import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useVacantes() {
  return useQuery({
    queryKey: ["vacantes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vacantes")
        .select("*, empresa:empresas(id, nombre)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCandidatos(vacanteId?: string) {
  return useQuery({
    queryKey: ["candidatos", vacanteId],
    enabled: !!vacanteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidatos")
        .select("*")
        .eq("vacante_id", vacanteId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAllCandidatos() {
  return useQuery({
    queryKey: ["candidatos-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidatos")
        .select("*, vacante:vacantes(id, titulo, empresa:empresas(nombre))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveVacante() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      if (id) {
        const { error } = await supabase.from("vacantes").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vacantes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vacantes"] }),
  });
}

export function useSaveCandidato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: any) => {
      if (id) {
        const { error } = await supabase.from("candidatos").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("candidatos").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidatos"] });
      qc.invalidateQueries({ queryKey: ["candidatos-all"] });
    },
  });
}

export function useUpdateCandidatoEstado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: string }) => {
      const { error } = await supabase.from("candidatos").update({ estado: estado as any }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidatos"] });
      qc.invalidateQueries({ queryKey: ["candidatos-all"] });
    },
  });
}
