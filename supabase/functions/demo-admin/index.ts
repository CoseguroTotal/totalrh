import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, corsHeaders, json, sha256 } from "../_shared/demo-security.ts";

const SUPERADMIN = "mcponce.torres@gmail.com";
const CONFIG_KEYS = ["demo_codigo_minutos", "demo_max_intentos_codigo", "demo_max_solicitudes_ip_hora", "demo_max_fallos_ip_hora", "demo_bloqueo_minutos", "demo_acceso_dias"];

function generarCodigo() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => chars[b % chars.length]).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = adminClient();
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return json({ error: "No autorizado" }, 401);
    const { data: u } = await admin.auth.getUser(token);
    if (u.user?.email?.toLowerCase() !== SUPERADMIN) return json({ error: "No autorizado" }, 403);

    const body = await req.json().catch(() => ({}));
    switch (body.action) {
      case "guardar_config": {
        const patch: Record<string, number> = {};
        for (const k of CONFIG_KEYS) {
          const v = Number(body.config?.[k]);
          if (!Number.isInteger(v) || v < 1 || v > 10000) return json({ error: `Valor inválido: ${k}` }, 400);
          patch[k] = v;
        }
        const { data: row } = await admin.from("configuracion_grupo").select("id").limit(1).single();
        const { error } = await admin.from("configuracion_grupo").update(patch).eq("id", row!.id);
        if (error) throw error;
        return json({ success: true });
      }
      case "generar_maestro": {
        const dias = Math.min(365, Math.max(1, Number(body.dias) || 30));
        const codigo = generarCodigo();
        await admin.from("demo_codigo_maestro").update({ activo: false }).eq("activo", true);
        await admin.from("demo_codigo_maestro").insert({
          codigo_hash: await sha256(codigo), expira_at: new Date(Date.now() + dias * 86400000).toISOString(),
        });
        return json({ success: true, codigo });
      }
      case "desactivar_maestro": {
        await admin.from("demo_codigo_maestro").update({ activo: false }).eq("activo", true);
        return json({ success: true });
      }
      case "desbloquear": {
        const clave = String(body.clave ?? "");
        if (!clave) return json({ error: "Falta la clave" }, 400);
        await admin.from("demo_bloqueos").delete().eq("clave", clave);
        return json({ success: true });
      }
      default:
        return json({ error: "Acción desconocida" }, 400);
    }
  } catch (error) {
    console.error("demo-admin error:", error);
    return json({ error: error instanceof Error ? error.message : "Error desconocido" }, 500);
  }
});
