import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCheck, Eye, Loader2, ShieldCheck, Vote } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { registrarVista, useConfirmarLectura, useDetalleLecturas, type Publicacion, type ResumenLectura } from "@/hooks/useMuro";
import { estaAbierta, useEncuestaDePublicacion } from "@/hooks/useEncuestas";
import { horario, useEventoDePublicacion } from "@/hooks/useEventos";
import { UserAvatar, nombreCompleto } from "@/components/muro/MuroComponents";

/** Cuenta la publicación como vista cuando se ve al menos la mitad durante un segundo. */
export function useVistaAlMostrar(ref: React.RefObject<HTMLElement>, id: string) {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) timer = setTimeout(() => { registrarVista(id); obs.disconnect(); }, 1000);
      else clearTimeout(timer);
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => { clearTimeout(timer); obs.disconnect(); };
  }, [ref, id]);
}

const fechaHora = (iso: string) => new Date(iso).toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** Comunicado que pide "Leí y entendí". */
export function BloqueConfirmacion({ pub, lectura, puedeVerDetalle }: { pub: Publicacion; lectura?: ResumenLectura; puedeVerDetalle: boolean }) {
  const confirmar = useConfirmarLectura();
  const [detalle, setDetalle] = useState(false);
  const confirmado = lectura?.yo_confirmado_at;

  return (
    <div className="mx-4 mb-3 rounded-xl border border-warning/40 bg-warning/10 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <ShieldCheck className="h-5 w-5 shrink-0 text-warning" />
        <p className="flex-1 text-sm font-medium">
          {confirmado ? `Confirmaste la lectura el ${fechaHora(confirmado)}` : "Este comunicado requiere que confirmes que lo leíste."}
        </p>
        {!confirmado && (
          <Button size="sm" className="rounded-full" disabled={confirmar.isPending}
            onClick={() => confirmar.mutate(pub.id, { onSuccess: () => toast.success("Lectura confirmada"), onError: () => toast.error("No se pudo confirmar") })}>
            {confirmar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCheck className="h-4 w-4 mr-1.5" />Leí y entendí</>}
          </Button>
        )}
      </div>
      {puedeVerDetalle && (
        <button type="button" onClick={() => setDetalle(true)} className="mt-2 text-xs font-medium text-warning hover:underline">
          {lectura?.confirmados ?? 0} {lectura?.confirmados === 1 ? "persona confirmó" : "personas confirmaron"} · Ver quiénes faltan
        </button>
      )}
      {puedeVerDetalle && <DetalleLecturasDialog pub={pub} open={detalle} onOpenChange={setDetalle} inicial="pendientes" />}
    </div>
  );
}

/** "Visto por N" en la barra de la publicación; el autor y RRHH ven la lista. */
export function VistoPor({ pub, lectura, puedeVerDetalle }: { pub: Publicacion; lectura?: ResumenLectura; puedeVerDetalle: boolean }) {
  const [abierto, setAbierto] = useState(false);
  if (!lectura || lectura.vistos === 0) return null;
  const texto = <><Eye className="h-3.5 w-3.5" />Visto por {lectura.vistos}</>;
  return puedeVerDetalle ? (
    <>
      <button type="button" className="flex items-center gap-1 hover:underline" onClick={() => setAbierto(true)}>{texto}</button>
      <DetalleLecturasDialog pub={pub} open={abierto} onOpenChange={setAbierto} inicial="vistos" />
    </>
  ) : <span className="flex items-center gap-1">{texto}</span>;
}

function DetalleLecturasDialog({ pub, open, onOpenChange, inicial }: { pub: Publicacion; open: boolean; onOpenChange: (o: boolean) => void; inicial: "vistos" | "pendientes" | "confirmados" }) {
  const { data = [], isLoading } = useDetalleLecturas(pub.id, open);
  const [pestana, setPestana] = useState(inicial);
  useEffect(() => { if (open) setPestana(inicial); }, [open, inicial]);

  const grupos = {
    vistos: data.filter((d) => d.visto_at),
    confirmados: data.filter((d) => d.confirmado_at),
    pendientes: data.filter((d) => (pub.requiere_confirmacion ? !d.confirmado_at : !d.visto_at)),
  };
  const lista = grupos[pestana];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Lecturas</DialogTitle>
          <DialogDescription>Quién vio{pub.requiere_confirmacion ? " y confirmó" : ""} esta publicación.</DialogDescription>
        </DialogHeader>
        <Tabs value={pestana} onValueChange={(v) => setPestana(v as typeof pestana)}>
          <TabsList className={cn("grid w-full", pub.requiere_confirmacion ? "grid-cols-3" : "grid-cols-2")}>
            <TabsTrigger value="vistos">Vieron ({grupos.vistos.length})</TabsTrigger>
            {pub.requiere_confirmacion && <TabsTrigger value="confirmados">Confirmaron ({grupos.confirmados.length})</TabsTrigger>}
            <TabsTrigger value="pendientes">Faltan ({grupos.pendientes.length})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="max-h-[50vh] overflow-y-auto -mx-2">
          {isLoading ? <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            : lista.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">{pestana === "pendientes" ? "¡No falta nadie!" : "Nadie todavía."}</p>
              : lista.map((d) => (
                <div key={d.user_id} className="flex items-center gap-3 rounded-xl px-2 py-2">
                  <UserAvatar perfil={d} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{nombreCompleto(d)}</p>
                    {d.puesto && <p className="truncate text-xs text-muted-foreground">{d.puesto}</p>}
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {pestana === "confirmados" && d.confirmado_at ? fechaHora(d.confirmado_at) : pestana === "vistos" && d.visto_at ? fechaHora(d.visto_at) : ""}
                  </span>
                </div>
              ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Tarjeta de encuesta dentro del muro. */
export function TarjetaEncuesta({ publicacionId }: { publicacionId: string }) {
  const { data: enc } = useEncuestaDePublicacion(publicacionId);
  if (!enc) return null;
  const abierta = estaAbierta(enc);
  return (
    <Link to={`/encuestas/${enc.id}`} className="mx-4 mb-3 flex items-center gap-3 rounded-xl border bg-gradient-to-r from-violet-500/10 to-primary/10 p-3 transition-shadow hover:shadow-md">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500 text-white"><Vote className="h-6 w-6" /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{enc.titulo}</p>
        <p className="text-xs text-muted-foreground">{abierta ? "Tu opinión cuenta: tarda un par de minutos" : "Encuesta cerrada · ver resultados"}</p>
      </div>
      <span className={cn("shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold", abierta ? "bg-primary text-primary-foreground" : "bg-muted")}>{abierta ? "Responder" : "Ver"}</span>
    </Link>
  );
}

/** Tarjeta de evento dentro del muro. */
export function TarjetaEventoMuro({ publicacionId }: { publicacionId: string }) {
  const { data: ev } = useEventoDePublicacion(publicacionId);
  if (!ev) return null;
  const d = new Date(ev.inicio);
  return (
    <Link to={`/eventos?evento=${ev.id}`} className="mx-4 mb-3 flex items-center gap-3 rounded-xl border bg-gradient-to-r from-sky-500/10 to-primary/10 p-3 transition-shadow hover:shadow-md">
      <div className="flex w-12 shrink-0 flex-col items-center rounded-xl border bg-card py-1">
        <span className="text-[10px] font-semibold uppercase text-primary">{d.toLocaleDateString("es-AR", { month: "short" }).replace(".", "")}</span>
        <span className="text-xl font-bold leading-tight">{d.getDate()}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{ev.titulo}</p>
        <p className="truncate text-xs text-muted-foreground">{horario(ev)}{ev.lugar ? ` · ${ev.lugar}` : ""}</p>
      </div>
      <span className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">Ver</span>
    </Link>
  );
}
