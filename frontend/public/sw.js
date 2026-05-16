self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Safe-Pass for large biometric models and ads to prevent SW crashes
  if (event.request.url.includes('models/') || event.request.url.includes('googlesyndication')) {
    return; // Let the browser handle these normally
  }

  event.respondWith(
    fetch(event.request).catch(() => {
      // Return a basic offline response if the network fails
      return new Response('Network request failed. Ensure connection to Krisha Buildings HQ.', {
        status: 408,
        statusText: 'Network Timeout'
      });
    })
  );
});

// Notifications
self.addEventListener('push', (event) => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/app-icon.jpg',
    badge: '/app-icon.jpg',
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Krishna ERP Update', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
