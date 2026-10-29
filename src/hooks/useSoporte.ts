import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { NOMBRE_APP } from "@/marca";

/** Administrador maestro: atiende el soporte en todas las instalaciones y no participa del chat interno. */
export { SOPORTE_EMAIL, esEmailSoporte as esCuentaSoporte } from "../../supabase/functions/_shared/soporte";
import { SOPORTE_EMAIL, esEmailSoporte as esCuentaSoporte } from "../../supabase/functions/_shared/soporte";

export type MensajeSoporte = {
  id: string;
  usuario_id: string;
  autor_id: string;
  contenido: string;
  pantalla: string | null;
  usuario_nombre: string | null;
  usuario_email: string | null;
  leido: boolean;
  created_at: string;
};

const KEY = ["soporte"];

/** Usuario de la sesión (id y si es la cuenta de soporte). */
export function useSesionSoporte() {
  const [s, setS] = useState<{ id: string | null; email: string | null }>({ id: null, email: null });
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setS({ id: session?.user.id ?? null, email: session?.user.email ?? null }));
  }, []);
  return { userId: s.id, esSoporte: esCuentaSoporte(s.email) };
}

/** Mensajes de una conversación de soporte (la propia, o cualquiera si sos el soporte). */
export function useMensajesSoporte(usuarioId: string | null | undefined) {
  return useQuery({
    queryKey: [...KEY, "mensajes", usuarioId],
    enabled: !!usuarioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("soporte_mensajes")
        .select("*")
        .eq("usuario_id", usuarioId!)
        .order("created_at")
        .limit(500);
      if (error) throw error;
      return data as MensajeSoporte[];
    },
  });
}

export type ConversacionSoporte = {
  usuario_id: string;
  nombre: string;
  email: string | null;
  ultimo: MensajeSoporte;
  sinLeer: number;
};

/** Bandeja del soporte: una fila por usuario, la más reciente arriba. */
export function useConversacionesSoporte(habilitado: boolean) {
  return useQuery({
    queryKey: [...KEY, "bandeja"],
    enabled: habilitado,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("soporte_mensajes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      const porUsuario = new Map<string, ConversacionSoporte>();
      for (const m of data as MensajeSoporte[]) {
        const c = porUsuario.get(m.usuario_id) ?? {
          usuario_id: m.usuario_id, nombre: m.usuario_nombre ?? "Usuario", email: m.usuario_email, ultimo: m, sinLeer: 0,
        };
        if (m.autor_id === m.usuario_id && !m.leido) c.sinLeer++;
        porUsuario.set(m.usuario_id, c);
      }
      return [...porUsuario.values()];
    },
  });
}

/** Cantidad de mensajes sin leer: para el usuario, respuestas del soporte; para el soporte, consultas. */
export function useSinLeerSoporte(userId: string | null, esSoporte: boolean) {
  return useQuery({
    queryKey: [...KEY, "sin-leer", userId, esSoporte],
    enabled: !!userId,
    queryFn: async () => {
      let q = supabase.from("soporte_mensajes").select("id", { count: "exact", head: true }).eq("leido", false).neq("autor_id", userId!);
      if (!esSoporte) q = q.eq("usuario_id", userId!);
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    },
  });
}

/** Tiempo real de los mensajes de soporte. */
export function useSoporteRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("soporte-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "soporte_mensajes" }, () => qc.invalidateQueries({ queryKey: KEY }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);
}

export function useMarcarLeidosSoporte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ usuarioId, yo }: { usuarioId: string; yo: string }) => {
      const { error } = await supabase.from("soporte_mensajes").update({ leido: true })
        .eq("usuario_id", usuarioId).neq("autor_id", yo).eq("leido", false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

const escapar = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Email de aviso a la otra parte (si el envío de emails no está configurado, igual queda en la app). */
async function avisarPorEmail(para: string, asunto: string, texto: string, enlace: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({
        to: para,
        subject: asunto,
        html: `<p style="white-space:pre-wrap">${escapar(texto)}</p><p><a href="${enlace}">Responder en ${escapar(NOMBRE_APP)}</a></p>`,
      }),
    });
  } catch { /* el aviso en la app ya quedó */ }
}

export function useEnviarSoporte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { usuarioId: string; yo: string; contenido: string; pantalla?: string; emailUsuario?: string | null; nombreUsuario?: string }) => {
      const { data, error } = await supabase.from("soporte_mensajes").insert({
        usuario_id: v.usuarioId, autor_id: v.yo, contenido: v.contenido, pantalla: v.pantalla ?? null,
      }).select("*").single();
      if (error) throw error;
      const m = data as MensajeSoporte;
      const origen = window.location.origin;
      if (v.yo === v.usuarioId) {
        void avisarPorEmail(SOPORTE_EMAIL, `Soporte ${NOMBRE_APP}: ${m.usuario_nombre ?? "consulta"}`,
          `${m.usuario_nombre ?? ""} (${m.usuario_email ?? ""}) escribió desde ${m.pantalla ?? "la app"}:\n\n${m.contenido}`,
          `${origen}/soporte?u=${m.usuario_id}`);
      } else if (v.emailUsuario) {
        void avisarPorEmail(v.emailUsuario, `Respuesta de soporte · ${NOMBRE_APP}`, m.contenido, `${origen}/ayuda`);
      }
      return m;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
