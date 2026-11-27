// Organización de quien llama a una edge function.
// Regla: la organización siempre sale de la membresía del usuario, nunca de lo que manda el navegador.
// Con la clave de servicio no hay RLS, así que cada consulta a una tabla de clientes filtra por ella
// (lo controla src/test/organizacionFunciones.test.ts).
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/** Organización activa del usuario, la misma que usa la base con org_actual(). Null si no pertenece a ninguna. */
export async function orgDeUsuario(admin: SupabaseClient, userId: string): Promise<string | null> {
  const { data, error } = await admin.rpc("org_de_usuario", { _user_id: userId });
  if (error) throw error;
  return (data as string | null) ?? null;
}

/** Roles del usuario dentro de una organización. */
export async function rolesEnOrg(admin: SupabaseClient, userId: string, org: string): Promise<Set<string>> {
  const { data, error } = await admin.from("user_roles").select("role").eq("user_id", userId).eq("organizacion_id", org);
  if (error) throw error;
  return new Set((data ?? []).map((r: { role: string }) => r.role));
}

export const MENSAJE_SIN_ORG = "Tu usuario no pertenece a ninguna organización. Consultá con RRHH.";
