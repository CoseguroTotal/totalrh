// Reglas puras de permisos de fichada (testeadas desde src/test/attendanceRules.test.ts).

/** Emitir QR y fichar por rostro: sólo la terminal de asistencia o un admin. */
export function puedeOperarTerminal(roles: Set<string>) {
  return roles.has("registro_asistencia") || roles.has("admin");
}

/** Registrar el rostro: el propio empleado, o RRHH/admin para cualquier legajo. */
export function puedeRegistrarRostro(callerId: string, empleadoUserId: string | null, roles: Set<string>) {
  if (empleadoUserId && empleadoUserId === callerId) return true;
  return roles.has("admin") || roles.has("rrhh");
}
