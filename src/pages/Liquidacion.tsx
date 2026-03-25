import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Plus, Pencil, Loader2, Zap } from "lucide-react";
import { useConceptos, useToggleConcepto, useLiquidaciones } from "@/hooks/useLiquidacion";
import { useEmpleados, useEmpresas } from "@/hooks/useEmpleados";
import { supabase } from "@/integrations/supabase/client";
import { calcularLiquidacion, calcTotales } from "@/lib/liquidacionEngine";
import ConceptoFormDialog from "@/components/ConceptoFormDialog";
import SimuladorRecibo from "@/components/SimuladorRecibo";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const tipoBadge: Record<string, string> = {
  remunerativo: "bg-success/15 text-success",
  no_remunerativo: "bg-info/15 text-info",
  deduccion: "bg-destructive/15 text-destructive",
};

const tipoLabel: Record<string, string> = {
  remunerativo: "Remunerativo",
  no_remunerativo: "No Remunerativo",
  deduccion: "Deducción",
};

export default function Liquidacion() {
  const { data: conceptos, isLoading: loadingConceptos } = useConceptos();
  const toggleConcepto = useToggleConcepto();
  const { data: liquidaciones, isLoading: loadingLiqs } = useLiquidaciones();
  const [conceptoDialog, setConceptoDialog] = useState<{ open: boolean; concepto?: any }>({ open: false });

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-semibold">Liquidación de Haberes</h1>
        <p className="text-sm text-muted-foreground mt-1">Configuración de conceptos, simulador de recibo y liquidaciones guardadas</p>
      </div>

      <Tabs defaultValue="conceptos" className="animate-slide-up">
        <TabsList>
          <TabsTrigger value="conceptos">Conceptos</TabsTrigger>
          <TabsTrigger value="simulador">Simulador</TabsTrigger>
          <TabsTrigger value="masiva">Masiva</TabsTrigger>
          <TabsTrigger value="guardadas">Guardadas</TabsTrigger>
        </TabsList>

        {/* Conceptos */}
        <TabsContent value="conceptos">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Conceptos de Liquidación</h3>
              <Button size="sm" onClick={() => setConceptoDialog({ open: true })}>
                <Plus className="h-4 w-4 mr-1" />Nuevo Concepto
              </Button>
            </div>
            <ConceptoFormDialog
              open={conceptoDialog.open}
              onOpenChange={(o) => setConceptoDialog({ open: o })}
              concepto={conceptoDialog.concepto}
            />
            {loadingConceptos ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Código</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Nombre</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Tipo</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Grupo</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Base</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground text-xs">%</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground text-xs">Fijo</th>
                      <th className="px-3 py-2 text-center font-medium text-muted-foreground text-xs">Ord</th>
                      <th className="px-3 py-2 text-center font-medium text-muted-foreground text-xs">Activo</th>
                      <th className="px-3 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(conceptos ?? []).map((c: any) => (
                      <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2 font-mono text-xs">{c.codigo}</td>
                        <td className="px-3 py-2">{c.nombre}</td>
                        <td className="px-3 py-2">
                          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tipoBadge[c.tipo])}>
                            {tipoLabel[c.tipo]}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{c.grupo || "—"}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground capitalize">{(c.base_calculo || "basico").replace("_", " ")}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{c.porcentaje != null ? `${c.porcentaje}%` : "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{c.monto_fijo != null ? `$${Number(c.monto_fijo).toLocaleString("es-AR")}` : "—"}</td>
                        <td className="px-3 py-2 text-center text-xs">{c.orden ?? 0}</td>
                        <td className="px-3 py-2 text-center">
                          <Switch
                            checked={c.activo}
                            onCheckedChange={(checked) => toggleConcepto.mutate({ id: c.id, activo: checked })}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setConceptoDialog({ open: true, concepto: c })}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Simulador */}
        <TabsContent value="simulador">
          <SimuladorRecibo />
        </TabsContent>

        {/* Masiva */}
        <TabsContent value="masiva">
          <LiquidacionMasiva />
        </TabsContent>

        {/* Guardadas */}
        <TabsContent value="guardadas">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-medium mb-4">Liquidaciones Guardadas</h3>
            {loadingLiqs ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (liquidaciones ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin liquidaciones guardadas.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Empleado</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Período</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground text-xs">Básico</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground text-xs">Neto</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Estado</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(liquidaciones ?? []).map((l: any) => (
                      <tr key={l.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2">{l.empleado?.apellido}, {l.empleado?.nombre}</td>
                        <td className="px-3 py-2">{l.periodo}</td>
                        <td className="px-3 py-2 text-right tabular-nums">${Number(l.sueldo_basico).toLocaleString("es-AR")}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium">${Number(l.neto).toLocaleString("es-AR")}</td>
                        <td className="px-3 py-2">
                          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            l.estado === "confirmada" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                          )}>{l.estado}</span>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString("es-AR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LiquidacionMasiva() {
  const { data: empresas = [] } = useEmpresas();
  const { data: empleados = [] } = useEmpleados();
  const { data: conceptos = [] } = useConceptos();

  const [empresaId, setEmpresaId] = useState("");
  const [periodo, setPeriodo] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [sueldoBasico, setSueldoBasico] = useState("0");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ ok: number; errors: number } | null>(null);

  const empleadosEmpresa = empleados.filter((e) => e.empresa_id === empresaId && e.estado === "Activo");
  const activos = (conceptos ?? []).filter((c: any) => c.activo).sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0));

  const handleGenerar = async () => {
    const basico = Number(sueldoBasico);
    if (!empresaId || basico <= 0 || empleadosEmpresa.length === 0) {
      toast.error("Seleccioná empresa, ingresá sueldo básico y verificá que haya empleados activos");
      return;
    }

    setProcessing(true);
    setProgress(0);
    setResult(null);
    let ok = 0, errors = 0;

    for (let i = 0; i < empleadosEmpresa.length; i++) {
      const emp = empleadosEmpresa[i];
      try {
        const lineas = calcularLiquidacion(basico, activos);
        const totales = calcTotales(basico, lineas);

        const { data: liq, error: liqErr } = await supabase
          .from("liquidaciones")
          .insert({
            empleado_id: emp.id,
            periodo,
            sueldo_basico: basico,
            total_remunerativo: totales.totalRem,
            total_no_remunerativo: totales.totalNoRem,
            total_deducciones: totales.totalDeducciones,
            neto: totales.neto,
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
        ok++;
      } catch {
        errors++;
      }
      setProgress(((i + 1) / empleadosEmpresa.length) * 100);
    }

    setResult({ ok, errors });
    setProcessing(false);
    toast.success(`Liquidación masiva: ${ok} generadas, ${errors} errores`);
  };

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm space-y-5">
      <h3 className="text-sm font-medium flex items-center gap-1.5"><Zap className="h-4 w-4 text-primary" />Liquidación Masiva por Empresa</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label className="text-xs">Empresa</Label>
          <Select value={empresaId} onValueChange={setEmpresaId}>
            <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
            <SelectContent>{empresas.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}</SelectContent>
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

      {empresaId && (
        <p className="text-sm text-muted-foreground">
          Empleados activos en esta empresa: <strong>{empleadosEmpresa.length}</strong>
        </p>
      )}

      {processing && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">Procesando... {Math.round(progress)}%</p>
        </div>
      )}

      {result && (
        <div className="rounded-lg border p-3 bg-muted/30">
          <p className="text-sm"><span className="text-success font-medium">{result.ok} liquidaciones generadas</span>{result.errors > 0 && <span className="text-destructive ml-2">{result.errors} errores</span>}</p>
        </div>
      )}

      <Button onClick={handleGenerar} disabled={processing || !empresaId}>
        {processing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Zap className="h-4 w-4 mr-1" />}
        Generar para todos los activos
      </Button>
    </div>
  );
}
