import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { invocarFuncion } from "@/lib/sesion";

/** Error de la función de asistencia, venga en el cuerpo o en la respuesta HTTP. */
export async function errorDeFuncion(data: { error?: string } | null, error: unknown) {
  if (data?.error) return data.error;
  if (!error) return null;
  try { return (await (error as { context?: Response }).context?.json())?.error ?? "No se pudo completar la acción"; } catch { return "No se pudo completar la acción"; }
}

/** RRHH mira la foto que el empleado se sacó al registrarse desde el celular y lo autoriza o rechaza. */
export function AutorizarRostroDialog({ empleadoId, nombre, onCerrar, onListo }: { empleadoId: string; nombre: string; onCerrar: () => void; onListo: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<"face-autorizar" | "face-borrar" | null>(null);

  useEffect(() => {
    let vigente = true;
    invocarFuncion("validate-attendance-token", { action: "face-foto", empleado_id: empleadoId }).then(async ({ data, error: e }) => {
      if (!vigente) return;
      const msg = await errorDeFuncion(data, e);
      if (msg) setError(msg); else setUrl(data.url);
    });
    return () => { vigente = false; };
  }, [empleadoId]);

  const decidir = async (action: "face-autorizar" | "face-borrar") => {
    if (action === "face-borrar" && !confirm(`¿Rechazar el registro facial de ${nombre}? Va a tener que registrarse de nuevo.`)) return;
    setEnviando(action);
    const { data, error: e } = await invocarFuncion("validate-attendance-token", { action, empleado_id: empleadoId });
    setEnviando(null);
    const msg = await errorDeFuncion(data, e);
    if (msg) { toast.error(msg); return; }
    toast.success(action === "face-autorizar" ? `${nombre} ya puede fichar con el rostro` : "Registro rechazado");
    onListo();
    onCerrar();
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCerrar(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Autorizar rostro de {nombre}</DialogTitle>
          <DialogDescription>Es la foto que se sacó al registrarse desde el celular, después de la prueba de vida. Autorizá sólo si es esta persona.</DialogDescription>
        </DialogHeader>
        <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-xl bg-muted">
          {url ? <img src={url} alt={`Foto del registro facial de ${nombre}`} className="h-full w-full object-cover" />
            : error ? <p className="px-6 text-center text-sm text-muted-foreground">{error}</p>
            : <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
        </div>
        <p className="text-xs text-muted-foreground">La foto se borra apenas autorizás o rechazás. Si no es la persona, rechazalo y que se registre de nuevo.</p>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" disabled={!!enviando} onClick={() => decidir("face-borrar")}>
            {enviando === "face-borrar" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <XCircle className="mr-1.5 h-4 w-4" />}Rechazar
          </Button>
          <Button disabled={!url || !!enviando} onClick={() => decidir("face-autorizar")}>
            {enviando === "face-autorizar" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-1.5 h-4 w-4" />}Autorizar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
