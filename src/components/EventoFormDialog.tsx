import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { hoyArgentina } from "@/lib/asistencia";

const tiposEvento = [
  { value: "ingreso", label: "Ingreso" },
  { value: "promocion", label: "Promoción" },
  { value: "sancion", label: "Sanción" },
  { value: "licencia", label: "Licencia" },
  { value: "cambio", label: "Cambio" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empleadoId: string;
}

export default function EventoFormDialog({ open, onOpenChange, empleadoId }: Props) {
  const queryClient = useQueryClient();
  const [tipo, setTipo] = useState<string>("ingreso");
  const [fecha, setFecha] = useState(() => hoyArgentina());
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const reset = () => {
    setTipo("ingreso");
    setFecha(hoyArgentina());
    setTitulo("");
    setDescripcion("");
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!titulo.trim()) throw new Error("El título es requerido");
      const { error } = await supabase.from("eventos_legajo").insert({
        empleado_id: empleadoId,
        tipo: tipo as any,
        fecha,
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evento registrado");
      queryClient.invalidateQueries({ queryKey: ["eventos_legajo", empleadoId] });
      reset();
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Evento</DialogTitle>
          <DialogDescription>Agregá un evento al historial del legajo.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo *</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {tiposEvento.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fecha *</Label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Título *</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Descripción</Label>
            <Textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
