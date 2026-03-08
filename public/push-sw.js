// Push notification service worker
self.addEventListener('push', function (event) {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: '이:르다', body: event.data.text() }
  }

  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: payload.tag || 'iruda-notification',
    data: { url: payload.url || '/levels' },
    vibrate: [200, 100, 200],
  }

  event.waitUntil(self.registration.showNotification(payload.title || '이:르다', options))
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()

  const url = event.notification.data?.url || '/levels'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
