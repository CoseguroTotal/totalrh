import { describe, it, expect } from "vitest";
import { asignacionVigente, diaSemanaDeFecha, minutosExtra, minutosTardanza, ultimoDiaDelMes } from "@/lib/asistencia";
import { plazoPresentacion } from "@/components/AdjuntosPermiso";

describe("asistencia", () => {
  it("el día de la semana no se corre por UTC", () => {
    expect(diaSemanaDeFecha("2026-10-19")).toBe(1); // lunes
    expect(diaSemanaDeFecha("2026-10-18")).toBe(0); // domingo
  });

  it("último día del mes, incluido febrero", () => {
    expect(ultimoDiaDelMes("2026-02")).toBe("2026-02-28");
    expect(ultimoDiaDelMes("2028-02")).toBe("2028-02-29");
    expect(ultimoDiaDelMes("2026-04")).toBe("2026-04-30");
    expect(ultimoDiaDelMes("2026-10")).toBe("2026-10-31");
  });

  it("usa el horario vigente más reciente del día de la semana", () => {
    const asig = [
      { empleado_id: "e", dia_semana: 1, hora_entrada: "08:00", hora_salida: "16:00", vigente_desde: "2026-01-01" },
      { empleado_id: "e", dia_semana: 1, hora_entrada: "09:00", hora_salida: "17:00", vigente_desde: "2026-10-01" },
      { empleado_id: "e", dia_semana: 1, hora_entrada: "10:00", hora_salida: "18:00", vigente_desde: "2026-11-01" },
      { empleado_id: "e", dia_semana: 2, hora_entrada: "07:00", hora_salida: "15:00", vigente_desde: "2026-01-01" },
    ];
    expect(asignacionVigente(asig, "e", "2026-10-19")?.hora_entrada).toBe("09:00");
    expect(asignacionVigente(asig, "e", "2026-09-28")?.hora_entrada).toBe("08:00");
    expect(asignacionVigente(asig, "otro", "2026-10-19")).toBeNull();
  });

  it("tardanza respeta la tolerancia", () => {
    // Pactado 08:00 AR = 11:00 UTC
    expect(minutosTardanza("2026-10-19", "2026-10-19T11:04:00Z", "08:00", 5)).toBe(0);
    expect(minutosTardanza("2026-10-19", "2026-10-19T11:12:00Z", "08:00", 5)).toBe(12);
    expect(minutosTardanza("2026-10-19", "2026-10-19T10:50:00Z", "08:00", 5)).toBe(0);
  });

  it("horas extra, también en turnos que cruzan la medianoche", () => {
    expect(minutosExtra("2026-10-19", "2026-10-19T19:30:00Z", "08:00", "16:00")).toBe(30);
    // Turno 22 a 06: sale 06:45 del día siguiente
    expect(minutosExtra("2026-10-19", "2026-10-20T09:45:00Z", "22:00", "06:00")).toBe(45);
  });
});

describe("plazo para presentar el original", () => {
  it("de lunes a jueves vence al día siguiente a la misma hora", () => {
    const p = plazoPresentacion(new Date(2026, 9, 19, 10, 30)); // lunes
    expect([p.getDate(), p.getHours(), p.getMinutes()]).toEqual([20, 10, 30]);
  });

  it("el viernes vence el lunes", () => {
    const p = plazoPresentacion(new Date(2026, 9, 23, 15, 0)); // viernes
    expect([p.getDay(), p.getDate(), p.getHours()]).toEqual([1, 26, 15]);
  });

  it("el fin de semana vence el lunes a las 23:59", () => {
    const sab = plazoPresentacion(new Date(2026, 9, 24, 11, 0));
    const dom = plazoPresentacion(new Date(2026, 9, 25, 20, 0));
    expect([sab.getDate(), sab.getHours(), sab.getMinutes()]).toEqual([26, 23, 59]);
    expect([dom.getDate(), dom.getHours()]).toEqual([26, 23]);
  });
});
