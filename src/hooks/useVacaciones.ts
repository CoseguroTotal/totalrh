import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useVacacionesConfig(empresaId?: string) {
  return useQuery({
    queryKey: ["vacaciones_config", empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vacaciones_config")
        .select("*")
        .eq("empresa_id", empresaId!)
        .order("anios_antiguedad_min");
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveVacacionesConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (config: { id?: string; empresa_id: string; anios_antiguedad_min: number; anios_antiguedad_max: number; dias_correspondientes: number }) => {
      if (config.id) {
        const { error } = await supabase.from("vacaciones_config").update({
          anios_antiguedad_min: config.anios_antiguedad_min,
          anios_antiguedad_max: config.anios_antiguedad_max,
          dias_correspondientes: config.dias_correspondientes,
        }).eq("id", config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vacaciones_config").insert(config);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vacaciones_config"] }),
  });
}

export function useDeleteVacacionesConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vacaciones_config").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vacaciones_config"] }),
  });
}

export function useSolicitudesVacaciones(empresaId?: string) {
  return useQuery({
    queryKey: ["solicitudes_vacaciones", empresaId],
    queryFn: async () => {
      let q = supabase
        .from("solicitudes_vacaciones")
        .select("*, empleado:empleados(id, nombre, apellido, legajo, empresa_id, fecha_ingreso, puesto, avatar_url, sucursal_id, sucursal:sucursales(id, nombre))")
        .order("created_at", { ascending: false });
      if (empresaId) {
        q = q.eq("empleado.empresa_id", empresaId);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useSolicitudesVacacionesEmpleado(empleadoId?: string) {
  return useQuery({
    queryKey: ["solicitudes_vacaciones_emp", empleadoId],
    enabled: !!empleadoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("solicitudes_vacaciones")
        .select("*")
        .eq("empleado_id", empleadoId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveSolicitudVacaciones() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sol: {
      empleado_id: string;
      fecha_desde: string;
      fecha_hasta: string;
      dias_solicitados: number;
      dias_correspondientes: number;
      periodo_anual: string;
      observaciones?: string;
    }) => {
      const { error } = await supabase.from("solicitudes_vacaciones").insert(sol);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["solicitudes_vacaciones"] });
      qc.invalidateQueries({ queryKey: ["solicitudes_vacaciones_emp"] });
    },
  });
}

export function useUpdateSolicitudVacaciones() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, estado, aprobado_por }: { id: string; estado: string; aprobado_por?: string }) => {
      const { error } = await supabase.from("solicitudes_vacaciones").update({
        estado: estado as any,
        aprobado_por: aprobado_por || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["solicitudes_vacaciones"] });
      qc.invalidateQueries({ queryKey: ["solicitudes_vacaciones_emp"] });
    },
  });
}

export function calcDiasCorrespondientes(
  fechaIngreso: string,
  configs: { anios_antiguedad_min: number; anios_antiguedad_max: number; dias_correspondientes: number }[]
): number {
  const ingreso = new Date(fechaIngreso);
  const hoy = new Date();
  const anios = Math.floor((hoy.getTime() - ingreso.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  const config = configs.find((c) => anios >= c.anios_antiguedad_min && anios < c.anios_antiguedad_max);
  return config?.dias_correspondientes ?? 14;
}

export function calcDiasHabiles(desde: string, hasta: string): number {
  const start = new Date(desde);
  const end = new Date(hasta);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays > 0 ? diffDays : 0;
}
