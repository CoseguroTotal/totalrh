import { useSearchParams } from "react-router-dom";
import { ArrowLeft, Inbox, LifeBuoy, Loader2 } from "lucide-react";
import ConversacionSoporte from "@/components/ConversacionSoporte";
import { useConversacionesSoporte, useSesionSoporte } from "@/hooks/useSoporte";
import { cn } from "@/lib/utils";

const cuando = (iso: string) => {
  const d = new Date(iso);
  const hoy = new Date().toDateString() === d.toDateString();
  return hoy ? d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }) : d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
};

/** Bandeja del administrador maestro: las consultas de ayuda de todos los usuarios de la instalación. */
export default function Soporte() {
  const { userId, esSoporte } = useSesionSoporte();
  const { data: conversaciones = [], isLoading } = useConversacionesSoporte(esSoporte);
  const [params, setParams] = useSearchParams();
  const abierta = params.get("u");

  if (!userId) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!esSoporte) return <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">Esta bandeja es sólo para el soporte de TotalRH.</div>;

  const actual = conversaciones.find((c) => c.usuario_id === abierta);

  return (
    <div className="mx-auto flex h-[calc(100dvh-11rem)] max-w-5xl overflow-hidden rounded-2xl border bg-card shadow-sm sm:h-[calc(100dvh-9rem)]">
      <aside className={cn("w-full shrink-0 border-r sm:w-80", abierta && "hidden sm:block")}>
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <LifeBuoy className="h-5 w-5 text-primary" />
          <h1 className="font-semibold">Soporte</h1>
        </div>
        {isLoading ? (
          <Loader2 className="mx-auto mt-8 h-5 w-5 animate-spin text-muted-foreground" />
        ) : conversaciones.length === 0 ? (
          <p className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground"><Inbox className="h-6 w-6" />Todavía no hay consultas.</p>
        ) : (
          <ul className="divide-y overflow-y-auto">
            {conversaciones.map((c) => (
              <li key={c.usuario_id}>
                <button type="button" onClick={() => setParams({ u: c.usuario_id })}
                  className={cn("flex w-full items-start gap-2 px-4 py-3 text-left hover:bg-muted/60", abierta === c.usuario_id && "bg-muted")}>
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate text-sm", c.sinLeer ? "font-semibold" : "font-medium")}>{c.nombre}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.ultimo.autor_id === userId ? "Vos: " : ""}{c.ultimo.contenido}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-[10px] text-muted-foreground">{cuando(c.ultimo.created_at)}</span>
                    {c.sinLeer > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{c.sinLeer}</span>}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
      <section className={cn("min-w-0 flex-1 flex-col bg-muted/30", abierta ? "flex" : "hidden sm:flex")}>
        {abierta ? (
          <>
            <div className="flex items-center gap-2 border-b bg-card px-3 py-2.5">
              <button type="button" className="rounded-full p-1.5 hover:bg-muted sm:hidden" onClick={() => setParams({})} aria-label="Volver"><ArrowLeft className="h-4 w-4" /></button>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{actual?.nombre ?? "Usuario"}</p>
                {actual?.email && <p className="truncate text-xs text-muted-foreground">{actual.email}</p>}
              </div>
            </div>
            <ConversacionSoporte usuarioId={abierta} yo={userId} emailUsuario={actual?.email} />
          </>
        ) : (
          <p className="m-auto text-sm text-muted-foreground">Elegí una consulta para responder.</p>
        )}
      </section>
    </div>
  );
}
