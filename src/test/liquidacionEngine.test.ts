import { describe, it, expect } from "vitest";
import { calcTotales, calcularLiquidacion, calcularSAC, conceptoAplica, redondear, type ConceptoCalc } from "@/lib/liquidacionEngine";

const c = (over: Partial<ConceptoCalc> & Pick<ConceptoCalc, "id" | "tipo">): ConceptoCalc => ({ nombre: over.id, ...over });

const jubilacion = c({ id: "jub", tipo: "deduccion", porcentaje: 11, base_calculo: "remunerativo_total" });
const obraSocial = c({ id: "os", tipo: "deduccion", porcentaje: 3, base_calculo: "remunerativo_total" });

describe("motor de liquidación", () => {
  it("liquida un recibo simple: básico menos 11 % y 3 %", () => {
    const lineas = calcularLiquidacion(1_000_000, [jubilacion, obraSocial]);
    const t = calcTotales(1_000_000, lineas);
    expect(t.totalDeducciones).toBe(140_000);
    expect(t.neto).toBe(860_000);
  });

  it("presentismo sobre total remunerativo usa el total, no el básico", () => {
    const antiguedad = c({ id: "ant", tipo: "remunerativo", porcentaje: 10 }); // 100.000
    const presentismo = c({ id: "pres", tipo: "remunerativo", porcentaje: 8.33, base_calculo: "remunerativo_total" });
    const lineas = calcularLiquidacion(1_000_000, [presentismo, antiguedad, jubilacion]);
    const pres = lineas.find((l) => l.concepto_id === "pres")!;
    expect(pres.base).toBe(1_100_000);
    expect(pres.monto).toBe(91_630);
    // La jubilación se aplica sobre el total, presentismo incluido
    const jub = lineas.find((l) => l.concepto_id === "jub")!;
    expect(jub.base).toBe(1_191_630);
    expect(jub.monto).toBe(131_079.3);
  });

  it("los no remunerativos no suman a la base de aportes", () => {
    const suma = c({ id: "nr", tipo: "no_remunerativo", monto_fijo: 50_000, base_calculo: "fijo" });
    const lineas = calcularLiquidacion(1_000_000, [suma, jubilacion]);
    expect(lineas.find((l) => l.concepto_id === "jub")!.monto).toBe(110_000);
    expect(calcTotales(1_000_000, lineas).neto).toBe(940_000);
  });

  it("respeta el tope de base imponible de los aportes", () => {
    const jubConTope = { ...jubilacion, tope_base: 2_500_000 };
    const lineas = calcularLiquidacion(4_000_000, [jubConTope]);
    const jub = lineas.find((l) => l.concepto_id === "jub")!;
    expect(jub.base).toBe(2_500_000);
    expect(jub.monto).toBe(275_000);
  });

  it("cantidad 0 no paga el concepto; vacía cuenta como 1", () => {
    const horas = c({ id: "hs", tipo: "remunerativo", monto_fijo: 5_000, base_calculo: "fijo", cantidad_default: 0 });
    const bono = c({ id: "bono", tipo: "remunerativo", monto_fijo: 5_000, base_calculo: "fijo", cantidad_default: null });
    const lineas = calcularLiquidacion(100_000, [horas, bono]);
    expect(lineas.find((l) => l.concepto_id === "hs")!.monto).toBe(0);
    expect(lineas.find((l) => l.concepto_id === "bono")!.monto).toBe(5_000);
  });

  it("concepto calculado sobre otro concepto", () => {
    const hsExtra = c({ id: "hx", tipo: "remunerativo", monto_fijo: 10_000, base_calculo: "fijo", cantidad_default: 3 });
    const recargo = c({ id: "rec", tipo: "remunerativo", porcentaje: 50, base_calculo: "monto_concepto", concepto_base_id: "hx" });
    const lineas = calcularLiquidacion(100_000, [hsExtra, recargo]);
    expect(lineas.find((l) => l.concepto_id === "rec")!.monto).toBe(15_000);
  });

  it("redondea a centavos", () => {
    const raro = c({ id: "r", tipo: "deduccion", porcentaje: 3.333 });
    const lineas = calcularLiquidacion(123_456.78, [raro]);
    expect(lineas[0].monto).toBe(4114.81);
    expect(redondear(0.1 + 0.2)).toBe(0.3);
  });

  it("básico en 0 no genera recibo", () => {
    expect(calcularLiquidacion(0, [jubilacion])).toEqual([]);
  });
});

describe("SAC", () => {
  it("es el 50 % de la mejor remuneración del semestre completo", () => {
    expect(calcularSAC(1_200_000)).toBe(600_000);
  });

  it("es proporcional a los días trabajados", () => {
    expect(calcularSAC(1_200_000, 91, 182)).toBe(300_000);
  });

  it("paga aportes: la jubilación se calcula también sobre el SAC", () => {
    const lineas = calcularLiquidacion(1_000_000, [jubilacion], true);
    const sac = lineas.find((l) => l.concepto_id === "__sac__")!;
    expect(sac.monto).toBe(500_000);
    expect(lineas.find((l) => l.concepto_id === "jub")!.monto).toBe(165_000);
  });

  it("usa la mejor remuneración informada cuando es mayor a la del mes", () => {
    const lineas = calcularLiquidacion(1_000_000, [], { mejorRemuneracion: 1_400_000 });
    expect(lineas.find((l) => l.concepto_id === "__sac__")!.monto).toBe(700_000);
  });
});

describe("conceptos por categoría o convenio", () => {
  const plusVendedor = c({ id: "pv", tipo: "remunerativo", porcentaje: 10, aplica_a: "categoria", aplica_valores: ["Vendedor B"] });
  const cuotaSindical = c({ id: "cs", tipo: "deduccion", porcentaje: 2, base_calculo: "remunerativo_total", aplica_a: "convenio", aplica_valores: ["130/75"] });
  const conceptos = [plusVendedor, cuotaSindical, jubilacion];
  const ids = (ls: ReturnType<typeof calcularLiquidacion>) => ls.map((l) => l.concepto_id).sort();

  it("liquida el concepto por categoría solo a esa categoría", () => {
    const vendedor = calcularLiquidacion(1_000_000, conceptos, false, { categoria: "Vendedor B", cct: "130/75" });
    expect(ids(vendedor)).toEqual(["cs", "jub", "pv"]);
    expect(vendedor.find((l) => l.concepto_id === "jub")!.base).toBe(1_100_000);

    const cajero = calcularLiquidacion(1_000_000, conceptos, false, { categoria: "Cajero A", cct: "130/75" });
    expect(ids(cajero)).toEqual(["cs", "jub"]);
    expect(cajero.find((l) => l.concepto_id === "jub")!.base).toBe(1_000_000);
  });

  it("liquida el concepto por convenio solo a ese CCT", () => {
    const fueraDeConvenio = calcularLiquidacion(1_000_000, conceptos, false, { categoria: "Vendedor B", cct: "260/75" });
    expect(ids(fueraDeConvenio)).toEqual(["jub", "pv"]);
  });

  it("sin categoría ni CCT del empleado solo aplican los conceptos para todos", () => {
    expect(ids(calcularLiquidacion(1_000_000, conceptos))).toEqual(["jub"]);
    expect(ids(calcularLiquidacion(1_000_000, conceptos, false, { categoria: null, cct: "" }))).toEqual(["jub"]);
  });

  it("compara sin distinguir mayúsculas ni espacios", () => {
    expect(conceptoAplica(plusVendedor, { categoria: "  vendedor b " })).toBe(true);
  });

  it("por categoría sin valores elegidos no aplica a nadie; aplica_a vacío equivale a todos", () => {
    expect(conceptoAplica(c({ id: "x", tipo: "remunerativo", aplica_a: "categoria", aplica_valores: [] }), { categoria: "Vendedor B" })).toBe(false);
    expect(conceptoAplica(c({ id: "y", tipo: "remunerativo", aplica_a: null }), {})).toBe(true);
  });

  it("un concepto sobre otro que no aplica se calcula sobre 0", () => {
    const recargo = c({ id: "rec", tipo: "remunerativo", porcentaje: 50, base_calculo: "monto_concepto", concepto_base_id: "pv" });
    const lineas = calcularLiquidacion(1_000_000, [plusVendedor, recargo], false, { categoria: "Cajero A" });
    expect(lineas.find((l) => l.concepto_id === "rec")!.monto).toBe(0);
  });
});
