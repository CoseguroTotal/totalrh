import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Plus, Pencil, Loader2, Zap, Mail } from "lucide-react";
import { useConceptos, useToggleConcepto, useLiquidaciones, guardarLiquidacion } from "@/hooks/useLiquidacion";
import { useEmpleados, useEmpresas } from "@/hooks/useEmpleados";
import { calcularLiquidacion } from "@/lib/liquidacionEngine";
import ConceptoFormDialog from "@/components/ConceptoFormDialog";
import SimuladorRecibo from "@/components/SimuladorRecibo";
import LiquidacionFinalTab from "@/components/LiquidacionFinalTab";
import EnviarEmailDialog from "@/components/EnviarEmailDialog";
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
  const [emailDialog, setEmailDialog] = useState<{ open: boolean; liq?: any }>({ open: false });

  const getReciboHtml = (l: any) => `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <h2 style="color:#333;border-bottom:2px solid #2563eb;padding-bottom:10px;">Recibo de Sueldo</h2>
      <p style="color:#666;font-size:14px;"><strong>Empleado:</strong> ${l.empleado?.apellido}, ${l.empleado?.nombre}</p>
      <p style="color:#666;font-size:14px;"><strong>Período:</strong> ${l.periodo}</p>
      <p style="color:#666;font-size:14px;"><strong>Fecha:</strong> ${new Date(l.created_at).toLocaleDateString("es-AR")}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:15px;">
        <tr style="background:#f3f4f6;"><th style="text-align:left;padding:8px;font-size:13px;">Concepto</th><th style="text-align:right;padding:8px;font-size:13px;">Monto</th></tr>
        <tr><td style="padding:8px;font-size:13px;border-bottom:1px solid #eee;">Sueldo Básico</td><td style="text-align:right;padding:8px;font-size:13px;border-bottom:1px solid #eee;">$${Number(l.sueldo_basico).toLocaleString("es-AR")}</td></tr>
        <tr><td style="padding:8px;font-size:13px;border-bottom:1px solid #eee;">Total Remunerativo</td><td style="text-align:right;padding:8px;font-size:13px;border-bottom:1px solid #eee;">$${Number(l.total_remunerativo).toLocaleString("es-AR")}</td></tr>
        <tr><td style="padding:8px;font-size:13px;border-bottom:1px solid #eee;">Total No Remunerativo</td><td style="text-align:right;padding:8px;font-size:13px;border-bottom:1px solid #eee;">$${Number(l.total_no_remunerativo).toLocaleString("es-AR")}</td></tr>
        <tr><td style="padding:8px;font-size:13px;border-bottom:1px solid #eee;">Total Deducciones</td><td style="text-align:right;padding:8px;font-size:13px;border-bottom:1px solid #eee;">-$${Number(l.total_deducciones).toLocaleString("es-AR")}</td></tr>
        <tr style="background:#f3f4f6;font-weight:bold;"><td style="padding:8px;font-size:14px;">NETO A COBRAR</td><td style="text-align:right;padding:8px;font-size:14px;">$${Number(l.neto).toLocaleString("es-AR")}</td></tr>
      </table>
    </div>
  `;
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
          <TabsTrigger value="final">Liquidación final</TabsTrigger>
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
        <TabsContent value="final"><LiquidacionFinalTab /></TabsContent>

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
                      <th className="px-3 py-2 w-10"></th>
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
                        <td className="px-3 py-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Enviar por email" onClick={() => setEmailDialog({ open: true, liq: l })}>
                            <Mail className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {emailDialog.liq && (
            <EnviarEmailDialog
              open={emailDialog.open}
              onOpenChange={(o) => setEmailDialog({ open: o })}
              defaultTo={emailDialog.liq.empleado?.email || ""}
              defaultSubject={`Recibo de sueldo — ${emailDialog.liq.periodo} — ${emailDialog.liq.empleado?.apellido}, ${emailDialog.liq.empleado?.nombre}`}
              htmlContent={getReciboHtml(emailDialog.liq)}
              previewText={`Neto: $${Number(emailDialog.liq.neto).toLocaleString("es-AR")} | Período: ${emailDialog.liq.periodo}`}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LiquidacionMasiva() {
  const { data: empresas = [] } = useEmpresas();
  const { data: empleados = [] } = useEmpleados();
  const { data: conceptos = [] } = useConceptos();
  const qc = useQueryClient();

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
    const globalBasico = Number(sueldoBasico);
    if (!empresaId || empleadosEmpresa.length === 0) {
      toast.error("Seleccioná empresa y verificá que haya empleados activos");
      return;
    }
    if (globalBasico <= 0 && empleadosEmpresa.every((e) => !e.sueldo_basico || e.sueldo_basico <= 0)) {
      toast.error("Ingresá un sueldo básico global o asegurate de que los empleados tengan sueldo cargado");
      return;
    }

    setProcessing(true);
    setProgress(0);
    setResult(null);
    let ok = 0, errors = 0, confirmadas = 0;

    for (let i = 0; i < empleadosEmpresa.length; i++) {
      const emp = empleadosEmpresa[i];
      const basico = (emp.sueldo_basico && emp.sueldo_basico > 0) ? emp.sueldo_basico : globalBasico;
      if (basico <= 0) { errors++; setProgress(((i + 1) / empleadosEmpresa.length) * 100); continue; }
      try {
        // Cabecera y líneas en una sola transacción; re-generar reemplaza el borrador del período
        await guardarLiquidacion(emp.id, periodo, basico, calcularLiquidacion(basico, activos, false, emp));
        ok++;
      } catch (err) {
        errors++;
        if (err instanceof Error && err.message.includes("confirmada")) confirmadas++;
      }
      setProgress(((i + 1) / empleadosEmpresa.length) * 100);
    }

    setResult({ ok, errors });
    setProcessing(false);
    if (errors === 0) toast.success(`Liquidación masiva: ${ok} generadas`);
    else toast.warning(`Liquidación masiva: ${ok} generadas, ${errors} con error${confirmadas ? ` (${confirmadas} ya estaban confirmadas y no se tocaron)` : ""}`);
    qc.invalidateQueries({ queryKey: ["liquidaciones"] });
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
          <Label className="text-xs">Sueldo Básico global ($) <span className="text-muted-foreground">(se usa si el empleado no tiene cargado)</span></Label>
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
