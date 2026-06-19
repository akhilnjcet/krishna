self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Notifications
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data.json();
  } catch (err) {
    data = { title: 'Krishna ERP Alert', body: event.data.text() };
  }

  const priority = (data.data && data.data.priority) || 'Low';
  const url = (data.data && data.data.url) || data.url || '/#/admin/notifications';

  let icon = '/logo192.png';
  let badge = '/favicon.ico';

  // Use appropriate vibration patterns and tags based on priority
  let vibrate = [100, 50, 100];
  let tag = 'low-priority';
  let renotify = false;

  if (priority === 'Critical') {
    vibrate = [500, 100, 500, 100, 500, 100, 500];
    tag = 'critical-alert';
    renotify = true;
  } else if (priority === 'High') {
    vibrate = [300, 100, 300, 100, 300];
    tag = 'high-alert';
    renotify = true;
  } else if (priority === 'Medium') {
    vibrate = [200, 100, 200];
    tag = 'medium-alert';
  }

  const options = {
    body: data.body || data.message || 'New status update reported.',
    icon: icon,
    badge: badge,
    vibrate: vibrate,
    tag: tag,
    renotify: renotify,
    data: {
      url: url,
      priority: priority
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Krishna ERP Alert', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data.url || '/#/admin/notifications';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Find if there is already a window open with our app
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
