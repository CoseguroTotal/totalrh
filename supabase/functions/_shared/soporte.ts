// Cuenta del administrador maestro: atiende el soporte en todas las instalaciones.
// La usan la app (src/hooks/useSoporte.ts) y las edge functions.
export const SOPORTE_EMAIL = "mcponce.torres@gmail.com";

export const esEmailSoporte = (email: string | null | undefined) => (email ?? "").trim().toLowerCase() === SOPORTE_EMAIL;

/** Roles que pueden mandar emails a cualquier destinatario (memorándums, avisos de RRHH). */
export const ROLES_EMAIL_LIBRE = ["admin", "rrhh", "gerente", "usuario", "contador"];
export const MAX_DESTINATARIOS = 50;

/**
 * Quién puede mandar un email y a quién: gestión a cualquiera (con tope de destinatarios);
 * el resto del personal sólo al soporte (botón de Ayuda).
 */
export function destinatariosPermitidos(roles: Set<string>, destinatarios: string[]) {
  if (destinatarios.length === 0) return { ok: false, error: "Falta el destinatario" } as const;
  if (destinatarios.length > MAX_DESTINATARIOS) return { ok: false, error: `Máximo ${MAX_DESTINATARIOS} destinatarios por envío` } as const;
  if (ROLES_EMAIL_LIBRE.some((r) => roles.has(r))) return { ok: true } as const;
  if (destinatarios.every(esEmailSoporte)) return { ok: true } as const;
  return { ok: false, error: "Tu usuario sólo puede escribirle al soporte" } as const;
}
