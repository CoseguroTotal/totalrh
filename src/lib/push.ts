// Suscripción a los avisos push del dispositivo (ver supabase/functions/avisos-push).
// Con la suscripción activa los avisos llegan aunque la app esté cerrada.
import { supabase } from "@/integrations/supabase/client";
import { invocarFuncion } from "@/lib/sesion";
import { aBase64Url, deBase64Url } from "../../supabase/functions/_shared/web-push";

export const pushSoportado = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/** El service worker sólo existe en el sitio publicado (no en la vista previa de Lovable). */
function registro(espera = 8000) {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((r) => setTimeout(() => r(null), espera)),
  ]);
}

export async function suscripcionActual() {
  if (!pushSoportado()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

async function suscribir() {
  if (!pushSoportado() || Notification.permission !== "granted") return false;
  const reg = await registro();
  if (!reg) return false;
  const { data, error } = await invocarFuncion("avisos-push", { action: "clave" });
  if (error || !data?.clave) return false;
  let sub = await reg.pushManager.getSubscription();
  // Una suscripción hecha con otra clave no recibiría nada: se rehace
  const actual = sub?.options.applicationServerKey;
  if (sub && actual && aBase64Url(new Uint8Array(actual)) !== data.clave) {
    await sub.unsubscribe();
    sub = null;
  }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: deBase64Url(data.clave) });
  const j = sub.toJSON();
  const r = await invocarFuncion("avisos-push", { action: "suscribir", endpoint: j.endpoint, p256dh: j.keys?.p256dh, auth: j.keys?.auth });
  return !r.error;
}

let enCurso: Promise<boolean> | null = null;

/** Registra este dispositivo para los avisos push (si ya dio permiso). Se puede llamar de más. */
export function activarPush() {
  enCurso ??= suscribir().catch(() => false).finally(() => { enCurso = null; });
  return enCurso;
}

/** Manda un aviso de prueba a los dispositivos de quien lo pide. */
export async function probarPush() {
  const { data, error } = await invocarFuncion("avisos-push", { action: "probar" });
  if (error) return null;
  return data as { enviados: number; fallidos: number };
}

let vigilando = false;

/** Al cerrar sesión, el dispositivo deja de recibir los avisos de esa cuenta. */
export function vigilarCierreSesion() {
  if (vigilando) return;
  vigilando = true;
  supabase.auth.onAuthStateChange((evento) => {
    if (evento === "SIGNED_OUT") void suscripcionActual().then((s) => s?.unsubscribe()).catch(() => undefined);
  });
}
