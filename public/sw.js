const CACHE_NAME = 'kettletrack-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // We don't cache HTML requests because it breaks Next.js dynamic routing and auth.
  // This service worker is purely for Web Push Notifications.
  return;
});

self.addEventListener('push', function (event) {
  if (event.data) {
    try {
      const data = event.data.json()
      const title = data.title || 'KettleTrack'
      
      const options = {
        body: data.body,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        vibrate: [100, 50, 100],
        data: {
          url: data.url || '/'
        }
      }
      event.waitUntil(self.registration.showNotification(title, options))
    } catch (e) {
      console.error('Push event error', e)
    }
  }
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(clients.openWindow(event.notification.data.url))
  } else {
    event.waitUntil(clients.openWindow('/'))
  }
})
