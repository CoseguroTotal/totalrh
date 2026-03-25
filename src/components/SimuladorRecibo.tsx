import { useState, useMemo } from "react";
import { useEmpleados } from "@/hooks/useEmpleados";
import { useConceptos } from "@/hooks/useLiquidacion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Download, ChevronDown, ChevronRight } from "lucide-react";
import { generarReciboPDF } from "@/components/ReciboPDF";
import { calcularLiquidacion, calcTotales } from "@/lib/liquidacionEngine";
import type { LineaCalc } from "@/lib/liquidacionEngine";
import { cn } from "@/lib/utils";

function fmt(n: number) {
  return n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

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
  const [calcSAC, setCalcSAC] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const basico = Number(sueldoBasico) || 0;
  const activos = useMemo(() => (conceptos ?? []).filter((c: any) => c.activo).sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0)), [conceptos]);

  // Advanced calculation engine
  const lineas = useMemo<LineaCalc[]>(() => {
    if (basico <= 0) return [];

    // First pass: calculate all lines
    const results: LineaCalc[] = [];
    const conceptoMontos = new Map<string, number>();

    // Add basico as implicit first line
    conceptoMontos.set("__basico__", basico);

    // Calculate total remunerativo incrementally
    let totalRem = basico;

    // First pass for non-deduccion items (haberes)
    for (const c of activos.filter((c: any) => c.tipo !== "deduccion")) {
      let base = basico;
      const bc = c.base_calculo || "basico";

      if (bc === "fijo") {
        base = 0;
      } else if (bc === "monto_concepto" && c.concepto_base_id) {
        base = conceptoMontos.get(c.concepto_base_id) || 0;
      }
      // remunerativo_total will be resolved in second pass

      let monto = 0;
      const cant = c.cantidad_default || 1;
      if (c.porcentaje && bc !== "fijo") {
        monto = base * (Number(c.porcentaje) / 100) * cant;
      }
      if (c.monto_fijo) {
        monto += Number(c.monto_fijo) * cant;
      }

      conceptoMontos.set(c.id, monto);
      if (c.tipo === "remunerativo") totalRem += monto;

      results.push({
        concepto_id: c.id,
        descripcion: c.nombre,
        tipo: c.tipo,
        base,
        cantidad: cant,
        unidad: c.unidad || "porcentaje",
        monto,
        grupo: c.grupo || "General",
        orden: c.orden || 0,
        es_haber: true,
      });
    }

    // Second pass: resolve remunerativo_total base and deducciones
    for (const r of results) {
      const c = activos.find((ac: any) => ac.id === r.concepto_id);
      if (c?.base_calculo === "remunerativo_total") {
        r.base = totalRem;
        const cant = c.cantidad_default || 1;
        let monto = 0;
        if (c.porcentaje) monto = totalRem * (Number(c.porcentaje) / 100) * cant;
        if (c.monto_fijo) monto += Number(c.monto_fijo) * cant;
        r.monto = monto;
        conceptoMontos.set(c.id, monto);
      }
    }

    // Deducciones
    for (const c of activos.filter((c: any) => c.tipo === "deduccion")) {
      let base = basico;
      const bc = c.base_calculo || "basico";

      if (bc === "remunerativo_total") base = totalRem;
      else if (bc === "fijo") base = 0;
      else if (bc === "monto_concepto" && c.concepto_base_id) {
        base = conceptoMontos.get(c.concepto_base_id) || 0;
      }

      const cant = c.cantidad_default || 1;
      let monto = 0;
      if (c.porcentaje) monto = base * (Number(c.porcentaje) / 100) * cant;
      if (c.monto_fijo) monto += Number(c.monto_fijo) * cant;

      conceptoMontos.set(c.id, monto);

      results.push({
        concepto_id: c.id,
        descripcion: c.nombre,
        tipo: c.tipo,
        base,
        cantidad: cant,
        unidad: c.unidad || "porcentaje",
        monto,
        grupo: c.grupo || "General",
        orden: c.orden || 0,
        es_haber: false,
      });
    }

    // SAC
    if (calcSAC) {
      const sacMonto = totalRem / 12;
      results.push({
        concepto_id: "__sac__",
        descripcion: "SAC Proporcional (1/12)",
        tipo: "remunerativo",
        base: totalRem,
        cantidad: 1,
        unidad: "porcentaje",
        monto: sacMonto,
        grupo: "SAC",
        orden: 9999,
        es_haber: true,
      });
    }

    return results;
  }, [activos, basico, calcSAC]);

  const totalHaberes = basico + lineas.filter((l) => l.es_haber).reduce((s, l) => s + l.monto, 0);
  const totalDeducciones = lineas.filter((l) => !l.es_haber).reduce((s, l) => s + l.monto, 0);
  const totalRem = basico + lineas.filter((l) => l.tipo === "remunerativo").reduce((s, l) => s + l.monto, 0);
  const totalNoRem = lineas.filter((l) => l.tipo === "no_remunerativo").reduce((s, l) => s + l.monto, 0);
  const neto = totalHaberes - totalDeducciones;

  // Group lines
  const groups = useMemo(() => {
    const map = new Map<string, LineaCalc[]>();
    for (const l of lineas) {
      if (!map.has(l.grupo)) map.set(l.grupo, []);
      map.get(l.grupo)!.push(l);
    }
    return Array.from(map.entries()).sort((a, b) => (a[1][0]?.orden || 0) - (b[1][0]?.orden || 0));
  }, [lineas]);

  const toggleGroup = (g: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g); else next.add(g);
      return next;
    });
  };

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
          total_deducciones: totalDeducciones,
          neto,
          estado: "borrador" as any,
        })
        .select("id")
        .single();
      if (liqErr) throw liqErr;

      const rows = lineas.map((l) => ({
        liquidacion_id: liq.id,
        concepto_id: l.concepto_id.startsWith("__") ? null : l.concepto_id,
        descripcion: l.descripcion,
        cantidad: l.cantidad,
        monto: l.monto,
        tipo: l.tipo as any,
        base: l.base,
        es_haber: l.es_haber,
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

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Checkbox id="sac" checked={calcSAC} onCheckedChange={(v) => setCalcSAC(!!v)} />
          <Label htmlFor="sac" className="text-xs cursor-pointer">Calcular SAC proporcional</Label>
        </div>
      </div>

      {basico > 0 && (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="p-5 pb-2">
            <h4 className="text-sm font-semibold">
              Recibo de Sueldo — {emp ? `${emp.apellido}, ${emp.nombre}` : ""}
            </h4>
            <p className="text-xs text-muted-foreground">Período: {periodo} {emp?.categoria ? `| Cat: ${emp.categoria}` : ""} {emp?.cct ? `| CCT: ${emp.cct}` : ""}</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/60">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground text-xs">Concepto</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground text-xs w-24">Base</th>
                  <th className="px-3 py-2 text-center font-medium text-muted-foreground text-xs w-20">Unidad</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground text-xs w-28">Haberes</th>
                  <th className="px-3 py-2 text-right font-medium text-muted-foreground text-xs w-28">Descuentos</th>
                </tr>
              </thead>
              <tbody>
                {/* Sueldo Básico row */}
                <tr className="border-b hover:bg-muted/20">
                  <td className="px-4 py-1.5 font-medium">Sueldo Básico</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-xs">—</td>
                  <td className="px-3 py-1.5 text-center text-xs">30 días</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">${fmt(basico)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">—</td>
                </tr>

                {groups.map(([grupo, items]) => {
                  const collapsed = collapsedGroups.has(grupo);
                  const subtotalHab = items.filter((i) => i.es_haber).reduce((s, i) => s + i.monto, 0);
                  const subtotalDesc = items.filter((i) => !i.es_haber).reduce((s, i) => s + i.monto, 0);

                  return [
                    <tr key={`gh-${grupo}`} className="bg-muted/40 cursor-pointer" onClick={() => toggleGroup(grupo)}>
                      <td colSpan={3} className="px-4 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1">
                        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {grupo}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-xs font-medium">
                        {subtotalHab > 0 ? `$${fmt(subtotalHab)}` : ""}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-xs font-medium text-destructive">
                        {subtotalDesc > 0 ? `$${fmt(subtotalDesc)}` : ""}
                      </td>
                    </tr>,
                    ...(!collapsed
                      ? items.map((l) => (
                          <tr key={l.concepto_id} className="border-b last:border-0 hover:bg-muted/20">
                            <td className="px-4 py-1.5 pl-8">{l.descripcion}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums text-xs">{l.base > 0 ? `$${fmt(l.base)}` : "—"}</td>
                            <td className="px-3 py-1.5 text-center text-xs">
                              {l.unidad === "porcentaje" && l.cantidad !== 1
                                ? `${l.cantidad}`
                                : l.unidad === "dias"
                                ? `${l.cantidad} d`
                                : l.unidad === "horas"
                                ? `${l.cantidad} hs`
                                : l.cantidad > 1
                                ? `${l.cantidad}`
                                : "—"}
                            </td>
                            <td className="px-3 py-1.5 text-right tabular-nums">
                              {l.es_haber ? `$${fmt(l.monto)}` : "—"}
                            </td>
                            <td className="px-3 py-1.5 text-right tabular-nums text-destructive">
                              {!l.es_haber ? `$${fmt(l.monto)}` : "—"}
                            </td>
                          </tr>
                        ))
                      : []),
                  ];
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/30">
                  <td colSpan={3} className="px-4 py-2 font-semibold text-xs uppercase">Totales</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold">${fmt(totalHaberes)}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-destructive">${fmt(totalDeducciones)}</td>
                </tr>
                <tr className="bg-primary/5">
                  <td colSpan={3} className="px-4 py-3 font-bold text-base">NETO A COBRAR</td>
                  <td colSpan={2} className="px-3 py-3 text-right tabular-nums font-bold text-base">${fmt(neto)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="p-5 pt-3 flex justify-end gap-2 border-t">
            <Button variant="outline" onClick={() => {
              if (!emp) return;
              generarReciboPDF({
                empleadoNombre: `${emp.apellido}, ${emp.nombre}`,
                empleadoLegajo: emp.legajo,
                periodo,
                sueldoBasico: basico,
                lineas: lineas.map((l) => ({ descripcion: l.descripcion, tipo: l.tipo, monto: l.monto, codigo: "", base: l.base, cantidad: l.cantidad, unidad: l.unidad, es_haber: l.es_haber, grupo: l.grupo })),
                totalRemunerativo: totalRem,
                totalNoRemunerativo: totalNoRem,
                totalDeducciones: totalDeducciones,
                neto,
              });
            }} disabled={!empleadoId}>
              <Download className="h-4 w-4 mr-1" /> Descargar PDF
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={!empleadoId || saveMutation.isPending}>
              {saveMutation.isPending ? "Guardando..." : "Guardar Liquidación"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
