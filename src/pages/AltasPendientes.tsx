import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  CheckCircle2, Copy, Link2, Loader2, MessageCircle, RefreshCw, Smartphone, UserCheck, UserPlus, UserX,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEmpleados, useEmpresas } from "@/hooks/useEmpleados";
import { useUserRole } from "@/hooks/useUserRole";
import { useConfigGrupo } from "@/hooks/useConfigGrupo";
import {
  enlaceInstalar, enlaceRegistro, useConfigRegistro, useConfigurarRegistro, useResolverAlta, useSolicitudesAlta, type SolicitudAlta,
} from "@/hooks/useRegistro";
import { supabase } from "@/integrations/supabase/client";
import { escaparHtml, sendNotificationEmailIfEnabled } from "@/lib/sendNotificationEmail";
import { hoyArgentina } from "@/lib/asistencia";
import { formatoFecha } from "@/lib/vacacionesCalendario";
import { NOMBRE_APP } from "@/marca";
import { cn } from "@/lib/utils";
import { soloDigitos } from "../../supabase/functions/_shared/registro-rules";

const ROLES_APROBAR = ["empleado", "rrhh", "gerente", "usuario", "contador"];
const ETIQUETA_ROL: Record<string, string> = { empleado: "Empleado", rrhh: "Recursos Humanos", gerente: "Gerente", usuario: "Usuario", contador: "Contador" };

/** Mensaje listo para pegar en el grupo de WhatsApp del personal. */
export function mensajeWhatsApp(codigo: string) {
  return `Hola! Para crear tu cuenta en ${NOMBRE_APP} entrá a ${enlaceRegistro(codigo)}\n` +
    `Código de la empresa: ${codigo}\n\n` +
    `Necesitás tu DNI, CUIL y un email. Cuando RRHH apruebe tu alta vas a poder entrar con tu DNI y tu contraseña.\n` +
    `Cómo instalar la app en el celular: ${enlaceInstalar()}`;
}

export default function AltasPendientes() {
  const { data: rol, isLoading: cargandoRol } = useUserRole();
  const puede = rol === "admin" || rol === "rrhh";
  const { data: pendientes = [], isLoading } = useSolicitudesAlta("pendiente");
  const { data: resueltas = [] } = useSolicitudesAlta("resueltas");
  const [verResueltas, setVerResueltas] = useState(false);

  if (cargandoRol) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!puede) return <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">Sólo RRHH o administración pueden gestionar las altas.</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold"><UserPlus className="h-6 w-6 text-primary" />Altas de empleados</h1>
        <p className="mt-1 text-sm text-muted-foreground">El personal crea su cuenta con el enlace de la empresa; acá la aprobás y la vinculás a su legajo.</p>
      </div>

      <EnlaceRegistro />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Pendientes {pendientes.length > 0 && <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{pendientes.length}</span>}
        </h2>
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : pendientes.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">No hay altas esperando aprobación.</div>
        ) : (
          <ul className="space-y-3">{pendientes.map((s) => <TarjetaAlta key={s.id} s={s} />)}</ul>
        )}
      </section>

      {resueltas.length > 0 && (
        <section>
          <button type="button" className="text-sm text-primary hover:underline" onClick={() => setVerResueltas((v) => !v)}>
            {verResueltas ? "Ocultar" : "Ver"} últimas resueltas ({resueltas.length})
          </button>
          {verResueltas && (
            <ul className="mt-3 divide-y rounded-xl border bg-card text-sm">
              {resueltas.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                  {s.estado === "aprobada" ? <UserCheck className="h-4 w-4 text-success" /> : <UserX className="h-4 w-4 text-destructive" />}
                  <span className="font-medium">{s.apellido}, {s.nombre}</span>
                  <span className="text-muted-foreground">DNI {s.dni}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {s.estado === "aprobada" ? "Aprobada" : `Rechazada: ${s.motivo_rechazo ?? ""}`} · {s.revisado_at ? new Date(s.revisado_at).toLocaleDateString("es-AR") : ""}
                  </span>
                  {s.empleado_id && <Link to={`/legajos/${s.empleado_id}`} className="text-xs text-primary hover:underline">Ver legajo</Link>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

/* ─────────────── Enlace y código de registro ─────────────── */

function EnlaceRegistro() {
  const { data: cfg } = useConfigRegistro();
  const configurar = useConfigurarRegistro();
  const codigo = cfg?.registro_codigo ?? "";
  const abierto = cfg?.registro_abierto ?? false;

  const copiar = async (texto: string, aviso: string) => {
    try { await navigator.clipboard.writeText(texto); toast.success(aviso); } catch { toast.error("No se pudo copiar"); }
  };
  const cambiar = (v: { abierto: boolean; regenerar: boolean }, ok: string) =>
    configurar.mutate(v, { onSuccess: () => toast.success(ok), onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo guardar") });

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold"><Link2 className="h-5 w-5 text-primary" />Enlace de registro</h2>
          <p className="mt-1 text-sm text-muted-foreground">Mandalo al grupo de WhatsApp del personal. Sin el código nadie de afuera puede registrarse.</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={abierto} disabled={configurar.isPending} onCheckedChange={(v) => cambiar({ abierto: v, regenerar: false }, v ? "Registro abierto" : "Registro cerrado")} />
          {abierto ? "Abierto" : "Cerrado"}
        </label>
      </div>

      <div className={cn("mt-4 flex flex-wrap items-center gap-3", !abierto && "opacity-50")}>
        <div className="rounded-lg border bg-muted/50 px-4 py-2 font-mono text-xl font-semibold tracking-[0.25em]">{codigo || "—"}</div>
        <Button variant="outline" size="sm" disabled={!codigo} onClick={() => copiar(enlaceRegistro(codigo), "Enlace copiado")}><Copy className="mr-1.5 h-4 w-4" />Copiar enlace</Button>
        <Button size="sm" className="bg-[#25D366] text-white hover:bg-[#1ebe5b]" disabled={!codigo || !abierto} asChild={!!codigo && abierto}>
          <a href={`https://wa.me/?text=${encodeURIComponent(mensajeWhatsApp(codigo))}`} target="_blank" rel="noreferrer"><MessageCircle className="mr-1.5 h-4 w-4" />Compartir por WhatsApp</a>
        </Button>
        <Button variant="ghost" size="sm" disabled={configurar.isPending}
          onClick={() => { if (confirm("¿Cambiar el código? El enlace anterior deja de funcionar.")) cambiar({ abierto, regenerar: true }, "Código nuevo generado"); }}>
          <RefreshCw className="mr-1.5 h-4 w-4" />Cambiar código
        </Button>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Smartphone className="h-3.5 w-3.5" />El mensaje incluye cómo instalar la app.
        <button type="button" className="text-primary hover:underline" disabled={!codigo} onClick={() => copiar(mensajeWhatsApp(codigo), "Mensaje copiado")}>Copiar mensaje completo</button>
      </p>
    </div>
  );
}

/* ─────────────── Una solicitud ─────────────── */

function TarjetaAlta({ s }: { s: SolicitudAlta }) {
  const { data: empleados = [] } = useEmpleados();
  const { data: empresas = [] } = useEmpresas();
  const { data: config } = useConfigGrupo();
  const resolver = useResolverAlta();
  const [modo, setModo] = useState<null | "vincular" | "nuevo" | "rechazar">(null);
  const [empleadoId, setEmpleadoId] = useState("");
  // Vincular una cuenta a un legajo existente le da acceso a sus recibos y datos: RRHH confirma que es la persona
  const [identidadOk, setIdentidadOk] = useState(false);
  const [nuevo, setNuevo] = useState({ legajo: "", puesto: "", fecha_ingreso: hoyArgentina() });
  const [motivo, setMotivo] = useState("");
  const { data: miRol } = useUserRole();
  // RRHH aprueba como empleado; un admin puede dar además un rol de gestión (p. ej. alguien de RRHH)
  const [rol, setRol] = useState<string>("empleado");
  const rolesPosibles = miRol === "admin" ? ROLES_APROBAR : ROLES_APROBAR.slice(0, 1);

  const sinCuenta = useMemo(() => empleados.filter((e) => !e.user_id && e.estado !== "Baja"), [empleados]);
  // Legajo que ya existe con el mismo DNI o CUIL
  const coincidencia = useMemo(
    () => sinCuenta.find((e) => soloDigitos(e.dni) === soloDigitos(s.dni) || soloDigitos(e.cuil) === soloDigitos(s.cuil)),
    [sinCuenta, s],
  );
  const conCuenta = empleados.find((e) => e.user_id && soloDigitos(e.dni) === soloDigitos(s.dni));
  const empresa = empresas.find((e) => e.id === s.empresa_id)?.nombre;
  const { data: sucursal } = useQuery({
    queryKey: ["sucursal-nombre", s.sucursal_id],
    enabled: !!s.sucursal_id,
    queryFn: async () => (await supabase.from("sucursales").select("nombre").eq("id", s.sucursal_id!).maybeSingle()).data?.nombre ?? null,
  });

  const avisar = async (aprobada: boolean, texto: string) => {
    await sendNotificationEmailIfEnabled(config, {
      to: s.email,
      subject: aprobada ? `Tu cuenta de ${NOMBRE_APP} está lista` : `Tu alta en ${NOMBRE_APP}`,
      html: aprobada
        ? `<p>Hola ${escaparHtml(s.nombre)}:</p><p>RRHH aprobó tu alta. Ya podés entrar con tu DNI y tu contraseña en <a href="${window.location.origin}/login">${window.location.origin}</a>.</p><p>Para instalar la app en el celular: <a href="${enlaceInstalar()}">${enlaceInstalar()}</a></p>`
        : `<p>Hola ${escaparHtml(s.nombre)}:</p><p>No pudimos aprobar tu alta: ${escaparHtml(texto)}</p><p>Consultá con RRHH.</p>`,
    });
  };

  const aprobar = (body: Record<string, unknown>) =>
    resolver.mutate({ action: "aprobar", solicitud_id: s.id, rol, ...body }, {
      onSuccess: async () => { toast.success(`Alta aprobada como ${ETIQUETA_ROL[rol]}: ${s.nombre} ya puede entrar`); setModo(null); await avisar(true, ""); },
      onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo aprobar"),
    });

  const rechazar = () =>
    resolver.mutate({ action: "rechazar", solicitud_id: s.id, motivo }, {
      onSuccess: async () => { toast.success("Alta rechazada"); setModo(null); await avisar(false, motivo); },
      onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo rechazar"),
    });

  const dato = (label: string, valor: React.ReactNode) => (
    <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium">{valor || "—"}</p></div>
  );

  return (
    <li className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-base font-semibold">{s.apellido}, {s.nombre}</p>
          <p className="text-xs text-muted-foreground">Se registró el {new Date(s.created_at).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short", hourCycle: "h23" })}</p>
        </div>
        {coincidencia ? (
          <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">Coincide con el legajo {coincidencia.legajo}</span>
        ) : conCuenta ? (
          <span className="rounded-full bg-warning/20 px-2.5 py-1 text-xs font-medium">Ese DNI ya tiene cuenta (legajo {conCuenta.legajo})</span>
        ) : (
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">Sin legajo con ese DNI</span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {dato("DNI", s.dni)}
        {dato("CUIL", s.cuil)}
        {dato("Nacimiento", s.fecha_nacimiento ? formatoFecha(s.fecha_nacimiento) : null)}
        {dato("Celular", s.telefono)}
        {dato("Email", <span className="break-all">{s.email}</span>)}
        {dato("Empresa", empresa)}
        {dato("Sucursal", sucursal)}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {rolesPosibles.length > 1 && (
          <Select value={rol} onValueChange={setRol}>
            <SelectTrigger className="h-9 w-[190px] text-sm" aria-label="Rol al aprobar"><SelectValue /></SelectTrigger>
            <SelectContent>{rolesPosibles.map((r) => <SelectItem key={r} value={r}>Rol: {ETIQUETA_ROL[r]}</SelectItem>)}</SelectContent>
          </Select>
        )}
        {coincidencia && (
          <Button size="sm" disabled={resolver.isPending} onClick={() => { setEmpleadoId(coincidencia.id); setIdentidadOk(false); setModo("vincular"); }}>
            <CheckCircle2 className="mr-1.5 h-4 w-4" />Aprobar y vincular al legajo {coincidencia.legajo}
          </Button>
        )}
        <Button size="sm" variant={coincidencia ? "outline" : "default"} onClick={() => { setEmpleadoId(""); setIdentidadOk(false); setModo("vincular"); }}>Vincular a otro legajo</Button>
        <Button size="sm" variant="outline" onClick={() => setModo("nuevo")}><UserPlus className="mr-1.5 h-4 w-4" />Crear legajo nuevo</Button>
        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setModo("rechazar")}><UserX className="mr-1.5 h-4 w-4" />Rechazar</Button>
      </div>

      <Dialog open={modo !== null} onOpenChange={(o) => { if (!o) setModo(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {modo === "vincular" ? "Vincular a un legajo" : modo === "nuevo" ? "Crear legajo y aprobar" : "Rechazar el alta"}
            </DialogTitle>
            <DialogDescription>{s.apellido}, {s.nombre} · DNI {s.dni}</DialogDescription>
          </DialogHeader>

          {modo === "vincular" && (
            <div>
              <Label>Legajo sin cuenta</Label>
              <Select value={empleadoId} onValueChange={setEmpleadoId}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Elegí el legajo" /></SelectTrigger>
                <SelectContent>
                  {sinCuenta.map((e) => <SelectItem key={e.id} value={e.id}>{e.apellido}, {e.nombre} · Leg. {e.legajo} · DNI {e.dni}</SelectItem>)}
                </SelectContent>
              </Select>
              {(() => {
                const leg = empleados.find((e) => e.id === empleadoId);
                if (!leg) return null;
                const filas: [string, string | null | undefined, string | null | undefined][] = [
                  ["Nombre", `${s.apellido}, ${s.nombre}`, `${leg.apellido}, ${leg.nombre}`],
                  ["DNI", s.dni, leg.dni],
                  ["CUIL", s.cuil, leg.cuil],
                  ["Nacimiento", s.fecha_nacimiento ? formatoFecha(s.fecha_nacimiento) : null, leg.fecha_nacimiento ? formatoFecha(leg.fecha_nacimiento) : null],
                  ["Celular", s.telefono, leg.telefono],
                  ["Email", s.email, leg.email],
                ];
                const norm = (v?: string | null) => (v ?? "").toLowerCase().replace(/[^a-z0-9@]/g, "");
                return (
                  <div className="mt-3 overflow-hidden rounded-lg border text-xs">
                    <table className="w-full">
                      <thead className="bg-muted/60 text-left"><tr><th className="px-2 py-1.5">Dato</th><th className="px-2 py-1.5">Lo que cargó</th><th className="px-2 py-1.5">En el legajo</th></tr></thead>
                      <tbody>
                        {filas.map(([dato, cargo, legajo]) => {
                          const distinto = !!legajo && !!cargo && norm(cargo) !== norm(legajo);
                          return (
                            <tr key={dato} className={cn("border-t", distinto && "bg-warning/15")}>
                              <td className="px-2 py-1.5 font-medium">{dato}</td>
                              <td className="break-all px-2 py-1.5">{cargo || "—"}</td>
                              <td className="break-all px-2 py-1.5">{legajo || "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
              <p className="mt-2 text-xs text-muted-foreground">El email y el celular del legajo se actualizan con los que cargó el empleado (queda en el historial).</p>
              <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
                <Checkbox checked={identidadOk} onCheckedChange={(v) => setIdentidadOk(v === true)} className="mt-0.5" />
                <span>Confirmé que la cuenta es de esta persona (por ejemplo, la vi en persona o hablé con ella). Va a tener acceso a sus recibos y datos.</span>
              </label>
            </div>
          )}

          {modo === "nuevo" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Se crea con los datos que cargó el empleado; completá los laborales.</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>N.º de legajo</Label><Input className="mt-1.5" value={nuevo.legajo} onChange={(e) => setNuevo({ ...nuevo, legajo: e.target.value })} /></div>
                <div><Label>Fecha de ingreso</Label><Input type="date" className="mt-1.5" value={nuevo.fecha_ingreso} onChange={(e) => setNuevo({ ...nuevo, fecha_ingreso: e.target.value })} /></div>
              </div>
              <div><Label>Puesto</Label><Input className="mt-1.5" value={nuevo.puesto} onChange={(e) => setNuevo({ ...nuevo, puesto: e.target.value })} /></div>
              <p className="text-xs text-muted-foreground">El sueldo, la categoría y el convenio se completan después en el legajo.</p>
            </div>
          )}

          {modo === "rechazar" && (
            <div>
              <Label>Motivo</Label>
              <Textarea className="mt-1.5" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Por ejemplo: no figura en la nómina de la empresa" />
              <p className="mt-2 text-xs text-muted-foreground">Se borra la cuenta que creó. Si fue un error, puede volver a registrarse.</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setModo(null)}>Cancelar</Button>
            {modo === "vincular" && <Button disabled={!empleadoId || !identidadOk || resolver.isPending} onClick={() => aprobar({ empleado_id: empleadoId })}>{resolver.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aprobar y vincular"}</Button>}
            {modo === "nuevo" && <Button disabled={!nuevo.legajo.trim() || !nuevo.puesto.trim() || !nuevo.fecha_ingreso || resolver.isPending} onClick={() => aprobar({ nuevo_legajo: nuevo })}>{resolver.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear y aprobar"}</Button>}
            {modo === "rechazar" && <Button variant="destructive" disabled={motivo.trim().length < 3 || resolver.isPending} onClick={rechazar}>{resolver.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Rechazar"}</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}
