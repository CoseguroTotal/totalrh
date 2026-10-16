export interface LineaCalc {
  concepto_id: string;
  descripcion: string;
  tipo: string;
  base: number;
  cantidad: number;
  unidad: string;
  monto: number;
  grupo: string;
  orden: number;
  es_haber: boolean;
}

export interface ConceptoCalc {
  id: string;
  nombre: string;
  tipo: string;
  base_calculo?: string | null;
  concepto_base_id?: string | null;
  porcentaje?: number | string | null;
  monto_fijo?: number | string | null;
  cantidad_default?: number | string | null;
  /** Base imponible máxima para descuentos (p. ej. tope de aportes de ARCA). Vacío = sin tope. */
  tope_base?: number | string | null;
  /** "todos" (o vacío), "categoria" o "convenio". */
  aplica_a?: string | null;
  /** Categorías o CCT a los que aplica cuando aplica_a no es "todos". */
  aplica_valores?: string[] | null;
  unidad?: string | null;
  grupo?: string | null;
  orden?: number | null;
}

export interface OpcionesSAC {
  /** Mejor remuneración mensual del semestre. Por defecto, la remuneración del período liquidado. */
  mejorRemuneracion?: number;
  /** Días trabajados en el semestre, para el SAC proporcional. Por defecto, el semestre completo. */
  diasTrabajados?: number;
  /** Días del semestre (181–184). */
  diasSemestre?: number;
}

/** Datos del empleado que deciden qué conceptos le corresponden. */
export interface EmpleadoCalc {
  categoria?: string | null;
  cct?: string | null;
}

/** Redondeo a centavos (evita arrastrar errores de punto flotante al recibo). */
export const redondear = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));

/** Cantidad del concepto: vacía = 1, pero 0 es un valor válido (concepto que no se paga este mes). */
const cantidadDe = (c: ConceptoCalc) => num(c.cantidad_default) ?? 1;

function montoConcepto(c: ConceptoCalc, base: number) {
  const cant = cantidadDe(c);
  const pct = num(c.porcentaje);
  const fijo = num(c.monto_fijo);
  let monto = 0;
  if (pct && c.base_calculo !== "fijo") monto += base * (pct / 100) * cant;
  if (fijo) monto += fijo * cant;
  return redondear(monto);
}

function linea(c: ConceptoCalc, base: number, monto: number, es_haber: boolean): LineaCalc {
  return {
    concepto_id: c.id, descripcion: c.nombre, tipo: c.tipo, base: redondear(base), cantidad: cantidadDe(c),
    unidad: c.unidad || "porcentaje", monto, grupo: c.grupo || "General", orden: c.orden || 0, es_haber,
  };
}

const normalizar = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();

/**
 * ¿El concepto le corresponde al empleado? "todos" aplica siempre; por categoría o convenio,
 * solo si la categoría / CCT del empleado está en aplica_valores (sin distinguir mayúsculas).
 */
export function conceptoAplica(c: ConceptoCalc, empleado: EmpleadoCalc = {}) {
  const modo = c.aplica_a || "todos";
  if (modo === "todos") return true;
  const valor = normalizar(modo === "categoria" ? empleado.categoria : modo === "convenio" ? empleado.cct : null);
  if (!valor) return false;
  return (c.aplica_valores ?? []).some((v) => normalizar(v) === valor);
}

/** SAC (medio aguinaldo, Ley 23.041): 50 % de la mejor remuneración mensual del semestre, proporcional a lo trabajado. */
export function calcularSAC(mejorRemuneracion: number, diasTrabajados = 182, diasSemestre = 182) {
  if (mejorRemuneracion <= 0 || diasSemestre <= 0) return 0;
  const proporcion = Math.min(Math.max(diasTrabajados, 0), diasSemestre) / diasSemestre;
  return redondear((mejorRemuneracion / 2) * proporcion);
}

/**
 * Calcula las líneas del recibo.
 * Orden: haberes sobre básico/fijo/otro concepto → haberes sobre total remunerativo → SAC → descuentos.
 * Así los descuentos (jubilación, obra social, etc.) se aplican también sobre el SAC.
 * Se omiten los conceptos por categoría o convenio que no le corresponden al empleado.
 */
export function calcularLiquidacion(
  basico: number,
  conceptosActivos: ConceptoCalc[],
  calcSAC: boolean | OpcionesSAC = false,
  empleado: EmpleadoCalc = {},
): LineaCalc[] {
  if (basico <= 0) return [];

  const results: LineaCalc[] = [];
  const montos = new Map<string, number>();
  const aplicables = conceptosActivos.filter((c) => conceptoAplica(c, empleado));
  const haberes = aplicables.filter((c) => c.tipo !== "deduccion");
  const deducciones = aplicables.filter((c) => c.tipo === "deduccion");

  const baseDe = (c: ConceptoCalc, totalRem: number) => {
    const bc = c.base_calculo || "basico";
    if (bc === "fijo") return 0;
    if (bc === "remunerativo_total") return totalRem;
    if (bc === "monto_concepto") return c.concepto_base_id ? montos.get(c.concepto_base_id) ?? 0 : 0;
    return basico;
  };

  // 1) Haberes que no dependen del total remunerativo
  let totalRem = basico;
  for (const c of haberes.filter((c) => c.base_calculo !== "remunerativo_total")) {
    const base = baseDe(c, totalRem);
    const monto = montoConcepto(c, base);
    montos.set(c.id, monto);
    if (c.tipo === "remunerativo") totalRem += monto;
    results.push(linea(c, base, monto, true));
  }

  // 2) Haberes sobre el total remunerativo (p. ej. presentismo): la base excluye a estos mismos conceptos
  const baseRemParcial = totalRem;
  for (const c of haberes.filter((c) => c.base_calculo === "remunerativo_total")) {
    const monto = montoConcepto(c, baseRemParcial);
    montos.set(c.id, monto);
    if (c.tipo === "remunerativo") totalRem += monto;
    results.push(linea(c, baseRemParcial, monto, true));
  }

  // 3) SAC: es remunerativo, así que suma a la base de los aportes
  if (calcSAC) {
    const op = typeof calcSAC === "object" ? calcSAC : {};
    const mejor = op.mejorRemuneracion ?? totalRem;
    const sac = calcularSAC(mejor, op.diasTrabajados ?? op.diasSemestre ?? 182, op.diasSemestre ?? 182);
    results.push({
      concepto_id: "__sac__", descripcion: "SAC (medio aguinaldo)", tipo: "remunerativo", base: redondear(mejor),
      cantidad: 1, unidad: "porcentaje", monto: sac, grupo: "SAC", orden: 9999, es_haber: true,
    });
    totalRem += sac;
  }

  // 4) Descuentos, con tope de base imponible si el concepto lo define
  for (const c of deducciones) {
    let base = baseDe(c, totalRem);
    const tope = num(c.tope_base);
    if (tope && tope > 0) base = Math.min(base, tope);
    const monto = montoConcepto(c, base);
    montos.set(c.id, monto);
    results.push(linea(c, base, monto, false));
  }

  return results;
}

export function calcTotales(basico: number, lineas: LineaCalc[]) {
  const suma = (ls: LineaCalc[]) => redondear(ls.reduce((s, l) => s + l.monto, 0));
  const totalHaberes = redondear(basico + suma(lineas.filter((l) => l.es_haber)));
  const totalDeducciones = suma(lineas.filter((l) => !l.es_haber));
  const totalRem = redondear(basico + suma(lineas.filter((l) => l.tipo === "remunerativo")));
  const totalNoRem = suma(lineas.filter((l) => l.tipo === "no_remunerativo"));
  const neto = redondear(totalHaberes - totalDeducciones);
  return { totalHaberes, totalDeducciones, totalRem, totalNoRem, neto };
}
