import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type EstadoTarea = "pendiente" | "en_curso" | "hecha";
export type Prioridad = "baja" | "media" | "alta";

export interface Tarea {
  id: string;
  titulo: string;
  descripcion: string;
  estado: EstadoTarea;
  prioridad: Prioridad;
  vence: string | null;
  asignada_a: string;
  creada_por: string;
  completada_at: string | null;
  created_at: string;
}

export const ESTADOS: { id: EstadoTarea; label: string }[] = [
  { id: "pendiente", label: "Pendiente" },
  { id: "en_curso", label: "En curso" },
  { id: "hecha", label: "Hecha" },
];

export const PRIORIDADES: Record<Prioridad, { label: string; color: string }> = {
  alta: { label: "Alta", color: "bg-red-500/15 text-red-700 dark:text-red-300" },
  media: { label: "Media", color: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  baja: { label: "Baja", color: "bg-muted text-muted-foreground" },
};

/* ─────────────── Reglas puras (testeadas) ─────────────── */

/** "2026-10-17" de hoy en hora local. */
export function hoyIso(ahora = new Date()) {
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
}

export function estadoVencimiento(t: Pick<Tarea, "vence" | "estado">, ahora = new Date()): "vencida" | "hoy" | "proxima" | null {
  if (!t.vence || t.estado === "hecha") return null;
  const hoy = hoyIso(ahora);
  if (t.vence < hoy) return "vencida";
  if (t.vence === hoy) return "hoy";
  return "proxima";
}

const PESO_PRIORIDAD: Record<Prioridad, number> = { alta: 0, media: 1, baja: 2 };

/** Primero lo vencido y lo que vence antes; a igual fecha, la prioridad más alta. Las hechas al final. */
export function ordenarTareas<T extends Pick<Tarea, "vence" | "prioridad" | "estado" | "created_at">>(tareas: T[]) {
  return [...tareas].sort((a, b) => {
    if ((a.estado === "hecha") !== (b.estado === "hecha")) return a.estado === "hecha" ? 1 : -1;
    const va = a.vence ?? "9999-12-31", vb = b.vence ?? "9999-12-31";
    if (va !== vb) return va < vb ? -1 : 1;
    if (a.prioridad !== b.prioridad) return PESO_PRIORIDAD[a.prioridad] - PESO_PRIORIDAD[b.prioridad];
    return a.created_at < b.created_at ? 1 : -1;
  });
}

/* ─────────────── Consultas y acciones ─────────────── */

const KEY = ["tareas"];

export function useTareas() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from("tareas").select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return (data ?? []) as Tarea[];
    },
  });
  useEffect(() => {
    const ch = supabase.channel("tareas-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tareas" }, () => qc.invalidateQueries({ queryKey: KEY }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);
  return query;
}

export function useGuardarTarea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: Partial<Tarea> & { titulo: string }) => {
      const datos = {
        titulo: t.titulo.trim(),
        descripcion: (t.descripcion ?? "").trim(),
        prioridad: t.prioridad ?? "media",
        vence: t.vence || null,
        ...(t.asignada_a ? { asignada_a: t.asignada_a } : {}),
        ...(t.estado ? { estado: t.estado } : {}),
      };
      if (t.id) {
        const { error } = await supabase.from("tareas").update(datos).eq("id", t.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tareas").insert(datos);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Cambiar estado con respuesta inmediata en la pantalla. */
export function useCambiarEstado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: EstadoTarea }) => {
      const { error } = await supabase.from("tareas").update({ estado }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, estado }) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<Tarea[]>(KEY);
      qc.setQueryData<Tarea[]>(KEY, (old) => old?.map((t) => (t.id === id ? { ...t, estado } : t)));
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(KEY, ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useEliminarTarea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tareas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useTareasPendientes(userId: string | null | undefined) {
  const { data = [] } = useTareas();
  return data.filter((t) => t.asignada_a === userId && t.estado !== "hecha").length;
}
