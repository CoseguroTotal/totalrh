import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/** Ruta interna pedida por el service worker al tocar un aviso; null si no es de la app. */
export function rutaDeAviso(datos: unknown): string | null {
  if (!datos || typeof datos !== "object") return null;
  const { tipo, ruta } = datos as { tipo?: unknown; ruta?: unknown };
  if (tipo !== "totalrh:abrir" || typeof ruta !== "string") return null;
  // Sólo rutas propias: "/muro", "/mensajes/…" (nunca "//otro-sitio" ni direcciones completas)
  return /^\/(?![/\\])/.test(ruta) ? ruta : null;
}

/**
 * Al tocar un aviso con la app ya abierta, el service worker la trae al frente y pide
 * la pantalla del aviso: se cambia por dentro, sin recargar (en iPhone recargar desde
 * el service worker deja la pantalla en blanco).
 */
export default function AbrirDesdeAviso() {
  const navigate = useNavigate();
  useEffect(() => {
    const sw = typeof navigator !== "undefined" ? navigator.serviceWorker : undefined;
    if (!sw) return;
    const alRecibir = (ev: MessageEvent) => {
      const ruta = rutaDeAviso(ev.data);
      if (ruta) navigate(ruta);
    };
    sw.addEventListener("message", alRecibir);
    return () => sw.removeEventListener("message", alRecibir);
  }, [navigate]);
  return null;
}
