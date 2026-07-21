import { supabase } from './supabaseClient';

const ONBOARDING_KEY = 'sh-tracker-push-onboarding-entschieden';

export function istPushUnterstuetzt(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function pushBerechtigungStatus(): NotificationPermission | 'nicht-unterstuetzt' {
  if (!istPushUnterstuetzt()) return 'nicht-unterstuetzt';
  return Notification.permission;
}

// Merkt sich pro Browser/Geraet (nicht pro Konto), ob die Einladung zum
// Aktivieren von Push bereits beantwortet oder weggeklickt wurde, damit sie
// nicht bei jedem Login erneut erscheint.
export function pushOnboardingBereitsEntschieden(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  } catch {
    return false;
  }
}

export function pushOnboardingAlsEntschiedenMarkieren(): void {
  try {
    localStorage.setItem(ONBOARDING_KEY, 'true');
  } catch {
    // localStorage kann in seltenen Faellen blockiert sein (z. B. private
    // Modus mit strikten Einstellungen) – dann wird die Einladung eben bei
    // jedem Login erneut gezeigt, kein kritischer Fehler.
  }
}

function urlBase64ZuUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Sicher = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64Sicher);
  const bytes = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i++) {
    bytes[i] = rawData.charCodeAt(i);
  }
  return bytes;
}

export async function pushAktivieren(userId: string): Promise<void> {
  if (!istPushUnterstuetzt()) {
    throw new Error('Push-Benachrichtigungen werden von diesem Browser nicht unterstuetzt.');
  }

  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    throw new Error('Push ist noch nicht konfiguriert (VITE_VAPID_PUBLIC_KEY fehlt).');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Berechtigung fuer Benachrichtigungen wurde nicht erteilt.');
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ZuUint8Array(vapidPublicKey),
    }));

  const json = subscription.toJSON();
  if (!json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('Push-Abonnement konnte nicht erstellt werden.');
  }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
    { onConflict: 'endpoint' }
  );
  if (error) throw error;
}

export async function sendeGamificationPush(payload: {
  title: string;
  body: string;
}): Promise<void> {
  try {
    await supabase.functions.invoke('send-push-notification', { body: payload });
  } catch (err) {
    // Push ist ein "nice to have" – ein Fehlschlag (z. B. Function nicht
    // deployt) darf den eigentlichen Selbsteinschaetzungs-Flow nie stoeren.
    console.warn('Push-Benachrichtigung konnte nicht gesendet werden:', err);
  }
}
