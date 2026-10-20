// Cálculos de asistencia (testeados en src/test/asistencia.test.ts).
import { fechaArgentina } from "../../supabase/functions/_shared/face-match";

export { fechaArgentina as hoyArgentina };

/** Día de la semana (0 = domingo) de una fecha "YYYY-MM-DD", sin el corrimiento de UTC. */
export function diaSemanaDeFecha(fecha: string) {
  const [y, m, d] = fecha.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

/** Último día del mes "YYYY-MM" como "YYYY-MM-DD" (febrero y meses de 30 días incluidos). */
/** Suma (o resta) días a una fecha "YYYY-MM-DD" sin pasar por la zona horaria. */
export function sumarDias(fecha: string, dias: number) {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
}

export function ultimoDiaDelMes(mes: string) {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m, 0).getDate();
  return `${mes}-${String(d).padStart(2, "0")}`;
}

export interface AsignacionTurno {
  empleado_id: string;
  dia_semana: number;
  hora_entrada: string;
  hora_salida: string;
  vigente_desde: string;
}

/** Horario asignado al empleado para esa fecha: el del día de la semana con vigencia más reciente. */
export function asignacionVigente(asignaciones: AsignacionTurno[], empleadoId: string, fecha: string) {
  const dia = diaSemanaDeFecha(fecha);
  return asignaciones
    .filter((a) => a.empleado_id === empleadoId && a.dia_semana === dia && a.vigente_desde.slice(0, 10) <= fecha)
    .sort((a, b) => (a.vigente_desde < b.vigente_desde ? 1 : -1))[0] ?? null;
}

/** Hora "HH:MM[:SS]" de una fecha en Argentina, como instante. */
export function instanteArgentina(fecha: string, hora: string) {
  return new Date(`${fecha}T${hora.slice(0, 5)}:00-03:00`);
}

/** Minutos de tardanza. Dentro de la tolerancia no cuenta; pasada la tolerancia cuenta desde la hora pactada. */
export function minutosTardanza(fecha: string, horaEntradaReal: string, horaPactada: string, toleranciaMin = 0) {
  const diff = Math.floor((new Date(horaEntradaReal).getTime() - instanteArgentina(fecha, horaPactada).getTime()) / 60000);
  return diff > toleranciaMin ? diff : 0;
}

/** Minutos trabajados después del horario de salida (si el turno termina después de medianoche, al día siguiente). */
export function minutosExtra(fecha: string, horaSalidaReal: string, horaEntradaPactada: string, horaSalidaPactada: string) {
  const salida = instanteArgentina(fecha, horaSalidaPactada);
  if (horaSalidaPactada.slice(0, 5) <= horaEntradaPactada.slice(0, 5)) salida.setDate(salida.getDate() + 1);
  const diff = Math.floor((new Date(horaSalidaReal).getTime() - salida.getTime()) / 60000);
  return diff > 0 ? diff : 0;
}

export const horaCorta = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export const ETIQUETA_METODO: Record<string, string> = { qr: "QR", facial: "Rostro", geo: "Ubicación", manual: "Manual" };
