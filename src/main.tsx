import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { CLIENTE, NOMBRE_APP } from "./marca";

// En la instalación de un cliente, el título de la pestaña y de la app instalada lleva su nombre
if (CLIENTE) {
  document.title = NOMBRE_APP;
  document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute("content", CLIENTE.nombre);
}

const previewHostPattern = /(^id-preview--|^preview--|\.lovableproject\.com$|\.lovableproject-dev\.com$|\.beta\.lovable\.dev$)/;
const shouldDisableAppShellWorker =
  !import.meta.env.PROD ||
  window.self !== window.top ||
  previewHostPattern.test(window.location.hostname) ||
  window.location.search.includes("sw=off");

if (shouldDisableAppShellWorker && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      const scriptUrl = registration.active?.scriptURL ?? registration.installing?.scriptURL ?? registration.waiting?.scriptURL ?? "";
      if (scriptUrl.endsWith("/sw.js") || scriptUrl.endsWith("/service-worker.js")) {
        registration.unregister();
      }
    });
  });
}

// App instalable (PWA): sólo en producción y fuera de la vista previa de Lovable
if (!shouldDisableAppShellWorker && "serviceWorker" in navigator) {
  import("virtual:pwa-register").then(({ registerSW }) => registerSW({ immediate: true })).catch(() => undefined);
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("No se encontró el contenedor principal de la aplicación.");
}

createRoot(root).render(<App />);
