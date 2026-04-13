// Service Worker for Web Push Notifications
self.addEventListener('push', function(event) {
  let data = { title: '알림', body: '새로운 알림이 있습니다.', icon: '/favicon.ico' };
  try {
    if (event.data) {
      data = Object.assign(data, event.data.json());
    }
  } catch (e) {
    console.error('Push data parse error:', e);
  }
  
  const options = {
    body: data.body,
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    vibrate: [200, 100, 200],
    data: data.data || { url: '/' },
    actions: data.actions || [],
    tag: data.tag || 'default',
    renotify: true,
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const notifData = event.notification.data || {};
  let targetUrl = '/';
  
  // 알림 타입별 라우팅
  if (notifData.type === 'chat_message' && notifData.roomId) {
    targetUrl = '/community/chat/' + notifData.roomId;
  } else if (notifData.type === 'flight_delay' || notifData.type === 'flight_cancel') {
    targetUrl = '/admin/flights';
  } else if (notifData.type === 'schedule_change' || notifData.type === 'schedule_reminder') {
    targetUrl = '/admin/schedule';
  } else if (notifData.type === 'geofence') {
    targetUrl = '/admin/geofence';
  } else if (notifData.url) {
    targetUrl = notifData.url;
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});
