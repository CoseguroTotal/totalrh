import { useEffect, useState } from "react";
import { BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useActualizarMisDatos, type MisDatos } from "@/hooks/useRegistro";
import { emailValido, soloDigitos } from "../../supabase/functions/_shared/registro-rules";

type EmpleadoDatos = Partial<Record<keyof MisDatos, string | null>>;

const CAMPOS: { k: keyof MisDatos; label: string; tipo?: string; ancho?: "full" }[] = [
  { k: "email", label: "Email", tipo: "email", ancho: "full" },
  { k: "telefono", label: "Celular", tipo: "tel" },
  { k: "estado_civil", label: "Estado civil" },
  { k: "domicilio_calle", label: "Calle", ancho: "full" },
  { k: "domicilio_numero", label: "Número" },
  { k: "domicilio_piso", label: "Piso / Depto" },
  { k: "domicilio_localidad", label: "Localidad" },
  { k: "domicilio_provincia", label: "Provincia" },
  { k: "domicilio_cp", label: "Código postal" },
  { k: "nacionalidad", label: "Nacionalidad" },
];

const desde = (e: EmpleadoDatos): MisDatos =>
  Object.fromEntries(CAMPOS.map(({ k }) => [k, e[k] ?? ""])) as MisDatos;

/** El empleado actualiza sus datos de contacto; RRHH recibe el aviso y queda en el historial. */
export default function MisDatosDialog({ open, onOpenChange, empleado }: { open: boolean; onOpenChange: (o: boolean) => void; empleado: EmpleadoDatos }) {
  const [d, setD] = useState<MisDatos>(desde(empleado));
  const guardar = useActualizarMisDatos();

  useEffect(() => { if (open) setD(desde(empleado)); }, [open, empleado]);

  const errorEmail = !emailValido(d.email) ? "Ingresá un email válido" : null;
  const errorTel = soloDigitos(d.telefono).length < 8 ? "Ingresá tu celular con código de área" : null;
  const sinCambios = CAMPOS.every(({ k }) => (empleado[k] ?? "") === d[k]);

  const enviar = () => {
    if (errorEmail || errorTel) return;
    guardar.mutate(d, {
      onSuccess: () => { toast.success("Datos actualizados. RRHH recibió el aviso."); onOpenChange(false); },
      onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudieron guardar"),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Actualizar mis datos</DialogTitle>
          <DialogDescription>Nombre, DNI, CUIL y los datos laborales los corrige RRHH.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {CAMPOS.map(({ k, label, tipo, ancho }) => (
            <div key={k} className={ancho === "full" ? "col-span-2" : ""}>
              <Label htmlFor={`md-${k}`}>{label}</Label>
              <Input id={`md-${k}`} type={tipo ?? "text"} className="mt-1.5" value={d[k]} onChange={(e) => setD({ ...d, [k]: e.target.value })} />
              {k === "email" && (errorEmail ? <p className="mt-1 text-xs text-destructive">{errorEmail}</p> : <p className="mt-1 text-xs text-muted-foreground">Ahí te llegan los memorándums y pedidos de firma.</p>)}
              {k === "telefono" && errorTel && <p className="mt-1 text-xs text-destructive">{errorTel}</p>}
            </div>
          ))}
        </div>
        <p className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
          <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-primary" />Los cambios se guardan al instante, se le avisan a RRHH y quedan registrados en tu legajo.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={enviar} disabled={sinCambios || !!errorEmail || !!errorTel || guardar.isPending}>
            {guardar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
