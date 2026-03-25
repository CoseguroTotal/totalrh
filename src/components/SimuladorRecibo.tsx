import { useState, useMemo } from "react";
import { useEmpleados } from "@/hooks/useEmpleados";
import { useConceptos } from "@/hooks/useLiquidacion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

export default function SimuladorRecibo() {
  const { data: empleados } = useEmpleados();
  const { data: conceptos } = useConceptos();
  const qc = useQueryClient();

  const [empleadoId, setEmpleadoId] = useState("");
  const [periodo, setPeriodo] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [sueldoBasico, setSueldoBasico] = useState("0");

  const basico = Number(sueldoBasico) || 0;
  const activos = useMemo(() => (conceptos ?? []).filter((c) => c.activo), [conceptos]);

  const lineas = useMemo(() => {
    return activos.map((c) => {
      let monto = 0;
      if (c.porcentaje) monto = basico * (Number(c.porcentaje) / 100);
      if (c.monto_fijo) monto += Number(c.monto_fijo);
      return { concepto_id: c.id, descripcion: c.nombre, tipo: c.tipo, monto, codigo: c.codigo };
    });
  }, [activos, basico]);

  const totalRem = lineas.filter((l) => l.tipo === "remunerativo").reduce((s, l) => s + l.monto, 0) + basico;
  const totalNoRem = lineas.filter((l) => l.tipo === "no_remunerativo").reduce((s, l) => s + l.monto, 0);
  const totalDed = lineas.filter((l) => l.tipo === "deduccion").reduce((s, l) => s + l.monto, 0);
  const neto = totalRem + totalNoRem - totalDed;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: liq, error: liqErr } = await supabase
        .from("liquidaciones")
        .insert({
          empleado_id: empleadoId,
          periodo,
          sueldo_basico: basico,
          total_remunerativo: totalRem,
          total_no_remunerativo: totalNoRem,
          total_deducciones: totalDed,
          neto,
          estado: "borrador" as any,
        })
        .select("id")
        .single();
      if (liqErr) throw liqErr;

      const rows = lineas.map((l) => ({
        liquidacion_id: liq.id,
        concepto_id: l.concepto_id,
        descripcion: l.descripcion,
        cantidad: 1,
        monto: l.monto,
        tipo: l.tipo as any,
      }));
      if (rows.length > 0) {
        const { error } = await supabase.from("liquidacion_lineas").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Liquidación guardada");
      qc.invalidateQueries({ queryKey: ["liquidaciones"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const emp = empleados?.find((e) => e.id === empleadoId);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label className="text-xs">Empleado</Label>
          <Select value={empleadoId} onValueChange={setEmpleadoId}>
            <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
            <SelectContent>
              {(empleados ?? []).filter((e) => e.estado === "Activo").map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.apellido}, {e.nombre} ({e.legajo})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Período</Label>
          <Input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Sueldo Básico ($)</Label>
          <Input type="number" value={sueldoBasico} onChange={(e) => setSueldoBasico(e.target.value)} />
        </div>
      </div>

      {basico > 0 && (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h4 className="text-sm font-semibold mb-1">
            Recibo de Sueldo — {emp ? `${emp.apellido}, ${emp.nombre}` : ""}
          </h4>
          <p className="text-xs text-muted-foreground mb-4">Período: {periodo}</p>

          <div className="grid grid-cols-2 gap-6">
            {/* Haberes */}
            <div>
              <h5 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Haberes</h5>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Sueldo Básico</span>
                  <span className="tabular-nums">${basico.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                </div>
                {lineas.filter((l) => l.tipo === "remunerativo").map((l) => (
                  <div key={l.concepto_id} className="flex justify-between">
                    <span>{l.descripcion}</span>
                    <span className="tabular-nums">${l.monto.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                {lineas.filter((l) => l.tipo === "no_remunerativo").map((l) => (
                  <div key={l.concepto_id} className="flex justify-between text-muted-foreground">
                    <span>{l.descripcion} (NR)</span>
                    <span className="tabular-nums">${l.monto.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Deducciones */}
            <div>
              <h5 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Deducciones</h5>
              <div className="space-y-1 text-sm">
                {lineas.filter((l) => l.tipo === "deduccion").map((l) => (
                  <div key={l.concepto_id} className="flex justify-between">
                    <span>{l.descripcion}</span>
                    <span className="tabular-nums text-destructive">${l.monto.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                {lineas.filter((l) => l.tipo === "deduccion").length === 0 && (
                  <p className="text-xs text-muted-foreground">Sin deducciones</p>
                )}
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="flex justify-between text-sm">
            <span>Total Remunerativo</span>
            <span className="tabular-nums font-medium">${totalRem.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Total No Remunerativo</span>
            <span className="tabular-nums">${totalNoRem.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Total Deducciones</span>
            <span className="tabular-nums text-destructive">-${totalDed.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
          </div>
          <Separator className="my-3" />
          <div className="flex justify-between text-base font-semibold">
            <span>NETO A COBRAR</span>
            <span className="tabular-nums">${neto.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={() => saveMutation.mutate()} disabled={!empleadoId || saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando..." : "Guardar Liquidación"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
