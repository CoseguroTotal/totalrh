import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Megaphone, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useCelebraciones, useEsModerador, useFeed, usePerfiles, useSessionUserId, type TipoPublicacion,
} from "@/hooks/useMuro";
import { CelebracionesCard, Composer, PostCard, type Celebracion } from "@/components/muro/MuroComponents";
import { AccesosRapidos, AccesosRapidosMovil, ContactosCard } from "@/components/muro/MuroLaterales";

type Filtro = "todo" | "comunicados";

export default function Muro() {
  const { data: userId } = useSessionUserId();
  const { data: esModerador = false } = useEsModerador();
  const feed = useFeed();
  const celebraciones = useCelebraciones(7);
  const [filtro, setFiltro] = useState<Filtro>("todo");
  const [saludo, setSaludo] = useState<{ contenido: string; tipo: TipoPublicacion; mencion_user_id: string | null; key: number } | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  const publicaciones = useMemo(() => feed.data?.pages.flat() ?? [], [feed.data]);
  const visibles = filtro === "comunicados" ? publicaciones.filter((p) => p.tipo === "comunicado") : publicaciones;

  const idsPerfiles = useMemo(() => {
    const ids: string[] = userId ? [userId] : [];
    for (const p of publicaciones) {
      ids.push(p.autor_id);
      if (p.mencion_user_id) ids.push(p.mencion_user_id);
      for (const c of p.comentarios) ids.push(c.autor_id);
    }
    return ids;
  }, [publicaciones, userId]);
  const { data: perfiles = new Map() } = usePerfiles(idsPerfiles);

  // Scroll infinito
  useEffect(() => {
    const el = finRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
    }, { rootMargin: "400px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [feed]);

  const saludar = (c: Celebracion) => {
    const contenido = c.tipo === "cumpleanios"
      ? `¡Feliz cumpleaños, ${c.nombre}! 🎂🎉 Que tengas un día excelente.`
      : `¡Felicitaciones, ${c.nombre}, por tus ${c.anios} ${c.anios === 1 ? "año" : "años"} con nosotros! 🏅`;
    setSaludo({ contenido, tipo: c.tipo as TipoPublicacion, mencion_user_id: c.user_id, key: Date.now() });
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => document.getElementById("muro-composer")?.focus(), 300);
  };

  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[260px_minmax(0,1fr)_300px]">
        {/* Izquierda: perfil y accesos rápidos (sólo pantallas grandes) */}
        <aside className="hidden xl:block">
          <div className="sticky top-4"><AccesosRapidos perfil={userId ? perfiles.get(userId) : null} /></div>
        </aside>

        {/* Derecha: celebraciones y contactos; en el celular las celebraciones van arriba del feed */}
        <aside className="lg:order-3 space-y-4">
          <div className="lg:sticky lg:top-4 space-y-4">
            <CelebracionesCard
              celebraciones={(celebraciones.data ?? []) as Celebracion[]}
              isLoading={celebraciones.isLoading}
              onSaludar={saludar}
              userId={userId}
            />
            <div className="hidden lg:block"><ContactosCard /></div>
          </div>
        </aside>

        <section className="lg:order-2 mx-auto w-full max-w-[680px] space-y-4 min-w-0">
          <AccesosRapidosMovil />
          <Composer perfil={userId ? perfiles.get(userId) : null} esModerador={esModerador} inicial={saludo} />

          <div className="flex gap-2" role="tablist" aria-label="Filtrar publicaciones">
            <Button size="sm" className="rounded-full" variant={filtro === "todo" ? "default" : "secondary"} onClick={() => setFiltro("todo")} role="tab" aria-selected={filtro === "todo"}>
              <Newspaper className="h-4 w-4 mr-1.5" />Todo
            </Button>
            <Button size="sm" className="rounded-full" variant={filtro === "comunicados" ? "default" : "secondary"} onClick={() => setFiltro("comunicados")} role="tab" aria-selected={filtro === "comunicados"}>
              <Megaphone className="h-4 w-4 mr-1.5" />Comunicados
            </Button>
          </div>

          {feed.isLoading ? (
            <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : feed.isError ? (
            <div className="rounded-2xl border bg-card p-8 text-center">
              <p className="text-sm text-destructive">No se pudo cargar el muro.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => feed.refetch()}>Reintentar</Button>
            </div>
          ) : visibles.length === 0 ? (
            <div className="rounded-2xl border bg-card p-10 text-center">
              <Newspaper className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">{filtro === "comunicados" ? "Todavía no hay comunicados" : "El muro está vacío"}</p>
              <p className="text-sm text-muted-foreground mt-1">Sé la primera persona en compartir una novedad.</p>
            </div>
          ) : (
            visibles.map((p) => (
              <PostCard key={p.id} pub={p} perfiles={perfiles} userId={userId} esModerador={esModerador} />
            ))
          )}

          <div ref={finRef} />
          {feed.isFetchingNextPage && (
            <div className="py-4 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          )}
        </section>
      </div>
    </div>
  );
}
