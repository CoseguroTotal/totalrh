import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, bloquear, checkBloqueo, corsHeaders, evaluarIp, getConfig, getIp, json, logIntento, sha256 } from "../_shared/demo-security.ts";
import { codigoVencido, debeBloquear } from "../_shared/demo-rules.ts";
import { enviarCredenciales, provisionarCuentas } from "../_shared/demo-accounts.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = adminClient();
    const cfg = await getConfig(admin);
    const ip = getIp(req);

    const body = await req.json().catch(() => null);
    const email = String(body?.email ?? "").trim().toLowerCase();
    const codigo = String(body?.codigo ?? "").trim();
    if (!email || !/^\d{6}$/.test(codigo)) return json({ error: "Código inválido" }, 400);

    const bloqueado = await checkBloqueo(admin, [`ip:${ip}`, `email:${email}`]);
    if (bloqueado) {
      await logIntento(admin, ip, email, "verificacion", "bloqueado");
      return bloqueado;
    }

    const fallo = async (msg: string, status = 400) => {
      await logIntento(admin, ip, email, "verificacion", "fallido");
      const b = await evaluarIp(admin, ip, "verificacion", "fallido", cfg.demo_max_fallos_ip_hora, cfg, "Exceso de códigos fallidos");
      return b ?? json({ error: msg }, status);
    };

    const { data: lead } = await admin.from("demo_leads").select("id, nombre, accesos").eq("email", email).maybeSingle();
    if (!lead) return fallo("No encontramos una solicitud para ese email", 404);

    const { data: registro } = await admin.from("demo_codigos")
      .select("id, codigo_hash, expira_at, intentos").eq("lead_id", lead.id).eq("consumido", false)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    if (!registro) return fallo("Pedí un código nuevo");
    if (codigoVencido(registro.expira_at)) return fallo("El código venció. Pedí uno nuevo.");
    if (debeBloquear(registro.intentos, cfg.demo_max_intentos_codigo)) {
      const hasta = await bloquear(admin, `email:${email}`, cfg.demo_bloqueo_minutos, "Código con demasiados fallos");
      await logIntento(admin, ip, email, "verificacion", "bloqueado");
      return json({ error: `Demasiados intentos fallidos. Intentá de nuevo en ${cfg.demo_bloqueo_minutos} min.`, retryAt: hasta }, 429);
    }

    if (registro.codigo_hash !== (await sha256(codigo))) {
      await admin.from("demo_codigos").update({ intentos: registro.intentos + 1 }).eq("id", registro.id);
      return fallo("Código incorrecto");
    }

    await admin.from("demo_codigos").update({ consumido: true, consumido_at: new Date().toISOString() }).eq("id", registro.id);

    const { creds, expira } = await provisionarCuentas(admin, lead.id, lead.nombre, cfg.demo_acceso_dias);
    let emailEstado = "credenciales enviadas";
    try {
      await enviarCredenciales(cfg.email_remitente, email, lead.nombre, creds, expira);
    } catch (e) {
      console.error("envío de credenciales:", e);
      emailEstado = "error credenciales";
    }

    await admin.from("demo_leads").update({
      verificado: true, accesos: (lead.accesos ?? 0) + 1, ultimo_acceso: new Date().toISOString(),
      ultimo_email_estado: emailEstado, ultimo_email_at: new Date().toISOString(),
    }).eq("id", lead.id);
    await logIntento(admin, ip, email, "verificacion", "ok");

    return json({ success: true, expiresAt: new Date(expira).getTime(), credencialesEnviadas: emailEstado === "credenciales enviadas" });
  } catch (error) {
    console.error("demo-verify-code error:", error);
    return json({ error: error instanceof Error ? error.message : "Error desconocido" }, 500);
  }
});
