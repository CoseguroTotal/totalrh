// Se suma al service worker de la app (workbox importScripts).

// Aviso push del servidor (supabase/functions/avisos-push): llega aunque la app esté cerrada.
// Si la app está a la vista no se muestra: ahí ya suena y avisa la propia app.
self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { cuerpo: event.data ? event.data.text() : "" }; }
  event.waitUntil((async () => {
    if (!d.siempre) {
      const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      if (ventanas.some((v) => v.visibilityState === "visible")) return;
    }
    await self.registration.showNotification(d.titulo || "Aviso nuevo", {
      body: d.cuerpo || "",
      icon: "/pwa-192x192.png",
      badge: "/favicon.png",
      tag: d.etiqueta,
      // Cada mensaje nuevo de la misma conversación vuelve a sonar
      renotify: !!d.etiqueta,
      data: { url: d.url || "/muro" },
    });
  })());
});

// Al tocar un aviso del sistema abre la app en la pantalla correspondiente,
// o la trae al frente si ya estaba abierta.
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
