self.addEventListener('push', function (event) {
  if (!event.data) return

  var payload
  try {
    payload = event.data.json()
  } catch (e) {
    payload = { title: 'Notification', body: event.data.text() }
  }

  var title = payload.title || 'Notification'
  var options = {
    body: payload.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: payload.data || {},
    vibrate: [100, 50, 100],
    tag: payload.data?.type || 'default',
    renotify: true
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()

  var data = event.notification.data || {}
  var targetUrl = data.url || '/'

  event.waitUntil(self.clients.openWindow(targetUrl))
})
