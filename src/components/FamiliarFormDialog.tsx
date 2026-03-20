import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const parentescos = [
  { value: "conyuge", label: "Cónyuge" },
  { value: "hijo", label: "Hijo/a" },
  { value: "padre", label: "Padre/Madre" },
  { value: "otro", label: "Otro" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empleadoId: string;
  familiar?: any;
}

export default function FamiliarFormDialog({ open, onOpenChange, empleadoId, familiar }: Props) {
  const queryClient = useQueryClient();
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [parentesco, setParentesco] = useState("hijo");
  const [dni, setDni] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [discapacidad, setDiscapacidad] = useState(false);
  const [aCargo, setACargo] = useState(true);

  useEffect(() => {
    if (open && familiar) {
      setNombre(familiar.nombre);
      setApellido(familiar.apellido);
      setParentesco(familiar.parentesco);
      setDni(familiar.dni ?? "");
      setFechaNacimiento(familiar.fecha_nacimiento ?? "");
      setDiscapacidad(familiar.discapacidad);
      setACargo(familiar.a_cargo);
    } else if (open) {
      setNombre(""); setApellido(""); setParentesco("hijo"); setDni("");
      setFechaNacimiento(""); setDiscapacidad(false); setACargo(true);
    }
  }, [open, familiar]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!nombre.trim() || !apellido.trim()) throw new Error("Nombre y apellido son requeridos");
      const payload = {
        empleado_id: empleadoId,
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        parentesco: parentesco as any,
        dni: dni.trim() || null,
        fecha_nacimiento: fechaNacimiento || null,
        discapacidad,
        a_cargo: aCargo,
      };
      if (familiar) {
        const { error } = await supabase.from("grupo_familiar").update(payload).eq("id", familiar.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("grupo_familiar").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(familiar ? "Familiar actualizado" : "Familiar agregado");
      queryClient.invalidateQueries({ queryKey: ["grupo_familiar", empleadoId] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{familiar ? "Editar Familiar" : "Agregar Familiar"}</DialogTitle>
          <DialogDescription>Datos del integrante del grupo familiar.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre *</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Apellido *</Label>
              <Input value={apellido} onChange={(e) => setApellido(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Parentesco *</Label>
              <Select value={parentesco} onValueChange={setParentesco}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {parentescos.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">DNI</Label>
              <Input value={dni} onChange={(e) => setDni(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Fecha de Nacimiento</Label>
            <Input type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} />
          </div>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Checkbox id="a_cargo" checked={aCargo} onCheckedChange={(c) => setACargo(!!c)} />
              <Label htmlFor="a_cargo" className="text-xs">A cargo</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="discapacidad" checked={discapacidad} onCheckedChange={(c) => setDiscapacidad(!!c)} />
              <Label htmlFor="discapacidad" className="text-xs">Discapacidad</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {familiar ? "Guardar" : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
