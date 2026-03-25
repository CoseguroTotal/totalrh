import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSanciones(empleadoId: string | undefined) {
  return useQuery({
    queryKey: ["sanciones", empleadoId],
    enabled: !!empleadoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sanciones" as any)
        .select("*")
        .eq("empleado_id", empleadoId!)
        .order("fecha", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useCreateSancion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sancion: {
      empleado_id: string;
      tipo: string;
      motivo: string;
      descripcion?: string;
      fecha: string;
      emitido_por?: string;
    }) => {
      const { error } = await supabase.from("sanciones" as any).insert(sancion as any);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["sanciones", vars.empleado_id] });
    },
  });
}

export function useUpdateDescargo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sancionId,
      empleadoId,
      descargo_texto,
      descargo_documento_url,
    }: {
      sancionId: string;
      empleadoId: string;
      descargo_texto?: string;
      descargo_documento_url?: string;
    }) => {
      const { error } = await supabase
        .from("sanciones" as any)
        .update({
          descargo_texto,
          descargo_documento_url: descargo_documento_url || null,
          descargo_fecha: new Date().toISOString(),
          descargo_cerrado: true,
        } as any)
        .eq("id", sancionId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["sanciones", vars.empleadoId] });
    },
  });
}
