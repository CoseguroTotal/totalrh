import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { toast } from "sonner";
import { avisoSistema, sonar } from "@/lib/avisos";

export function useNotificaciones() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["notificaciones"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("notificaciones")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  return query;
}

type Notif = { id: string; user_id: string; titulo: string; mensaje: string; link: string | null };

/**
 * Tiempo real de la campanita (una sola vez para toda la app): actualiza la lista,
 * suena, muestra un aviso en pantalla y, si la app no está a la vista, uno del sistema.
 */
export function useNotificacionesRealtime(abrir: (link: string) => void) {
  const qc = useQueryClient();
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelado = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      const userId = session?.user.id;
      if (!userId || cancelado) return;
      channel = supabase
        .channel(`notificaciones-${userId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "notificaciones", filter: `user_id=eq.${userId}` }, (payload) => {
          qc.invalidateQueries({ queryKey: ["notificaciones"] });
          const n = payload.new as Notif;
          sonar("aviso");
          toast(n.titulo, {
            description: n.mensaje,
            action: n.link ? { label: "Ver", onClick: () => abrir(n.link!) } : undefined,
          });
          void avisoSistema(n.titulo, n.mensaje, n.link ?? "/muro", `notif-${n.id}`);
        })
        .subscribe();
    });
    return () => { cancelado = true; if (channel) supabase.removeChannel(channel); };
  }, [qc, abrir]);
}

export function useMarcarLeida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notificaciones").update({ leida: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notificaciones"] }),
  });
}

export function useMarcarTodasLeidas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from("notificaciones").update({ leida: true }).eq("user_id", user.id).eq("leida", false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notificaciones"] }),
  });
}
