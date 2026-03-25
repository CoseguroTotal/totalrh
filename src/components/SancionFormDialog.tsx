import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle } from "lucide-react";
import { useCreateSancion } from "@/hooks/useSanciones";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const TIPOS_SANCION = [
  { value: "apercibimiento", label: "Apercibimiento" },
  { value: "amonestacion", label: "Amonestación" },
  { value: "suspension", label: "Suspensión" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empleadoId: string;
  empleadoNombre: string;
}

export default function SancionFormDialog({ open, onOpenChange, empleadoId, empleadoNombre }: Props) {
  const [form, setForm] = useState({ tipo: "apercibimiento", motivo: "", descripcion: "", fecha: new Date().toISOString().slice(0, 10) });
  const createSancion = useCreateSancion();
  const qc = useQueryClient();

  const handleSubmit = async () => {
    if (!form.motivo) { toast.error("El motivo es obligatorio"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    createSancion.mutate({
      empleado_id: empleadoId,
      tipo: form.tipo,
      motivo: form.motivo,
      descripcion: form.descripcion || undefined,
      fecha: form.fecha,
      emitido_por: user?.id,
    }, {
      onSuccess: async () => {
        // Also register as evento_legajo
        await supabase.from("eventos_legajo").insert({
          empleado_id: empleadoId,
          fecha: form.fecha,
          tipo: "sancion" as any,
          titulo: `${TIPOS_SANCION.find(t => t.value === form.tipo)?.label}: ${form.motivo}`,
          descripcion: form.descripcion || null,
        });
        qc.invalidateQueries({ queryKey: ["eventos_legajo", empleadoId] });
        toast.success("Sanción registrada");
        onOpenChange(false);
        setForm({ tipo: "apercibimiento", motivo: "", descripcion: "", fecha: new Date().toISOString().slice(0, 10) });
      },
      onError: (err: Error) => toast.error(err.message),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            Emitir Sanción
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Empleado: <strong>{empleadoNombre}</strong></p>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Tipo de Sanción</Label>
            <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS_SANCION.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Motivo *</Label>
            <Input value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} placeholder="Motivo de la sanción" />
          </div>
          <div>
            <Label className="text-xs">Descripción</Label>
            <Textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Detalle adicional (opcional)" rows={3} />
          </div>
          <div>
            <Label className="text-xs">Fecha</Label>
            <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={createSancion.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {createSancion.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <AlertCircle className="h-4 w-4 mr-1" />}
            Emitir Sanción
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
