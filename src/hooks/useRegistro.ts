import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invocarFuncion } from "@/lib/sesion";

/** Llama a una edge function y devuelve el mensaje de error del cuerpo (los 4xx lo traen ahí). */
export async function invocar<T = Record<string, unknown>>(funcion: string, body: Record<string, unknown>) {
  const { data, error } = await invocarFuncion(funcion, body);
  let mensaje: string | undefined = data?.error;
  let cuerpo: Record<string, unknown> | undefined = data ?? undefined;
  if (error && !mensaje) {
    try {
      cuerpo = await (error as { context?: Response }).context?.json();
      mensaje = cuerpo?.error as string | undefined;
    } catch { /* sin cuerpo */ }
    mensaje ??= "No se pudo conectar. Revisá tu conexión e intentá de nuevo.";
  }
  return { data: (cuerpo ?? data) as T & { error?: string }, error: mensaje ?? null };
}

export type SolicitudAlta = {
  id: string;
  dni: string;
  cuil: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string | null;
  telefono: string;
  email: string;
  empresa_id: string | null;
  sucursal_id: string | null;
  estado: "pendiente" | "aprobada" | "rechazada";
  motivo_rechazo: string | null;
  empleado_id: string | null;
  revisado_at: string | null;
  created_at: string;
};

const KEY_ALTAS = ["solicitudes_alta"];

export function useSolicitudesAlta(estado: "pendiente" | "resueltas") {
  return useQuery({
    queryKey: [...KEY_ALTAS, estado],
    queryFn: async () => {
      let q = supabase.from("solicitudes_alta").select("*").order("created_at", { ascending: false });
      q = estado === "pendiente" ? q.eq("estado", "pendiente") : q.neq("estado", "pendiente").limit(50);
      const { data, error } = await q;
      if (error) throw error;
      return data as SolicitudAlta[];
    },
  });
}

export function useResolverAlta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const { data, error } = await invocar<{ email: string; nombre: string; empleado_id?: string }>("registro-empleado", body);
      if (error) throw new Error(error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY_ALTAS });
      qc.invalidateQueries({ queryKey: ["empleados"] });
    },
  });
}

/** Código y estado del registro (configuracion_grupo la leen todos los usuarios con sesión). */
export function useConfigRegistro() {
  return useQuery({
    queryKey: ["config_registro"],
    queryFn: async () => {
      const { data, error } = await supabase.from("configuracion_grupo").select("registro_codigo, registro_abierto").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useConfigurarRegistro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { abierto: boolean; regenerar: boolean }) => {
      const { data, error } = await supabase.rpc("configurar_registro", { _abierto: v.abierto, _regenerar: v.regenerar });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["config_registro"] }),
  });
}

export const enlaceRegistro = (codigo: string) => `${window.location.origin}/registro?c=${encodeURIComponent(codigo)}`;
export const enlaceInstalar = () => `${window.location.origin}/instalar`;

/* ─────────────── Historial de cambios del legajo ─────────────── */

export type CambioEmpleado = {
  id: string;
  campo: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  origen: "empleado" | "rrhh" | "sistema";
  created_at: string;
};

export const ETIQUETA_CAMPO: Record<string, string> = {
  nombre: "Nombre", apellido: "Apellido", dni: "DNI", cuil: "CUIL", fecha_nacimiento: "Fecha de nacimiento",
  email: "Email", telefono: "Teléfono", domicilio_calle: "Calle", domicilio_numero: "Número", domicilio_piso: "Piso/Depto",
  domicilio_localidad: "Localidad", domicilio_provincia: "Provincia", domicilio_cp: "Código postal",
  estado_civil: "Estado civil", nacionalidad: "Nacionalidad", sexo: "Sexo", puesto: "Puesto", categoria: "Categoría",
  cct: "Convenio", sueldo_basico: "Sueldo básico", estado: "Estado", empresa_id: "Empresa", sucursal_id: "Sucursal",
  fecha_ingreso: "Fecha de ingreso", legajo: "N.º de legajo", user_id: "Cuenta de usuario",
};

export const ETIQUETA_ORIGEN: Record<CambioEmpleado["origen"], string> = {
  empleado: "El empleado", rrhh: "RRHH", sistema: "Sistema",
};

export function useCambiosEmpleado(empleadoId: string | undefined, limite = 50) {
  return useQuery({
    queryKey: ["empleados_cambios", empleadoId, limite],
    enabled: !!empleadoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empleados_cambios")
        .select("id, campo, valor_anterior, valor_nuevo, origen, created_at")
        .eq("empleado_id", empleadoId!)
        .order("created_at", { ascending: false })
        .limit(limite);
      if (error) throw error;
      return data as CambioEmpleado[];
    },
  });
}

export type MisDatos = {
  email: string; telefono: string; domicilio_calle: string; domicilio_numero: string; domicilio_piso: string;
  domicilio_localidad: string; domicilio_provincia: string; domicilio_cp: string; estado_civil: string; nacionalidad: string;
};

export function useActualizarMisDatos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (datos: MisDatos) => {
      const { error } = await supabase.rpc("actualizar_mis_datos", { _datos: datos });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mi-empleado"] });
      qc.invalidateQueries({ queryKey: ["empleados_cambios"] });
    },
  });
}
