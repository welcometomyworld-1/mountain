// PrivateID Service Worker — Push & Phone System Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle custom message from web app to show phone system notification
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, data, tag } = event.data;

    const options = {
      body: body || 'New message received',
      icon: icon || '/logo.jpg',
      badge: '/logo.jpg',
      vibrate: [200, 100, 200, 100, 200],
      tag: tag || 'msg_' + Date.now(),
      renotify: true,
      requireInteraction: false,
      data: data || { url: '/' },
    };

    event.waitUntil(
      self.registration.showNotification(title || 'TailorWala', options)
    );
  }
});

// Handle notification tap on phone status bar
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
