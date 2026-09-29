/* Kriyabot service worker: only handles explicit push events and notification clicks. */
self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = { body: event.data?.text() || "You have a new Kriyabot reminder." }; }
  const title = payload.title || "Kriyabot reminder";
  const options = {
    body: payload.body || "You have an update in Kriyabot.",
    tag: payload.tag || "taskflow-notification",
    renotify: false,
    data: { url: payload.url || "/app" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const requested = new URL(event.notification.data?.url || "/app", self.location.origin);
  const target = requested.origin === self.location.origin ? requested.href : new URL("/app", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin !== self.location.origin) continue;
      if ("navigate" in client) await client.navigate(target);
      return client.focus();
    }
    return self.clients.openWindow(target);
  })());
});
