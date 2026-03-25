import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

const motivos = [
  "Lic. por Paternidad",
  "Lic. por Estudio",
  "Mudanza",
  "Trámites Personales",
  "Lic. por Fallecimiento",
  "Lic. Sin goce de haberes",
  "Otros",
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  empleadoId: string;
}

export default function SolicitudPermisoFormDialog({ open, onOpenChange, empleadoId }: Props) {
  const [motivo, setMotivo] = useState(motivos[0]);
  const [motivoDetalle, setMotivoDetalle] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [horaReintegro, setHoraReintegro] = useState("");
  const [sujetoDescuento, setSujetoDescuento] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!fechaDesde || !fechaHasta) throw new Error("Las fechas son requeridas");
      const { error } = await supabase.from("solicitudes_permiso").insert({
        empleado_id: empleadoId,
        motivo,
        motivo_detalle: motivoDetalle.trim() || null,
        fecha_desde: fechaDesde,
        fecha_hasta: fechaHasta,
        hora_reintegro: horaReintegro || null,
        sujeto_descuento: sujetoDescuento,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitud enviada");
      queryClient.invalidateQueries({ queryKey: ["solicitudes_permiso", empleadoId] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const needsDetail = motivo === "Lic. por Fallecimiento" || motivo === "Otros";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva Solicitud de Permiso</DialogTitle>
          <DialogDescription>Completá el formulario para solicitar un permiso.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Motivo *</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {motivos.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {needsDetail && (
            <div className="space-y-1.5">
              <Label className="text-xs">{motivo === "Lic. por Fallecimiento" ? "Indicar pariente" : "Indicar motivo"}</Label>
              <Textarea value={motivoDetalle} onChange={(e) => setMotivoDetalle(e.target.value)} rows={2} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Desde *</Label>
              <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Hasta *</Label>
              <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Hora de reintegro</Label>
            <Input type="time" value={horaReintegro} onChange={(e) => setHoraReintegro(e.target.value)} />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={sujetoDescuento} onCheckedChange={setSujetoDescuento} />
            <Label className="text-xs">Sujeto a descuento</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar Solicitud
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
