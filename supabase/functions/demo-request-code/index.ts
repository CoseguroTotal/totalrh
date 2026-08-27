import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPERADMIN_EMAIL = "mcponce.torres@gmail.com";
const REPLY_TO = "info@skystudio.ar";
const APP_URL = "https://totalrh.com.ar";

const DEMO_USERS: { rol: string; email: string; detalle: string }[] = [
  { rol: "Administrador", email: "admin@demototalrh.com", detalle: "Acceso total: configuración, usuarios y todos los módulos." },
  { rol: "RRHH", email: "rrhh@demototalrh.com", detalle: "Legajos, memorándums, asistencia, vacaciones y liquidación." },
  { rol: "Gerente", email: "gerente@demototalrh.com", detalle: "Tableros, reportes y aprobaciones de su equipo." },
  { rol: "Contador", email: "contador@demototalrh.com", detalle: "Liquidación de sueldos, reportes y legajos (sin memorándums)." },
  { rol: "Empleado", email: "empleado@demototalrh.com", detalle: "Autogestión móvil: fichado por QR, recibos y solicitudes." },
  { rol: "Terminal de fichado", email: "terminal@demototalrh.com", detalle: "Pantalla de sucursal que muestra el QR dinámico." },
];
const DEMO_PASSWORD = "TotalRH2026!";

async function sha256(value: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => null);
    if (!body) return json({ error: "Solicitud inválida" }, 400);

    const nombre = String(body.nombre ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const empresa = body.empresa ? String(body.empresa).trim().slice(0, 120) : null;
    const telefono = body.telefono ? String(body.telefono).trim().slice(0, 40) : null;

    if (!nombre || nombre.length > 120) return json({ error: "Ingresá tu nombre" }, 400);
    if (!EMAIL_RE.test(email) || email.length > 255) return json({ error: "Email inválido" }, 400);

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

    // Upsert lead
    const { data: existing } = await admin
      .from("demo_leads")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    let leadId = existing?.id as string | undefined;
    if (leadId) {
      await admin.from("demo_leads").update({ nombre, empresa, telefono, ultimo_ip: ip }).eq("id", leadId);
    } else {
      const { data: inserted, error: insErr } = await admin
        .from("demo_leads")
        .insert({ nombre, email, empresa, telefono, ultimo_ip: ip })
        .select("id")
        .single();
      if (insErr) throw insErr;
      leadId = inserted.id;
    }

    // Rate limit: max 3 códigos en los últimos 15 minutos
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("demo_codigos")
      .select("id", { count: "exact", head: true })
      .eq("lead_id", leadId)
      .gte("created_at", since);

    if ((count ?? 0) >= 3) {
      return json({ error: "Demasiados intentos. Esperá unos minutos e intentá de nuevo." }, 429);
    }

    const codigo = String(Math.floor(100000 + Math.random() * 900000));
    const expira = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await admin.from("demo_codigos").insert({
      lead_id: leadId,
      codigo_hash: await sha256(codigo),
      expira_at: expira,
    });

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY no está configurada");

    const { data: config } = await admin
      .from("configuracion_grupo")
      .select("email_remitente, nombre_grupo")
      .limit(1)
      .maybeSingle();

    const remitente = config?.email_remitente || "no-reply@totalrh.com.ar";
    const from = `TotalRH <${remitente}>`;

    const filas = DEMO_USERS.map(
      (u) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #eef2f3;font-size:13px;color:#28353a">
            <strong>${u.rol}</strong><br />
            <span style="color:#7d8f96;font-size:11px">${u.detalle}</span>
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #eef2f3;font-size:13px;color:#28353a;white-space:nowrap">${u.email}</td>
        </tr>`
    ).join("");

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;background:#f5f7f8;padding:32px">
        <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e3e8ea">
          <div style="background:linear-gradient(135deg,#26A69A,#4FC3F7);padding:24px 28px;color:#ffffff">
            <h1 style="margin:0;font-size:20px">TotalRH — Acceso a la demo</h1>
          </div>
          <div style="padding:28px">
            <p style="font-size:15px;color:#28353a;margin:0 0 16px">Hola ${nombre},</p>
            <p style="font-size:15px;color:#28353a;margin:0 0 20px">Este es tu código de acceso para probar la demo de TotalRH:</p>
            <div style="text-align:center;margin:24px 0">
              <span style="display:inline-block;font-size:34px;letter-spacing:10px;font-weight:bold;color:#26A69A;background:#e8f6f5;padding:16px 24px;border-radius:12px">${codigo}</span>
            </div>
            <p style="font-size:13px;color:#61737a;margin:0 0 24px">El código vence en 15 minutos y puede usarse una sola vez.</p>

            <h2 style="font-size:15px;color:#28353a;margin:0 0 6px">Usuarios de prueba por rol</h2>
            <p style="font-size:13px;color:#61737a;margin:0 0 12px">
              Después de ingresar el código vas a la pantalla de inicio de sesión. Podés entrar con cualquiera de estos perfiles:
            </p>
            <table style="width:100%;border-collapse:collapse;border:1px solid #eef2f3;border-radius:10px">
              ${filas}
            </table>
            <p style="font-size:13px;color:#28353a;margin:14px 0 0">
              Contraseña para todos los usuarios: <strong style="color:#26A69A">${DEMO_PASSWORD}</strong>
            </p>
            <p style="font-size:12px;color:#8b9ba1;margin:14px 0 0">
              Son credenciales compartidas de demostración y todos los datos que vas a ver son ficticios.
              Sistema: <a href="${APP_URL}" style="color:#26A69A">${APP_URL.replace("https://", "")}</a>
            </p>
            <p style="font-size:13px;color:#61737a;margin:20px 0 0">Si no solicitaste este acceso, podés ignorar este mensaje.</p>
          </div>
          <div style="background:#f5f7f8;padding:16px 28px;font-size:11px;color:#8b9ba1;text-align:center">
            TotalRH - Gestión de Personal. Sky Studio 2026 todos los derechos reservados.
          </div>
        </div>
      </div>`;

    const text = [
      `Hola ${nombre},`,
      "",
      `Tu código de acceso a la demo de TotalRH es: ${codigo}`,
      "Vence en 15 minutos y puede usarse una sola vez.",
      "",
      "Usuarios de prueba por rol:",
      ...DEMO_USERS.map((u) => `- ${u.rol}: ${u.email} (${u.detalle})`),
      `Contraseña para todos: ${DEMO_PASSWORD}`,
      "",
      `Sistema: ${APP_URL}`,
      "",
      "Si no solicitaste este acceso, podés ignorar este mensaje.",
      "TotalRH - Gestión de Personal. Sky Studio 2026 todos los derechos reservados.",
    ].join("\n");

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [email],
        reply_to: REPLY_TO,
        subject: "Tu código de acceso a la demo de TotalRH",
        html,
        text,
      }),
    });

    const resendBody = await resendRes.text();

    if (!resendRes.ok) {
      console.error(`Resend error [${resendRes.status}]: ${resendBody}`);
      await admin
        .from("demo_leads")
        .update({
          ultimo_email_estado: `error ${resendRes.status}`,
          ultimo_email_at: new Date().toISOString(),
        })
        .eq("id", leadId);
      return json({ error: "No pudimos enviar el email. Verificá la dirección." }, 502);
    }

    let resendId: string | null = null;
    try {
      resendId = JSON.parse(resendBody)?.id ?? null;
    } catch (_) { /* ignore */ }
    console.log(`Resend aceptado para ${email} — id: ${resendId}`);

    await admin
      .from("demo_leads")
      .update({
        ultimo_email_id: resendId,
        ultimo_email_estado: "aceptado",
        ultimo_email_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    // Aviso al superadmin (no bloqueante)
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [SUPERADMIN_EMAIL],
          reply_to: REPLY_TO,
          subject: `Nueva solicitud de demo: ${nombre}`,
          html: `<p><strong>${nombre}</strong> solicitó acceso a la demo.</p>
                 <ul><li>Email: ${email}</li><li>Empresa: ${empresa ?? "-"}</li><li>Teléfono: ${telefono ?? "-"}</li></ul>`,
          text: `${nombre} solicitó acceso a la demo.\nEmail: ${email}\nEmpresa: ${empresa ?? "-"}\nTeléfono: ${telefono ?? "-"}`,
        }),
      });
    } catch (_) { /* no crítico */ }

    return json({ success: true, emailId: resendId });
  } catch (error) {
    console.error("demo-request-code error:", error);
    return json({ error: error instanceof Error ? error.message : "Error desconocido" }, 500);
  }
});
