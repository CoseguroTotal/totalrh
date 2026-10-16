import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, checkBloqueo, corsHeaders, evaluarIp, getConfig, getIp, json, logIntento, sha256 } from "../_shared/demo-security.ts";
import { expiraCodigo } from "../_shared/demo-rules.ts";
import { REPLY_TO } from "../_shared/demo-accounts.ts";

const SUPERADMIN_EMAIL = "mcponce.torres@gmail.com";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = adminClient();
    const cfg = await getConfig(admin);
    const ip = getIp(req);

    const body = await req.json().catch(() => null);
    if (!body) return json({ error: "Solicitud inválida" }, 400);

    const nombre = String(body.nombre ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const empresa = body.empresa ? String(body.empresa).trim().slice(0, 120) : null;
    const telefono = body.telefono ? String(body.telefono).trim().slice(0, 40) : null;

    if (!nombre || nombre.length > 120) return json({ error: "Ingresá tu nombre" }, 400);
    if (!EMAIL_RE.test(email) || email.length > 255) return json({ error: "Email inválido" }, 400);

    const bloqueado = await checkBloqueo(admin, [`ip:${ip}`, `email:${email}`]);
    if (bloqueado) {
      await logIntento(admin, ip, email, "solicitud", "bloqueado");
      return bloqueado;
    }
    const excesoIp = await evaluarIp(admin, ip, "solicitud", null, cfg.demo_max_solicitudes_ip_hora, cfg, "Exceso de solicitudes de código");
    if (excesoIp) {
      await logIntento(admin, ip, email, "solicitud", "bloqueado");
      return excesoIp;
    }

    const { data: existing } = await admin.from("demo_leads").select("id").eq("email", email).maybeSingle();
    let leadId = existing?.id as string | undefined;
    if (leadId) {
      await admin.from("demo_leads").update({ nombre, empresa, telefono, ultimo_ip: ip }).eq("id", leadId);
    } else {
      const { data: inserted, error: insErr } = await admin
        .from("demo_leads").insert({ nombre, email, empresa, telefono, ultimo_ip: ip }).select("id").single();
      if (insErr) throw insErr;
      leadId = inserted.id;
    }

    // Máx 3 códigos por email en los últimos 15 minutos
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count } = await admin.from("demo_codigos").select("id", { count: "exact", head: true })
      .eq("lead_id", leadId).gte("created_at", since);
    if ((count ?? 0) >= 3) {
      await logIntento(admin, ip, email, "solicitud", "limite_email");
      return json({ error: "Demasiados códigos pedidos. Esperá unos minutos e intentá de nuevo." }, 429);
    }

    const codigo = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
    await admin.from("demo_codigos").insert({
      lead_id: leadId, codigo_hash: await sha256(codigo), expira_at: expiraCodigo(cfg.demo_codigo_minutos).toISOString(),
    });

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY no está configurada");
    const from = `TotalRH <${cfg.email_remitente || "no-reply@totalrh.com.ar"}>`;

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;background:#f5f7f8;padding:32px">
        <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e3e8ea">
          <div style="background:linear-gradient(135deg,#26A69A,#4FC3F7);padding:24px 28px;color:#fff"><h1 style="margin:0;font-size:20px">TotalRH — Código de acceso</h1></div>
          <div style="padding:28px">
            <p style="font-size:15px;color:#28353a;margin:0 0 16px">Hola ${nombre},</p>
            <p style="font-size:15px;color:#28353a;margin:0 0 20px">Este es tu código para acceder a la demo de TotalRH:</p>
            <div style="text-align:center;margin:24px 0"><span style="display:inline-block;font-size:34px;letter-spacing:10px;font-weight:bold;color:#26A69A;background:#e8f6f5;padding:16px 24px;border-radius:12px">${codigo}</span></div>
            <p style="font-size:13px;color:#61737a;margin:0 0 12px">Vence en ${cfg.demo_codigo_minutos} minutos y puede usarse una sola vez.</p>
            <p style="font-size:13px;color:#61737a;margin:0">Al validarlo te enviaremos un segundo email con tus usuarios y contraseñas personales para cada perfil.</p>
            <p style="font-size:13px;color:#61737a;margin:20px 0 0">Si no solicitaste este acceso, ignorá este mensaje.</p>
          </div>
          <div style="background:#f5f7f8;padding:16px 28px;font-size:11px;color:#8b9ba1;text-align:center">TotalRH - Gestión de Personal. Sky Studio 2026 todos los derechos reservados.</div>
        </div>
      </div>`;
    const text = `Hola ${nombre},\n\nTu código de acceso a la demo de TotalRH es: ${codigo}\nVence en ${cfg.demo_codigo_minutos} minutos.\nAl validarlo recibirás tus usuarios personales por email.`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [email], reply_to: REPLY_TO, subject: "Tu código de acceso a la demo de TotalRH", html, text }),
    });
    const resendBody = await resendRes.text();

    if (!resendRes.ok) {
      console.error(`Resend error [${resendRes.status}]: ${resendBody}`);
      await admin.from("demo_leads").update({ ultimo_email_estado: `error ${resendRes.status}`, ultimo_email_at: new Date().toISOString() }).eq("id", leadId);
      await logIntento(admin, ip, email, "solicitud", "error_email");
      return json({ error: "No pudimos enviar el email. Verificá la dirección." }, 502);
    }

    let resendId: string | null = null;
    try { resendId = JSON.parse(resendBody)?.id ?? null; } catch (_) { /* ignore */ }
    await admin.from("demo_leads").update({ ultimo_email_id: resendId, ultimo_email_estado: "aceptado", ultimo_email_at: new Date().toISOString() }).eq("id", leadId);
    await logIntento(admin, ip, email, "solicitud", "ok");

    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from, to: [SUPERADMIN_EMAIL], reply_to: REPLY_TO, subject: `Nueva solicitud de demo: ${nombre}`,
          text: `${nombre} solicitó acceso a la demo.\nEmail: ${email}\nEmpresa: ${empresa ?? "-"}\nTeléfono: ${telefono ?? "-"}\nIP: ${ip}`,
        }),
      });
    } catch (_) { /* no crítico */ }

    return json({ success: true, emailId: resendId, minutos: cfg.demo_codigo_minutos });
  } catch (error) {
    console.error("demo-request-code error:", error);
    return json({ error: error instanceof Error ? error.message : "Error desconocido" }, 500);
  }
});
