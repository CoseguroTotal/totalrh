// Liquidación final por egreso según la Ley de Contrato de Trabajo (testeado en src/test/liquidacionFinal.test.ts).
// Es una estimación para RRHH: los topes del art. 245 dependen del convenio y deben cargarse a mano,
// y conviene validar cada caso con el contador o el asesor legal.
import { redondear } from "@/lib/liquidacionEngine";

export type CausaEgreso =
  | "despido_sin_causa"
  | "despido_con_causa"
  | "renuncia"
  | "mutuo_acuerdo"
  | "periodo_prueba"
  | "fuerza_mayor"
  | "fallecimiento"
  | "jubilacion";

export const CAUSAS: Record<CausaEgreso, { label: string; ayuda: string }> = {
  despido_sin_causa: { label: "Despido sin causa", ayuda: "Indemnización por antigüedad, preaviso e integración del mes (arts. 231, 232, 233 y 245 LCT)" },
  despido_con_causa: { label: "Despido con justa causa", ayuda: "Sin indemnización: días trabajados, SAC y vacaciones proporcionales" },
  renuncia: { label: "Renuncia", ayuda: "Días trabajados, SAC y vacaciones proporcionales (art. 240 LCT)" },
  mutuo_acuerdo: { label: "Mutuo acuerdo", ayuda: "Rubros de ley; la gratificación pactada se suma aparte (art. 241 LCT)" },
  periodo_prueba: { label: "Fin del período de prueba", ayuda: "Sin indemnización por antigüedad; preaviso de 15 días si no se otorgó (art. 92 bis LCT)" },
  fuerza_mayor: { label: "Fuerza mayor o falta de trabajo", ayuda: "50 % de la indemnización por antigüedad (art. 247 LCT) más preaviso" },
  fallecimiento: { label: "Fallecimiento del trabajador", ayuda: "50 % de la indemnización por antigüedad a los derechohabientes (art. 248 LCT)" },
  jubilacion: { label: "Jubilación", ayuda: "Sin indemnización: días trabajados, SAC y vacaciones proporcionales (art. 252 LCT)" },
};

export interface DatosEgreso {
  causa: CausaEgreso;
  fechaIngreso: string; // YYYY-MM-DD
  fechaEgreso: string; // YYYY-MM-DD (último día trabajado)
  /** Mejor remuneración mensual, normal y habitual del último año (art. 245). */
  mejorRemuneracion: number;
  /** Remuneración del mes del egreso (para días trabajados y valor día). */
  remuneracionMensual: number;
  /** Mejor remuneración del semestre en curso (para el SAC). */
  mejorRemuneracionSemestre?: number;
  /** Días de vacaciones que le corresponden por año según antigüedad (14, 21, 28 o 35, o los del convenio). */
  diasVacacionesAnuales: number;
  /** Días de vacaciones del año del egreso ya gozados. */
  diasVacacionesGozados: number;
  /** Si el empleador otorgó el preaviso (trabajado). */
  preavisoOtorgado: boolean;
  /** Tope del art. 245: 3 veces el promedio de remuneraciones del convenio. Vacío = sin tope. */
  topeConvenio?: number | null;
  /** Período de prueba en meses (6 por defecto, Ley 27.742). */
  mesesPrueba?: number;
  /** Aportes del trabajador sobre conceptos remunerativos (jubilación 11 + ley 19.032 3 + obra social 3). */
  porcentajeAportes?: number;
}

export interface LineaFinal {
  concepto: string;
  base: string;
  importe: number;
  remunerativo: boolean;
  fundamento: string;
}

export interface ResultadoFinal {
  lineas: LineaFinal[];
  antiguedad: { anios: number; meses: number; dias: number; aniosComputables: number };
  totalRemunerativo: number;
  totalIndemnizatorio: number;
  aportes: number;
  neto: number;
  avisos: string[];
}

const fecha = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
const diasEntre = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86_400_000);

/** Años, meses y días entre dos fechas (inclusive del último día). */
export function antiguedad(ingreso: string, egreso: string) {
  const a = fecha(ingreso);
  const b = fecha(egreso);
  b.setDate(b.getDate() + 1);
  let anios = b.getFullYear() - a.getFullYear();
  let meses = b.getMonth() - a.getMonth();
  let dias = b.getDate() - a.getDate();
  if (dias < 0) { meses--; dias += new Date(b.getFullYear(), b.getMonth(), 0).getDate(); }
  if (meses < 0) { anios--; meses += 12; }
  // Art. 245: un mes por año de servicio o fracción mayor de 3 meses
  const aniosComputables = Math.max(1, anios + (meses > 3 || (meses === 3 && dias > 0) ? 1 : 0));
  return { anios, meses, dias, aniosComputables };
}

/** Meses de preaviso (art. 231): 15 días en período de prueba, 1 mes hasta 5 años, 2 meses desde 5 años. */
export function mesesPreaviso(ingreso: string, egreso: string, mesesPrueba = 6) {
  const ant = antiguedad(ingreso, egreso);
  const totalMeses = ant.anios * 12 + ant.meses;
  if (totalMeses < mesesPrueba) return 0.5;
  return ant.anios >= 5 ? 2 : 1;
}

export function calcularLiquidacionFinal(d: DatosEgreso): ResultadoFinal {
  const lineas: LineaFinal[] = [];
  const avisos: string[] = [];
  const egreso = fecha(d.fechaEgreso);
  const ingreso = fecha(d.fechaIngreso);
  const ant = antiguedad(d.fechaIngreso, d.fechaEgreso);
  const valorDia30 = d.remuneracionMensual / 30;
  const add = (l: Omit<LineaFinal, "importe"> & { importe: number }) => { if (l.importe > 0) lineas.push({ ...l, importe: redondear(l.importe) }); };

  // 1) Días trabajados del mes del egreso
  const diasMes = egreso.getDate();
  add({ concepto: `Días trabajados del mes (${diasMes})`, base: `${diasMes} × remuneración / 30`, importe: valorDia30 * diasMes, remunerativo: true, fundamento: "Art. 103 LCT" });

  // 2) SAC proporcional del semestre
  const inicioSemestre = new Date(egreso.getFullYear(), egreso.getMonth() < 6 ? 0 : 6, 1);
  const desdeSac = ingreso > inicioSemestre ? ingreso : inicioSemestre;
  const finSemestre = new Date(egreso.getFullYear(), egreso.getMonth() < 6 ? 5 : 11, egreso.getMonth() < 6 ? 30 : 31);
  const diasSemestre = diasEntre(inicioSemestre, finSemestre) + 1;
  const diasTrabSemestre = diasEntre(desdeSac, egreso) + 1;
  const mejorSem = d.mejorRemuneracionSemestre ?? d.mejorRemuneracion;
  add({ concepto: "SAC proporcional", base: `${diasTrabSemestre} de ${diasSemestre} días del semestre`, importe: (mejorSem / 2) * (diasTrabSemestre / diasSemestre), remunerativo: true, fundamento: "Art. 123 LCT" });

  // 3) Vacaciones no gozadas proporcionales y su SAC
  const inicioAnio = new Date(egreso.getFullYear(), 0, 1);
  const desdeVac = ingreso > inicioAnio ? ingreso : inicioAnio;
  const diasTrabAnio = diasEntre(desdeVac, egreso) + 1;
  const diasVacProp = Math.max(0, d.diasVacacionesAnuales * (diasTrabAnio / 365) - d.diasVacacionesGozados);
  const valorDiaVac = d.remuneracionMensual / 25;
  const vac = diasVacProp * valorDiaVac;
  add({ concepto: `Vacaciones no gozadas (${diasVacProp.toFixed(2)} días)`, base: `${d.diasVacacionesAnuales} días × ${diasTrabAnio}/365 − ${d.diasVacacionesGozados} gozados; día = remuneración / 25`, importe: vac, remunerativo: false, fundamento: "Arts. 155 y 156 LCT" });
  add({ concepto: "SAC sobre vacaciones no gozadas", base: "1/12 de las vacaciones no gozadas", importe: vac / 12, remunerativo: false, fundamento: "Art. 121 LCT" });

  // 4) Indemnización por antigüedad (art. 245) con tope de convenio y piso Vizzoti (67 %)
  const pagaAntiguedad = d.causa === "despido_sin_causa" || d.causa === "fuerza_mayor" || d.causa === "fallecimiento";
  if (pagaAntiguedad) {
    let base = d.mejorRemuneracion;
    if (d.topeConvenio && d.topeConvenio > 0 && d.topeConvenio < base) {
      base = Math.max(d.topeConvenio, d.mejorRemuneracion * 0.67);
      avisos.push(base > d.topeConvenio
        ? "Se aplicó el piso del fallo Vizzoti: la base no puede ser menor al 67 % de la mejor remuneración."
        : "Se aplicó el tope del convenio a la base de la indemnización.");
    }
    const factor = d.causa === "despido_sin_causa" ? 1 : 0.5;
    add({
      concepto: `Indemnización por antigüedad${factor < 1 ? " (50 %)" : ""}`,
      base: `${ant.aniosComputables} ${ant.aniosComputables === 1 ? "año" : "años"} × $ ${redondear(base).toLocaleString("es-AR")}${factor < 1 ? " × 50 %" : ""}`,
      importe: ant.aniosComputables * base * factor,
      remunerativo: false,
      fundamento: d.causa === "despido_sin_causa" ? "Art. 245 LCT" : d.causa === "fuerza_mayor" ? "Art. 247 LCT" : "Art. 248 LCT",
    });
  }

  // 5) Preaviso omitido e integración del mes de despido
  const pagaPreaviso = (d.causa === "despido_sin_causa" || d.causa === "fuerza_mayor" || d.causa === "periodo_prueba") && !d.preavisoOtorgado;
  if (d.causa === "periodo_prueba" && mesesPreaviso(d.fechaIngreso, d.fechaEgreso, d.mesesPrueba) > 0.5) {
    avisos.push("Por la antigüedad ya no está en período de prueba: corresponde tratarlo como despido sin causa.");
  }
  if (pagaPreaviso) {
    const meses = d.causa === "periodo_prueba" ? 0.5 : mesesPreaviso(d.fechaIngreso, d.fechaEgreso, d.mesesPrueba);
    const preaviso = d.remuneracionMensual * meses;
    add({ concepto: `Indemnización sustitutiva de preaviso (${meses === 0.5 ? "15 días" : `${meses} ${meses === 1 ? "mes" : "meses"}`})`, base: "Remuneración mensual", importe: preaviso, remunerativo: false, fundamento: "Arts. 231 y 232 LCT" });
    add({ concepto: "SAC sobre preaviso", base: "1/12 del preaviso", importe: preaviso / 12, remunerativo: false, fundamento: "Art. 121 LCT" });

    if (d.causa !== "periodo_prueba") {
      const ultimoDiaMes = new Date(egreso.getFullYear(), egreso.getMonth() + 1, 0).getDate();
      const diasIntegracion = ultimoDiaMes - egreso.getDate();
      if (diasIntegracion > 0) {
        const integ = valorDia30 * diasIntegracion;
        add({ concepto: `Integración del mes de despido (${diasIntegracion} días)`, base: `${diasIntegracion} × remuneración / 30`, importe: integ, remunerativo: false, fundamento: "Art. 233 LCT" });
        add({ concepto: "SAC sobre integración", base: "1/12 de la integración", importe: integ / 12, remunerativo: false, fundamento: "Art. 121 LCT" });
      }
    }
  }

  if (d.causa === "mutuo_acuerdo") avisos.push("Si se pactó una gratificación por cese, sumala aparte: no está incluida.");
  if (d.causa === "despido_sin_causa") avisos.push("No incluye multas ni agravantes por falta o deficiencia de registración: revisalo con el asesor legal.");

  const totalRemunerativo = redondear(lineas.filter((l) => l.remunerativo).reduce((s, l) => s + l.importe, 0));
  const totalIndemnizatorio = redondear(lineas.filter((l) => !l.remunerativo).reduce((s, l) => s + l.importe, 0));
  // Las indemnizaciones no llevan aportes (art. 7 Ley 24.241): sólo días trabajados y SAC
  const aportes = redondear(totalRemunerativo * ((d.porcentajeAportes ?? 17) / 100));
  return {
    lineas,
    antiguedad: ant,
    totalRemunerativo,
    totalIndemnizatorio,
    aportes,
    neto: redondear(totalRemunerativo + totalIndemnizatorio - aportes),
    avisos,
  };
}

/**
 * Días de vacaciones anuales según el art. 150 LCT (antigüedad al 31/12 del año):
 * hasta 5 años 14 días, de 5 a 10 años 21, de 10 a 20 años 28 y más de 20 años 35.
 */
export function diasVacacionesLCT(fechaIngreso: string, anio: number) {
  const ant = antiguedad(fechaIngreso, `${anio}-12-31`);
  if (ant.anios < 5) return 14;
  if (ant.anios < 10) return 21;
  if (ant.anios < 20) return 28;
  return 35;
}
