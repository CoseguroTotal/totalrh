import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowDown, ArrowLeft, ArrowUp, Loader2, Plus, Send, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEsModerador } from "@/hooks/useMuro";
import {
  TIPOS_PREGUNTA, erroresDeEncuesta, useEliminarEncuesta, useEncuesta, useGuardarEncuesta, usePublicarEncuesta,
  type MostrarResultados, type Pregunta, type TipoPregunta,
} from "@/hooks/useEncuestas";

const nuevaPregunta = (tipo: TipoPregunta = "unica"): Pregunta => ({
  orden: 0, texto: "", tipo, opciones: tipo === "unica" || tipo === "multiple" ? ["", ""] : [], obligatoria: true,
});

export default function EncuestaEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: esModerador, isLoading: cargandoRol } = useEsModerador();
  const { data, isLoading } = useEncuesta(id);
  const guardar = useGuardarEncuesta();
  const publicar = usePublicarEncuesta();
  const eliminar = useEliminarEncuesta();

  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [anonima, setAnonima] = useState(true);
  const [mostrar, setMostrar] = useState<MostrarResultados>("al_responder");
  const [cierre, setCierre] = useState("");
  const [preguntas, setPreguntas] = useState<Pregunta[]>([nuevaPregunta()]);

  useEffect(() => {
    if (!data) return;
    const e = data.encuesta;
    setTitulo(e.titulo); setDescripcion(e.descripcion); setAnonima(e.anonima); setMostrar(e.mostrar_resultados);
    setCierre(e.cierra_at ? e.cierra_at.slice(0, 10) : "");
    setPreguntas(data.preguntas.length ? data.preguntas : [nuevaPregunta()]);
  }, [data]);

  if (isLoading || cargandoRol) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!esModerador) return <p className="py-20 text-center text-muted-foreground">Sólo RRHH puede crear encuestas.</p>;
  if (data && data.encuesta.estado !== "borrador") return <p className="py-20 text-center text-muted-foreground">Esta encuesta ya se publicó y no se puede editar.</p>;

  const cambiar = (i: number, cambios: Partial<Pregunta>) => setPreguntas((ps) => ps.map((p, j) => (j === i ? { ...p, ...cambios } : p)));
  const mover = (i: number, d: number) => setPreguntas((ps) => {
    const n = [...ps]; const j = i + d; if (j < 0 || j >= n.length) return ps;
    [n[i], n[j]] = [n[j], n[i]]; return n;
  });

  const payload = () => ({
    id,
    titulo, descripcion, anonima, mostrar_resultados: mostrar,
    // Cierra al final del día elegido (hora argentina)
    cierra_at: cierre ? new Date(`${cierre}T23:59:59-03:00`).toISOString() : null,
    preguntas,
  });

  const guardarBorrador = () => guardar.mutate(payload(), {
    onSuccess: (nuevoId) => { toast.success("Borrador guardado"); if (!id) navigate(`/encuestas/${nuevoId}/editar`, { replace: true }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo guardar"),
  });

  const guardarYPublicar = () => {
    const errores = erroresDeEncuesta(titulo, preguntas);
    if (errores.length) { toast.error(errores[0]); return; }
    if (!confirm("¿Publicar la encuesta? Se anuncia en el muro, se avisa a todos y ya no se pueden cambiar las preguntas.")) return;
    guardar.mutate(payload(), {
      onSuccess: (nuevoId) => publicar.mutate(nuevoId, {
        onSuccess: () => { toast.success("¡Encuesta publicada!"); navigate(`/encuestas/${nuevoId}`); },
        onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo publicar"),
      }),
      onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo guardar"),
    });
  };

  const ocupado = guardar.isPending || publicar.isPending;

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-24">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate("/encuestas")} aria-label="Volver"><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-xl font-bold">{id ? "Editar encuesta" : "Nueva encuesta"}</h1>
      </div>

      <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
        <div>
          <Label htmlFor="titulo">Título</Label>
          <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej.: Encuesta de clima laboral 2026" maxLength={160} className="mt-1.5 text-base" />
        </div>
        <div>
          <Label htmlFor="desc">Descripción (opcional)</Label>
          <Textarea id="desc" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Contá para qué es y cuánto tiempo lleva responderla." maxLength={2000} className="mt-1.5" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 sm:col-span-1">
            <span className="text-sm"><span className="font-medium">Anónima</span><br /><span className="text-xs text-muted-foreground">No se guarda quién respondió qué</span></span>
            <Switch checked={anonima} onCheckedChange={setAnonima} />
          </label>
          <div>
            <Label className="text-xs">Resultados para el personal</Label>
            <Select value={mostrar} onValueChange={(v) => setMostrar(v as MostrarResultados)}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="al_responder">Al responder</SelectItem>
                <SelectItem value="al_cerrar">Cuando cierre</SelectItem>
                <SelectItem value="nunca">Sólo RRHH</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="cierre" className="text-xs">Cierra el (opcional)</Label>
            <Input id="cierre" type="date" value={cierre} onChange={(e) => setCierre(e.target.value)} className="mt-1.5" />
          </div>
        </div>
      </section>

      {preguntas.map((p, i) => (
        <section key={i} className="space-y-3 rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-sm font-bold text-violet-600">{i + 1}</span>
            <Select value={p.tipo} onValueChange={(v) => cambiar(i, { tipo: v as TipoPregunta, opciones: v === "unica" || v === "multiple" ? (p.opciones.length >= 2 ? p.opciones : ["", ""]) : [] })}>
              <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
              <SelectContent>{TIPOS_PREGUNTA.map((t) => <SelectItem key={t.tipo} value={t.tipo}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
            <div className="ml-auto flex items-center">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir"><ArrowUp className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => mover(i, 1)} disabled={i === preguntas.length - 1} aria-label="Bajar"><ArrowDown className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setPreguntas((ps) => ps.filter((_, j) => j !== i))} disabled={preguntas.length === 1} aria-label="Quitar pregunta"><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
          <Input value={p.texto} onChange={(e) => cambiar(i, { texto: e.target.value })} placeholder="Escribí la pregunta" maxLength={500} className="text-base" />

          {(p.tipo === "unica" || p.tipo === "multiple") && (
            <div className="space-y-2 pl-1">
              {p.opciones.map((o, k) => (
                <div key={k} className="flex items-center gap-2">
                  <span className={p.tipo === "unica" ? "h-4 w-4 rounded-full border-2" : "h-4 w-4 rounded border-2"} />
                  <Input value={o} onChange={(e) => cambiar(i, { opciones: p.opciones.map((x, z) => (z === k ? e.target.value : x)) })} placeholder={`Opción ${k + 1}`} className="h-9" maxLength={200} />
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => cambiar(i, { opciones: p.opciones.filter((_, z) => z !== k) })} disabled={p.opciones.length <= 2} aria-label="Quitar opción"><X className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => cambiar(i, { opciones: [...p.opciones, ""] })} disabled={p.opciones.length >= 12}><Plus className="h-4 w-4 mr-1" />Agregar opción</Button>
            </div>
          )}
          {p.tipo === "escala" && <p className="text-sm text-muted-foreground">Se responde del 1 (muy en desacuerdo) al 5 (muy de acuerdo).</p>}
          {p.tipo === "texto" && <p className="text-sm text-muted-foreground">Respuesta escrita. Sólo RRHH ve los textos.</p>}

          <label className="flex items-center gap-2 text-sm"><Switch checked={p.obligatoria} onCheckedChange={(v) => cambiar(i, { obligatoria: v })} />Obligatoria</label>
        </section>
      ))}

      <Button variant="outline" className="w-full border-dashed h-12 rounded-2xl" onClick={() => setPreguntas((ps) => [...ps, nuevaPregunta()])} disabled={preguntas.length >= 40}>
        <Plus className="h-4 w-4 mr-1.5" />Agregar pregunta
      </Button>

      {/* Acciones fijas abajo */}
      <div className="fixed inset-x-0 bottom-[calc(58px+env(safe-area-inset-bottom))] sm:bottom-0 z-30 border-t bg-card/95 backdrop-blur px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          {id && (
            <Button variant="ghost" className="text-destructive" disabled={ocupado} onClick={() => {
              if (confirm("¿Eliminar este borrador?")) eliminar.mutate(id, { onSuccess: () => navigate("/encuestas") });
            }}><Trash2 className="h-4 w-4 mr-1.5" />Eliminar</Button>
          )}
          <Button variant="outline" className="ml-auto" disabled={ocupado} onClick={guardarBorrador}>Guardar borrador</Button>
          <Button disabled={ocupado} onClick={guardarYPublicar}>
            {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-1.5" />Publicar</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
