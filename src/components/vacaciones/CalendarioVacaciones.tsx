import { useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, FileDown, FileSpreadsheet, GanttChart, LayoutGrid, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  coloresPorEmpleado, diaSemanaLunes, fechaLocal, formatoFecha, nivelSuperposicion, ocupacionDelMes,
  personasDistintas, resumenDelMes, superposicionesPorSucursal, type Nivel, type SolicitudCal,
} from "@/lib/vacacionesCalendario";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** Fondo y borde de cada día según cuántas personas faltan. */
const ESTILO_NIVEL: Record<Nivel, string> = {
  0: "bg-card border-border",
  1: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900",
  2: "bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-800",
  3: "bg-red-50 border-red-300 dark:bg-red-950/30 dark:border-red-800",
};
const PUNTO_NIVEL: Record<Nivel, string> = { 0: "", 1: "bg-emerald-500", 2: "bg-amber-500", 3: "bg-red-500" };
const TEXTO_NIVEL: Record<Nivel, string> = { 0: "", 1: "1 persona", 2: "Superposición", 3: "Superposición alta" };

const diaMes = (iso: string) => fechaLocal(iso).toLocaleDateString("es-AR", { day: "numeric", month: "numeric" });
const nombreCorto = (s: SolicitudCal) => `${s.empleado?.apellido ?? ""} ${s.empleado?.nombre?.[0] ?? ""}.`.trim();

export default function CalendarioVacaciones({
  solicitudes, onExportarPDF, onExportarExcel,
}: {
  solicitudes: SolicitudCal[];
  onExportarPDF: (mes: string) => void;
  onExportarExcel: (mes: string) => void;
}) {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes0, setMes0] = useState(hoy.getMonth());
  const [vista, setVista] = useState<"mes" | "linea">("mes");
  const [conPendientes, setConPendientes] = useState(true);
  const [sucursal, setSucursal] = useState("todas");
  const [diaAbierto, setDiaAbierto] = useState<number | null>(null);

  const sucursales = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of solicitudes) if (s.empleado?.sucursal_id) m.set(s.empleado.sucursal_id, s.empleado.sucursal?.nombre ?? "Sucursal");
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [solicitudes]);

  const visibles = useMemo(() => solicitudes.filter((s) =>
    (s.estado === "aprobada" || (conPendientes && s.estado === "pendiente")) &&
    (sucursal === "todas" || s.empleado?.sucursal_id === sucursal)
  ), [solicitudes, conPendientes, sucursal]);

  const ocupacion = useMemo(() => ocupacionDelMes(visibles, anio, mes0), [visibles, anio, mes0]);
  const colores = useMemo(() => coloresPorEmpleado(visibles), [visibles]);
  const resumen = useMemo(() => resumenDelMes(ocupacion), [ocupacion]);
  const diasMes = new Date(anio, mes0 + 1, 0).getDate();
  const offset = diaSemanaLunes(new Date(anio, mes0, 1));
  const esMesActual = anio === hoy.getFullYear() && mes0 === hoy.getMonth();
  const hoyAusentes = esMesActual ? personasDistintas(ocupacion.get(hoy.getDate()) ?? []) : null;
  const tituloBruto = new Date(anio, mes0).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  const titulo = tituloBruto.charAt(0).toUpperCase() + tituloBruto.slice(1);
  const mesIso = `${anio}-${String(mes0 + 1).padStart(2, "0")}`;

  const mover = (delta: number) => {
    const d = new Date(anio, mes0 + delta, 1);
    setAnio(d.getFullYear()); setMes0(d.getMonth());
  };

  // Personas con vacaciones en el mes, para la línea de tiempo
  const filas = useMemo(() => {
    const porEmpleado = new Map<string, { s: SolicitudCal; sols: SolicitudCal[] }>();
    for (const sols of ocupacion.values()) for (const s of sols) {
      if (!porEmpleado.has(s.empleado_id)) porEmpleado.set(s.empleado_id, { s, sols: [] });
      const f = porEmpleado.get(s.empleado_id)!;
      if (!f.sols.includes(s)) f.sols.push(s);
    }
    return [...porEmpleado.values()].sort((a, b) => (a.s.empleado?.apellido ?? "").localeCompare(b.s.empleado?.apellido ?? ""));
  }, [ocupacion]);

  return (
    <div className="rounded-2xl border bg-card shadow-sm">
      {/* Barra superior */}
      <div className="flex flex-wrap items-center gap-2 border-b p-4">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => mover(-1)} aria-label="Mes anterior"><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => mover(1)} aria-label="Mes siguiente"><ChevronRight className="h-4 w-4" /></Button>
          {!esMesActual && <Button variant="ghost" size="sm" onClick={() => { setAnio(hoy.getFullYear()); setMes0(hoy.getMonth()); }}>Hoy</Button>}
        </div>
        <h3 className="text-lg font-semibold flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" />{titulo}</h3>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-muted p-0.5" role="tablist" aria-label="Vista">
            <button type="button" role="tab" aria-selected={vista === "mes"} onClick={() => setVista("mes")}
              className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium", vista === "mes" ? "bg-card shadow-sm" : "text-muted-foreground")}>
              <LayoutGrid className="h-4 w-4" />Mes
            </button>
            <button type="button" role="tab" aria-selected={vista === "linea"} onClick={() => setVista("linea")}
              className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium", vista === "linea" ? "bg-card shadow-sm" : "text-muted-foreground")}>
              <GanttChart className="h-4 w-4" />Línea de tiempo
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={() => onExportarPDF(mesIso)}><FileDown className="h-4 w-4 mr-1" />PDF</Button>
          <Button variant="outline" size="sm" onClick={() => onExportarExcel(mesIso)}><FileSpreadsheet className="h-4 w-4 mr-1" />Excel</Button>
        </div>
      </div>

      {/* Filtros y resumen */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b px-4 py-3">
        {sucursales.length > 1 && (
          <Select value={sucursal} onValueChange={setSucursal}>
            <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las sucursales</SelectItem>
              {sucursales.map(([id, nombre]) => <SelectItem key={id} value={id}>{nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Switch checked={conPendientes} onCheckedChange={setConPendientes} />Incluir pendientes de aprobación
        </label>
        <div className="flex flex-wrap gap-2 text-sm">
          {hoyAusentes !== null && (
            <span className="rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">Hoy de vacaciones: {hoyAusentes}</span>
          )}
          <span className={cn("rounded-full px-3 py-1 font-medium", resumen.diasConSuperposicion ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" : "bg-muted text-muted-foreground")}>
            Días con superposición: {resumen.diasConSuperposicion}
          </span>
          {resumen.maximo > 1 && (
            <span className="rounded-full bg-red-100 px-3 py-1 font-medium text-red-800 dark:bg-red-950 dark:text-red-300">
              Máximo: {resumen.maximo} personas el {resumen.diaMaximo}/{mes0 + 1}
            </span>
          )}
        </div>
      </div>

      {vista === "mes" ? (
        <div className="p-2 sm:p-4">
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {DIAS.map((d) => <div key={d} className="py-1 text-center text-xs font-semibold text-muted-foreground">{d}</div>)}
            {Array.from({ length: offset }).map((_, i) => <div key={`v${i}`} />)}
            {Array.from({ length: diasMes }).map((_, i) => {
              const dia = i + 1;
              const sols = ocupacion.get(dia) ?? [];
              const n = personasDistintas(sols);
              const nivel = nivelSuperposicion(n);
              const finde = diaSemanaLunes(new Date(anio, mes0, dia)) >= 5;
              const esHoy = esMesActual && dia === hoy.getDate();
              const unicos = [...new Map(sols.map((s) => [s.empleado_id, s])).values()];
              return (
                <button
                  key={dia}
                  type="button"
                  onClick={() => n > 0 && setDiaAbierto(dia)}
                  className={cn(
                    "flex min-h-[64px] sm:min-h-[96px] flex-col rounded-lg border p-1 sm:p-1.5 text-left transition-shadow",
                    ESTILO_NIVEL[nivel],
                    finde && nivel === 0 && "bg-muted/40",
                    n > 0 ? "hover:shadow-md cursor-pointer" : "cursor-default",
                    esHoy && "ring-2 ring-primary"
                  )}
                  aria-label={`${dia}: ${n ? `${n} de vacaciones` : "sin vacaciones"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn("text-xs sm:text-sm font-semibold", esHoy && "text-primary", finde && "text-muted-foreground")}>{dia}</span>
                    {n > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-bold">
                        <span className={cn("h-2 w-2 rounded-full", PUNTO_NIVEL[nivel])} />{n}
                      </span>
                    )}
                  </div>
                  {/* En el celular sólo puntos de color; en pantallas grandes, los nombres */}
                  <div className="mt-1 flex flex-wrap gap-0.5 sm:hidden">
                    {unicos.slice(0, 4).map((s) => <span key={s.id} className="h-1.5 w-1.5 rounded-full" style={{ background: colores.get(s.empleado_id) }} />)}
                  </div>
                  <div className="mt-1 hidden sm:flex flex-col gap-0.5">
                    {unicos.slice(0, 3).map((s) => (
                      <span
                        key={s.id}
                        className={cn("truncate rounded px-1 py-0.5 text-[11px] font-medium text-white", s.estado === "pendiente" && "opacity-70 outline-dashed outline-1 outline-offset-[-1px] outline-white/80")}
                        style={{ background: colores.get(s.empleado_id) }}
                        title={`${s.empleado?.apellido}, ${s.empleado?.nombre} · ${formatoFecha(s.fecha_desde)} al ${formatoFecha(s.fecha_hasta)}${s.estado === "pendiente" ? " (pendiente)" : ""}`}
                      >
                        {nombreCorto(s)}
                      </span>
                    ))}
                    {unicos.length > 3 && <span className="text-[11px] font-medium text-muted-foreground">+{unicos.length - 3} más</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <LineaDeTiempo filas={filas} ocupacion={ocupacion} diasMes={diasMes} anio={anio} mes0={mes0} colores={colores} hoy={esMesActual ? hoy.getDate() : null} />
      )}

      {/* Referencias */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t px-4 py-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-emerald-300 bg-emerald-100" />1 persona</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-amber-300 bg-amber-100" />2 personas (superposición)</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-red-300 bg-red-100" />3 o más</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded bg-sky-500 opacity-70 outline-dashed outline-1 outline-white" />Pendiente de aprobación</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded ring-2 ring-primary" />Hoy</span>
      </div>

      <DetalleDia
        dia={diaAbierto}
        anio={anio}
        mes0={mes0}
        sols={diaAbierto ? ocupacion.get(diaAbierto) ?? [] : []}
        colores={colores}
        onClose={() => setDiaAbierto(null)}
      />
    </div>
  );
}

function LineaDeTiempo({
  filas, ocupacion, diasMes, anio, mes0, colores, hoy,
}: {
  filas: { s: SolicitudCal; sols: SolicitudCal[] }[];
  ocupacion: Map<number, SolicitudCal[]>;
  diasMes: number;
  anio: number;
  mes0: number;
  colores: Map<string, string>;
  hoy: number | null;
}) {
  if (filas.length === 0) {
    return <p className="p-10 text-center text-sm text-muted-foreground">Nadie tiene vacaciones este mes.</p>;
  }
  const inicioMes = new Date(anio, mes0, 1).getTime();
  const col = (d: Date) => Math.round((d.getTime() - inicioMes) / 86_400_000) + 1;
  const plantilla = `minmax(150px, 190px) repeat(${diasMes}, minmax(26px, 1fr))`;

  return (
    <div className="overflow-x-auto p-2 sm:p-4">
      <div className="min-w-[900px]">
        {/* Encabezado: días y nivel de superposición */}
        <div className="grid items-end gap-px" style={{ gridTemplateColumns: plantilla }}>
          <div className="px-2 pb-1 text-xs font-semibold text-muted-foreground">Persona</div>
          {Array.from({ length: diasMes }).map((_, i) => {
            const dia = i + 1;
            const nivel = nivelSuperposicion(personasDistintas(ocupacion.get(dia) ?? []));
            const finde = diaSemanaLunes(new Date(anio, mes0, dia)) >= 5;
            return (
              <div key={dia} className="flex flex-col items-center gap-1 pb-1">
                <span className={cn("text-[11px] font-semibold", finde && "text-muted-foreground", hoy === dia && "rounded bg-primary px-1 text-primary-foreground")}>{dia}</span>
                <span className={cn("h-1.5 w-full rounded-full", nivel ? PUNTO_NIVEL[nivel] : "bg-muted")} title={TEXTO_NIVEL[nivel]} />
              </div>
            );
          })}
        </div>
        {filas.map(({ s, sols }) => (
          <div key={s.empleado_id} className="grid items-center gap-px border-t py-1" style={{ gridTemplateColumns: plantilla }}>
            <div className="min-w-0 px-2">
              <p className="truncate text-sm font-medium">{s.empleado?.apellido}, {s.empleado?.nombre}</p>
              <p className="truncate text-[11px] text-muted-foreground">{[s.empleado?.puesto, s.empleado?.sucursal?.nombre].filter(Boolean).join(" · ")}</p>
            </div>
            {sols.map((x) => {
              const desde = Math.max(1, col(fechaLocal(x.fecha_desde)));
              const hasta = Math.min(diasMes, col(fechaLocal(x.fecha_hasta)));
              return (
                <div
                  key={x.id}
                  className={cn("h-7 rounded-md text-[11px] font-medium text-white flex items-center px-1.5 overflow-hidden", x.estado === "pendiente" && "opacity-70 outline-dashed outline-1 outline-offset-[-2px] outline-white")}
                  style={{ gridColumn: `${desde + 1} / ${hasta + 2}`, gridRow: 1, background: colores.get(x.empleado_id) }}
                  title={`${formatoFecha(x.fecha_desde)} al ${formatoFecha(x.fecha_hasta)}${x.estado === "pendiente" ? " (pendiente)" : ""}`}
                >
                  <span className="truncate">{hasta - desde >= 2 ? `${diaMes(x.fecha_desde)} – ${diaMes(x.fecha_hasta)}` : ""}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function DetalleDia({
  dia, anio, mes0, sols, colores, onClose,
}: {
  dia: number | null;
  anio: number;
  mes0: number;
  sols: SolicitudCal[];
  colores: Map<string, string>;
  onClose: () => void;
}) {
  const n = personasDistintas(sols);
  const porSucursal = superposicionesPorSucursal(sols);
  const bruto = dia ? new Date(anio, mes0, dia).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" }) : "";
  const fecha = bruto.charAt(0).toUpperCase() + bruto.slice(1);
  return (
    <Dialog open={dia !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{fecha}</DialogTitle>
          <DialogDescription className="flex items-center gap-1.5"><Users className="h-4 w-4" />{n} {n === 1 ? "persona" : "personas"} de vacaciones</DialogDescription>
        </DialogHeader>
        {porSucursal.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Superposición en la misma sucursal</p>
              {porSucursal.map((p) => <p key={p.sucursal}>{p.sucursal}: {p.personas} personas ausentes</p>)}
            </div>
          </div>
        )}
        <ul className="space-y-2">
          {sols.map((s) => (
            <li key={s.id} className="flex items-center gap-3 rounded-lg border p-2.5">
              <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: colores.get(s.empleado_id) }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{s.empleado?.apellido}, {s.empleado?.nombre}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatoFecha(s.fecha_desde)} al {formatoFecha(s.fecha_hasta)}
                  {s.dias_solicitados ? ` · ${s.dias_solicitados} días` : ""}
                  {s.empleado?.sucursal?.nombre ? ` · ${s.empleado.sucursal.nombre}` : ""}
                </p>
              </div>
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", s.estado === "pendiente" ? "bg-warning/15 text-warning" : "bg-success/15 text-success")}>
                {s.estado === "pendiente" ? "Pendiente" : "Aprobada"}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
