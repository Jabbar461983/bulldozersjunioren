// Supabase Edge Function (Deno): sendet eine Web-Push-Benachrichtigung an
// alle registrierten Geräte des AUFRUFENDEN Nutzers.
//
// Wird ausschliesslich für die beiden in Phase 4 spezifizierten Ereignisse
// aufgerufen: neuer Badge erreicht, Level-Aufstieg. Keine weiteren Trigger
// (z. B. Trainingserinnerungen) in dieser Phase.
//
// Benötigte Secrets (per `supabase secrets set` zu setzen):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (z. B. "mailto:you@example.com")
// SUPABASE_URL und SUPABASE_ANON_KEY sind in der Edge-Runtime bereits vorhanden.
//
// Generieren der VAPID-Schlüssel lokal: `npx web-push generate-vapid-keys`

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';

interface RequestBody {
  title: string;
  body: string;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 });
  }

  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const vapidSubject = Deno.env.get('VAPID_SUBJECT');

  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return new Response('Push ist serverseitig nicht konfiguriert (VAPID-Secrets fehlen).', {
      status: 500,
    });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  let payload: RequestBody;
  try {
    payload = await req.json();
  } catch {
    return new Response('Ungültiger Request-Body.', { status: 400 });
  }
  if (!payload.title || !payload.body) {
    return new Response('title und body sind erforderlich.', { status: 400 });
  }

  // Client mit dem JWT des Aufrufers: RLS beschränkt die Abfrage automatisch
  // auf dessen eigene push_subscriptions-Zeilen (siehe Migration 0004).
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth');

  if (error) {
    return new Response(`Konnte Abonnements nicht laden: ${error.message}`, { status: 500 });
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
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
        throw err;
      }
    })
  );

  const gesendet = results.filter((r) => r.status === 'fulfilled').length;
  return new Response(JSON.stringify({ gesendet, gesamt: results.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
