import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, ClipboardList, Clock, Lock, Plus, Vote, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEsModerador } from "@/hooks/useMuro";
import { estaAbierta, useEncuestas, type Encuesta } from "@/hooks/useEncuestas";

type Filtro = "pendientes" | "respondidas" | "cerradas" | "borradores";

function venceTexto(e: Encuesta) {
  if (!e.cierra_at) return "Sin fecha de cierre";
  const d = new Date(e.cierra_at);
  return `${d < new Date() ? "Cerró" : "Cierra"} el ${d.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}`;
}

export default function Encuestas() {
  const navigate = useNavigate();
  const { data: esModerador = false } = useEsModerador();
  const { data: encuestas = [], isLoading } = useEncuestas();
  const [filtro, setFiltro] = useState<Filtro>("pendientes");

  const grupos: Record<Filtro, typeof encuestas> = {
    pendientes: encuestas.filter((e) => estaAbierta(e) && !e.respondida),
    respondidas: encuestas.filter((e) => e.estado !== "borrador" && e.respondida),
    cerradas: encuestas.filter((e) => e.estado !== "borrador" && !estaAbierta(e) && !e.respondida),
    borradores: encuestas.filter((e) => e.estado === "borrador"),
  };
  const pestanas: { id: Filtro; label: string }[] = [
    { id: "pendientes", label: "Por responder" },
    { id: "respondidas", label: "Respondidas" },
    { id: "cerradas", label: "Cerradas" },
    ...(esModerador ? [{ id: "borradores" as const, label: "Borradores" }] : []),
  ];
  const lista = grupos[filtro];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Vote className="h-6 w-6 text-violet-500" />Encuestas</h1>
          <p className="text-sm text-muted-foreground mt-1">Tu opinión ayuda a mejorar el lugar de trabajo.</p>
        </div>
        {esModerador && (
          <Button onClick={() => navigate("/encuestas/nueva")} className="rounded-full"><Plus className="h-4 w-4 mr-1.5" />Nueva encuesta</Button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-none" role="tablist">
        {pestanas.map((t) => (
          <Button
            key={t.id}
            size="sm"
            role="tab"
            aria-selected={filtro === t.id}
            variant={filtro === t.id ? "default" : "secondary"}
            className="rounded-full shrink-0"
            onClick={() => setFiltro(t.id)}
          >
            {t.label}
            {grupos[t.id].length > 0 && (
              <span className={cn("ml-1.5 rounded-full px-1.5 text-[11px]", filtro === t.id ? "bg-primary-foreground/20" : "bg-background")}>{grupos[t.id].length}</span>
            )}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : lista.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center">
          <ClipboardList className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">{filtro === "pendientes" ? "¡Estás al día! No tenés encuestas por responder." : "No hay encuestas acá."}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {lista.map((e) => (
            <li key={e.id}>
              <Link
                to={e.estado === "borrador" ? `/encuestas/${e.id}/editar` : `/encuestas/${e.id}`}
                className="flex items-center gap-4 rounded-2xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <span className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                  e.estado === "borrador" ? "bg-muted text-muted-foreground" : e.respondida ? "bg-success/15 text-success" : estaAbierta(e) ? "bg-violet-500/15 text-violet-600" : "bg-muted text-muted-foreground"
                )}>
                  {e.estado === "borrador" ? <ClipboardList className="h-6 w-6" /> : e.respondida ? <CheckCircle2 className="h-6 w-6" /> : estaAbierta(e) ? <Vote className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{e.titulo}</p>
                  {e.descripcion && <p className="line-clamp-1 text-sm text-muted-foreground">{e.descripcion}</p>}
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />{e.estado === "borrador" ? "Borrador sin publicar" : venceTexto(e)}
                    {e.anonima && e.estado !== "borrador" && " · Anónima"}
                  </p>
                </div>
                {filtro === "pendientes" ? (
                  <span className="rounded-full bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">Responder</span>
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
