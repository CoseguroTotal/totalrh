// Se suma al service worker de la app (workbox importScripts): al tocar un aviso del sistema
// abre la app en la pantalla correspondiente, o la trae al frente si ya estaba abierta.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/muro", self.location.origin).href;
  event.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const v of ventanas) {
      if (v.url.startsWith(self.location.origin)) {
        await v.focus();
        if ("navigate" in v) await v.navigate(url);
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
