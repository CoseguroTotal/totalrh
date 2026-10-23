import { useEffect, useMemo, useRef, useState } from "react";
import { Globe, Loader2, Megaphone, Newspaper, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  armarInicio, useCelebraciones, useEsModerador, useFeed, useFijadas, useLecturas, usePerfiles, useSessionUserId,
  type Publicacion, type TipoPublicacion,
} from "@/hooks/useMuro";
import { CelebracionesCard, Composer, PostCard, type Celebracion } from "@/components/muro/MuroComponents";
import { AccesosRapidos, AccesosRapidosMovil, ContactosCard, ProximosEventosCard } from "@/components/muro/MuroLaterales";
import InstallPWAPrompt from "@/components/InstallPWAPrompt";
import { MarcaMuroBanner } from "@/components/Marca";
import { useGrupos } from "@/hooks/useGrupos";

type Filtro = "todo" | "generales" | "grupos" | "comunicados";

const FILTROS: { valor: Filtro; label: string; icon: typeof Newspaper; vacio: string }[] = [
  { valor: "todo", label: "Todo", icon: Newspaper, vacio: "El muro está vacío" },
  { valor: "generales", label: "Generales", icon: Globe, vacio: "Todavía no hay publicaciones generales" },
  { valor: "grupos", label: "Mis grupos", icon: Users, vacio: "Todavía no hay publicaciones en tus grupos" },
  { valor: "comunicados", label: "Comunicados", icon: Megaphone, vacio: "Todavía no hay comunicados" },
];

function filtrar(publicaciones: Publicacion[], filtro: Filtro) {
  if (filtro === "generales") return publicaciones.filter((p) => !p.grupo_id);
  if (filtro === "grupos") return publicaciones.filter((p) => !!p.grupo_id);
  if (filtro === "comunicados") return publicaciones.filter((p) => p.tipo === "comunicado");
  return publicaciones;
}

export default function Muro() {
  const { data: userId } = useSessionUserId();
  const { data: esModerador = false } = useEsModerador();
  const { data: listaGrupos, isError: errorGrupos } = useGrupos();
  // En el inicio: lo general y lo de los grupos donde participo (aunque RRHH pueda ver todos)
  const misGrupos = useMemo(() => listaGrupos?.filter((g) => g.soy_miembro), [listaGrupos]);
  const feed = useFeed(undefined, useMemo(() => (errorGrupos ? [] : misGrupos?.map((g) => g.id)), [errorGrupos, misGrupos]));
  const fijadas = useFijadas();
  const celebraciones = useCelebraciones(7);
  const [filtro, setFiltro] = useState<Filtro>("todo");
  const [saludo, setSaludo] = useState<{ contenido: string; tipo: TipoPublicacion; mencion_user_id: string | null; key: number } | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  const publicaciones = useMemo(() => armarInicio(fijadas.data ?? [], feed.data?.pages.flat() ?? []), [fijadas.data, feed.data]);
  const visibles = filtrar(publicaciones, filtro);
  const vacio = FILTROS.find((f) => f.valor === filtro)!.vacio;

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
  const { data: lecturas } = useLecturas(publicaciones.map((p) => p.id));
  const grupos = useMemo(() => new Map((listaGrupos ?? []).map((g) => [g.id, g])), [listaGrupos]);

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
            <ProximosEventosCard />
            <div className="hidden lg:block"><ContactosCard /></div>
          </div>
        </aside>

        <section className="lg:order-2 mx-auto w-full max-w-[680px] space-y-4 min-w-0">
          <MarcaMuroBanner />
          <AccesosRapidosMovil />
          <InstallPWAPrompt />
          <Composer perfil={userId ? perfiles.get(userId) : null} esModerador={esModerador} inicial={saludo} destinos={misGrupos} />

          <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 scrollbar-none sm:mx-0 sm:px-0" role="tablist" aria-label="Filtrar publicaciones">
            {FILTROS.map((f) => (
              <Button key={f.valor} size="sm" className="shrink-0 rounded-full" variant={filtro === f.valor ? "default" : "secondary"}
                onClick={() => setFiltro(f.valor)} role="tab" aria-selected={filtro === f.valor}>
                <f.icon className="h-4 w-4 mr-1.5" />{f.label}
              </Button>
            ))}
          </div>

          {feed.isLoading || feed.isPending ? (
            <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : feed.isError ? (
            <div className="rounded-2xl border bg-card p-8 text-center">
              <p className="text-sm text-destructive">No se pudo cargar el muro.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => feed.refetch()}>Reintentar</Button>
            </div>
          ) : visibles.length === 0 ? (
            <div className="rounded-2xl border bg-card p-10 text-center">
              <Newspaper className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">{vacio}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {filtro === "grupos" && !misGrupos?.length ? "Todavía no participás de ningún grupo." : "Sé la primera persona en compartir una novedad."}
              </p>
            </div>
          ) : (
            visibles.map((p) => (
              <PostCard key={p.id} pub={p} perfiles={perfiles} userId={userId} esModerador={esModerador} lectura={lecturas?.get(p.id)} grupo={p.grupo_id ? grupos.get(p.grupo_id) ?? null : null} />
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
