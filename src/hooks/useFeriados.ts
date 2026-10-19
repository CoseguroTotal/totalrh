import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TipoFeriado = "inamovible" | "trasladable" | "puente" | "no_laborable" | "empresa";

export interface Feriado { id: string; fecha: string; nombre: string; tipo: TipoFeriado }

export const TIPOS_FERIADO: Record<TipoFeriado, { label: string; color: string }> = {
  inamovible: { label: "Feriado nacional", color: "bg-red-500/15 text-red-700 dark:text-red-300" },
  trasladable: { label: "Feriado trasladable", color: "bg-red-500/15 text-red-700 dark:text-red-300" },
  puente: { label: "Día puente", color: "bg-orange-500/15 text-orange-700 dark:text-orange-300" },
  no_laborable: { label: "No laborable", color: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  empresa: { label: "Asueto de la empresa", color: "bg-violet-500/15 text-violet-700 dark:text-violet-300" },
};

/** Feriados que cuentan como no trabajados (el día no laborable es optativo para el empleador). */
export const esFeriadoPleno = (f: Pick<Feriado, "tipo">) => f.tipo !== "no_laborable";

const KEY = ["feriados"];

export function useFeriados(anio?: number) {
  return useQuery({
    queryKey: [...KEY, anio ?? "todos"],
    staleTime: 30 * 60_000,
    queryFn: async () => {
      let q = supabase.from("feriados").select("id, fecha, nombre, tipo").order("fecha");
      if (anio) q = q.gte("fecha", `${anio}-01-01`).lte("fecha", `${anio}-12-31`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Feriado[];
    },
  });
}

/** Mapa fecha → feriados de ese día, para marcar calendarios. */
export function mapaFeriados(feriados: Feriado[]) {
  const m = new Map<string, Feriado[]>();
  for (const f of feriados) {
    if (!m.has(f.fecha)) m.set(f.fecha, []);
    m.get(f.fecha)!.push(f);
  }
  return m;
}

export function useGuardarFeriado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (f: { fecha: string; nombre: string; tipo: TipoFeriado }) => {
      const { error } = await supabase.from("feriados").insert({ fecha: f.fecha, nombre: f.nombre.trim(), tipo: f.tipo });
      if (error) throw error.code === "23505" ? new Error("Ese feriado ya está cargado") : error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useEliminarFeriado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("feriados").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
