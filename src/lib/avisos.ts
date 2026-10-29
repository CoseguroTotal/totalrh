// Sonidos y avisos del sistema (barra de notificaciones del celular o la compu).
// Los sonidos se generan con Web Audio: no hay archivos que descargar.

export type TipoSonido = "mensaje" | "aviso";

const CLAVE_SONIDOS = "totalrh.sonidos";

export function sonidosActivos() {
  try { return localStorage.getItem(CLAVE_SONIDOS) !== "no"; } catch { return true; }
}

export function setSonidosActivos(activos: boolean) {
  try { localStorage.setItem(CLAVE_SONIDOS, activos ? "si" : "no"); } catch { /* sin almacenamiento */ }
}

let ctx: AudioContext | null = null;

/** Los navegadores no dejan sonar nada hasta que la persona toca la pantalla una vez. */
export function prepararSonidos() {
  const desbloquear = () => {
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      ctx ??= new Ctor();
      if (ctx.state === "suspended") void ctx.resume();
    } catch { /* sin audio */ }
  };
  window.addEventListener("pointerdown", desbloquear, { once: true, passive: true });
  window.addEventListener("keydown", desbloquear, { once: true });
}

/** Notas (frecuencia en Hz, inicio y duración en segundos) de cada sonido. */
export const NOTAS: Record<TipoSonido, { f: number; t: number; d: number }[]> = {
  // Dos notas cortas ascendentes, como un "pop" de chat
  mensaje: [{ f: 880, t: 0, d: 0.09 }, { f: 1320, t: 0.09, d: 0.12 }],
  // Campanita suave de tres notas para notificaciones
  aviso: [{ f: 660, t: 0, d: 0.14 }, { f: 880, t: 0.12, d: 0.14 }, { f: 1175, t: 0.24, d: 0.22 }],
};

let ultimo = 0;

export function sonar(tipo: TipoSonido) {
  if (!sonidosActivos() || !ctx || ctx.state !== "running") return;
  // Si llegan varios juntos (p. ej. un comunicado a todos) suena una sola vez
  const ahora = Date.now();
  if (ahora - ultimo < 1500) return;
  ultimo = ahora;
  const base = ctx.currentTime + 0.01;
  for (const n of NOTAS[tipo]) {
    const osc = ctx.createOscillator();
    const vol = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = n.f;
    vol.gain.setValueAtTime(0.0001, base + n.t);
    vol.gain.exponentialRampToValueAtTime(0.18, base + n.t + 0.015);
    vol.gain.exponentialRampToValueAtTime(0.0001, base + n.t + n.d);
    osc.connect(vol).connect(ctx.destination);
    osc.start(base + n.t);
    osc.stop(base + n.t + n.d + 0.02);
  }
}

/* ─────────────── Avisos del sistema ─────────────── */

export const avisosDisponibles = () => typeof window !== "undefined" && "Notification" in window;
export const permisoAvisos = (): NotificationPermission | "no-disponible" => (avisosDisponibles() ? Notification.permission : "no-disponible");

export async function pedirPermisoAvisos() {
  if (!avisosDisponibles()) return "no-disponible" as const;
  return Notification.requestPermission();
}

/**
 * Muestra un aviso del sistema sólo si la app no está a la vista (en otra pestaña, minimizada
 * o con el celular bloqueado): con la app abierta alcanza con el sonido y el aviso en pantalla.
 */
export async function avisoSistema(titulo: string, cuerpo: string, url: string, etiqueta?: string) {
  if (!avisosDisponibles() || Notification.permission !== "granted" || document.visibilityState === "visible") return;
  const opciones: NotificationOptions = { body: cuerpo, icon: "/pwa-192x192.png", badge: "/favicon.png", tag: etiqueta, data: { url } };
  try {
    // En Android sólo se puede avisar a través del service worker
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) { await reg.showNotification(titulo, opciones); return; }
    const n = new Notification(titulo, opciones);
    n.onclick = () => { window.focus(); window.location.assign(url); n.close(); };
  } catch { /* el navegador no lo permite */ }
}

/** Número en el ícono de la app instalada (donde el sistema lo soporta). */
export function marcarIconoApp(cantidad: number) {
  const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
  try {
    if (cantidad > 0) void nav.setAppBadge?.(cantidad);
    else void nav.clearAppBadge?.();
  } catch { /* sin soporte */ }
}

/** Texto corto para un mensaje de chat (sin contenido, con adjunto o eliminado). */
export function resumenMensaje(m: { contenido?: string | null; adjunto_tipo?: string | null; eliminado?: boolean | null }) {
  if (m.eliminado) return "Mensaje eliminado";
  const texto = (m.contenido ?? "").trim();
  if (texto) return texto.length > 120 ? `${texto.slice(0, 117)}…` : texto;
  if (m.adjunto_tipo === "imagen") return "📷 Foto";
  if (m.adjunto_tipo === "audio") return "🎤 Mensaje de voz";
  if (m.adjunto_tipo === "documento") return "📎 Documento";
  return "Nuevo mensaje";
}
