import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, checkBloqueo, corsHeaders, evaluarIp, getConfig, getIp, json, logIntento, sha256, soloEnDemo } from "../_shared/demo-security.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const fueraDeDemo = soloEnDemo();
  if (fueraDeDemo) return fueraDeDemo;
  try {
    const admin = adminClient();
    const cfg = await getConfig(admin);
    const ip = getIp(req);
    const body = await req.json().catch(() => null);
    const codigo = String(body?.codigo ?? "").trim().toUpperCase();
    if (!/^[A-Z0-9]{8}$/.test(codigo)) return json({ error: "El código de presentación tiene 8 caracteres" }, 400);

    const bloqueado = await checkBloqueo(admin, [`ip:${ip}`]);
    if (bloqueado) {
      await logIntento(admin, ip, null, "maestro", "bloqueado");
      return bloqueado;
    }

    const { data: m } = await admin.from("demo_codigo_maestro").select("*")
      .eq("codigo_hash", await sha256(codigo)).eq("activo", true).gt("expira_at", new Date().toISOString()).maybeSingle();

    if (!m) {
      await logIntento(admin, ip, null, "maestro", "fallido");
      const b = await evaluarIp(admin, ip, "maestro", "fallido", cfg.demo_max_fallos_ip_hora, cfg, "Exceso de códigos de presentación fallidos");
      return b ?? json({ error: "Código de presentación inválido o vencido" }, 400);
    }

    await admin.from("demo_codigo_maestro").update({ usos: m.usos + 1 }).eq("id", m.id);
    await logIntento(admin, ip, null, "maestro", "ok");
    return json({ success: true, expiresAt: Date.now() + 12 * 60 * 60 * 1000 });
  } catch (error) {
    console.error("demo-master-code error:", error);
    return json({ error: error instanceof Error ? error.message : "Error desconocido" }, 500);
  }
});
