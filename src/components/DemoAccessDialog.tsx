import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MailCheck, ShieldCheck } from "lucide-react";
import { requestDemoCode, verifyDemoCode } from "@/lib/demoAccess";

const leadSchema = z.object({
  nombre: z.string().trim().min(2, "Ingresá tu nombre").max(120),
  email: z.string().trim().email("Email inválido").max(255),
  empresa: z.string().trim().max(120).optional(),
  telefono: z.string().trim().max(40).optional(),
});

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DemoAccessDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState<"datos" | "codigo">("datos");
  const [form, setForm] = useState({ nombre: "", email: "", empresa: "", telefono: "" });
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep("datos");
    setCodigo("");
    setError(null);
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = leadSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      await requestDemoCode({ ...parsed.data, nombre: parsed.data.nombre, email: parsed.data.email });
      setStep("codigo");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos enviar el código");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(codigo.trim())) {
      setError("El código tiene 6 dígitos");
      return;
    }
    setLoading(true);
    try {
      await verifyDemoCode(form.email.trim().toLowerCase(), codigo.trim());
      onOpenChange(false);
      navigate("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Código inválido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === "datos" ? <ShieldCheck className="h-5 w-5 text-primary" /> : <MailCheck className="h-5 w-5 text-primary" />}
            {step === "datos" ? "Acceder a la demo" : "Ingresá tu código"}
          </DialogTitle>
          <DialogDescription>
            {step === "datos"
              ? "Dejanos tus datos y te enviamos por email un código de acceso a la demo."
              : `Enviamos un código de 6 dígitos a ${form.email}. Vence en 15 minutos.`}
          </DialogDescription>
        </DialogHeader>

        {step === "datos" ? (
          <form onSubmit={handleRequest} className="space-y-3">
            <div>
              <Label htmlFor="demo-nombre">Nombre y apellido *</Label>
              <Input id="demo-nombre" value={form.nombre} maxLength={120} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Juan Pérez" />
            </div>
            <div>
              <Label htmlFor="demo-email">Email *</Label>
              <Input id="demo-email" type="email" value={form.email} maxLength={255} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="juan@empresa.com.ar" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="demo-empresa">Empresa</Label>
                <Input id="demo-empresa" value={form.empresa} maxLength={120} onChange={(e) => setForm({ ...form, empresa: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="demo-telefono">Teléfono</Label>
                <Input id="demo-telefono" value={form.telefono} maxLength={40} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
              </div>
            </div>
            {error && <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Enviarme el código
            </Button>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Usamos tus datos únicamente para darte acceso a la demo y contactarte con novedades comerciales de TotalRH. Podés pedir la baja cuando quieras.
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-3">
            <div>
              <Label htmlFor="demo-codigo">Código de acceso</Label>
              <Input
                id="demo-codigo"
                inputMode="numeric"
                maxLength={6}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
                className="text-center text-2xl tracking-[0.5em] font-semibold"
                placeholder="000000"
              />
            </div>
            {error && <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Ingresar a la demo
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={reset} disabled={loading}>
              Cambiar mis datos / reenviar código
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
