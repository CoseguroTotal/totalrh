import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays, CalendarPlus, CalendarX2, ChevronLeft, ChevronRight, Clock, Download, ExternalLink, Loader2, MapPin, Plus, Trash2, Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useEsModerador, usePerfiles, useSessionUserId } from "@/hooks/useMuro";
import {
  TIPOS_EVENTO, conteoAsistencia, eventosPorDia, horario, useCrearEvento, useEliminarEvento, useEventos, useResponderEvento,
  type Evento, type Respuesta, type TipoEvento,
} from "@/hooks/useEventos";
import { UserAvatar, nombreCompleto } from "@/components/muro/MuroComponents";
import FeriadosDialog from "@/components/FeriadosDialog";
import { TIPOS_FERIADO, mapaFeriados, useFeriados } from "@/hooks/useFeriados";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const lunes0 = (d: Date) => (d.getDay() + 6) % 7;
const mayus = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Archivo .ics para agregar el evento al calendario del celular o de Outlook/Google. */
function descargarIcs(e: Evento) {
  const f = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const fd = (iso: string, extra = 0) => { const d = new Date(iso); d.setDate(d.getDate() + extra); return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`; };
  const esc = (t: string) => t.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  const lineas = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TotalRH//Eventos//ES", "BEGIN:VEVENT",
    `UID:${e.id}@totalrh`, `DTSTAMP:${f(new Date().toISOString())}`,
    e.todo_el_dia ? `DTSTART;VALUE=DATE:${fd(e.inicio)}` : `DTSTART:${f(e.inicio)}`,
    e.todo_el_dia ? `DTEND;VALUE=DATE:${fd(e.fin ?? e.inicio, 1)}` : `DTEND:${f(e.fin ?? new Date(new Date(e.inicio).getTime() + 3600e3).toISOString())}`,
    `SUMMARY:${esc(e.titulo)}`,
    e.descripcion && `DESCRIPTION:${esc(e.descripcion)}`,
    e.lugar && `LOCATION:${esc(e.lugar)}`,
    e.enlace && `URL:${e.enlace}`,
    "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean);
  const url = URL.createObjectURL(new Blob([lineas.join("\r\n")], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url; a.download = `${e.titulo.replace(/[^\w\s-]/g, "").trim() || "evento"}.ics`; a.click();
  URL.revokeObjectURL(url);
}

export default function Eventos() {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes0, setMes0] = useState(hoy.getMonth());
  const [diaSel, setDiaSel] = useState<number | null>(hoy.getDate());
  const [nuevo, setNuevo] = useState(false);
  const [params, setParams] = useSearchParams();
  const { data: esModerador = false } = useEsModerador();

  const desde = useMemo(() => new Date(anio, mes0, 1), [anio, mes0]);
  const hasta = useMemo(() => new Date(anio, mes0 + 1, 0, 23, 59, 59), [anio, mes0]);
  const { data: eventos = [], isLoading } = useEventos(desde, hasta);
  const { data: feriadosAnio = [] } = useFeriados(anio);
  const feriados = useMemo(() => mapaFeriados(feriadosAnio), [feriadosAnio]);
  const [verFeriados, setVerFeriados] = useState(false);
  const isoDia = (d: number) => `${anio}-${String(mes0 + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const porDia = useMemo(() => eventosPorDia(eventos, anio, mes0), [eventos, anio, mes0]);
  const porId = useMemo(() => new Map(eventos.map((e) => [e.id, e])), [eventos]);

  // Evento abierto (también desde el link de la notificación ?evento=id)
  const abiertoId = params.get("evento");
  const { data: eventoSuelto } = useQuery({
    queryKey: ["eventos", "uno", abiertoId],
    enabled: !!abiertoId && !porId.has(abiertoId),
    queryFn: async () => {
      const { data } = await supabase.from("eventos").select("*, asistencias:evento_asistencias(user_id, respuesta)").eq("id", abiertoId!).maybeSingle();
      return data as unknown as Evento | null;
    },
  });
  const abierto = abiertoId ? porId.get(abiertoId) ?? eventoSuelto ?? null : null;
  const abrir = (id: string | null) => { const p = new URLSearchParams(params); if (id) p.set("evento", id); else p.delete("evento"); setParams(p, { replace: true }); };

  const mover = (d: number) => { const n = new Date(anio, mes0 + d, 1); setAnio(n.getFullYear()); setMes0(n.getMonth()); setDiaSel(null); };
  const esMesActual = anio === hoy.getFullYear() && mes0 === hoy.getMonth();
  const diasMes = new Date(anio, mes0 + 1, 0).getDate();
  const offset = lunes0(new Date(anio, mes0, 1));
  const titulo = mayus(desde.toLocaleDateString("es-AR", { month: "long", year: "numeric" }));

  const delDia = diaSel ? (porDia.get(diaSel) ?? []).map((id) => porId.get(id)!).filter(Boolean) : [];
  const proximos = eventos.filter((e) => new Date(e.fin ?? e.inicio) >= new Date(new Date().setHours(0, 0, 0, 0)));
  const lista = diaSel ? delDia : proximos;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><CalendarDays className="h-6 w-6 text-sky-500" />Eventos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Capacitaciones, reuniones, feriados y celebraciones del grupo.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-full" onClick={() => setVerFeriados(true)}><CalendarX2 className="h-4 w-4 mr-1.5 text-red-500" />Feriados</Button>
          {esModerador && <Button className="rounded-full" onClick={() => setNuevo(true)}><Plus className="h-4 w-4 mr-1.5" />Nuevo evento</Button>}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-2xl border bg-card shadow-sm">
          <div className="flex items-center gap-2 border-b p-4">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => mover(-1)} aria-label="Mes anterior"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => mover(1)} aria-label="Mes siguiente"><ChevronRight className="h-4 w-4" /></Button>
            <h2 className="text-lg font-semibold">{titulo}</h2>
            {!esMesActual && <Button variant="ghost" size="sm" className="ml-auto" onClick={() => { setAnio(hoy.getFullYear()); setMes0(hoy.getMonth()); setDiaSel(hoy.getDate()); }}>Hoy</Button>}
            {isLoading && <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <div className="grid grid-cols-7 gap-1 p-2 sm:gap-1.5 sm:p-4">
            {DIAS.map((d) => <div key={d} className="py-1 text-center text-xs font-semibold text-muted-foreground">{d}</div>)}
            {Array.from({ length: offset }).map((_, i) => <div key={`v${i}`} />)}
            {Array.from({ length: diasMes }).map((_, i) => {
              const dia = i + 1;
              const ids = porDia.get(dia) ?? [];
              const evs = ids.map((id) => porId.get(id)!).filter(Boolean);
              const esHoy = esMesActual && dia === hoy.getDate();
              const sel = diaSel === dia;
              const finde = lunes0(new Date(anio, mes0, dia)) >= 5;
              const fer = feriados.get(isoDia(dia)) ?? [];
              return (
                <button
                  key={dia}
                  type="button"
                  onClick={() => setDiaSel(sel ? null : dia)}
                  className={cn(
                    "flex min-h-[56px] sm:min-h-[92px] flex-col rounded-lg border p-1 sm:p-1.5 text-left transition-colors",
                    sel ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50",
                    finde && !sel && "bg-muted/30",
                    fer.length > 0 && !sel && "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
                  )}
                  aria-pressed={sel}
                  aria-label={`${dia}${fer.length ? ` (${fer[0].nombre})` : ""}${evs.length ? `: ${evs.length} ${evs.length === 1 ? "evento" : "eventos"}` : ""}`}
                >
                  <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs sm:text-sm font-semibold", esHoy && "bg-primary text-primary-foreground", fer.length > 0 && !esHoy && "text-red-600", finde && !esHoy && !fer.length && "text-muted-foreground")}>{dia}</span>
                  <div className="mt-1 flex flex-wrap gap-0.5 sm:hidden">
                    {evs.slice(0, 4).map((e) => <span key={e.id} className={cn("h-1.5 w-1.5 rounded-full", TIPOS_EVENTO[e.tipo].punto)} />)}
                  </div>
                  <div className="mt-1 hidden flex-col gap-0.5 sm:flex">
                    {fer.slice(0, 1).map((f) => (
                      <span key={f.id} className={cn("truncate rounded px-1 py-0.5 text-[11px] font-semibold", TIPOS_FERIADO[f.tipo].color)} title={TIPOS_FERIADO[f.tipo].label}>🇦🇷 {f.nombre}</span>
                    ))}
                    {evs.slice(0, 2).map((e) => (
                      <span key={e.id} onClick={(ev) => { ev.stopPropagation(); abrir(e.id); }}
                        className={cn("truncate rounded px-1 py-0.5 text-[11px] font-medium cursor-pointer hover:opacity-80", TIPOS_EVENTO[e.tipo].color)}>
                        {!e.todo_el_dia && <span className="tabular-nums">{new Date(e.inicio).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })} </span>}{e.titulo}
                      </span>
                    ))}
                    {evs.length > 2 && <span className="text-[11px] text-muted-foreground">+{evs.length - 2} más</span>}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t px-4 py-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded border border-red-300 bg-red-100" />Feriado</span>
            {Object.entries(TIPOS_EVENTO).map(([k, t]) => <span key={k} className="flex items-center gap-1.5"><span className={cn("h-2.5 w-2.5 rounded-full", t.punto)} />{t.label}</span>)}
          </div>
        </section>

        <aside className="space-y-3">
          <h2 className="font-semibold">
            {diaSel ? mayus(new Date(anio, mes0, diaSel).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })) : "Próximos eventos"}
          </h2>
          {diaSel && (feriados.get(isoDia(diaSel)) ?? []).map((f) => (
            <div key={f.id} className="flex items-center gap-3 rounded-2xl border border-red-300 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
              <CalendarX2 className="h-5 w-5 shrink-0 text-red-600" />
              <div><p className="font-semibold">{f.nombre}</p><p className="text-xs text-muted-foreground">{TIPOS_FERIADO[f.tipo].label}</p></div>
            </div>
          ))}
          {lista.length === 0 ? (
            <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
              {diaSel ? "No hay eventos este día." : "No hay eventos próximos este mes."}
              {diaSel && <button type="button" className="mt-2 block w-full text-primary hover:underline" onClick={() => setDiaSel(null)}>Ver próximos del mes</button>}
            </div>
          ) : lista.map((e) => <TarjetaEvento key={e.id} e={e} onClick={() => abrir(e.id)} />)}
        </aside>
      </div>

      <FeriadosDialog open={verFeriados} onOpenChange={setVerFeriados} puedeEditar={esModerador} />
      {abierto && <DetalleEvento e={abierto} esModerador={esModerador} onClose={() => abrir(null)} />}
      <NuevoEventoDialog open={nuevo} onOpenChange={setNuevo} fechaInicial={diaSel ? new Date(anio, mes0, diaSel) : new Date()} />
    </div>
  );
}

function TarjetaEvento({ e, onClick }: { e: Evento; onClick: () => void }) {
  const d = new Date(e.inicio);
  const c = conteoAsistencia(e.asistencias);
  return (
    <button type="button" onClick={onClick} className="flex w-full items-start gap-3 rounded-2xl border bg-card p-3 text-left shadow-sm transition-shadow hover:shadow-md">
      <div className="flex w-12 shrink-0 flex-col items-center rounded-xl border bg-background py-1">
        <span className="text-[10px] font-semibold uppercase text-primary">{d.toLocaleDateString("es-AR", { month: "short" }).replace(".", "")}</span>
        <span className="text-xl font-bold leading-tight">{d.getDate()}</span>
      </div>
      <div className="min-w-0 flex-1">
        <span className={cn("inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold", TIPOS_EVENTO[e.tipo].color)}>{TIPOS_EVENTO[e.tipo].label}</span>
        <p className="mt-1 truncate font-semibold">{e.titulo}</p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{horario(e)}</p>
        {e.lugar && <p className="flex items-center gap-1 truncate text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{e.lugar}</p>}
        {e.pide_asistencia && c.voy > 0 && <p className="mt-1 text-xs font-medium text-success">{c.voy} {c.voy === 1 ? "va" : "van"}</p>}
      </div>
    </button>
  );
}

function DetalleEvento({ e, esModerador, onClose }: { e: Evento; esModerador: boolean; onClose: () => void }) {
  const { data: yo } = useSessionUserId();
  const responder = useResponderEvento(yo);
  const eliminar = useEliminarEvento();
  const mia = e.asistencias.find((a) => a.user_id === yo)?.respuesta;
  const c = conteoAsistencia(e.asistencias);
  const van = e.asistencias.filter((a) => a.respuesta === "voy").map((a) => a.user_id);
  const { data: perfiles = new Map() } = usePerfiles(van);
  const pasado = new Date(e.fin ?? e.inicio) < new Date();

  const opciones: { r: Respuesta; label: string; emoji: string }[] = [
    { r: "voy", label: "Voy", emoji: "✅" },
    { r: "quizas", label: "Quizás", emoji: "🤔" },
    { r: "no_voy", label: "No voy", emoji: "❌" },
  ];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <span className={cn("w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold", TIPOS_EVENTO[e.tipo].color)}>{TIPOS_EVENTO[e.tipo].label}</span>
          <DialogTitle className="text-xl">{e.titulo}</DialogTitle>
          <DialogDescription className="space-y-1 text-sm">
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{horario(e)}</span>
            {e.lugar && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{e.lugar}</span>}
          </DialogDescription>
        </DialogHeader>
        {e.descripcion && <p className="whitespace-pre-wrap text-sm">{e.descripcion}</p>}
        <div className="flex flex-wrap gap-2">
          {e.enlace && <Button asChild variant="outline" size="sm"><a href={e.enlace} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4 mr-1.5" />Abrir enlace</a></Button>}
          <Button variant="outline" size="sm" onClick={() => descargarIcs(e)}><Download className="h-4 w-4 mr-1.5" />Agregar a mi calendario</Button>
        </div>

        {e.pide_asistencia && (
          <div className="space-y-3 rounded-xl border p-3">
            <p className="text-sm font-medium">{pasado ? "Asistencia" : "¿Vas a ir?"}</p>
            {!pasado && (
              <div className="grid grid-cols-3 gap-2">
                {opciones.map((o) => (
                  <Button key={o.r} variant={mia === o.r ? "default" : "outline"} disabled={responder.isPending}
                    onClick={() => responder.mutate({ eventoId: e.id, respuesta: o.r, actual: mia }, { onError: () => toast.error("No se pudo guardar") })}>
                    <span className="mr-1.5">{o.emoji}</span>{o.label}
                  </Button>
                ))}
              </div>
            )}
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" />{c.voy} van · {c.quizas} quizás · {c.no_voy} no van</p>
            {van.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {van.slice(0, 12).map((id) => (
                  <span key={id} title={nombreCompleto(perfiles.get(id))}><UserAvatar perfil={perfiles.get(id)} size="sm" /></span>
                ))}
                {van.length > 12 && <span className="flex h-8 items-center text-xs text-muted-foreground">+{van.length - 12}</span>}
              </div>
            )}
          </div>
        )}

        {esModerador && (
          <DialogFooter>
            <Button variant="ghost" className="text-destructive" disabled={eliminar.isPending}
              onClick={() => { if (confirm("¿Eliminar este evento?")) eliminar.mutate(e.id, { onSuccess: () => { toast.success("Evento eliminado"); onClose(); } }); }}>
              <Trash2 className="h-4 w-4 mr-1.5" />Eliminar evento
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

const isoLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** Fecha y hora elegidas en Argentina a ISO. */
const aIso = (fecha: string, hora: string) => new Date(`${fecha}T${hora || "00:00"}:00-03:00`).toISOString();

function NuevoEventoDialog({ open, onOpenChange, fechaInicial }: { open: boolean; onOpenChange: (o: boolean) => void; fechaInicial: Date }) {
  const crear = useCrearEvento();
  const [f, setF] = useState({
    titulo: "", descripcion: "", tipo: "evento" as TipoEvento, todo_el_dia: false,
    fecha: isoLocal(fechaInicial), hora: "09:00", fechaFin: isoLocal(fechaInicial), horaFin: "10:00",
    lugar: "", enlace: "", pide_asistencia: true, anunciar: true,
  });
  // Sólo al abrir: si cambia la fecha con el diálogo abierto no se pisa lo que escribió el usuario
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) setF((x) => ({ ...x, fecha: isoLocal(fechaInicial), fechaFin: isoLocal(fechaInicial) })); }, [open]);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const guardar = () => {
    if (!f.titulo.trim()) { toast.error("Poné un título"); return; }
    if (f.enlace && !/^https?:\/\//i.test(f.enlace)) { toast.error("El enlace tiene que empezar con http:// o https://"); return; }
    const inicio = aIso(f.fecha, f.todo_el_dia ? "00:00" : f.hora);
    const fin = f.todo_el_dia ? aIso(f.fechaFin || f.fecha, "23:59") : aIso(f.fechaFin || f.fecha, f.horaFin);
    if (new Date(fin) < new Date(inicio)) { toast.error("El fin no puede ser antes del inicio"); return; }
    crear.mutate({ ...f, inicio, fin }, {
      onSuccess: () => { toast.success(f.anunciar ? "Evento creado y anunciado en el muro" : "Evento creado"); onOpenChange(false); setF((x) => ({ ...x, titulo: "", descripcion: "", lugar: "", enlace: "" })); },
      onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo crear"),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><CalendarPlus className="h-5 w-5 text-sky-500" />Nuevo evento</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Título</Label><Input className="mt-1.5" value={f.titulo} onChange={(e) => set("titulo", e.target.value)} placeholder="Ej.: Capacitación en seguridad e higiene" maxLength={160} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={f.tipo} onValueChange={(v) => set("tipo", v as TipoEvento)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(TIPOS_EVENTO).map(([k, t]) => <SelectItem key={k} value={k}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <label className="mt-6 flex items-center gap-2 text-sm"><Switch checked={f.todo_el_dia} onCheckedChange={(v) => set("todo_el_dia", v)} />Todo el día</label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Desde</Label><Input type="date" className="mt-1.5" value={f.fecha} onChange={(e) => { set("fecha", e.target.value); if (f.fechaFin < e.target.value) set("fechaFin", e.target.value); }} /></div>
            {!f.todo_el_dia && <div><Label>Hora</Label><Input type="time" className="mt-1.5" value={f.hora} onChange={(e) => set("hora", e.target.value)} /></div>}
            <div><Label>Hasta</Label><Input type="date" className="mt-1.5" value={f.fechaFin} min={f.fecha} onChange={(e) => set("fechaFin", e.target.value)} /></div>
            {!f.todo_el_dia && <div><Label>Hora</Label><Input type="time" className="mt-1.5" value={f.horaFin} onChange={(e) => set("horaFin", e.target.value)} /></div>}
          </div>
          <div><Label>Lugar (opcional)</Label><Input className="mt-1.5" value={f.lugar} onChange={(e) => set("lugar", e.target.value)} placeholder="Sala de reuniones, sucursal, dirección…" maxLength={200} /></div>
          <div><Label>Enlace (opcional)</Label><Input className="mt-1.5" value={f.enlace} onChange={(e) => set("enlace", e.target.value)} placeholder="https://meet.google.com/…" /></div>
          <div><Label>Descripción (opcional)</Label><Textarea className="mt-1.5" value={f.descripcion} onChange={(e) => set("descripcion", e.target.value)} maxLength={3000} /></div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={f.pide_asistencia} onCheckedChange={(v) => set("pide_asistencia", v)} />Pedir confirmación de asistencia</label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={f.anunciar} onCheckedChange={(v) => set("anunciar", v)} />Anunciar en el muro y avisar a todos</label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={guardar} disabled={crear.isPending}>{crear.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear evento"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
