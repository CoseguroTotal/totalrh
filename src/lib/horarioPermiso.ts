/** Horario de un permiso de salida: hora en que sale y hora en que vuelve ("HH:MM"). */
export interface HorarioPermiso {
  hora_salida?: string | null;
  hora_reintegro?: string | null;
}

/** "10:00:00" o " 10:00 " → "10:00"; vacío → "". */
export const horaCorta = (h?: string | null) => (h ?? "").trim().slice(0, 5);

/** Para listas: "Sale 10:00 · Vuelve 12:00". */
export function textoHorario(h: HorarioPermiso) {
  const sale = horaCorta(h.hora_salida);
  const vuelve = horaCorta(h.hora_reintegro);
  return [sale && `Sale ${sale} hs`, vuelve && `Vuelve ${vuelve} hs`].filter(Boolean).join(" · ");
}

/** Para el PDF: ", saliendo a horas 10:00 y reintegrándose a horas 12:00". */
export function fraseHorario(h: HorarioPermiso) {
  const sale = horaCorta(h.hora_salida);
  const vuelve = horaCorta(h.hora_reintegro);
  if (sale && vuelve) return `, saliendo a horas ${sale} y reintegrándose a horas ${vuelve}`;
  if (sale) return `, saliendo a horas ${sale}`;
  if (vuelve) return `, reintegrándose a horas ${vuelve}`;
  return "";
}

/** Un permiso de un solo día con las dos horas tiene que volver después de salir. */
export function errorHorario(fechaDesde: string, fechaHasta: string, h: HorarioPermiso) {
  const sale = horaCorta(h.hora_salida);
  const vuelve = horaCorta(h.hora_reintegro);
  if (sale && vuelve && fechaDesde && fechaDesde === fechaHasta && vuelve <= sale) {
    return "La hora de regreso tiene que ser posterior a la hora de salida";
  }
  return null;
}
