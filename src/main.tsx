import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

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

const root = document.getElementById("root");

if (!root) {
  throw new Error("No se encontró el contenedor principal de la aplicación.");
}

createRoot(root).render(<App />);
