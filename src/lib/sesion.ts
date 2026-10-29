// La sesión guardada en el celular puede seguir "abierta" aunque el servidor ya la haya cerrado
// (venció, se cerró desde otro lado o se reinició el acceso). Sin este control la app parece
// conectada pero cada acción falla con "Debés iniciar sesión".
import { supabase } from "@/integrations/supabase/client";

export const MENSAJE_SESION_VENCIDA = "Tu sesión venció. Volvé a iniciar sesión.";

/** Errores que indican que la sesión ya no vale (no los de red). */
export function esErrorDeSesion(e: { status?: number; message?: string; code?: string } | null | undefined) {
  if (!e) return false;
  if (e.status === 401 || e.status === 403) return true;
  return /session[_ ]?(not[_ ]found|missing|expired)|invalid (jwt|refresh token)|jwt expired|refresh token not found/i.test(`${e.code ?? ""} ${e.message ?? ""}`);
}

/**
 * Confirma con el servidor que la sesión sigue vigente; si no, intenta renovarla.
 * Devuelve false sólo si la sesión no sirve más (sin conexión se asume que sigue).
 */
export async function asegurarSesion(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return false;
  const { error } = await supabase.auth.getUser();
  if (!error) return true;
  if (!esErrorDeSesion(error)) return true;
  const { data, error: errRenovar } = await supabase.auth.refreshSession();
  return !errRenovar && !!data.session;
}

let cerrando = false;

/** Cierra la sesión guardada y lleva al login con el aviso. */
export async function cerrarSesionVencida() {
  if (cerrando) return;
  cerrando = true;
  try { await supabase.auth.signOut({ scope: "local" }); } catch { /* igual se sale */ }
  window.location.assign(`/login?vencida=1`);
}

/**
 * Igual que supabase.functions.invoke, pero si la función responde "no autenticado"
 * renueva la sesión y reintenta una vez; si no se puede, cierra la sesión vencida.
 */
export async function invocarFuncion(funcion: string, body: Record<string, unknown>) {
  const primera = await supabase.functions.invoke(funcion, { body });
  const status = (primera.error as { context?: Response } | null)?.context?.status;
  if (status !== 401) return primera;
  // Sin sesión (p. ej. el login con DNI) el 401 es la respuesta real: no hay nada que renovar
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return primera;
  if (await asegurarSesion()) return supabase.functions.invoke(funcion, { body });
  await cerrarSesionVencida();
  return primera;
}
