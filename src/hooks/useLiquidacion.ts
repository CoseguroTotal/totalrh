import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calcTotales, type LineaCalc } from "@/lib/liquidacionEngine";

export function useConceptos() {
  return useQuery({
    queryKey: ["conceptos_liquidacion"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conceptos_liquidacion")
        .select("*")
        .order("codigo");
      if (error) throw error;
      return data;
    },
  });
}

export function useToggleConcepto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase
        .from("conceptos_liquidacion")
        .update({ activo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conceptos_liquidacion"] }),
  });
}

export function useLiquidaciones(periodo?: string) {
  return useQuery({
    queryKey: ["liquidaciones", periodo],
    queryFn: async () => {
      let q = supabase
        .from("liquidaciones")
        .select("*, empleado:empleados(id, nombre, apellido, legajo)")
        .order("created_at", { ascending: false });
      if (periodo) q = q.eq("periodo", periodo);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useLiquidacionDetalle(id?: string) {
  return useQuery({
    queryKey: ["liquidacion_detalle", id],
    enabled: !!id,
    queryFn: async () => {
      const { data: liq, error: liqErr } = await supabase
        .from("liquidaciones")
        .select("*, empleado:empleados(id, nombre, apellido, legajo)")
        .eq("id", id!)
        .single();
      if (liqErr) throw liqErr;

      const { data: lineas, error: linErr } = await supabase
        .from("liquidacion_lineas")
        .select("*, concepto:conceptos_liquidacion(id, codigo, nombre)")
        .eq("liquidacion_id", id!);
      if (linErr) throw linErr;

      return { ...liq, lineas };
    },
  });
}

export function useLiquidacionesEmpleado(empleadoId?: string) {
  return useQuery({
    queryKey: ["liquidaciones_empleado", empleadoId],
    enabled: !!empleadoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("liquidaciones")
        .select("*")
        .eq("empleado_id", empleadoId!)
        .eq("estado", "confirmada")
        .order("periodo", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Guarda cabecera y líneas en una sola transacción (RPC guardar_liquidacion).
 * Reemplaza el borrador del mismo período y rechaza si ya está confirmada.
 */
export async function guardarLiquidacion(empleadoId: string, periodo: string, basico: number, lineas: LineaCalc[]) {
  const t = calcTotales(basico, lineas);
  const { data, error } = await supabase.rpc("guardar_liquidacion", {
    _empleado_id: empleadoId,
    _periodo: periodo,
    _sueldo_basico: basico,
    _total_remunerativo: t.totalRem,
    _total_no_remunerativo: t.totalNoRem,
    _total_deducciones: t.totalDeducciones,
    _neto: t.neto,
    _lineas: lineas.map((l) => ({
      concepto_id: l.concepto_id.startsWith("__") ? null : l.concepto_id,
      descripcion: l.descripcion,
      cantidad: l.cantidad,
      monto: l.monto,
      tipo: l.tipo,
      base: l.base,
      es_haber: l.es_haber,
    })),
  });
  if (error) throw error;
  return data;
}
