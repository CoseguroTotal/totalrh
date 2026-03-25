import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type EmpleadoConEmpresa = {
  id: string;
  legajo: string;
  nombre: string;
  apellido: string;
  dni: string;
  cuil: string;
  puesto: string;
  categoria: string | null;
  fecha_ingreso: string;
  cct: string | null;
  estado: "Activo" | "Licencia" | "Baja";
  email: string | null;
  telefono: string | null;
  avatar_url: string | null;
  empresa_id: string;
  sucursal_id: string;
  empresa: { id: string; nombre: string } | null;
  sucursal: { id: string; nombre: string } | null;
  domicilio_calle: string | null;
  domicilio_numero: string | null;
  domicilio_piso: string | null;
  domicilio_localidad: string | null;
  domicilio_provincia: string | null;
  domicilio_cp: string | null;
  nacionalidad: string | null;
  fecha_nacimiento: string | null;
  sexo: string | null;
  estado_civil: string | null;
  sueldo_basico: number | null;
};

export function useEmpleados() {
  return useQuery({
    queryKey: ["empleados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empleados")
        .select("*, empresa:empresas(id, nombre), sucursal:sucursales(id, nombre)")
        .order("apellido");
      if (error) throw error;
      return data as EmpleadoConEmpresa[];
    },
  });
}

export function useEmpleado(id: string | undefined) {
  return useQuery({
    queryKey: ["empleado", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empleados")
        .select("*, empresa:empresas(id, nombre), sucursal:sucursales(id, nombre)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as EmpleadoConEmpresa;
    },
  });
}

export function useEventosLegajo(empleadoId: string | undefined) {
  return useQuery({
    queryKey: ["eventos_legajo", empleadoId],
    enabled: !!empleadoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eventos_legajo")
        .select("*")
        .eq("empleado_id", empleadoId!)
        .order("fecha", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useDocumentosLegajo(empleadoId: string | undefined) {
  return useQuery({
    queryKey: ["documentos_legajo", empleadoId],
    enabled: !!empleadoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documentos_legajo")
        .select("*")
        .eq("empleado_id", empleadoId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useEmpresas() {
  return useQuery({
    queryKey: ["empresas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("empresas").select("*").order("nombre");
      if (error) throw error;
      return data;
    },
  });
}

export function useSucursales(empresaId?: string) {
  return useQuery({
    queryKey: ["sucursales", empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sucursales")
        .select("*")
        .eq("empresa_id", empresaId!)
        .order("nombre");
      if (error) throw error;
      return data;
    },
  });
}

export function useGrupoFamiliar(empleadoId: string | undefined) {
  return useQuery({
    queryKey: ["grupo_familiar", empleadoId],
    enabled: !!empleadoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grupo_familiar")
        .select("*")
        .eq("empleado_id", empleadoId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useDatosMedicos(empleadoId: string | undefined) {
  return useQuery({
    queryKey: ["datos_medicos", empleadoId],
    enabled: !!empleadoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("datos_medicos")
        .select("*")
        .eq("empleado_id", empleadoId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
