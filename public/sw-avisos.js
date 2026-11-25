// Se suma al service worker de la app (workbox importScripts).

// Aviso push del servidor (supabase/functions/avisos-push): llega aunque la app esté cerrada.
// Siempre se muestra: iPhone (y Chrome) dan de baja la suscripción si llegan avisos que no se
// muestran, y en iPhone la app en segundo plano a veces figura como "visible" aunque no lo esté.
// Si la app está a la vista, el aviso sale sin sonido (la propia app ya suena y avisa).
self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { cuerpo: event.data ? event.data.text() : "" }; }
  event.waitUntil((async () => {
    let aLaVista = false;
    if (!d.siempre) {
      try {
        const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        aLaVista = ventanas.some((v) => v.visibilityState === "visible" && v.focused !== false);
      } catch (e) { /* sin acceso a las ventanas: se avisa con sonido */ }
    }
    await self.registration.showNotification(d.titulo || "Aviso nuevo", {
      body: d.cuerpo || "",
      icon: "/pwa-192x192.png",
      badge: "/favicon.png",
      tag: d.etiqueta,
      // Cada mensaje nuevo de la misma conversación vuelve a sonar
      renotify: !!d.etiqueta && !aLaVista,
      silent: aLaVista,
      data: { url: d.url || "/muro" },
    });
  })());
});

// Al tocar un aviso del sistema abre la app en la pantalla correspondiente.
// Si la app ya estaba abierta, la trae al frente y le pide que cambie de pantalla por dentro:
// navegar la ventana desde acá (WindowClient.navigate) deja la pantalla en blanco en iPhone.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = new URL((event.notification.data && event.notification.data.url) || "/muro", self.location.origin);
  const ruta = destino.pathname + destino.search + destino.hash;
  event.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const abierta = ventanas.find((v) => v.url.startsWith(self.location.origin));
    if (abierta) {
      try {
        const v = await abierta.focus();
        (v || abierta).postMessage({ tipo: "totalrh:abrir", ruta });
        return;
      } catch (e) { /* no se pudo traer al frente: se abre una ventana nueva */ }
    }
    await self.clients.openWindow(destino.href);
  })());
});
