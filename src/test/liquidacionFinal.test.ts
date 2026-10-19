import { describe, it, expect } from "vitest";
import { antiguedad, calcularLiquidacionFinal, diasVacacionesLCT, mesesPreaviso, type DatosEgreso } from "@/lib/liquidacionFinal";

const base: DatosEgreso = {
  causa: "despido_sin_causa",
  fechaIngreso: "2020-03-01",
  fechaEgreso: "2026-10-15",
  mejorRemuneracion: 1_000_000,
  remuneracionMensual: 1_000_000,
  diasVacacionesAnuales: 21,
  diasVacacionesGozados: 0,
  preavisoOtorgado: false,
};
const linea = (r: ReturnType<typeof calcularLiquidacionFinal>, inicio: string) => r.lineas.find((l) => l.concepto.startsWith(inicio));

describe("antigüedad y preaviso", () => {
  it("cuenta la fracción mayor de 3 meses como año (art. 245)", () => {
    expect(antiguedad("2020-03-01", "2026-10-15")).toMatchObject({ anios: 6, meses: 7, aniosComputables: 7 });
    expect(antiguedad("2024-01-01", "2026-03-31")).toMatchObject({ anios: 2, meses: 3, aniosComputables: 2 });
    expect(antiguedad("2026-08-01", "2026-09-15")).toMatchObject({ aniosComputables: 1 }); // mínimo un mes
  });

  it("preaviso según antigüedad (art. 231)", () => {
    expect(mesesPreaviso("2026-08-01", "2026-10-15")).toBe(0.5); // período de prueba
    expect(mesesPreaviso("2023-01-01", "2026-10-15")).toBe(1);
    expect(mesesPreaviso("2020-03-01", "2026-10-15")).toBe(2);
  });
});

describe("liquidación final", () => {
  it("despido sin causa: antigüedad, preaviso, integración y proporcionales", () => {
    const r = calcularLiquidacionFinal(base);
    expect(linea(r, "Indemnización por antigüedad")!.importe).toBe(7_000_000);
    expect(linea(r, "Indemnización sustitutiva de preaviso")!.importe).toBe(2_000_000);
    expect(linea(r, "SAC sobre preaviso")!.importe).toBeCloseTo(166_666.67, 1);
    expect(linea(r, "Integración del mes")!.importe).toBe(533_333.33); // 16 días de octubre
    expect(linea(r, "Días trabajados")!.importe).toBe(500_000);
    // Aportes sólo sobre días trabajados y SAC
    expect(r.aportes).toBe(Math.round(r.totalRemunerativo * 0.17 * 100) / 100);
    expect(r.neto).toBeCloseTo(r.totalRemunerativo + r.totalIndemnizatorio - r.aportes, 2);
  });

  it("con preaviso otorgado no paga preaviso ni integración", () => {
    const r = calcularLiquidacionFinal({ ...base, preavisoOtorgado: true });
    expect(linea(r, "Indemnización sustitutiva")).toBeUndefined();
    expect(linea(r, "Integración")).toBeUndefined();
  });

  it("renuncia: sin indemnizaciones", () => {
    const r = calcularLiquidacionFinal({ ...base, causa: "renuncia" });
    expect(linea(r, "Indemnización")).toBeUndefined();
    expect(linea(r, "Vacaciones no gozadas")).toBeDefined();
    expect(linea(r, "SAC proporcional")).toBeDefined();
  });

  it("fallecimiento y fuerza mayor pagan el 50 % de antigüedad", () => {
    expect(linea(calcularLiquidacionFinal({ ...base, causa: "fallecimiento" }), "Indemnización por antigüedad")!.importe).toBe(3_500_000);
    expect(linea(calcularLiquidacionFinal({ ...base, causa: "fuerza_mayor" }), "Indemnización por antigüedad")!.importe).toBe(3_500_000);
  });

  it("tope de convenio con piso Vizzoti del 67 %", () => {
    const r = calcularLiquidacionFinal({ ...base, topeConvenio: 500_000 });
    expect(linea(r, "Indemnización por antigüedad")!.importe).toBe(7 * 670_000);
    const r2 = calcularLiquidacionFinal({ ...base, topeConvenio: 800_000 });
    expect(linea(r2, "Indemnización por antigüedad")!.importe).toBe(7 * 800_000);
  });

  it("vacaciones proporcionales: días del año × trabajado / 365, día = remuneración / 25", () => {
    const r = calcularLiquidacionFinal({ ...base, causa: "renuncia", diasVacacionesGozados: 5 });
    // 1/1 al 15/10 = 288 días → 21 × 288/365 = 16,57 − 5 = 11,57 días × 40.000
    expect(linea(r, "Vacaciones no gozadas")!.importe).toBeCloseTo(11.57 * 40_000, -2);
  });

  it("SAC proporcional del segundo semestre", () => {
    const r = calcularLiquidacionFinal({ ...base, causa: "renuncia" });
    // 1/7 al 15/10 = 107 de 184 días
    expect(linea(r, "SAC proporcional")!.importe).toBeCloseTo(500_000 * 107 / 184, 1);
  });

  it("período de prueba: sin antigüedad, preaviso de 15 días", () => {
    const r = calcularLiquidacionFinal({ ...base, causa: "periodo_prueba", fechaIngreso: "2026-08-01" });
    expect(linea(r, "Indemnización por antigüedad")).toBeUndefined();
    expect(linea(r, "Indemnización sustitutiva de preaviso (15 días)")!.importe).toBe(500_000);
  });
});

describe("vacaciones según antigüedad (art. 150)", () => {
  it("14, 21, 28 o 35 días según años al 31/12", () => {
    expect(diasVacacionesLCT("2024-03-01", 2026)).toBe(14);
    expect(diasVacacionesLCT("2021-06-01", 2026)).toBe(21);
    expect(diasVacacionesLCT("2014-01-01", 2026)).toBe(28);
    expect(diasVacacionesLCT("2000-01-01", 2026)).toBe(35);
  });
});
