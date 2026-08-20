// Supabase Edge Function (Deno): Passwort-Reset-Anfrage.
//
// Es gibt bewusst keinen klassischen Self-Service-Reset per E-Mail-Link
// (siehe README, Migration 0015) – ohne eigenen SMTP-Anbieter ist Supabases
// eingebauter Mailer für sicherheitsrelevante Links nicht zuverlässig genug.
// Stattdessen legt dieser Endpunkt eine Zeile in public.passwort_reset_anfragen
// an und benachrichtigt alle Admins per Push; der Admin setzt das neue
// Passwort danach manuell über die Nutzerverwaltung
// (admin-user-management, Aktion "reset-password").
//
// Bewusst OHNE Prüfung auf einen eingeloggten Nutzer, da genau die
// Zielgruppe (Passwort vergessen) sich nicht einloggen kann. Um
// User-Enumeration zu verhindern, antwortet der Endpunkt immer mit derselben
// generischen Meldung, unabhängig davon, ob die E-Mail zu einem Konto gehört.
//
// Benötigte Secrets: SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY sind in der
// Edge-Runtime bereits vorhanden. VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/
// VAPID_SUBJECT (siehe send-push-notification) sind optional – ohne sie
// wird die Anfrage weiterhin gespeichert, nur der Push an die Admins entfällt
// (sie sehen offene Anfragen dann erst beim nächsten Öffnen der
// Nutzerverwaltung).

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';

const GENERISCHE_ANTWORT = {
  message: 'Falls ein Konto mit dieser E-Mail existiert, wurde ein Admin benachrichtigt.',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let payload: { email?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Ungültiger Request-Body.' }, 400);
  }

  const email = payload.email?.trim().toLowerCase();
  if (!email) {
    return json({ error: 'E-Mail ist erforderlich.' }, 400);
  }

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: nutzer } = await serviceClient
    .from('users')
    .select('id')
    .ilike('email', email)
    .maybeSingle();

  // Kein Konto mit dieser E-Mail (oder Tippfehler) – trotzdem generisch
  // antworten, damit niemand darüber erraten kann, welche E-Mails
  // registriert sind.
  if (!nutzer) {
    return json(GENERISCHE_ANTWORT);
  }

  // Bereits eine offene Anfrage für dieses Konto? Dann nicht erneut anlegen
  // bzw. die Admins nicht wiederholt benachrichtigen (verhindert Spam durch
  // mehrfaches Absenden).
  const { data: offeneAnfrage } = await serviceClient
    .from('passwort_reset_anfragen')
    .select('id')
    .eq('user_id', nutzer.id)
    .eq('erledigt', false)
    .maybeSingle();

  if (!offeneAnfrage) {
    await serviceClient.from('passwort_reset_anfragen').insert({ user_id: nutzer.id });

    // Push an alle Admins – best effort, ein Fehlschlag hier darf die
    // Anfrage selbst nicht ungültig machen (die Admin-Übersicht zeigt sie
    // ohnehin an).
    try {
      const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
      const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
      const vapidSubject = Deno.env.get('VAPID_SUBJECT');

      if (vapidPublicKey && vapidPrivateKey && vapidSubject) {
        webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

        const { data: admins } = await serviceClient
          .from('users')
          .select('id')
          .eq('rolle', 'admin');

        const adminIds = (admins ?? []).map((a) => a.id);

        if (adminIds.length > 0) {
          const { data: adminAbos } = await serviceClient
            .from('push_subscriptions')
            .select('id, endpoint, p256dh, auth')
            .in('user_id', adminIds);

          const notificationPayload = JSON.stringify({
            title: 'Passwort-Reset angefragt',
            body: 'Ein Nutzer hat sein Passwort vergessen. Bitte in der Nutzerverwaltung zurücksetzen.',
          });

          await Promise.allSettled(
            (adminAbos ?? []).map(async (sub) => {
              try {
                await webpush.sendNotification(
                  { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                  notificationPayload
                );
              } catch (err) {
                const status = (err as { statusCode?: number }).statusCode;
                if (status === 404 || status === 410) {
                  await serviceClient.from('push_subscriptions').delete().eq('id', sub.id);
                }
              }
            })
          );
        }
      }
    } catch (err) {
      console.warn('Push an Admins konnte nicht gesendet werden:', err);
    }
  }

  return json(GENERISCHE_ANTWORT);
});
