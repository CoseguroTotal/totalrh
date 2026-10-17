import { useMemo, useState } from "react";
import { CalendarClock, Check, CheckSquare, Circle, Loader2, Plus, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useEsModerador, usePerfiles, useSessionUserId } from "@/hooks/useMuro";
import { useDirectorio } from "@/hooks/useChat";
import {
  ESTADOS, PRIORIDADES, estadoVencimiento, ordenarTareas, useCambiarEstado, useEliminarTarea, useGuardarTarea, useTareas,
  type EstadoTarea, type Prioridad, type Tarea,
} from "@/hooks/useTareas";
import { UserAvatar, nombreCompleto } from "@/components/muro/MuroComponents";

type Vista = "mias" | "asignadas";

const fechaCorta = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
};

export default function Tareas() {
  const { data: yo } = useSessionUserId();
  const { data: esModerador = false } = useEsModerador();
  const { data: tareas = [], isLoading } = useTareas();
  const guardar = useGuardarTarea();
  const [vista, setVista] = useState<Vista>("mias");
  const [rapida, setRapida] = useState("");
  const [editando, setEditando] = useState<Tarea | "nueva" | null>(null);
  const [verHechas, setVerHechas] = useState(false);

  const mias = useMemo(() => ordenarTareas(tareas.filter((t) => t.asignada_a === yo)), [tareas, yo]);
  const asignadas = useMemo(() => ordenarTareas(tareas.filter((t) => t.creada_por === yo && t.asignada_a !== yo)), [tareas, yo]);
  const lista = vista === "mias" ? mias : asignadas;
  const abiertas = lista.filter((t) => t.estado !== "hecha");
  const hechas = lista.filter((t) => t.estado === "hecha");
  const ids = useMemo(() => [...new Set(tareas.flatMap((t) => [t.asignada_a, t.creada_por]))], [tareas]);
  const { data: perfiles = new Map() } = usePerfiles(ids);

  const agregarRapida = () => {
    if (!rapida.trim()) return;
    guardar.mutate({ titulo: rapida }, { onSuccess: () => setRapida(""), onError: () => toast.error("No se pudo crear") });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><CheckSquare className="h-6 w-6 text-teal-500" />Tareas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tus pendientes y los que te asignan.</p>
        </div>
        <Button className="rounded-full" onClick={() => setEditando("nueva")}>
          {esModerador ? <><UserPlus className="h-4 w-4 mr-1.5" />Nueva o asignar</> : <><Plus className="h-4 w-4 mr-1.5" />Nueva tarea</>}
        </Button>
      </div>

      {(esModerador || asignadas.length > 0) && (
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="tablist">
          {([["mias", `Mis tareas (${mias.filter((t) => t.estado !== "hecha").length})`], ["asignadas", `Asigné a otros (${asignadas.filter((t) => t.estado !== "hecha").length})`]] as const).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={vista === id} onClick={() => setVista(id)}
              className={cn("rounded-lg px-3 py-2 text-sm font-medium transition-colors", vista === id ? "bg-card shadow-sm" : "text-muted-foreground")}>
              {label}
            </button>
          ))}
        </div>
      )}

      {vista === "mias" && (
        <div className="flex gap-2">
          <Input value={rapida} onChange={(e) => setRapida(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") agregarRapida(); }}
            placeholder="Agregá una tarea rápida y apretá Enter…" className="h-11 rounded-xl" maxLength={200} />
          <Button className="h-11 rounded-xl" onClick={agregarRapida} disabled={!rapida.trim() || guardar.isPending} aria-label="Agregar tarea"><Plus className="h-5 w-5" /></Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : abiertas.length === 0 && hechas.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center">
          <CheckSquare className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">{vista === "mias" ? "No tenés tareas. ¡Todo al día!" : "Todavía no asignaste tareas."}</p>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {abiertas.map((t) => <FilaTarea key={t.id} t={t} yo={yo} vista={vista} perfiles={perfiles} onAbrir={() => setEditando(t)} />)}
            {abiertas.length === 0 && <li className="rounded-xl bg-success/10 p-4 text-center text-sm font-medium text-success">¡No queda nada pendiente!</li>}
          </ul>
          {hechas.length > 0 && (
            <div>
              <button type="button" className="text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => setVerHechas((v) => !v)}>
                {verHechas ? "Ocultar" : "Ver"} completadas ({hechas.length})
              </button>
              {verHechas && (
                <ul className="mt-2 space-y-2">
                  {hechas.map((t) => <FilaTarea key={t.id} t={t} yo={yo} vista={vista} perfiles={perfiles} onAbrir={() => setEditando(t)} />)}
                </ul>
              )}
            </div>
          )}
        </>
      )}

      {editando && (
        <TareaDialog
          tarea={editando === "nueva" ? null : editando}
          yo={yo}
          esModerador={esModerador}
          perfiles={perfiles}
          onClose={() => setEditando(null)}
        />
      )}
    </div>
  );
}

function FilaTarea({ t, yo, vista, perfiles, onAbrir }: { t: Tarea; yo: string | null | undefined; vista: Vista; perfiles: Map<string, import("@/hooks/useMuro").PerfilMuro>; onAbrir: () => void }) {
  const cambiar = useCambiarEstado();
  const hecha = t.estado === "hecha";
  const venc = estadoVencimiento(t);
  const otro = vista === "mias" ? (t.creada_por !== yo ? perfiles.get(t.creada_por) : null) : perfiles.get(t.asignada_a);

  return (
    <li className={cn("flex items-start gap-3 rounded-2xl border bg-card p-3 shadow-sm", venc === "vencida" && "border-destructive/40")}>
      <button
        type="button"
        onClick={() => cambiar.mutate({ id: t.id, estado: hecha ? "pendiente" : "hecha" })}
        className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors", hecha ? "border-success bg-success text-white" : "border-muted-foreground/40 hover:border-success")}
        aria-label={hecha ? "Marcar como pendiente" : "Marcar como hecha"}
      >
        {hecha && <Check className="h-4 w-4" />}
      </button>
      <button type="button" onClick={onAbrir} className="min-w-0 flex-1 text-left">
        <p className={cn("font-medium", hecha && "text-muted-foreground line-through")}>{t.titulo}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
          {t.estado === "en_curso" && <span className="rounded-full bg-sky-500/15 px-2 py-0.5 font-semibold text-sky-700 dark:text-sky-300">En curso</span>}
          {t.prioridad !== "media" && !hecha && <span className={cn("rounded-full px-2 py-0.5 font-semibold", PRIORIDADES[t.prioridad].color)}>Prioridad {PRIORIDADES[t.prioridad].label.toLowerCase()}</span>}
          {t.vence && (
            <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold",
              venc === "vencida" ? "bg-destructive/15 text-destructive" : venc === "hoy" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-muted text-muted-foreground")}>
              <CalendarClock className="h-3 w-3" />{venc === "vencida" ? "Venció" : venc === "hoy" ? "Vence hoy" : "Vence"} {venc !== "hoy" && fechaCorta(t.vence)}
            </span>
          )}
          {otro && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <UserAvatar perfil={otro} size="sm" />{vista === "mias" ? "Te la asignó" : "Para"} {nombreCompleto(otro)}
            </span>
          )}
        </div>
      </button>
    </li>
  );
}

function TareaDialog({
  tarea, yo, esModerador, perfiles, onClose,
}: {
  tarea: Tarea | null;
  yo: string | null | undefined;
  esModerador: boolean;
  perfiles: Map<string, import("@/hooks/useMuro").PerfilMuro>;
  onClose: () => void;
}) {
  const guardar = useGuardarTarea();
  const eliminar = useEliminarTarea();
  const cambiar = useCambiarEstado();
  const { data: personas = [] } = useDirectorio();
  const soyCreador = !tarea || tarea.creada_por === yo;
  const [titulo, setTitulo] = useState(tarea?.titulo ?? "");
  const [descripcion, setDescripcion] = useState(tarea?.descripcion ?? "");
  const [prioridad, setPrioridad] = useState<Prioridad>(tarea?.prioridad ?? "media");
  const [vence, setVence] = useState(tarea?.vence ?? "");
  const [asignada, setAsignada] = useState(tarea?.asignada_a ?? yo ?? "");
  const [estado, setEstado] = useState<EstadoTarea>(tarea?.estado ?? "pendiente");

  const enviar = () => {
    if (!soyCreador) {
      cambiar.mutate({ id: tarea!.id, estado }, { onSuccess: onClose });
      return;
    }
    if (!titulo.trim()) { toast.error("Poné un título"); return; }
    guardar.mutate(
      { id: tarea?.id, titulo, descripcion, prioridad, vence: vence || null, asignada_a: asignada || undefined, estado },
      {
        onSuccess: () => { toast.success(tarea ? "Tarea actualizada" : asignada && asignada !== yo ? "Tarea asignada y avisada" : "Tarea creada"); onClose(); },
        onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo guardar"),
      }
    );
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{tarea ? (soyCreador ? "Editar tarea" : tarea.titulo) : "Nueva tarea"}</DialogTitle></DialogHeader>
        {soyCreador ? (
          <div className="space-y-4">
            <div><Label>Qué hay que hacer</Label><Input className="mt-1.5" value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={200} autoFocus placeholder="Ej.: Enviar documentación del alta" /></div>
            <div><Label>Detalle (opcional)</Label><Textarea className="mt-1.5" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} maxLength={3000} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prioridad</Label>
                <Select value={prioridad} onValueChange={(v) => setPrioridad(v as Prioridad)}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>{(["alta", "media", "baja"] as Prioridad[]).map((p) => <SelectItem key={p} value={p}>{PRIORIDADES[p].label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Vence (opcional)</Label><Input type="date" className="mt-1.5" value={vence} onChange={(e) => setVence(e.target.value)} /></div>
            </div>
            {esModerador && (
              <div>
                <Label>Asignar a</Label>
                <Select value={asignada} onValueChange={setAsignada}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Elegí una persona" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {yo && <SelectItem value={yo}>Yo</SelectItem>}
                    {personas.map((p) => <SelectItem key={p.user_id} value={p.user_id}>{nombreCompleto(p)}{p.puesto ? ` · ${p.puesto}` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {tarea && <EstadoSelector estado={estado} onChange={setEstado} />}
          </div>
        ) : (
          <div className="space-y-4">
            {tarea!.descripcion && <p className="whitespace-pre-wrap text-sm">{tarea!.descripcion}</p>}
            <p className="text-sm text-muted-foreground">Te la asignó {nombreCompleto(perfiles.get(tarea!.creada_por))}{tarea!.vence ? ` · vence ${fechaCorta(tarea!.vence)}` : ""}</p>
            <EstadoSelector estado={estado} onChange={setEstado} />
          </div>
        )}
        <DialogFooter className="gap-2">
          {tarea && soyCreador && (
            <Button variant="ghost" className="mr-auto text-destructive" onClick={() => { if (confirm("¿Eliminar la tarea?")) eliminar.mutate(tarea.id, { onSuccess: onClose }); }}>
              <Trash2 className="h-4 w-4 mr-1.5" />Eliminar
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={enviar} disabled={guardar.isPending || cambiar.isPending}>{guardar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EstadoSelector({ estado, onChange }: { estado: EstadoTarea; onChange: (e: EstadoTarea) => void }) {
  return (
    <div>
      <Label>Estado</Label>
      <div className="mt-1.5 grid grid-cols-3 gap-2">
        {ESTADOS.map((e) => (
          <Button key={e.id} type="button" variant={estado === e.id ? "default" : "outline"} onClick={() => onChange(e.id)} className="h-10">
            {e.id === "hecha" ? <Check className="h-4 w-4 mr-1" /> : <Circle className={cn("h-3 w-3 mr-1.5", e.id === "en_curso" && "fill-current")} />}{e.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
