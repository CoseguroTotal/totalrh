import { authenticateCronRequest } from "../_shared/cron-auth.ts";
import { adminClient } from "../_shared/demo-security.ts";

Deno.serve(async (request) => {
  const authFailure = authenticateCronRequest(request);
  if (authFailure) return authFailure;

  const admin = adminClient();
  const { data: vencidas } = await admin.from("demo_cuentas").select("*").lt("expira_at", new Date().toISOString()).limit(300);
  let borradas = 0;
  for (const c of vencidas ?? []) {
    try {
      if (c.empleado_id) {
        for (const t of ["fichadas", "qr_sesiones", "tokens_consumidos", "tokens_asistencia", "solicitudes_vacaciones", "solicitudes_permiso"]) {
          const col = t === "qr_sesiones" ? "consumido_por" : "empleado_id";
          await admin.from(t).delete().eq(col, c.empleado_id);
        }
        await admin.from("empleados").delete().eq("id", c.empleado_id);
      }
      await admin.auth.admin.deleteUser(c.user_id);
      await admin.from("demo_cuentas").delete().eq("id", c.id);
      borradas++;
    } catch (e) {
      console.error("cleanup", c.email, e);
    }
  }
  // Limpieza de auditoría antigua (90 días) y bloqueos vencidos
  await admin.from("demo_intentos").delete().lt("created_at", new Date(Date.now() - 90 * 86400000).toISOString());
  await admin.from("demo_bloqueos").delete().lt("hasta", new Date().toISOString());
  return Response.json({ success: true, borradas });
});
