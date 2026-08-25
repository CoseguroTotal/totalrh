import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useMiEmpleado() {
  return useQuery({
    queryKey: ["mi-empleado"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("empleados")
        .select("*, empresa:empresas(id, nombre), sucursal:sucursales(id, nombre)")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSolicitudesPermiso(empleadoId: string | undefined) {
  return useQuery({
    queryKey: ["solicitudes_permiso", empleadoId],
    enabled: !!empleadoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("solicitudes_permiso")
        .select("*")
        .eq("empleado_id", empleadoId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useEstudiosEmpleado(empleadoId: string | undefined) {
  return useQuery({
    queryKey: ["estudios_empleado", empleadoId],
    enabled: !!empleadoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estudios_empleado")
        .select("*")
        .eq("empleado_id", empleadoId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
