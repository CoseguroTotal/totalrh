/** Datos de la firma de RRHH sobre una solicitud de permiso. */
export interface FirmaPermiso {
  estado: string;
  aprobado_nombre?: string | null;
  aprobado_cargo?: string | null;
  aprobado_at?: string | null;
  observaciones?: string | null;
}

/** Fecha y hora en Argentina: "12/11/2026 14:30". */
export function fechaHoraAR(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const partes = new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const p = (t: string) => partes.find((x) => x.type === t)?.value ?? "";
  return `${p("day")}/${p("month")}/${p("year")} ${p("hour")}:${p("minute")}`;
}

/** Quién firmó, con el cargo si lo hay: "Ana Pérez (Jefa de RRHH)". */
export function firmante(f: Pick<FirmaPermiso, "aprobado_nombre" | "aprobado_cargo">) {
  const nombre = f.aprobado_nombre?.trim();
  if (!nombre) return "";
  const cargo = f.aprobado_cargo?.trim();
  return cargo ? `${nombre} (${cargo})` : nombre;
}

/**
 * Leyenda de la resolución: "Aprobado por Ana Pérez (Jefa de RRHH) el 12/11/2026 14:30".
 * Vacía mientras esté pendiente o si es una solicitud vieja sin firma registrada.
 */
export function leyendaFirma(f: FirmaPermiso) {
  if (f.estado !== "aprobada" && f.estado !== "rechazada") return "";
  const quien = firmante(f);
  if (!quien) return "";
  const verbo = f.estado === "aprobada" ? "Aprobado" : "Rechazado";
  const cuando = f.aprobado_at ? fechaHoraAR(f.aprobado_at) : "";
  return `${verbo} por ${quien}${cuando ? ` el ${cuando}` : ""}`;
}
