// Supabase Edge Function (Deno): sendet eine Web-Push-Benachrichtigung.
//
// Ohne target_user_id: an alle registrierten Geräte des AUFRUFENDEN Nutzers
// (neuer Badge, Level-Aufstieg, Freundeschallenge-Ereignisse in eigener Sache).
// Mit target_user_id: an die Geräte eines ANDEREN Nutzers – ausschliesslich für
// Freundeschallenge-Benachrichtigungen (z. B. "du wurdest herausgefordert"), und
// nur, wenn zwischen Aufrufer und Ziel tatsächlich eine Freundeschallenge-Zeile
// existiert (siehe Prüfung weiter unten), damit dieser Pfad nicht für beliebigen
// Spam an fremde Nutzer missbraucht werden kann.
//
// Benötigte Secrets (per `supabase secrets set` zu setzen):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (z. B. "mailto:you@example.com")
// SUPABASE_URL, SUPABASE_ANON_KEY und SUPABASE_SERVICE_ROLE_KEY sind in der
// Edge-Runtime bereits vorhanden.
//
// Generieren der VAPID-Schlüssel lokal: `npx web-push generate-vapid-keys`

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';
import { corsHeaders } from '../_shared/cors.ts';

interface RequestBody {
  title: string;
  body: string;
  target_user_id?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const vapidSubject = Deno.env.get('VAPID_SUBJECT');

  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return new Response('Push ist serverseitig nicht konfiguriert (VAPID-Secrets fehlen).', {
      status: 500,
      headers: corsHeaders,
    });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  let payload: RequestBody;
  try {
    payload = await req.json();
  } catch {
    return new Response('Ungültiger Request-Body.', { status: 400, headers: corsHeaders });
  }
  if (!payload.title || !payload.body) {
    return new Response('title und body sind erforderlich.', { status: 400, headers: corsHeaders });
  }

  // Client mit dem JWT des Aufrufers: RLS beschränkt die Abfrage automatisch
  // auf dessen eigene push_subscriptions-Zeilen (siehe Migration 0004).
  const callerClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  let subscriptionsQuery = callerClient.from('push_subscriptions').select('id, endpoint, p256dh, auth');
  let deleteClient = callerClient;

  if (payload.target_user_id) {
    const {
      data: { user: caller },
    } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    // Service-Role-Client, um RLS gezielt für den Freundeschallenge-Fall zu
    // umgehen (das Ziel ist ein ANDERER Nutzer als der Aufrufer).
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: beziehung } = await serviceClient
      .from('freundeschallenges')
      .select('id')
      .or(
        `and(ersteller_id.eq.${caller.id},empfaenger_id.eq.${payload.target_user_id}),` +
          `and(ersteller_id.eq.${payload.target_user_id},empfaenger_id.eq.${caller.id})`
      )
      .limit(1)
      .maybeSingle();

    if (!beziehung) {
      return new Response('Keine Freundeschallenge zwischen Aufrufer und Ziel gefunden.', {
        status: 403,
        headers: corsHeaders,
      });
    }

    subscriptionsQuery = serviceClient
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('user_id', payload.target_user_id);
    deleteClient = serviceClient;
  }

  const { data: subscriptions, error } = await subscriptionsQuery;

  if (error) {
    return new Response(`Konnte Abonnements nicht laden: ${error.message}`, {
      status: 500,
      headers: corsHeaders,
    });
  }

  const notificationPayload = JSON.stringify({ title: payload.title, body: payload.body });

  const results = await Promise.allSettled(
    (subscriptions ?? []).map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          notificationPayload
        );
      } catch (err) {
        // 404/410 = Abonnement ist nicht mehr gültig (z. B. Browser-Daten
        // gelöscht) -> aufräumen, damit künftige Sends nicht erneut fehlschlagen.
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await deleteClient.from('push_subscriptions').delete().eq('id', sub.id);
        }
        throw err;
      }
    })
  );

  const gesendet = results.filter((r) => r.status === 'fulfilled').length;
  return new Response(JSON.stringify({ gesendet, gesamt: results.length }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
