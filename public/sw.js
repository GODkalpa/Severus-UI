self.addEventListener("push", function (event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.title || "SEVERUS";
      const body = data.body || "REVELIO: Intelligence Alert";
      const url = data.data?.url || "/";

      const options = {
        body: body,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/badge-72x72.png",
        vibrate: [150, 80, 150, 80, 300],
        tag: data.tag || "severus-tactical-alert",
        renotify: true,
        requireInteraction: true,
        data: {
          url: url,
          title: title,
          body: body,
          arrival_time: data.data?.arrival_time || new Date().toISOString(),
        },
        actions: [
          { action: "open", title: "Open HUD" },
          { action: "dismiss", title: "Dismiss" },
        ],
      };

      // 1. Broadcast to active clients for instant foreground HUD toast and cyber chime ringtone
      const broadcastPayload = {
        type: "SEVERUS_PUSH_NOTIFICATION",
        title: title,
        body: body,
        url: url,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      if ("BroadcastChannel" in self) {
        try {
          const channel = new BroadcastChannel("severus_notifications");
          channel.postMessage(broadcastPayload);
          channel.close();
        } catch (chanErr) {
          console.warn("BroadcastChannel error:", chanErr);
        }
      }

      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
        clientList.forEach(function (client) {
          client.postMessage(broadcastPayload);
        });
      });

      // 2. Display native OS push notification
      event.waitUntil(
        self.registration.showNotification(title, options)
      );
    } catch (e) {
      console.error("Push event data parsing error", e);
    }
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ("focus" in client) {
          client.focus();
          client.postMessage({
            type: "NOTIFICATION_CLICKED",
            url: targetUrl,
          });
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
