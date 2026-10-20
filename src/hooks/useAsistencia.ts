import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { hoyArgentina, ultimoDiaDelMes } from "@/lib/asistencia";
import { HORAS_MAX_JORNADA } from "../../supabase/functions/_shared/attendance-rules";

export function useTurnos() {
  return useQuery({
    queryKey: ["turnos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("turnos").select("*").order("nombre");
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveTurno() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (turno: { id?: string; nombre: string; hora_entrada: string; hora_salida: string; tolerancia_minutos: number }) => {
      if (turno.id) {
        const { error } = await supabase.from("turnos").update({
          nombre: turno.nombre,
          hora_entrada: turno.hora_entrada,
          hora_salida: turno.hora_salida,
          tolerancia_minutos: turno.tolerancia_minutos,
        }).eq("id", turno.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("turnos").insert({
          nombre: turno.nombre,
          hora_entrada: turno.hora_entrada,
          hora_salida: turno.hora_salida,
          tolerancia_minutos: turno.tolerancia_minutos,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["turnos"] }),
  });
}

export function useDeleteTurno() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("turnos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["turnos"] }),
  });
}

export function useFichadas(fecha?: string) {
  return useQuery({
    queryKey: ["fichadas", fecha],
    queryFn: async () => {
      let q = supabase
        .from("fichadas")
        .select("*, empleado:empleados(id, nombre, apellido, legajo), turno:turnos(id, nombre, tolerancia_minutos)")
        .order("created_at", { ascending: false });
      if (fecha) q = q.eq("fecha", fecha);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useRegistrarFichada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { empleado_id: string; turno_id?: string; tipo: "entrada" | "salida" }) => {
      // Fecha de Argentina (en UTC, después de las 21 h ya sería mañana)
      const hoy = hoyArgentina();
      const ahora = new Date().toISOString();

      if (params.tipo === "entrada") {
        const { error } = await supabase.from("fichadas").insert({
          empleado_id: params.empleado_id,
          fecha: hoy,
          hora_entrada: ahora,
          turno_id: params.turno_id || null,
          estado: "presente",
          metodo: "manual",
        });
        if (error) throw error;
      } else {
        // Entrada abierta de las últimas 16 h (un turno noche sale al día siguiente)
        const desde = new Date(Date.now() - HORAS_MAX_JORNADA * 3_600_000).toISOString();
        const { data: open } = await supabase
          .from("fichadas")
          .select("id")
          .eq("empleado_id", params.empleado_id)
          .gte("hora_entrada", desde)
          .is("hora_salida", null)
          .order("created_at", { ascending: false })
          .limit(1);

        if (open && open.length > 0) {
          const { error } = await supabase.from("fichadas").update({ hora_salida: ahora, metodo_salida: "manual" }).eq("id", open[0].id);
          if (error) throw error;
        } else {
          throw new Error("No hay una entrada abierta en las últimas 16 horas");
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fichadas"] }),
  });
}

export function useNovedades(mes?: string) {
  return useQuery({
    queryKey: ["novedades_asistencia", mes],
    queryFn: async () => {
      let q = supabase
        .from("novedades_asistencia")
        .select("*, empleado:empleados(id, nombre, apellido, legajo)")
        .order("fecha", { ascending: false });
      if (mes) {
        // El 31 no existe en todos los meses: la consulta fallaba en febrero y en los de 30 días
        q = q.gte("fecha", `${mes}-01`).lte("fecha", ultimoDiaDelMes(mes));
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveNovedad() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nov: { empleado_id: string; fecha: string; tipo: string; descripcion?: string }) => {
      const { error } = await supabase.from("novedades_asistencia").insert(nov);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["novedades_asistencia"] }),
  });
}

export function useFichadasEmpleado(empleadoId: string | undefined, mes?: string) {
  return useQuery({
    queryKey: ["fichadas_empleado", empleadoId, mes],
    enabled: !!empleadoId,
    queryFn: async () => {
      let q = supabase
        .from("fichadas")
        .select("*, turno:turnos(id, nombre)")
        .eq("empleado_id", empleadoId!)
        .order("fecha", { ascending: false });
      if (mes) {
        q = q.gte("fecha", `${mes}-01`).lte("fecha", ultimoDiaDelMes(mes));
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}
