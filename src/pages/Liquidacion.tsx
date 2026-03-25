import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Loader2 } from "lucide-react";
import { useConceptos, useToggleConcepto, useLiquidaciones } from "@/hooks/useLiquidacion";
import ConceptoFormDialog from "@/components/ConceptoFormDialog";
import SimuladorRecibo from "@/components/SimuladorRecibo";
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
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground text-xs">%</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground text-xs">Monto Fijo</th>
                      <th className="px-3 py-2 text-center font-medium text-muted-foreground text-xs">Activo</th>
                      <th className="px-3 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(conceptos ?? []).map((c) => (
                      <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2 font-mono text-xs">{c.codigo}</td>
                        <td className="px-3 py-2">{c.nombre}</td>
                        <td className="px-3 py-2">
                          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tipoBadge[c.tipo])}>
                            {tipoLabel[c.tipo]}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{c.porcentaje != null ? `${c.porcentaje}%` : "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{c.monto_fijo != null ? `$${Number(c.monto_fijo).toLocaleString("es-AR")}` : "—"}</td>
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
