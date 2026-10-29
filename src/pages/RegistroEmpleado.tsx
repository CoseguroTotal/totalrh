import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MarcaLockup } from "@/components/Marca";
import GuiaInstalacion from "@/components/GuiaInstalacion";
import { invocar } from "@/hooks/useRegistro";
import { NOMBRE_APP } from "@/marca";
import { cn } from "@/lib/utils";
import {
  normalizarCodigo, PASSWORD_MINIMO, validarRegistro, type DatosRegistro,
} from "../../supabase/functions/_shared/registro-rules";

type Empresa = { id: string; nombre: string; sucursales: { id: string; nombre: string }[] };

const TEXTO_CONSENTIMIENTO =
  "Autorizo a mi empleador a tratar estos datos para gestionar mi legajo, mi asistencia, mis recibos y las " +
  "comunicaciones laborales (memorándums y firmas digitales), según la Ley 25.326 de Protección de Datos Personales.";

const VACIO: DatosRegistro = {
  dni: "", cuil: "", nombre: "", apellido: "", fecha_nacimiento: "", telefono: "", email: "",
  empresa_id: "", sucursal_id: "", password: "", consentimiento: false,
};

/** Formulario público: el empleado crea su cuenta con el código de la empresa y RRHH la aprueba. */
export default function RegistroEmpleado() {
  const [params] = useSearchParams();
  const [codigo, setCodigo] = useState(normalizarCodigo(params.get("c") ?? ""));
  const [empresas, setEmpresas] = useState<Empresa[] | null>(null);
  const [validando, setValidando] = useState(false);
  const [errorCodigo, setErrorCodigo] = useState<string | null>(null);

  const [d, setD] = useState<DatosRegistro>(VACIO);
  const [repetir, setRepetir] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [tocado, setTocado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [erroresServidor, setErroresServidor] = useState<Record<string, string>>({});
  const [listo, setListo] = useState(false);

  const validarCodigo = async (c = codigo) => {
    if (!c) return;
    setValidando(true);
    setErrorCodigo(null);
    const { data, error } = await invocar<{ empresas: Empresa[] }>("registro-empleado", { action: "info", codigo: c });
    setValidando(false);
    if (error) { setErrorCodigo(error); return; }
    setEmpresas(data.empresas);
    // Con una sola empresa no hace falta elegir
    if (data.empresas.length === 1) {
      const e = data.empresas[0];
      setD((x) => ({ ...x, empresa_id: e.id, sucursal_id: e.sucursales.length === 1 ? e.sucursales[0].id : "" }));
    }
  };

  // Con el enlace de WhatsApp el código ya viene en la dirección
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (codigo) validarCodigo(codigo); }, []);

  const errores = useMemo(() => {
    const e: Record<string, string> = { ...validarRegistro(d), ...erroresServidor };
    if (!e.password && repetir !== d.password) e.repetir = "Las contraseñas no coinciden";
    return e;
  }, [d, repetir, erroresServidor]);

  const set = <K extends keyof DatosRegistro>(k: K, v: DatosRegistro[K]) => {
    setD((x) => ({ ...x, [k]: v }));
    setErroresServidor((x) => { const { [k]: _, ...resto } = x; return resto; });
  };

  const empresa = empresas?.find((e) => e.id === d.empresa_id);

  const enviar = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setTocado(true);
    setErrorEnvio(null);
    if (Object.keys(errores).length) return;
    setEnviando(true);
    const { data, error } = await invocar<{ errores?: Record<string, string> }>("registro-empleado", { action: "registrar", codigo, datos: d });
    setEnviando(false);
    if (error) {
      setErrorEnvio(error);
      if (data?.errores) setErroresServidor(data.errores);
      return;
    }
    setListo(true);
    window.scrollTo({ top: 0 });
  };

  const err = (k: string) => (tocado && errores[k] ? <p className="mt-1 text-xs text-destructive">{errores[k]}</p> : null);
  const cls = (k: string) => cn("mt-1.5", tocado && errores[k] && "border-destructive");

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <MarcaLockup />
          <h1 className="text-xl font-semibold">{listo ? "¡Listo! Enviaste tu alta" : "Creá tu cuenta de empleado"}</h1>
          {!listo && <p className="text-sm text-muted-foreground">Completá tus datos. RRHH revisa tu alta y la vincula a tu legajo.</p>}
        </div>

        {listo ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-success/30 bg-success/10 p-5 text-sm">
              <p className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-5 w-5 text-success" />Tu solicitud llegó a RRHH.</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-muted-foreground">
                <li>Cuando la aprueben vas a poder entrar con tu <b>DNI</b> (o tu email) y la contraseña que elegiste.</li>
                <li>Mientras tanto, instalá la app en tu celular con los pasos de abajo.</li>
                <li>Después, desde <b>Autogestión → Fichar</b>, podés registrar tu rostro para fichar con la cámara. RRHH lo verifica con vos en persona.</li>
              </ul>
            </div>
            <GuiaInstalacion />
            <Button asChild variant="outline" className="w-full"><Link to="/login">Ir a iniciar sesión</Link></Button>
          </div>
        ) : !empresas ? (
          <form className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm" onSubmit={(e) => { e.preventDefault(); validarCodigo(); }}>
            <div>
              <Label htmlFor="codigo" className="flex items-center gap-1.5"><KeyRound className="h-4 w-4 text-primary" />Código de la empresa</Label>
              <Input id="codigo" className="mt-1.5 h-11 text-center font-mono text-lg tracking-[0.3em] uppercase" autoComplete="off" autoFocus
                value={codigo} onChange={(e) => setCodigo(normalizarCodigo(e.target.value).slice(0, 12))} placeholder="AB3K7MPQ" />
              <p className="mt-1.5 text-xs text-muted-foreground">Viene en el enlace que te mandaron por WhatsApp. Si no lo tenés, pedíselo a RRHH.</p>
            </div>
            {errorCodigo && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorCodigo}</p>}
            <Button type="submit" className="h-11 w-full" disabled={!codigo || validando}>
              {validando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continuar"}
            </Button>
          </form>
        ) : (
          <form className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm" onSubmit={enviar} noValidate>
            <fieldset className="space-y-3">
              <legend className="mb-1 text-sm font-semibold">Tus datos</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label htmlFor="nombre">Nombre</Label><Input id="nombre" className={cls("nombre")} autoComplete="given-name" value={d.nombre} onChange={(e) => set("nombre", e.target.value)} />{err("nombre")}</div>
                <div><Label htmlFor="apellido">Apellido</Label><Input id="apellido" className={cls("apellido")} autoComplete="family-name" value={d.apellido} onChange={(e) => set("apellido", e.target.value)} />{err("apellido")}</div>
                <div><Label htmlFor="dni">DNI</Label><Input id="dni" className={cls("dni")} inputMode="numeric" value={d.dni} onChange={(e) => set("dni", e.target.value)} placeholder="Sólo números" />{err("dni")}</div>
                <div><Label htmlFor="cuil">CUIL</Label><Input id="cuil" className={cls("cuil")} inputMode="numeric" value={d.cuil} onChange={(e) => set("cuil", e.target.value)} placeholder="20-12345678-9" />{err("cuil")}</div>
                <div><Label htmlFor="nac">Fecha de nacimiento</Label><Input id="nac" type="date" className={cls("fecha_nacimiento")} value={d.fecha_nacimiento ?? ""} onChange={(e) => set("fecha_nacimiento", e.target.value)} />{err("fecha_nacimiento")}</div>
                <div><Label htmlFor="tel">Celular</Label><Input id="tel" type="tel" className={cls("telefono")} autoComplete="tel" value={d.telefono} onChange={(e) => set("telefono", e.target.value)} placeholder="387 455-1234" />{err("telefono")}</div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" className={cls("email")} autoComplete="email" value={d.email} onChange={(e) => set("email", e.target.value)} placeholder="tu@email.com" />
                <p className="mt-1 text-xs text-muted-foreground">Obligatorio: ahí te llegan los memorándums y los pedidos de firma.</p>
                {err("email")}
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="mb-1 text-sm font-semibold">Dónde trabajás</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Empresa</Label>
                  <Select value={d.empresa_id} onValueChange={(v) => { set("empresa_id", v); set("sucursal_id", ""); }}>
                    <SelectTrigger className={cls("empresa_id")}><SelectValue placeholder="Elegí" /></SelectTrigger>
                    <SelectContent>{empresas.map((e) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}</SelectContent>
                  </Select>
                  {err("empresa_id")}
                </div>
                <div>
                  <Label>Sucursal</Label>
                  <Select value={d.sucursal_id} onValueChange={(v) => set("sucursal_id", v)} disabled={!empresa}>
                    <SelectTrigger className={cls("sucursal_id")}><SelectValue placeholder="Elegí" /></SelectTrigger>
                    <SelectContent>{(empresa?.sucursales ?? []).map((s) => <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>)}</SelectContent>
                  </Select>
                  {err("sucursal_id")}
                </div>
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="mb-1 text-sm font-semibold">Tu contraseña</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="pw">Contraseña</Label>
                  <div className="relative">
                    <Input id="pw" type={verClave ? "text" : "password"} className={cn(cls("password"), "pr-10")} autoComplete="new-password" value={d.password} onChange={(e) => set("password", e.target.value)} />
                    <button type="button" onClick={() => setVerClave((v) => !v)} aria-label={verClave ? "Ocultar contraseña" : "Mostrar contraseña"}
                      className="absolute right-2 top-1/2 mt-0.5 -translate-y-1/2 p-1 text-muted-foreground">
                      {verClave ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {err("password")}
                </div>
                <div><Label htmlFor="pw2">Repetila</Label><Input id="pw2" type={verClave ? "text" : "password"} className={cls("repetir")} autoComplete="new-password" value={repetir} onChange={(e) => setRepetir(e.target.value)} />{err("repetir")}</div>
              </div>
              <p className="text-xs text-muted-foreground">Al menos {PASSWORD_MINIMO} caracteres, con letras y números.</p>
            </fieldset>

            <label className="flex cursor-pointer items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
              <Checkbox checked={d.consentimiento} onCheckedChange={(v) => set("consentimiento", v === true)} className="mt-0.5" />
              <span><ShieldCheck className="mr-1 inline h-4 w-4 text-primary" />{TEXTO_CONSENTIMIENTO}</span>
            </label>
            {err("consentimiento")}

            {errorEnvio && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorEnvio}</p>}
            <Button type="submit" className="h-11 w-full" disabled={enviando}>
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear mi cuenta"}
            </Button>
          </form>
        )}

        {!listo && (
          <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />Ya tengo cuenta en {NOMBRE_APP}
          </Link>
        )}
      </div>
    </div>
  );
}
