import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, Lock, Send, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useEsModerador } from "@/hooks/useMuro";
import {
  estaAbierta, faltantes, porcentaje, useCerrarEncuesta, useEncuesta, useResponderEncuesta, useResultados,
  type Pregunta, type Respuestas, type Resultados,
} from "@/hooks/useEncuestas";

const ETIQUETAS_ESCALA = ["Muy en desacuerdo", "En desacuerdo", "Neutral", "De acuerdo", "Muy de acuerdo"];

export default function EncuestaDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useEncuesta(id);
  const { data: esModerador = false } = useEsModerador();
  const [respuestas, setRespuestas] = useState<Respuestas>({});
  const [faltan, setFaltan] = useState<Set<string>>(new Set());
  const responder = useResponderEncuesta(id);
  const cerrar = useCerrarEncuesta();

  const abierta = data ? estaAbierta(data.encuesta) : false;
  const respondida = !!data?.respondidaAt || responder.isSuccess;
  const verResultados = !!data && (esModerador || respondida || !abierta);
  const { data: resultados, isLoading: cargandoRes } = useResultados(id, verResultados);

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!data) return <p className="py-20 text-center text-muted-foreground">No encontramos la encuesta.</p>;
  const { encuesta: e, preguntas } = data;

  const enviar = () => {
    const f = faltantes(preguntas, respuestas);
    setFaltan(new Set(f.map((p) => p.id!)));
    if (f.length) { toast.error(`Te falta responder ${f.length === 1 ? "una pregunta" : `${f.length} preguntas`}`); document.getElementById(`p-${f[0].id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    responder.mutate(respuestas, {
      onSuccess: () => { toast.success("¡Gracias por responder!"); window.scrollTo({ top: 0, behavior: "smooth" }); },
      onError: (err) => toast.error(err instanceof Error ? err.message : "No se pudo enviar"),
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-10">
      <Button variant="ghost" size="sm" onClick={() => navigate("/encuestas")}><ArrowLeft className="h-4 w-4 mr-1.5" />Encuestas</Button>

      <header className="rounded-2xl border bg-gradient-to-br from-violet-500/10 to-primary/10 p-6">
        <h1 className="text-2xl font-bold">{e.titulo}</h1>
        {e.descripcion && <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{e.descripcion}</p>}
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
          {e.anonima && <span className="flex items-center gap-1 rounded-full bg-card px-2.5 py-1"><ShieldCheck className="h-3.5 w-3.5 text-success" />Anónima: nadie ve qué respondiste</span>}
          <span className="rounded-full bg-card px-2.5 py-1">{preguntas.length} {preguntas.length === 1 ? "pregunta" : "preguntas"}</span>
          {e.cierra_at && <span className="rounded-full bg-card px-2.5 py-1">{abierta ? "Cierra" : "Cerró"} el {new Date(e.cierra_at).toLocaleDateString("es-AR")}</span>}
          {!abierta && <span className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1"><Lock className="h-3.5 w-3.5" />Cerrada</span>}
        </div>
        {esModerador && abierta && (
          <Button variant="outline" size="sm" className="mt-4" disabled={cerrar.isPending}
            onClick={() => { if (confirm("¿Cerrar la encuesta? Ya nadie podrá responder.")) cerrar.mutate(e.id); }}>
            <Lock className="h-4 w-4 mr-1.5" />Cerrar encuesta
          </Button>
        )}
      </header>

      {respondida && (
        <div className="flex items-center gap-3 rounded-2xl border border-success/30 bg-success/10 p-4 text-success">
          <CheckCircle2 className="h-6 w-6 shrink-0" />
          <p className="font-medium">Ya respondiste esta encuesta. ¡Gracias!</p>
        </div>
      )}

      {abierta && !respondida && (
        <>
          {preguntas.map((p, i) => (
            <PreguntaForm key={p.id} p={p} n={i + 1} valor={respuestas[p.id!]} falta={faltan.has(p.id!)}
              onChange={(v) => { setRespuestas((r) => ({ ...r, [p.id!]: v })); setFaltan((f) => { const n = new Set(f); n.delete(p.id!); return n; }); }} />
          ))}
          <Button size="lg" className="w-full h-12 rounded-2xl text-base" onClick={enviar} disabled={responder.isPending}>
            {responder.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Send className="h-5 w-5 mr-2" />Enviar respuestas</>}
          </Button>
        </>
      )}

      {esModerador && verResultados && (
        <h2 className="pt-2 text-lg font-bold">Resultados</h2>
      )}

      {verResultados && (
        cargandoRes ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          : resultados ? <VistaResultados resultados={resultados} preguntas={preguntas} />
            : e.mostrar_resultados !== "nunca" || esModerador ? null
              : <p className="text-center text-sm text-muted-foreground">Los resultados los ve sólo RRHH.</p>
      )}
      {verResultados && !resultados && !cargandoRes && e.mostrar_resultados === "al_cerrar" && abierta && (
        <p className="text-center text-sm text-muted-foreground">Los resultados se muestran cuando cierre la encuesta.</p>
      )}
    </div>
  );
}

function PreguntaForm({ p, n, valor, falta, onChange }: { p: Pregunta; n: number; valor: Respuestas[string]; falta: boolean; onChange: (v: Respuestas[string]) => void }) {
  const elegidas = Array.isArray(valor) ? valor : [];
  return (
    <section id={`p-${p.id}`} className={cn("space-y-3 rounded-2xl border bg-card p-5 shadow-sm", falta && "border-destructive ring-1 ring-destructive")}>
      <p className="font-semibold"><span className="text-muted-foreground">{n}.</span> {p.texto}{p.obligatoria && <span className="text-destructive"> *</span>}</p>
      {p.tipo === "multiple" && <p className="-mt-2 text-xs text-muted-foreground">Podés elegir varias</p>}
      {(p.tipo === "unica" || p.tipo === "multiple") && (
        <div className="space-y-2">
          {p.opciones.map((o, k) => {
            const sel = elegidas.includes(k);
            return (
              <button key={k} type="button"
                onClick={() => onChange(p.tipo === "unica" ? [k] : sel ? elegidas.filter((x) => x !== k) : [...elegidas, k])}
                className={cn("flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors", sel ? "border-primary bg-primary/5" : "border-border hover:bg-muted")}
                aria-pressed={sel}
              >
                <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center border-2", p.tipo === "unica" ? "rounded-full" : "rounded", sel ? "border-primary bg-primary" : "border-muted-foreground/40")}>
                  {sel && <span className={cn("bg-primary-foreground", p.tipo === "unica" ? "h-2 w-2 rounded-full" : "h-2.5 w-2.5 rounded-sm")} />}
                </span>
                <span>{o}</span>
              </button>
            );
          })}
        </div>
      )}
      {p.tipo === "escala" && (
        <div>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((v) => (
              <button key={v} type="button" onClick={() => onChange(v)} aria-pressed={valor === v} title={ETIQUETAS_ESCALA[v - 1]}
                className={cn("h-12 rounded-xl border-2 text-lg font-bold transition-colors", valor === v ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted")}>
                {v}
              </button>
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground"><span>Muy en desacuerdo</span><span>Muy de acuerdo</span></div>
        </div>
      )}
      {p.tipo === "texto" && (
        <Textarea value={typeof valor === "string" ? valor : ""} onChange={(e) => onChange(e.target.value)} placeholder="Escribí tu respuesta" maxLength={2000} className="min-h-[100px]" />
      )}
    </section>
  );
}

function VistaResultados({ resultados, preguntas }: { resultados: Resultados; preguntas: Pregunta[] }) {
  const { participantes, destinatarios } = resultados;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 rounded-2xl border bg-card p-5 shadow-sm">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Users className="h-6 w-6" /></span>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">Participación</p>
          <p className="text-xl font-bold">{participantes} de {destinatarios} <span className="text-base font-medium text-muted-foreground">({porcentaje(participantes, destinatarios)}%)</span></p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${porcentaje(participantes, destinatarios)}%` }} /></div>
        </div>
      </div>

      {preguntas.map((p, i) => {
        const r = resultados.preguntas.find((x) => x.id === p.id);
        if (!r) return null;
        const etiquetas = p.tipo === "escala" ? ["1", "2", "3", "4", "5"] : p.opciones;
        const totalVotos = p.tipo === "multiple" ? participantes : r.respuestas;
        const max = Math.max(1, ...(r.conteos ?? [0]));
        return (
          <section key={p.id} className="space-y-3 rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold"><span className="text-muted-foreground">{i + 1}.</span> {p.texto}</p>
              <span className="shrink-0 text-xs text-muted-foreground">{r.respuestas} respuestas</span>
            </div>
            {r.conteos && (
              <div className="space-y-2">
                {r.conteos.map((c, k) => (
                  <div key={k}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className={cn(c === max && c > 0 && "font-semibold")}>{p.tipo === "escala" ? `${etiquetas[k]} · ${ETIQUETAS_ESCALA[k]}` : etiquetas[k]}</span>
                      <span className="tabular-nums text-muted-foreground">{c} · {porcentaje(c, totalVotos)}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                      <div className={cn("h-full rounded-full transition-all", c === max && c > 0 ? "bg-primary" : "bg-primary/40")} style={{ width: `${porcentaje(c, totalVotos)}%` }} />
                    </div>
                  </div>
                ))}
                {p.tipo === "escala" && r.promedio !== null && <p className="pt-1 text-sm">Promedio: <span className="font-bold">{Number(r.promedio).toFixed(1)}</span> / 5</p>}
              </div>
            )}
            {p.tipo === "texto" && (
              r.textos?.length ? (
                <ul className="max-h-72 space-y-2 overflow-y-auto">
                  {r.textos.map((t, k) => <li key={k} className="rounded-xl bg-muted px-3 py-2 text-sm whitespace-pre-wrap">{t.texto}</li>)}
                </ul>
              ) : <p className="text-sm text-muted-foreground">{r.textos ? "Sin respuestas todavía." : "Las respuestas escritas las ve sólo RRHH."}</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
