import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  concepto?: any;
};

export default function ConceptoFormDialog({ open, onOpenChange, concepto }: Props) {
  const qc = useQueryClient();
  const isEdit = !!concepto;

  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    tipo: "remunerativo" as string,
    porcentaje: "",
    monto_fijo: "",
    aplica_a: "todos",
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
      });
    } else {
      setForm({ codigo: "", nombre: "", tipo: "remunerativo", porcentaje: "", monto_fijo: "", aplica_a: "todos" });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Concepto" : "Nuevo Concepto"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Código</Label>
              <Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Porcentaje (%)</Label>
              <Input type="number" value={form.porcentaje} onChange={(e) => setForm({ ...form, porcentaje: e.target.value })} placeholder="Ej: 11" />
            </div>
            <div>
              <Label className="text-xs">Monto Fijo ($)</Label>
              <Input type="number" value={form.monto_fijo} onChange={(e) => setForm({ ...form, monto_fijo: e.target.value })} placeholder="Ej: 5000" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Aplica a</Label>
            <Select value={form.aplica_a} onValueChange={(v) => setForm({ ...form, aplica_a: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="categoria">Por Categoría</SelectItem>
                <SelectItem value="convenio">Por Convenio</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={!form.codigo || !form.nombre || mutation.isPending}>
            {mutation.isPending ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
