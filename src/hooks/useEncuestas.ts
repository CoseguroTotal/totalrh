import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type TipoPregunta = "unica" | "multiple" | "escala" | "texto";
export type MostrarResultados = "al_responder" | "al_cerrar" | "nunca";

export interface Pregunta {
  id?: string;
  orden: number;
  texto: string;
  tipo: TipoPregunta;
  opciones: string[];
  obligatoria: boolean;
}

export interface Encuesta {
  id: string;
  titulo: string;
  descripcion: string;
  anonima: boolean;
  mostrar_resultados: MostrarResultados;
  estado: "borrador" | "publicada" | "cerrada";
  cierra_at: string | null;
  creada_por: string;
  publicada_at: string | null;
  publicacion_id: string | null;
  created_at: string;
}

/** Respuestas por id de pregunta: índices de opción, valor 1–5 o texto. */
export type Respuestas = Record<string, number[] | number | string | undefined>;

export interface Resultados {
  participantes: number;
  destinatarios: number;
  preguntas: { id: string; conteos: number[] | null; respuestas: number; promedio: number | null; textos: { texto: string; respondente: string | null }[] | null }[];
}

export const TIPOS_PREGUNTA: { tipo: TipoPregunta; label: string }[] = [
  { tipo: "unica", label: "Opción única" },
  { tipo: "multiple", label: "Opción múltiple" },
  { tipo: "escala", label: "Escala del 1 al 5" },
  { tipo: "texto", label: "Respuesta libre" },
];

/* ─────────────── Reglas puras (testeadas) ─────────────── */

export function estaAbierta(e: { estado: string; cierra_at: string | null }, ahora = new Date()) {
  return e.estado === "publicada" && (!e.cierra_at || new Date(e.cierra_at) > ahora);
}

/** Preguntas obligatorias sin responder (para avisar antes de enviar). */
export function faltantes(preguntas: Pregunta[], r: Respuestas) {
  return preguntas.filter((p) => {
    if (!p.obligatoria) return false;
    const v = r[p.id!];
    if (p.tipo === "texto") return typeof v !== "string" || !v.trim();
    if (p.tipo === "escala") return typeof v !== "number";
    return !Array.isArray(v) || v.length === 0;
  });
}

/** Problemas de una encuesta antes de publicarla. */
export function erroresDeEncuesta(titulo: string, preguntas: Pregunta[]) {
  const errores: string[] = [];
  if (!titulo.trim()) errores.push("Poné un título");
  if (preguntas.length === 0) errores.push("Agregá al menos una pregunta");
  preguntas.forEach((p, i) => {
    if (!p.texto.trim()) errores.push(`La pregunta ${i + 1} no tiene texto`);
    if ((p.tipo === "unica" || p.tipo === "multiple") && p.opciones.filter((o) => o.trim()).length < 2) {
      errores.push(`La pregunta ${i + 1} necesita al menos dos opciones`);
    }
  });
  return errores;
}

export const porcentaje = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 100) : 0);

/* ─────────────── Consultas ─────────────── */

export function useEncuestas() {
  return useQuery({
    queryKey: ["encuestas"],
    queryFn: async () => {
      const [{ data: encuestas, error }, { data: parts }] = await Promise.all([
        supabase.from("encuestas").select("*").order("created_at", { ascending: false }),
        supabase.from("encuesta_participaciones").select("encuesta_id"),
      ]);
      if (error) throw error;
      const respondidas = new Set((parts ?? []).map((p) => p.encuesta_id));
      return ((encuestas ?? []) as Encuesta[]).map((e) => ({ ...e, respondida: respondidas.has(e.id) }));
    },
  });
}

export function useEncuestasPendientes() {
  const { data = [] } = useEncuestas();
  return data.filter((e) => estaAbierta(e) && !e.respondida).length;
}

export function useEncuesta(id: string | undefined) {
  return useQuery({
    queryKey: ["encuestas", id],
    enabled: !!id,
    queryFn: async () => {
      const [{ data: e, error }, { data: ps, error: e2 }, { data: part }] = await Promise.all([
        supabase.from("encuestas").select("*").eq("id", id!).maybeSingle(),
        supabase.from("encuesta_preguntas").select("*").eq("encuesta_id", id!).order("orden"),
        supabase.from("encuesta_participaciones").select("respondida_at").eq("encuesta_id", id!).maybeSingle(),
      ]);
      if (error) throw error;
      if (e2) throw e2;
      if (!e) return null;
      return {
        encuesta: e as Encuesta,
        preguntas: (ps ?? []).map((p) => ({ ...p, opciones: (p.opciones as string[]) ?? [] })) as Pregunta[],
        respondidaAt: part?.respondida_at ?? null,
      };
    },
  });
}

/** Encuesta asociada a una publicación del muro. */
export function useEncuestaDePublicacion(publicacionId: string | undefined) {
  return useQuery({
    queryKey: ["encuestas", "por-publicacion", publicacionId],
    enabled: !!publicacionId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.from("encuestas").select("id, titulo, estado, cierra_at").eq("publicacion_id", publicacionId!).maybeSingle();
      return data;
    },
  });
}

export function useResultados(id: string | undefined, habilitado = true) {
  return useQuery({
    queryKey: ["encuestas", id, "resultados"],
    enabled: !!id && habilitado,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("encuesta_resultados", { _encuesta_id: id! });
      if (error) throw error;
      return (data ?? null) as unknown as Resultados | null;
    },
  });
}

/* ─────────────── Acciones ─────────────── */

export function useGuardarEncuesta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      titulo: string;
      descripcion: string;
      anonima: boolean;
      mostrar_resultados: MostrarResultados;
      cierra_at: string | null;
      preguntas: Pregunta[];
    }) => {
      const datos = {
        titulo: input.titulo.trim(),
        descripcion: input.descripcion.trim(),
        anonima: input.anonima,
        mostrar_resultados: input.mostrar_resultados,
        cierra_at: input.cierra_at,
      };
      let id = input.id;
      if (id) {
        const { error } = await supabase.from("encuestas").update(datos).eq("id", id);
        if (error) throw error;
        const { error: delErr } = await supabase.from("encuesta_preguntas").delete().eq("encuesta_id", id);
        if (delErr) throw delErr;
      } else {
        const { data, error } = await supabase.from("encuestas").insert(datos).select("id").single();
        if (error) throw error;
        id = data.id;
      }
      if (input.preguntas.length) {
        const { error } = await supabase.from("encuesta_preguntas").insert(
          input.preguntas.map((p, i) => ({
            encuesta_id: id!,
            orden: i,
            texto: p.texto.trim(),
            tipo: p.tipo,
            opciones: (p.tipo === "unica" || p.tipo === "multiple" ? p.opciones.map((o) => o.trim()).filter(Boolean) : []) as Json,
            obligatoria: p.obligatoria,
          }))
        );
        if (error) throw error;
      }
      return id!;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["encuestas"] }),
  });
}

export function usePublicarEncuesta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("encuesta_publicar", { _encuesta_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["encuestas"] });
      qc.invalidateQueries({ queryKey: ["muro"] });
    },
  });
}

export function useCerrarEncuesta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("encuestas").update({ estado: "cerrada" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["encuestas"] }),
  });
}

export function useEliminarEncuesta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("encuestas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["encuestas"] }),
  });
}

export function useResponderEncuesta(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (respuestas: Respuestas) => {
      const { error } = await supabase.rpc("encuesta_responder", { _encuesta_id: id!, _respuestas: respuestas as Json });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["encuestas"] }),
  });
}
