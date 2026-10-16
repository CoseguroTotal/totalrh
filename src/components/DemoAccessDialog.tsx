import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MailCheck, ShieldCheck } from "lucide-react";
import { requestDemoCode, verifyDemoCode, verifyMasterCode } from "@/lib/demoAccess";

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
  const [step, setStep] = useState<"datos" | "codigo" | "maestro">("datos");
  const [form, setForm] = useState({ nombre: "", email: "", empresa: "", telefono: "" });
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [bloqueadoHasta, setBloqueadoHasta] = useState<number>(0);
  const [maestro, setMaestro] = useState("");
  const bloqueado = bloqueadoHasta > Date.now();

  const onErr = (err: unknown, fallback: string) => {
    const e = err as Error & { retryAt?: string };
    if (e?.retryAt) setBloqueadoHasta(new Date(e.retryAt).getTime());
    setError(e instanceof Error ? e.message : fallback);
  };

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const reset = () => {
    setStep("datos");
    setCodigo("");
    setMaestro("");
    setError(null);
    setResendIn(0);
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
      setResendIn(45);
    } catch (err) {
      onErr(err, "No pudimos enviar el código");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    const parsed = leadSchema.safeParse(form);
    if (!parsed.success) return;
    setError(null);
    setLoading(true);
    try {
      await requestDemoCode({ ...parsed.data, nombre: parsed.data.nombre, email: parsed.data.email });
      setResendIn(45);
    } catch (err) {
      onErr(err, "No pudimos reenviar el código");
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
      const r = await verifyDemoCode(form.email.trim().toLowerCase(), codigo.trim());
      onOpenChange(false);
      navigate("/login", { state: { demoAviso: r.credencialesEnviadas ? `Te enviamos tus usuarios personales a ${form.email}.` : null } });
    } catch (err) {
      onErr(err, "Código inválido");
    } finally {
      setLoading(false);
    }
  };

  const handleMaestro = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^[A-Za-z0-9]{8}$/.test(maestro.trim())) {
      setError("El código de presentación tiene 8 caracteres");
      return;
    }
    setLoading(true);
    try {
      await verifyMasterCode(maestro.trim().toUpperCase());
      onOpenChange(false);
      navigate("/login");
    } catch (err) {
      onErr(err, "Código inválido");
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
            {step === "datos" ? "Acceder a la demo" : step === "maestro" ? "Código de presentación" : "Ingresá tu código"}
          </DialogTitle>
          <DialogDescription>
            {step === "datos"
              ? "Dejanos tus datos y te enviamos por email un código de acceso a la demo."
              : step === "maestro"
              ? "Ingresá el código de 8 caracteres provisto para presentaciones en vivo."
              : `Enviamos un código de 6 dígitos a ${form.email}.`}
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
            <Button type="submit" className="w-full" disabled={loading || bloqueado}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Enviarme el código
            </Button>
            <button type="button" className="w-full text-xs text-primary underline-offset-2 hover:underline" onClick={() => { setError(null); setStep("maestro"); }}>
              Tengo un código de presentación
            </button>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Usamos tus datos únicamente para darte acceso a la demo y contactarte con novedades comerciales de TotalRH. Podés pedir la baja cuando quieras.
            </p>
          </form>
        ) : step === "maestro" ? (
          <form onSubmit={handleMaestro} className="space-y-3">
            <Input
              aria-label="Código de presentación"
              maxLength={8}
              value={maestro}
              onChange={(e) => setMaestro(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())}
              className="text-center text-2xl tracking-[0.3em] font-semibold"
              placeholder="XXXXXXXX"
            />
            {error && <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading || bloqueado}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Ingresar
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={reset} disabled={loading}>Volver</Button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-3">
            <div className="rounded-md bg-primary/10 px-3 py-2 text-[12px] text-foreground/80 leading-snug">
              El email puede demorar hasta 1 minuto. Si no lo ves, revisá la carpeta de <strong>spam o correo no deseado</strong>.
              Al validarlo te enviamos un segundo email con tus usuarios personales para cada perfil.
            </div>
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
            <Button type="submit" className="w-full" disabled={loading || bloqueado}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Ingresar a la demo
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleResend}
              disabled={loading || resendIn > 0 || bloqueado}
            >
              {bloqueado ? "Reenvío bloqueado temporalmente" : resendIn > 0 ? `Reenviar código en ${resendIn}s` : "Reenviar código"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={reset} disabled={loading}>
              Cambiar mis datos
            </Button>
          </form>

        )}
      </DialogContent>
    </Dialog>
  );
}
