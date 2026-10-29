import { useState } from "react";
import { Copy, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { invocar } from "@/hooks/useRegistro";
import { problemaPassword } from "../../supabase/functions/_shared/registro-rules";

const SILABAS = ["ba", "ce", "di", "fo", "gu", "la", "me", "ni", "po", "ru", "sa", "te", "vi", "zo", "ma", "lu", "ra", "ne", "ti", "co"];

/** Contraseña provisoria fácil de dictar pero difícil de adivinar: p. ej. "Bamenipo-4827". */
export function sugerirClave() {
  const r = crypto.getRandomValues(new Uint32Array(8));
  const palabra = Array.from(r.slice(0, 4), (n) => SILABAS[n % SILABAS.length]).join("");
  const numeros = Array.from(r.slice(4), (n) => n % 10).join("");
  return palabra[0].toUpperCase() + palabra.slice(1) + "-" + numeros;
}

/** RRHH le pone una contraseña provisoria a un empleado que la olvidó (las cuentas sin email no pueden recuperarla solas). */
export default function BlanquearClave({ empleadoId, nombre }: { empleadoId: string; nombre: string }) {
  const [abierto, setAbierto] = useState(false);
  const [clave, setClave] = useState("");
  const [guardando, setGuardando] = useState(false);
  const problema = problemaPassword(clave);

  const abrir = () => { setClave(sugerirClave()); setAbierto(true); };
  const guardar = async () => {
    setGuardando(true);
    const { error } = await invocar("registro-empleado", { action: "blanquear", empleado_id: empleadoId, password: clave });
    setGuardando(false);
    if (error) { toast.error(error); return; }
    toast.success("Contraseña provisoria guardada. Pasásela al empleado y pedile que la cambie en Autogestión → Clave.");
    setAbierto(false);
  };

  return (
    <>
      <Button variant="ghost" size="sm" onClick={abrir}><KeyRound className="mr-1.5 h-3.5 w-3.5" />Blanquear clave</Button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Blanquear contraseña</DialogTitle>
            <DialogDescription>{nombre} va a poder entrar con su DNI y esta contraseña provisoria.</DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="clave-prov">Contraseña provisoria</Label>
            <div className="mt-1.5 flex gap-2">
              <Input id="clave-prov" className="font-mono" value={clave} onChange={(e) => setClave(e.target.value)} />
              <Button variant="outline" size="icon" aria-label="Copiar" onClick={() => navigator.clipboard.writeText(clave).then(() => toast.success("Copiada"))}><Copy className="h-4 w-4" /></Button>
            </div>
            {problema && <p className="mt-1 text-xs text-destructive">{problema}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbierto(false)}>Cancelar</Button>
            <Button onClick={guardar} disabled={!!problema || guardando}>{guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
