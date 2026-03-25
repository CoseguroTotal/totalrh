import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

const niveles = [
  { value: "primario", label: "Primario" },
  { value: "secundario", label: "Secundario" },
  { value: "terciario", label: "Terciario" },
  { value: "universitario", label: "Universitario" },
  { value: "posgrado", label: "Posgrado" },
];

const estados = [
  { value: "completo", label: "Completo" },
  { value: "en_curso", label: "En curso" },
  { value: "incompleto", label: "Incompleto" },
];

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  empleadoId: string;
  estudio?: any;
}

export default function EstudioFormDialog({ open, onOpenChange, empleadoId, estudio }: Props) {
  const [titulo, setTitulo] = useState("");
  const [institucion, setInstitucion] = useState("");
  const [nivel, setNivel] = useState("secundario");
  const [estado, setEstado] = useState("completo");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const queryClient = useQueryClient();

  const resetAndOpen = () => {
    setTitulo(estudio?.titulo ?? "");
    setInstitucion(estudio?.institucion ?? "");
    setNivel(estudio?.nivel ?? "secundario");
    setEstado(estudio?.estado ?? "completo");
    setFechaInicio(estudio?.fecha_inicio ?? "");
    setFechaFin(estudio?.fecha_fin ?? "");
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!titulo.trim()) throw new Error("El título es requerido");
      const payload = {
        empleado_id: empleadoId,
        titulo: titulo.trim(),
        institucion: institucion.trim() || null,
        nivel: nivel as any,
        estado: estado as any,
        fecha_inicio: fechaInicio || null,
        fecha_fin: fechaFin || null,
      };
      if (estudio) {
        const { error } = await supabase.from("estudios_empleado").update(payload).eq("id", estudio.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("estudios_empleado").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(estudio ? "Estudio actualizado" : "Estudio agregado");
      queryClient.invalidateQueries({ queryKey: ["estudios_empleado", empleadoId] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (o) resetAndOpen(); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{estudio ? "Editar Estudio" : "Agregar Estudio"}</DialogTitle>
          <DialogDescription>Datos de formación académica del empleado.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Título *</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Licenciatura en Administración" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Institución</Label>
            <Input value={institucion} onChange={(e) => setInstitucion(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nivel</Label>
              <Select value={nivel} onValueChange={setNivel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {niveles.map((n) => <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Estado</Label>
              <Select value={estado} onValueChange={setEstado}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {estados.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Fecha inicio</Label>
              <Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fecha fin</Label>
              <Input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {estudio ? "Guardar" : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
