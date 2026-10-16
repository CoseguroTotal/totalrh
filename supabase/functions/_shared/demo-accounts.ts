import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { expiraCuenta } from "./demo-rules.ts";

export const REPLY_TO = "info@skystudio.ar";
export const APP_URL = "https://totalrh.com.ar";
const DEMO_EMPRESA = "11111111-1111-4111-8111-111111111111";
const DEMO_SUCURSAL = "22222222-2222-4222-8222-222222222221";

export const ROLES: { rol: string; key: string; detalle: string }[] = [
  { rol: "Administrador", key: "admin", detalle: "Acceso total: configuración, usuarios y todos los módulos." },
  { rol: "RRHH", key: "rrhh", detalle: "Legajos, memorándums, asistencia, vacaciones y liquidación." },
  { rol: "Gerente", key: "gerente", detalle: "Tableros, reportes y aprobaciones de su equipo." },
  { rol: "Contador", key: "contador", detalle: "Liquidación de sueldos, reportes y legajos (sin memorándums)." },
  { rol: "Empleado", key: "empleado", detalle: "Autogestión móvil: fichado por QR, recibos y solicitudes." },
  { rol: "Terminal de fichado", key: "registro_asistencia", detalle: "Pantalla de sucursal que muestra el QR dinámico." },
];

function randomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("") + "!7";
}

export interface Credencial { rol: string; detalle: string; email: string; password: string }

export async function provisionarCuentas(admin: SupabaseClient, leadId: string, nombre: string, dias: number) {
  const sufijo = leadId.replace(/-/g, "").slice(0, 6);
  const expira = expiraCuenta(dias).toISOString();
  const { data: existentes } = await admin.from("demo_cuentas").select("*").eq("lead_id", leadId);
  const creds: Credencial[] = [];

  for (const r of ROLES) {
    const email = `${r.key === "registro_asistencia" ? "terminal" : r.key}.${sufijo}@demototalrh.com`;
    const password = randomPassword();
    const prev = existentes?.find((c) => c.rol === r.key);
    let userId = prev?.user_id as string | undefined;

    if (userId) {
      const { error } = await admin.auth.admin.updateUserById(userId, { password, ban_duration: "none" });
      if (error) userId = undefined;
    }
    if (!userId) {
      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { demo: true } });
      if (error || !data.user) {
        // Puede existir de una cuenta anterior sin registro: buscar y actualizar
        const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const u = list?.users.find((x) => x.email === email);
        if (!u) throw new Error(`No se pudo crear ${email}: ${error?.message}`);
        await admin.auth.admin.updateUserById(u.id, { password });
        userId = u.id;
      } else userId = data.user.id;
      await admin.from("user_roles").upsert({ user_id: userId, role: r.key }, { onConflict: "user_id,role" });
    }

    let empleadoId = prev?.empleado_id ?? null;
    if (r.key === "empleado" && !empleadoId) {
      const [nom, ...ape] = nombre.split(" ");
      const { data: emp } = await admin.from("empleados").insert({
        legajo: `D-${sufijo}`, nombre: nom || "Demo", apellido: ape.join(" ") || "Demo",
        dni: "00000000", cuil: "20-00000000-0", puesto: "Empleado demo",
        empresa_id: DEMO_EMPRESA, sucursal_id: DEMO_SUCURSAL, fecha_ingreso: new Date().toISOString().slice(0, 10),
        email, user_id: userId,
      }).select("id").single();
      empleadoId = emp?.id ?? null;
    }

    await admin.from("demo_cuentas").upsert(
      { lead_id: leadId, rol: r.key, user_id: userId, email, empleado_id: empleadoId, expira_at: expira },
      { onConflict: "lead_id,rol" },
    );
    creds.push({ rol: r.rol, detalle: r.detalle, email, password });
  }
  return { creds, expira };
}

export async function enviarCredenciales(remitente: string | null, to: string, nombre: string, creds: Credencial[], expira: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("RESEND_API_KEY no está configurada");
  const vence = new Date(expira).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "short", timeStyle: "short" });
  const filas = creds.map((c) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #eef2f3;font-size:13px;color:#28353a"><strong>${c.rol}</strong><br/><span style="color:#7d8f96;font-size:11px">${c.detalle}</span></td>
      <td style="padding:10px 12px;border-bottom:1px solid #eef2f3;font-size:12px;color:#28353a">${c.email}<br/><strong style="color:#26A69A;font-family:monospace">${c.password}</strong></td>
    </tr>`).join("");
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#f5f7f8;padding:32px">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e3e8ea">
      <div style="background:linear-gradient(135deg,#26A69A,#4FC3F7);padding:24px 28px;color:#fff"><h1 style="margin:0;font-size:20px">TotalRH — Tus accesos a la demo</h1></div>
      <div style="padding:28px">
        <p style="font-size:15px;color:#28353a;margin:0 0 12px">Hola ${nombre},</p>
        <p style="font-size:14px;color:#28353a;margin:0 0 16px">Creamos usuarios personales para que pruebes cada perfil del sistema. Son exclusivos para vos y vencen el <strong>${vence}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;border:1px solid #eef2f3">${filas}</table>
        <p style="font-size:13px;margin:18px 0 0"><a href="${APP_URL}/login" style="color:#26A69A">Ingresar a la demo</a></p>
        <p style="font-size:12px;color:#8b9ba1;margin:14px 0 0">Los datos que vas a ver son ficticios. No compartas estas credenciales.</p>
      </div>
      <div style="background:#f5f7f8;padding:16px 28px;font-size:11px;color:#8b9ba1;text-align:center">TotalRH - Gestión de Personal. Sky Studio 2026 todos los derechos reservados.</div>
    </div>
  </div>`;
  const text = [`Hola ${nombre},`, "", `Tus accesos personales a la demo de TotalRH (vencen ${vence}):`,
    ...creds.map((c) => `- ${c.rol}: ${c.email} / ${c.password}`), "", `${APP_URL}/login`].join("\n");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `TotalRH <${remitente || "no-reply@totalrh.com.ar"}>`, to: [to], reply_to: REPLY_TO,
      subject: "Tus usuarios de acceso a la demo de TotalRH", html, text,
    }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Resend [${res.status}]: ${body}`);
  try { return JSON.parse(body)?.id ?? null; } catch { return null; }
}
