// Reglas puras de fichada (testeadas desde src/test/attendanceRules.test.ts).
// Se usan en la edge function validate-attendance-token y en la app.

/** Emitir QR y fichar por rostro: sólo la terminal de asistencia o un admin. */
export function puedeOperarTerminal(roles: Set<string>) {
  return roles.has("registro_asistencia") || roles.has("admin");
}

/** Verificar en persona un rostro registrado desde el celular: RRHH o admin. */
export function puedeVerificarRostro(roles: Set<string>) {
  return roles.has("admin") || roles.has("rrhh");
}

/** Si RRHH/admin registra el rostro de otra persona lo hace en persona: queda verificado. */
export function registroQuedaVerificado(callerId: string, empleadoUserId: string | null, roles: Set<string>) {
  return puedeVerificarRostro(roles) && empleadoUserId !== callerId;
}

/** Registrar el rostro: el propio empleado, o RRHH/admin para cualquier legajo. */
export function puedeRegistrarRostro(callerId: string, empleadoUserId: string | null, roles: Set<string>) {
  if (empleadoUserId && empleadoUserId === callerId) return true;
  return roles.has("admin") || roles.has("rrhh");
}

/* ─────────────── Entrada o salida ─────────────── */

/** Una entrada sin salida se cierra si no pasaron más de estas horas (cubre turnos noche). */
export const HORAS_MAX_JORNADA = 16;
/** No se vuelve a fichar dentro de este lapso (evita dobles marcas). */
export const SEGUNDOS_ENTRE_MARCAS = 60;

export interface UltimaFichada {
  id: string;
  hora_entrada: string | null;
  hora_salida: string | null;
}

export type DecisionFichada =
  | { accion: "salida"; fichadaId: string }
  | { accion: "entrada" }
  | { accion: "repetida"; tipo: "entrada" | "salida"; hora: string };

/**
 * Decide qué registrar a partir de la última fichada del empleado (de cualquier día).
 * - Si fichó hace menos de un minuto: es una marca repetida.
 * - Si tiene una entrada abierta de las últimas 16 h: es la salida (aunque haya cambiado el día).
 * - Si no: es una entrada nueva (una entrada abierta más vieja queda sin salida, para que RRHH la revise).
 */
export function decidirFichada(ultima: UltimaFichada | null, ahora: Date): DecisionFichada {
  if (!ultima) return { accion: "entrada" };
  const ultimaMarca = ultima.hora_salida ?? ultima.hora_entrada;
  if (ultimaMarca && ahora.getTime() - new Date(ultimaMarca).getTime() < SEGUNDOS_ENTRE_MARCAS * 1000) {
    return { accion: "repetida", tipo: ultima.hora_salida ? "salida" : "entrada", hora: ultimaMarca };
  }
  if (!ultima.hora_salida && ultima.hora_entrada) {
    const horas = (ahora.getTime() - new Date(ultima.hora_entrada).getTime()) / 3_600_000;
    if (horas >= 0 && horas <= HORAS_MAX_JORNADA) return { accion: "salida", fichadaId: ultima.id };
  }
  return { accion: "entrada" };
}

/* ─────────────── Geocerca ─────────────── */

/** Precisión mínima aceptable del GPS (metros). Con peor señal se pide reintentar. */
export const PRECISION_MAXIMA_M = 150;
/** Cuánto de la imprecisión del GPS se le perdona al empleado (metros). */
export const TOLERANCIA_PRECISION_M = 50;

export interface Ubicacion { latitud: number; longitud: number; precision: number }
export interface Geocerca { latitud: number | null; longitud: number | null; radio_metros: number | null }

/** Distancia en metros entre dos puntos (fórmula de haversine). */
export function distanciaMetros(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6_371_000;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function esUbicacionValida(u: unknown): u is Ubicacion {
  if (!u || typeof u !== "object") return false;
  const { latitud, longitud, precision } = u as Record<string, unknown>;
  return typeof latitud === "number" && typeof longitud === "number" && typeof precision === "number"
    && Math.abs(latitud) <= 90 && Math.abs(longitud) <= 180 && precision >= 0 && Number.isFinite(precision);
}

export type ResultadoGeocerca =
  | { ok: true; distancia: number }
  | { ok: false; motivo: "sin_geocerca" | "imprecisa" | "fuera"; distancia?: number; radio?: number };

export function evaluarGeocerca(u: Ubicacion, g: Geocerca): ResultadoGeocerca {
  if (g.latitud == null || g.longitud == null || !g.radio_metros) return { ok: false, motivo: "sin_geocerca" };
  if (u.precision > PRECISION_MAXIMA_M) return { ok: false, motivo: "imprecisa" };
  const distancia = Math.round(distanciaMetros(u.latitud, u.longitud, g.latitud, g.longitud));
  const margen = Math.min(u.precision, TOLERANCIA_PRECISION_M);
  if (distancia - margen > g.radio_metros) return { ok: false, motivo: "fuera", distancia, radio: g.radio_metros };
  return { ok: true, distancia };
}
