import { describe, it, expect } from "vitest";
import { codigoVencido, expiraCodigo, debeBloquear, expiraCuenta, cuentaVencida } from "../../supabase/functions/_shared/demo-rules";

const t0 = new Date("2026-10-16T12:00:00Z");

describe("reglas de la demo", () => {
  it("un código de 15 minutos vence a los 15 minutos", () => {
    const exp = expiraCodigo(15, t0);
    expect(codigoVencido(exp, new Date(t0.getTime() + 14 * 60_000))).toBe(false);
    expect(codigoVencido(exp, new Date(t0.getTime() + 16 * 60_000))).toBe(true);
  });

  it("bloquea la IP al llegar a 10 fallos", () => {
    expect(debeBloquear(9, 10)).toBe(false);
    expect(debeBloquear(10, 10)).toBe(true);
  });

  it("las cuentas demo de 3 días vencen al cuarto día", () => {
    const exp = expiraCuenta(3, t0);
    expect(cuentaVencida(exp, new Date("2026-10-19T11:00:00Z"))).toBe(false);
    expect(cuentaVencida(exp, new Date("2026-10-19T13:00:00Z"))).toBe(true);
  });
});
