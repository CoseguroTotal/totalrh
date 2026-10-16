import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MessageCircle, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { usePerfiles, useSessionUserId } from "@/hooks/useMuro";
import { useConversaciones, type Conversacion } from "@/hooks/useChat";
import { ListaConversaciones, NuevoChatDialog, VistaConversacion } from "@/components/chat/ChatComponents";

/** Una conversación recién creada todavía no aparece en la bandeja (no tiene mensajes): se lee directo. */
function useConversacionSuelta(id: string | undefined, yo: string | null | undefined, enLista: boolean) {
  return useQuery({
    queryKey: ["chat", "suelta", id],
    enabled: !!id && !!yo && !enLista,
    queryFn: async (): Promise<Conversacion | null> => {
      const { data: c } = await supabase.from("chat_conversaciones").select("id, tipo, nombre, ultimo_mensaje_at").eq("id", id!).maybeSingle();
      if (!c) return null;
      const { data: ps } = await supabase.from("chat_participantes").select("user_id").eq("conversacion_id", id!);
      return {
        ...c,
        tipo: c.tipo as Conversacion["tipo"],
        ultimo_texto: null, ultimo_adjunto_tipo: null, ultimo_autor_id: null, ultimo_eliminado: null, no_leidos: 0,
        participantes: (ps ?? []).map((p) => p.user_id).filter((u) => u !== yo),
      };
    },
  });
}

export default function Mensajes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: yo } = useSessionUserId();
  const { data: conversaciones = [], isLoading } = useConversaciones();
  const [nuevo, setNuevo] = useState(false);

  const enLista = conversaciones.find((c) => c.id === id);
  const { data: suelta, isLoading: cargandoSuelta } = useConversacionSuelta(id, yo, !!enLista);
  const activa = enLista ?? suelta ?? null;

  const ids = useMemo(() => {
    const s = new Set<string>(yo ? [yo] : []);
    for (const c of conversaciones) c.participantes.forEach((p) => s.add(p));
    activa?.participantes.forEach((p) => s.add(p));
    return [...s];
  }, [conversaciones, activa, yo]);
  const { data: perfiles = new Map() } = usePerfiles(ids);

  return (
    // El layout le da todo el alto disponible (modo chat)
    <div className="h-full md:p-4">
      <div className="flex h-full overflow-hidden bg-card md:rounded-2xl md:border md:shadow-sm">
        <aside className={cn("w-full md:w-80 lg:w-96 shrink-0 border-r", id ? "hidden md:block" : "block")}>
          <ListaConversaciones
            conversaciones={conversaciones}
            perfiles={perfiles}
            yo={yo}
            activa={id}
            onElegir={(cid) => navigate(`/mensajes/${cid}`)}
            onNuevo={() => setNuevo(true)}
            isLoading={isLoading}
          />
        </aside>
        <section className={cn("min-w-0 flex-1", id ? "block" : "hidden md:block")}>
          {activa ? (
            <VistaConversacion conversacion={activa} perfiles={perfiles} yo={yo} onVolver={() => navigate("/mensajes")} />
          ) : id && (isLoading || cargandoSuelta) ? (
            <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary"><MessageCircle className="h-8 w-8" /></div>
              <p className="mt-4 text-lg font-semibold">{id ? "No encontramos esta conversación" : "Tus mensajes"}</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">Enviá mensajes, fotos, audios y documentos a tus compañeros o a un grupo.</p>
              <Button className="mt-4" onClick={() => setNuevo(true)}><MessageSquarePlus className="h-4 w-4 mr-2" />Nuevo mensaje</Button>
            </div>
          )}
        </section>
      </div>
      <NuevoChatDialog open={nuevo} onOpenChange={setNuevo} onCreado={(cid) => navigate(`/mensajes/${cid}`)} />
    </div>
  );
}
