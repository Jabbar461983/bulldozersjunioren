// Wird per workbox.importScripts in den generierten Service Worker (sw.js)
// eingebunden (siehe vite.config.ts) und ergänzt die Anzeige eingehender
// Web-Push-Nachrichten. Ausgelöst ausschliesslich für: neuer Badge, Level-
// Aufstieg (siehe supabase/functions/send-push-notification).

self.addEventListener('push', (event) => {
  let data = { title: 'Bulldozers Challenge', body: '' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow('/junior/profil'));
});
