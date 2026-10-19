import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useMemorandums() {
  return useQuery({
    queryKey: ["memorandums"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memorandums")
        .select("*, empresa:empresas(id, nombre), destinatario:empleados(id, nombre, apellido, email)")
        .order("numero", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useMemorandumsEmpleado(empleadoId: string | undefined) {
  return useQuery({
    queryKey: ["memorandums-empleado", empleadoId],
    enabled: !!empleadoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memorandums")
        .select("*, empresa:empresas(id, nombre)")
        .eq("destinatario_empleado_id", empleadoId!)
        .in("estado", ["enviado", "recibido", "firmado"])
        .order("fecha", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveMemorandum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (memo: {
      id?: string; empresa_id?: string | null; titulo: string; contenido: string;
      destinatario_empleado_id?: string | null; destinatario_nombre?: string | null;
      fecha: string; estado?: string;
      emisor_nombre?: string | null; emisor_cargo?: string | null; emisor_sector?: string | null;
    }) => {
      const emisor = {
        emisor_nombre: memo.emisor_nombre?.trim() || null,
        emisor_cargo: memo.emisor_cargo?.trim() || null,
        emisor_sector: memo.emisor_sector?.trim() || null,
      };
      const { data: { user } } = await supabase.auth.getUser();
      if (memo.id) {
        const { error } = await supabase.from("memorandums").update({
          empresa_id: memo.empresa_id || null,
          titulo: memo.titulo,
          contenido: memo.contenido,
          destinatario_empleado_id: memo.destinatario_empleado_id || null,
          destinatario_nombre: memo.destinatario_nombre || null,
          fecha: memo.fecha,
          estado: (memo.estado || "borrador") as any,
          ...emisor,
        }).eq("id", memo.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("memorandums").insert({
          empresa_id: memo.empresa_id || null,
          titulo: memo.titulo,
          contenido: memo.contenido,
          destinatario_empleado_id: memo.destinatario_empleado_id || null,
          destinatario_nombre: memo.destinatario_nombre || null,
          fecha: memo.fecha,
          estado: (memo.estado || "borrador") as any,
          created_by: user?.id,
          emitido_por: user?.id,
          ...emisor,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["memorandums"] }),
  });
}

export function useDeleteMemorandum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("memorandums").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["memorandums"] }),
  });
}

export function useUpdateEstadoMemorandum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, estado, firmado_por }: { id: string; estado: string; firmado_por?: string }) => {
      const updates: any = { estado };
      if (estado === "firmado") {
        updates.firmado_por = firmado_por;
        updates.fecha_firma = new Date().toISOString();
      }
      const { error } = await supabase.from("memorandums").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["memorandums"] });
      qc.invalidateQueries({ queryKey: ["memorandums-empleado"] });
    },
  });
}
