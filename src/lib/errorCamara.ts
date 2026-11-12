// Mensajes claros cuando la cámara no arranca. Cada error lleva un código corto
// (CAM-…) para que el empleado lo pueda pasar a RRHH y se sepa la causa exacta.

export interface ErrorCamara {
  mensaje: string;
  /** Qué puede hacer la persona para resolverlo */
  ayuda?: string;
  codigo: string;
}

/** Navegador interno de otra app (WhatsApp, Instagram, Facebook…), que suele no dar acceso a la cámara. */
export function navegadorInterno(ua: string): string | null {
  if (/WhatsApp/i.test(ua)) return "WhatsApp";
  if (/Instagram/i.test(ua)) return "Instagram";
  if (/FBAN|FBAV|FB_IAB|FBIOS|FB4A/i.test(ua)) return "Facebook";
  if (/\bLine\//i.test(ua)) return "Line";
  if (/musical_ly|TikTok|BytedanceWebview/i.test(ua)) return "TikTok";
  if (/Telegram/i.test(ua)) return "Telegram";
  // WebView genérico de Android (apps que abren enlaces adentro)
  if (/Android/i.test(ua) && /;\s*wv\)/i.test(ua)) return "otra app";
  return null;
}

const esIOS = (ua: string) => /iPhone|iPad|iPod/i.test(ua);
const navegadorRecomendado = (ua: string) => (esIOS(ua) ? "Safari" : "Chrome");

function ayudaNavegadorInterno(ua: string, app: string) {
  return `Lo abriste desde ${app}. Abrí la página en ${navegadorRecomendado(ua)} (menú ⋮ o ··· → "Abrir en el navegador") o desde la app instalada en la pantalla de inicio.`;
}

/** Traduce el error de getUserMedia (o la falta de soporte) a un mensaje con qué hacer. */
export function errorDeCamara(e: unknown, ua: string): ErrorCamara {
  const app = navegadorInterno(ua);
  const nombre = (e as { name?: string } | null)?.name ?? "";

  if (nombre === "SinSoporte") {
    return app
      ? { mensaje: "Este navegador no permite usar la cámara.", ayuda: ayudaNavegadorInterno(ua, app), codigo: "CAM-APP" }
      : {
          mensaje: "Este navegador no permite usar la cámara.",
          ayuda: `Abrí la página en ${navegadorRecomendado(ua)} actualizado.${esIOS(ua) ? " En iPhone hace falta iOS 14.3 o posterior." : ""}`,
          codigo: "CAM-SOPORTE",
        };
  }

  switch (nombre) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return {
        mensaje: "El permiso para usar la cámara está bloqueado.",
        ayuda: app
          ? ayudaNavegadorInterno(ua, app)
          : esIOS(ua)
            ? "En Safari tocá «aA» en la barra de direcciones → Configuración del sitio web → Cámara → Permitir. Después tocá Reintentar."
            : "Tocá el candado junto a la dirección → Permisos → Cámara → Permitir. Después tocá Reintentar.",
        codigo: app ? "CAM-APP" : "CAM-PERMISO",
      };
    case "SecurityError":
      return {
        mensaje: "El navegador no deja usar la cámara en esta página.",
        ayuda: app ? ayudaNavegadorInterno(ua, app) : `Abrí la página en ${navegadorRecomendado(ua)}.`,
        codigo: app ? "CAM-APP" : "CAM-SEGURIDAD",
      };
    case "NotFoundError":
    case "DevicesNotFoundError":
    case "OverconstrainedError":
      return {
        mensaje: "No se encontró una cámara disponible.",
        ayuda: "Revisá que el equipo tenga cámara y que no esté desactivada.",
        codigo: "CAM-SIN-CAMARA",
      };
    case "NotReadableError":
    case "TrackStartError":
    case "AbortError":
      return {
        mensaje: "La cámara está ocupada o no pudo arrancar.",
        ayuda: "Cerrá las otras apps que la estén usando (videollamadas, la cámara de fotos) y tocá Reintentar. Si sigue, reiniciá el celular.",
        codigo: "CAM-OCUPADA",
      };
  }

  return {
    mensaje: "No se pudo iniciar la cámara.",
    ayuda: app ? ayudaNavegadorInterno(ua, app) : `Tocá Reintentar. Si sigue, probá en ${navegadorRecomendado(ua)} actualizado.`,
    codigo: `CAM-${(nombre || "DESCONOCIDO").replace(/Error$/, "").toUpperCase().slice(0, 16)}`,
  };
}

/** La cámara anduvo pero no se pudo cargar el reconocimiento facial (conexión o celular sin WebGL). */
export function errorDeModelos(e: unknown): ErrorCamara {
  const texto = e instanceof Error ? e.message : String(e ?? "");
  const red = /fetch|network|load failed|404|timeout/i.test(texto); // "Load failed" es el error de red de Safari
  return red
    ? { mensaje: "No se pudo descargar el reconocimiento facial.", ayuda: "Revisá la conexión a internet (pesa unos 7 MB) y tocá Reintentar.", codigo: "CAM-DESCARGA" }
    : { mensaje: "Este celular no pudo cargar el reconocimiento facial.", ayuda: "Probá actualizar el navegador o usar otro equipo. Mientras tanto se puede fichar con QR.", codigo: "CAM-MOTOR" };
}
