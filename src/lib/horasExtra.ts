// Horas extra según la Ley de Contrato de Trabajo (testeado en src/test/horasExtra.test.ts).
//
// - Art. 201 LCT: recargo del 50 % en días comunes y del 100 % los sábados después de las 13 h,
//   domingos y feriados.
// - Decreto 484/2000: máximo 3 h extra por día, 30 h por mes y 200 h por año.
import { diaSemanaDeFecha, instanteArgentina } from "@/lib/asistencia";

export const TOPE_DIARIO_MIN = 3 * 60;
export const TOPE_MENSUAL_MIN = 30 * 60;
export const TOPE_ANUAL_MIN = 200 * 60;

export interface ExtrasDia { al50: number; al100: number }

/** Minutos entre dos instantes, nunca negativo. */
const minutos = (desde: Date, hasta: Date) => Math.max(0, Math.floor((hasta.getTime() - desde.getTime()) / 60000));

/**
 * Clasifica los minutos extra de una jornada.
 * @param fecha Día de la fichada ("YYYY-MM-DD").
 * @param entradaReal / salidaReal Instantes reales (ISO).
 * @param horario Horario pactado del día, o null si ese día no le tocaba trabajar.
 * @param esFeriado Si la fecha es feriado nacional o asueto.
 * @param minimo Minutos de cortesía: por debajo no se cuenta extra.
 */
export function clasificarExtras(
  fecha: string,
  entradaReal: string,
  salidaReal: string,
  horario: { hora_entrada: string; hora_salida: string } | null,
  esFeriado: boolean,
  minimo = 0
): ExtrasDia {
  const dia = diaSemanaDeFecha(fecha);
  const entrada = new Date(entradaReal);
  const salida = new Date(salidaReal);

  // Día no laborable para el empleado (sin horario), domingo o feriado: todo lo trabajado es extra
  if (!horario || esFeriado || dia === 0) {
    const total = minutos(entrada, salida);
    if (total < minimo) return { al50: 0, al100: 0 };
    if (esFeriado || dia === 0) return { al50: 0, al100: total };
    if (dia === 6) return dividirSabado(fecha, entrada, salida);
    return { al50: total, al100: 0 };
  }

  // Día laboral: extra = después de la salida pactada (el turno puede terminar al día siguiente)
  const salidaPactada = instanteArgentina(fecha, horario.hora_salida);
  if (horario.hora_salida.slice(0, 5) <= horario.hora_entrada.slice(0, 5)) salidaPactada.setDate(salidaPactada.getDate() + 1);
  const extra = minutos(salidaPactada, salida);
  if (extra < minimo || extra === 0) return { al50: 0, al100: 0 };
  if (dia === 6) return dividirSabado(fecha, salidaPactada > entrada ? salidaPactada : entrada, salida);
  return { al50: extra, al100: 0 };
}

/** Sábado: lo trabajado antes de las 13 h va al 50 %, lo posterior al 100 %. */
function dividirSabado(fecha: string, desde: Date, hasta: Date): ExtrasDia {
  const trece = instanteArgentina(fecha, "13:00");
  const antes = minutos(desde, hasta < trece ? hasta : trece);
  const despues = minutos(desde > trece ? desde : trece, hasta);
  return { al50: antes, al100: despues };
}

export interface ResumenExtras {
  al50: number;
  al100: number;
  total: number;
  diasSobreTopeDiario: string[];
  superaMensual: boolean;
}

export function resumirExtras(dias: { fecha: string; extras: ExtrasDia }[]): ResumenExtras {
  let al50 = 0, al100 = 0;
  const diasSobreTopeDiario: string[] = [];
  for (const d of dias) {
    al50 += d.extras.al50;
    al100 += d.extras.al100;
    if (d.extras.al50 + d.extras.al100 > TOPE_DIARIO_MIN) diasSobreTopeDiario.push(d.fecha);
  }
  return { al50, al100, total: al50 + al100, diasSobreTopeDiario, superaMensual: al50 + al100 > TOPE_MENSUAL_MIN };
}

/** Importe estimado: valor hora = remuneración / divisor; recargo 50 % o 100 %. */
export function importeExtras(remuneracionMensual: number, divisor: number, r: Pick<ResumenExtras, "al50" | "al100">) {
  const valorHora = divisor > 0 ? remuneracionMensual / divisor : 0;
  const i50 = (r.al50 / 60) * valorHora * 1.5;
  const i100 = (r.al100 / 60) * valorHora * 2;
  return { valorHora, i50: Math.round(i50 * 100) / 100, i100: Math.round(i100 * 100) / 100 };
}

export const hhmm = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;
