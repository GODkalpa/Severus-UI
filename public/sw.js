self.addEventListener("push", function (event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body || "REVELIO: Intelligence Alert",
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-192x192.png",
        vibrate: [100, 50, 100],
        data: {
          url: data.data?.url || "/",
        },
      };

      event.waitUntil(
        self.registration.showNotification(data.title || "SEVERUS", options)
      );
    } catch (e) {
      console.error("Push event data parsing error", e);
    }
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
