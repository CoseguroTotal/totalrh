import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useConceptos } from "@/hooks/useLiquidacion";
import { useEmpleados } from "@/hooks/useEmpleados";
import { baseCalculo } from "@/lib/liquidacionEngine";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  concepto?: any;
};

export default function ConceptoFormDialog({ open, onOpenChange, concepto }: Props) {
  const qc = useQueryClient();
  const { data: allConceptos } = useConceptos();
  const { data: empleados } = useEmpleados({ enabled: open });
  const isEdit = !!concepto;

  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    tipo: "remunerativo" as string,
    porcentaje: "",
    monto_fijo: "",
    aplica_a: "todos",
    aplica_valores: [] as string[],
    grupo: "General",
    base_calculo: "basico",
    concepto_base_id: "",
    unidad: "porcentaje",
    cantidad_default: "1",
    tope_base: "",
    orden: "0",
  });

  useEffect(() => {
    if (concepto) {
      setForm({
        codigo: concepto.codigo,
        nombre: concepto.nombre,
        tipo: concepto.tipo,
        porcentaje: concepto.porcentaje?.toString() ?? "",
        monto_fijo: concepto.monto_fijo?.toString() ?? "",
        aplica_a: concepto.aplica_a,
        aplica_valores: concepto.aplica_valores ?? [],
        grupo: concepto.grupo || "General",
        base_calculo: baseCalculo(concepto),
        concepto_base_id: concepto.concepto_base_id || "",
        unidad: concepto.unidad || "porcentaje",
        cantidad_default: concepto.cantidad_default?.toString() ?? "1",
        tope_base: concepto.tope_base?.toString() ?? "",
        orden: concepto.orden?.toString() ?? "0",
      });
    } else {
      setForm({ codigo: "", nombre: "", tipo: "remunerativo", porcentaje: "", monto_fijo: "", aplica_a: "todos", aplica_valores: [], grupo: "General", base_calculo: "basico", concepto_base_id: "", unidad: "porcentaje", cantidad_default: "1", tope_base: "", orden: "0" });
    }
  }, [concepto, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        codigo: form.codigo,
        nombre: form.nombre,
        tipo: form.tipo as any,
        porcentaje: form.porcentaje ? Number(form.porcentaje) : null,
        monto_fijo: form.monto_fijo ? Number(form.monto_fijo) : null,
        aplica_a: form.aplica_a,
        aplica_valores: form.aplica_a === "todos" ? [] : form.aplica_valores,
        grupo: form.grupo,
        base_calculo: form.base_calculo,
        concepto_base_id: form.concepto_base_id || null,
        unidad: form.unidad,
        // 0 es válido (concepto que no se paga este mes); vacío = 1
        cantidad_default: form.cantidad_default === "" ? 1 : Number(form.cantidad_default),
        tope_base: form.tipo === "deduccion" && Number(form.tope_base) > 0 ? Number(form.tope_base) : null,
        orden: Number(form.orden) || 0,
      };
      if (isEdit) {
        const { error } = await supabase.from("conceptos_liquidacion").update(payload).eq("id", concepto.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("conceptos_liquidacion").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Concepto actualizado" : "Concepto creado");
      qc.invalidateQueries({ queryKey: ["conceptos_liquidacion"] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const otherConceptos = (allConceptos ?? []).filter((c) => c.id !== concepto?.id);

  // Categorías o CCT cargados en los empleados, más los ya elegidos aunque hoy nadie los tenga
  const opcionesAplica = useMemo(() => {
    if (form.aplica_a === "todos") return [];
    const campo = form.aplica_a === "categoria" ? "categoria" : "cct";
    const valores = (empleados ?? []).map((e) => e[campo]?.trim()).filter((v): v is string => !!v);
    return Array.from(new Set([...valores, ...form.aplica_valores])).sort((a, b) => a.localeCompare(b, "es"));
  }, [empleados, form.aplica_a, form.aplica_valores]);

  const toggleValor = (v: string, checked: boolean) =>
    setForm({ ...form, aplica_valores: checked ? [...form.aplica_valores, v] : form.aplica_valores.filter((x) => x !== v) });

  const faltanValores = form.aplica_a !== "todos" && form.aplica_valores.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Concepto" : "Nuevo Concepto"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Código</Label>
              <Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Orden</Label>
              <Input type="number" value={form.orden} onChange={(e) => setForm({ ...form, orden: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="remunerativo">Remunerativo</SelectItem>
                  <SelectItem value="no_remunerativo">No Remunerativo</SelectItem>
                  <SelectItem value="deduccion">Deducción</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Nombre</Label>
            <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Grupo</Label>
            <Input value={form.grupo} onChange={(e) => setForm({ ...form, grupo: e.target.value })} placeholder="Ej: Sumas remunerativas" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Base de Cálculo</Label>
              <Select value={form.base_calculo} onValueChange={(v) => setForm({ ...form, base_calculo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="basico">Sueldo Básico</SelectItem>
                  <SelectItem value="remunerativo_total">Total Remunerativo</SelectItem>
                  <SelectItem value="fijo">Monto Fijo</SelectItem>
                  <SelectItem value="hora">Valor hora (horas extra)</SelectItem>
                  <SelectItem value="monto_concepto">Otro Concepto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.base_calculo === "hora" && (
              <p className="text-[11px] text-muted-foreground self-end pb-2">
                Valor hora = básico ÷ 200. Porcentaje = recargo (50 o 100). Cantidad = horas del mes (dejala en 0 y cargala por empleado).
              </p>
            )}
            {form.base_calculo === "monto_concepto" && (
              <div>
                <Label className="text-xs">Concepto Base</Label>
                <Select value={form.concepto_base_id} onValueChange={(v) => setForm({ ...form, concepto_base_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {otherConceptos.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.codigo} — {c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label className="text-xs">Porcentaje (%)</Label>
              <Input type="number" value={form.porcentaje} onChange={(e) => setForm({ ...form, porcentaje: e.target.value })} placeholder="Ej: 11" />
            </div>
            <div>
              <Label className="text-xs">Monto Fijo ($)</Label>
              <Input type="number" value={form.monto_fijo} onChange={(e) => setForm({ ...form, monto_fijo: e.target.value })} placeholder="Ej: 5000" />
            </div>
            <div>
              <Label className="text-xs">Cantidad Default</Label>
              <Input type="number" value={form.cantidad_default} onChange={(e) => setForm({ ...form, cantidad_default: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Unidad</Label>
              <Select value={form.unidad} onValueChange={(v) => setForm({ ...form, unidad: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="porcentaje">Porcentaje</SelectItem>
                  <SelectItem value="dias">Días</SelectItem>
                  <SelectItem value="unidades">Unidades</SelectItem>
                  <SelectItem value="horas">Horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.tipo === "deduccion" && (
              <div>
                <Label className="text-xs">Tope de base imponible ($)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.tope_base}
                  onChange={(e) => setForm({ ...form, tope_base: e.target.value })}
                  placeholder="Sin tope"
                />
                <p className="text-[11px] text-muted-foreground mt-1">Ej.: base máxima de aportes vigente de ARCA. Se actualiza cada mes.</p>
              </div>
            )}
            <div>
              <Label className="text-xs">Aplica a</Label>
              <Select value={form.aplica_a} onValueChange={(v) => setForm({ ...form, aplica_a: v, aplica_valores: [] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="categoria">Por Categoría</SelectItem>
                  <SelectItem value="convenio">Por Convenio</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {form.aplica_a !== "todos" && (
            <div>
              <Label className="text-xs">{form.aplica_a === "categoria" ? "Categorías" : "Convenios (CCT)"}</Label>
              {opcionesAplica.length === 0 ? (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Ningún empleado tiene {form.aplica_a === "categoria" ? "categoría" : "CCT"} cargado. Cargalo en el legajo para poder elegirlo.
                </p>
              ) : (
                <div className="mt-1 max-h-40 overflow-y-auto rounded-md border p-2 grid gap-1.5">
                  {opcionesAplica.map((v) => (
                    <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={form.aplica_valores.includes(v)} onCheckedChange={(c) => toggleValor(v, c === true)} />
                      {v}
                    </label>
                  ))}
                </div>
              )}
              {faltanValores && <p className="text-[11px] text-destructive mt-1">Elegí al menos uno: sin valores el concepto no se le liquida a nadie.</p>}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={!form.codigo || !form.nombre || faltanValores || mutation.isPending}>
            {mutation.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
