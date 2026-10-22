import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { debeBloquear, esInstalacionDemo, minutosRestantes } from "./demo-rules.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function adminClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

export async function sha256(value: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function getIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "desconocida";
}

export interface DemoConfig {
  demo_codigo_minutos: number;
  demo_max_intentos_codigo: number;
  demo_max_solicitudes_ip_hora: number;
  demo_max_fallos_ip_hora: number;
  demo_bloqueo_minutos: number;
  demo_acceso_dias: number;
  email_remitente: string | null;
}

export async function getConfig(admin: SupabaseClient): Promise<DemoConfig> {
  const { data } = await admin.from("configuracion_grupo").select("*").limit(1).maybeSingle();
  return {
    demo_codigo_minutos: data?.demo_codigo_minutos ?? 15,
    demo_max_intentos_codigo: data?.demo_max_intentos_codigo ?? 5,
    demo_max_solicitudes_ip_hora: data?.demo_max_solicitudes_ip_hora ?? 5,
    demo_max_fallos_ip_hora: data?.demo_max_fallos_ip_hora ?? 10,
    demo_bloqueo_minutos: data?.demo_bloqueo_minutos ?? 60,
    demo_acceso_dias: data?.demo_acceso_dias ?? 3,
    email_remitente: data?.email_remitente ?? null,
  };
}

export async function logIntento(admin: SupabaseClient, ip: string, email: string | null, tipo: string, resultado: string) {
  await admin.from("demo_intentos").insert({ ip, email, tipo, resultado });
}

/** Devuelve una Response 429 si la IP o el email están bloqueados. */
export async function checkBloqueo(admin: SupabaseClient, claves: string[]) {
  const { data } = await admin
    .from("demo_bloqueos")
    .select("clave, hasta")
    .in("clave", claves)
    .gt("hasta", new Date().toISOString())
    .order("hasta", { ascending: false })
    .limit(1);
  const b = data?.[0];
  if (!b) return null;
  const min = minutosRestantes(b.hasta);
  return json({ error: `Acceso bloqueado temporalmente por actividad sospechosa. Intentá de nuevo en ${min} min.`, retryAt: b.hasta }, 429);
}

export async function bloquear(admin: SupabaseClient, clave: string, minutos: number, motivo: string) {
  const hasta = new Date(Date.now() + minutos * 60_000).toISOString();
  await admin.from("demo_bloqueos").upsert({ clave, hasta, motivo }, { onConflict: "clave" });
  return hasta;
}

/** Cuenta eventos de un tipo/resultado para la IP en la última hora y bloquea si supera el máximo. */
export async function evaluarIp(
  admin: SupabaseClient, ip: string, tipo: string, resultado: string | null, maximo: number, cfg: DemoConfig, motivo: string,
) {
  const since = new Date(Date.now() - 60 * 60_000).toISOString();
  let q = admin.from("demo_intentos").select("id", { count: "exact", head: true }).eq("ip", ip).eq("tipo", tipo).gte("created_at", since);
  if (resultado) q = q.eq("resultado", resultado);
  const { count } = await q;
  if (debeBloquear(count ?? 0, maximo)) {
    const hasta = await bloquear(admin, `ip:${ip}`, cfg.demo_bloqueo_minutos, motivo);
    return json({ error: `Demasiados intentos desde tu conexión. Intentá de nuevo en ${cfg.demo_bloqueo_minutos} min.`, retryAt: hasta }, 429);
  }
  return null;
}

/** Las funciones de demo solo responden en el backend de la demo; en una instalación de cliente devuelven 404. */
export function soloEnDemo(): Response | null {
  return esInstalacionDemo(Deno.env.get("SUPABASE_URL")) ? null : json({ error: "No disponible" }, 404);
}
