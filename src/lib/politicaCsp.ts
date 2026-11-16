/**
 * Política de seguridad de contenido (CSP) del build de producción.
 * Va como <meta> en index.html (ver vite.config.ts). Limita de dónde se cargan
 * scripts, estilos, imágenes y conexiones: si alguien lograra inyectar HTML,
 * el navegador no ejecuta scripts de otros sitios ni manda datos afuera.
 *
 * Orígenes que usa la app:
 * - el propio sitio (código, modelos de reconocimiento facial, scripts de Lovable en /__l5e/);
 * - Supabase (API, realtime por wss, storage para imágenes y logos);
 * - data: y blob: para fotos de la cámara, QR, PDFs y planillas generadas en el navegador.
 *
 * frame-ancestors, X-Frame-Options y Permissions-Policy no se pueden poner en un
 * <meta>: van como headers del hosting (Cloudflare).
 */
export function politicaCsp(supabaseUrl?: string) {
  let supabase = "https://*.supabase.co";
  let supabaseWs = "wss://*.supabase.co";
  try {
    if (supabaseUrl) {
      const u = new URL(supabaseUrl);
      // Si el proyecto usa un dominio propio, se suma además del comodín
      if (!u.hostname.endsWith(".supabase.co")) {
        supabase += ` ${u.origin}`;
        supabaseWs += ` wss://${u.host}`;
      }
    }
  } catch {
    // URL inválida: quedan los comodines de Supabase
  }
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self'",
    // wasm-unsafe-eval: el motor de reconocimiento facial puede usar WebAssembly
    "script-src 'self' 'wasm-unsafe-eval'",
    // Los componentes de la interfaz usan estilos en línea
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${supabase}`,
    "font-src 'self' data:",
    `connect-src 'self' data: blob: ${supabase} ${supabaseWs}`,
    "media-src 'self' data: blob:",
    "worker-src 'self' blob:",
    "frame-src 'self' blob:",
    "manifest-src 'self'",
  ].join("; ");
}
