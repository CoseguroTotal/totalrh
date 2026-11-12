import { describe, expect, it } from "vitest";
import { fechaHoraAR, firmante, leyendaFirma } from "@/lib/firmaPermiso";

describe("firma de permisos", () => {
  it("muestra la fecha y hora de Argentina", () => {
    // 17:30 UTC son las 14:30 en Argentina
    expect(fechaHoraAR("2026-11-12T17:30:00Z")).toBe("12/11/2026 14:30");
    expect(fechaHoraAR("cualquiera")).toBe("");
  });

  it("arma el firmante con el cargo si lo hay", () => {
    expect(firmante({ aprobado_nombre: " Ana Pérez ", aprobado_cargo: "Jefa de RRHH" })).toBe("Ana Pérez (Jefa de RRHH)");
    expect(firmante({ aprobado_nombre: "Ana Pérez", aprobado_cargo: "  " })).toBe("Ana Pérez");
    expect(firmante({ aprobado_nombre: null })).toBe("");
  });

  it("dice quién aprobó o rechazó y cuándo", () => {
    expect(leyendaFirma({ estado: "aprobada", aprobado_nombre: "Ana Pérez", aprobado_cargo: "Jefa de RRHH", aprobado_at: "2026-11-12T17:30:00Z" }))
      .toBe("Aprobado por Ana Pérez (Jefa de RRHH) el 12/11/2026 14:30");
    expect(leyendaFirma({ estado: "rechazada", aprobado_nombre: "Luis Gómez" })).toBe("Rechazado por Luis Gómez");
  });

  it("no muestra firma mientras está pendiente o si es una solicitud vieja sin firma", () => {
    expect(leyendaFirma({ estado: "pendiente", aprobado_nombre: "Ana" })).toBe("");
    expect(leyendaFirma({ estado: "aprobada", aprobado_nombre: null })).toBe("");
  });
});
