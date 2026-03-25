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

export function calcularLiquidacion(basico: number, conceptosActivos: any[], calcSAC = false): LineaCalc[] {
  if (basico <= 0) return [];

  const results: LineaCalc[] = [];
  const conceptoMontos = new Map<string, number>();
  conceptoMontos.set("__basico__", basico);
  let totalRem = basico;

  // Haberes
  for (const c of conceptosActivos.filter((c: any) => c.tipo !== "deduccion")) {
    let base = basico;
    const bc = c.base_calculo || "basico";
    if (bc === "fijo") base = 0;
    else if (bc === "monto_concepto" && c.concepto_base_id) base = conceptoMontos.get(c.concepto_base_id) || 0;

    let monto = 0;
    const cant = c.cantidad_default || 1;
    if (c.porcentaje && bc !== "fijo") monto = base * (Number(c.porcentaje) / 100) * cant;
    if (c.monto_fijo) monto += Number(c.monto_fijo) * cant;

    conceptoMontos.set(c.id, monto);
    if (c.tipo === "remunerativo") totalRem += monto;

    results.push({ concepto_id: c.id, descripcion: c.nombre, tipo: c.tipo, base, cantidad: cant, unidad: c.unidad || "porcentaje", monto, grupo: c.grupo || "General", orden: c.orden || 0, es_haber: true });
  }

  // Resolve remunerativo_total
  for (const r of results) {
    const c = conceptosActivos.find((ac: any) => ac.id === r.concepto_id);
    if (c?.base_calculo === "remunerativo_total") {
      r.base = totalRem;
      const cant = c.cantidad_default || 1;
      let monto = 0;
      if (c.porcentaje) monto = totalRem * (Number(c.porcentaje) / 100) * cant;
      if (c.monto_fijo) monto += Number(c.monto_fijo) * cant;
      r.monto = monto;
      conceptoMontos.set(c.id, monto);
    }
  }

  // Deducciones
  for (const c of conceptosActivos.filter((c: any) => c.tipo === "deduccion")) {
    let base = basico;
    const bc = c.base_calculo || "basico";
    if (bc === "remunerativo_total") base = totalRem;
    else if (bc === "fijo") base = 0;
    else if (bc === "monto_concepto" && c.concepto_base_id) base = conceptoMontos.get(c.concepto_base_id) || 0;

    const cant = c.cantidad_default || 1;
    let monto = 0;
    if (c.porcentaje) monto = base * (Number(c.porcentaje) / 100) * cant;
    if (c.monto_fijo) monto += Number(c.monto_fijo) * cant;
    conceptoMontos.set(c.id, monto);

    results.push({ concepto_id: c.id, descripcion: c.nombre, tipo: c.tipo, base, cantidad: cant, unidad: c.unidad || "porcentaje", monto, grupo: c.grupo || "General", orden: c.orden || 0, es_haber: false });
  }

  if (calcSAC) {
    results.push({ concepto_id: "__sac__", descripcion: "SAC Proporcional (1/12)", tipo: "remunerativo", base: totalRem, cantidad: 1, unidad: "porcentaje", monto: totalRem / 12, grupo: "SAC", orden: 9999, es_haber: true });
  }

  return results;
}

export function calcTotales(basico: number, lineas: LineaCalc[]) {
  const totalHaberes = basico + lineas.filter(l => l.es_haber).reduce((s, l) => s + l.monto, 0);
  const totalDeducciones = lineas.filter(l => !l.es_haber).reduce((s, l) => s + l.monto, 0);
  const totalRem = basico + lineas.filter(l => l.tipo === "remunerativo").reduce((s, l) => s + l.monto, 0);
  const totalNoRem = lineas.filter(l => l.tipo === "no_remunerativo").reduce((s, l) => s + l.monto, 0);
  const neto = totalHaberes - totalDeducciones;
  return { totalHaberes, totalDeducciones, totalRem, totalNoRem, neto };
}
