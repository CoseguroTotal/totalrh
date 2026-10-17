import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Service worker de la app instalable. El manifiesto vive en public/manifest.json
    // y el registro se hace en main.tsx (nunca en la vista previa de Lovable).
    VitePWA({
      manifest: false,
      injectRegister: null,
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Los modelos de reconocimiento facial (~7 MB) se cachean sólo cuando se usan
        globIgnores: ["models/**", "**/face-api*.js"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/~oauth/, /^\/functions\//, /^\/models\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/models/") || /\/assets\/face-api.*\.js$/.test(url.pathname),
            handler: "CacheFirst",
            options: { cacheName: "modelos-faciales", expiration: { maxEntries: 10 } },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
