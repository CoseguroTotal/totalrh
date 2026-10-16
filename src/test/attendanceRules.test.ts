import { describe, it, expect } from "vitest";
import { puedeOperarTerminal, puedeRegistrarRostro } from "../../supabase/functions/_shared/attendance-rules";

const roles = (...r: string[]) => new Set(r);

describe("permisos de fichada", () => {
  it("sólo la terminal o un admin emiten QR y fichan por rostro", () => {
    expect(puedeOperarTerminal(roles("registro_asistencia"))).toBe(true);
    expect(puedeOperarTerminal(roles("admin"))).toBe(true);
    // Un empleado que emitiera su propio QR podría fichar desde su casa
    expect(puedeOperarTerminal(roles("empleado"))).toBe(false);
    expect(puedeOperarTerminal(roles("rrhh"))).toBe(false);
    expect(puedeOperarTerminal(roles())).toBe(false);
  });

  it("el rostro lo registra el propio empleado o RRHH/admin", () => {
    expect(puedeRegistrarRostro("u1", "u1", roles("empleado"))).toBe(true);
    expect(puedeRegistrarRostro("u1", "u2", roles("empleado"))).toBe(false);
    expect(puedeRegistrarRostro("u1", "u2", roles("rrhh"))).toBe(true);
    expect(puedeRegistrarRostro("u1", null, roles("admin"))).toBe(true);
    expect(puedeRegistrarRostro("u1", null, roles("gerente"))).toBe(false);
  });
});
