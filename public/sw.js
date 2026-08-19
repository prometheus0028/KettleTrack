const CACHE_NAME = 'kettletrack-v1';

const urlsToCache = [
  '/',
  '/login',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
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
