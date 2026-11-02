// Qué dice cada aviso push. Lo usan la edge function avisos-push y la app (testeado en src/test/webpush.test.ts).
// La etiqueta es la misma que usa la app abierta: si llegan los dos, el sistema muestra uno solo.

export interface AvisoPush {
  titulo: string;
  cuerpo: string;
  url: string;
  etiqueta: string;
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

/** Servicios de push de Chrome/Android, Safari/iPhone, Firefox y Edge: sólo a esos se les envía. */
const SERVICIOS_PUSH = [/^fcm\.googleapis\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /(^|\.)notify\.windows\.com$/];

export function endpointPermitido(endpoint: string) {
  try {
    const u = new URL(endpoint);
    return u.protocol === "https:" && SERVICIOS_PUSH.some((r) => r.test(u.hostname));
  } catch {
    return false;
  }
}

export const datosPush = {
  chat(
    m: { conversacion_id: string; contenido?: string | null; adjunto_tipo?: string | null; eliminado?: boolean | null },
    autor: string | null,
    grupo: string | null,
  ): AvisoPush {
    const quien = autor || "Mensaje nuevo";
    return {
      titulo: grupo ? `${quien} · ${grupo}` : quien,
      cuerpo: resumenMensaje(m),
      url: `/mensajes/${m.conversacion_id}`,
      etiqueta: `chat-${m.conversacion_id}`,
    };
  },
  notificacion(n: { id: string; titulo: string; mensaje?: string | null; link?: string | null }): AvisoPush {
    return { titulo: n.titulo, cuerpo: n.mensaje ?? "", url: n.link || "/muro", etiqueta: `notif-${n.id}` };
  },
};
