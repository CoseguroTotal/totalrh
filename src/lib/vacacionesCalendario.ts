// Lógica pura del calendario de vacaciones (testeada en src/test/vacacionesCalendario.test.ts).

export interface SolicitudCal {
  id: string;
  empleado_id: string;
  fecha_desde: string;
  fecha_hasta: string;
  estado: string;
  dias_solicitados?: number;
  empleado?: {
    id: string;
    nombre: string;
    apellido: string;
    legajo?: string | null;
    puesto?: string | null;
    avatar_url?: string | null;
    sucursal_id?: string | null;
    sucursal?: { id: string; nombre: string } | null;
  } | null;
}

/**
 * "2026-10-16" como fecha local. `new Date("2026-10-16")` la interpreta en UTC y
 * en Argentina queda en el 15 a las 21 h: cada vacación aparecía un día antes.
 */
export function fechaLocal(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const formatoFecha = (iso: string) => fechaLocal(iso).toLocaleDateString("es-AR");

/** Solicitudes que ocupan cada día del mes (1..31). */
export function ocupacionDelMes(solicitudes: SolicitudCal[], anio: number, mes0: number) {
  const mapa = new Map<number, SolicitudCal[]>();
  const inicioMes = new Date(anio, mes0, 1);
  const finMes = new Date(anio, mes0 + 1, 0);
  for (const s of solicitudes) {
    const desde = fechaLocal(s.fecha_desde);
    const hasta = fechaLocal(s.fecha_hasta);
    if (hasta < inicioMes || desde > finMes) continue;
    const d = new Date(Math.max(desde.getTime(), inicioMes.getTime()));
    const fin = new Date(Math.min(hasta.getTime(), finMes.getTime()));
    while (d <= fin) {
      const dia = d.getDate();
      if (!mapa.has(dia)) mapa.set(dia, []);
      mapa.get(dia)!.push(s);
      d.setDate(d.getDate() + 1);
    }
  }
  return mapa;
}

/** Cantidad de personas distintas ausentes en un día (dos solicitudes de la misma persona cuentan una vez). */
export const personasDistintas = (sols: SolicitudCal[]) => new Set(sols.map((s) => s.empleado_id)).size;

export type Nivel = 0 | 1 | 2 | 3;

/** 0 = nadie, 1 = una persona, 2 = superposición de dos, 3 = tres o más. */
export function nivelSuperposicion(personas: number): Nivel {
  if (personas <= 0) return 0;
  if (personas === 1) return 1;
  if (personas === 2) return 2;
  return 3;
}

/** Personas de la misma sucursal ausentes el mismo día: la superposición que más afecta la cobertura. */
export function superposicionesPorSucursal(sols: SolicitudCal[]) {
  const porSucursal = new Map<string, { nombre: string; empleados: Set<string> }>();
  for (const s of sols) {
    const id = s.empleado?.sucursal_id ?? "sin";
    const nombre = s.empleado?.sucursal?.nombre ?? "Sin sucursal";
    if (!porSucursal.has(id)) porSucursal.set(id, { nombre, empleados: new Set() });
    porSucursal.get(id)!.empleados.add(s.empleado_id);
  }
  return [...porSucursal.values()]
    .filter((x) => x.empleados.size > 1)
    .map((x) => ({ sucursal: x.nombre, personas: x.empleados.size }));
}

export function resumenDelMes(ocupacion: Map<number, SolicitudCal[]>) {
  let diasConSuperposicion = 0;
  let maximo = 0;
  let diaMaximo: number | null = null;
  for (const [dia, sols] of ocupacion) {
    const n = personasDistintas(sols);
    if (n > 1) diasConSuperposicion++;
    if (n > maximo) { maximo = n; diaMaximo = dia; }
  }
  return { diasConSuperposicion, maximo, diaMaximo };
}

/** Paleta para distinguir a cada persona (estable por orden de aparición). */
export const PALETA_PERSONAS = [
  "#0ea5e9", "#8b5cf6", "#f97316", "#10b981", "#ec4899",
  "#eab308", "#14b8a6", "#6366f1", "#ef4444", "#84cc16",
];

export function coloresPorEmpleado(solicitudes: SolicitudCal[]) {
  const ids = [...new Set(
    [...solicitudes]
      .sort((a, b) => (a.empleado?.apellido ?? "").localeCompare(b.empleado?.apellido ?? ""))
      .map((s) => s.empleado_id)
  )];
  return new Map(ids.map((id, i) => [id, PALETA_PERSONAS[i % PALETA_PERSONAS.length]]));
}

/** Lunes = 0 … domingo = 6 (semana argentina). */
export const diaSemanaLunes = (d: Date) => (d.getDay() + 6) % 7;
