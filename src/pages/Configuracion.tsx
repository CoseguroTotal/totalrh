import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEmpleados } from "@/hooks/useEmpleados";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Users, Settings2, Plus, UserPlus, Bell, Clock, QrCode, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import DemoLeadsTab, { useIsSuperadmin } from "@/components/DemoLeadsTab";


const ROLES = [
  { value: "admin", label: "Administrador" },
  { value: "contador", label: "Contador" },
  { value: "gerente", label: "Gerente" },
  { value: "rrhh", label: "Recursos Humanos" },
  { value: "usuario", label: "Usuario" },
  { value: "empleado", label: "Empleado" },
  { value: "registro_asistencia", label: "Registro Asistencia" },
];

function useConfigGrupo() {
  return useQuery({
    queryKey: ["configuracion_grupo"],
    queryFn: async () => {
      const { data, error } = await supabase.from("configuracion_grupo").select("*").limit(1).single();
      if (error) throw error;
      return data;
    },
  });
}

async function callUserAdmin(body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Sesión no disponible");

  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });

  const payload = await res.json();
  if (!res.ok) throw new Error(payload.error || "No se pudo completar la operación");
  return payload;
}

function useUsuariosConRoles() {
  return useQuery({
    queryKey: ["usuarios-roles"],
    queryFn: async () => callUserAdmin({ action: "list-users" }),
  });
}

export default function Configuracion() {
  return <ConfiguracionContent />;
}

function ConfiguracionContent() {
  const { data: isSuperadmin } = useIsSuperadmin();
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-semibold">Configuración</h1>
        <p className="text-sm text-muted-foreground mt-1">Gestión de usuarios y configuración del grupo empresario</p>
      </div>
      <Tabs defaultValue="general" className="animate-slide-up">
        <TabsList className="flex-wrap h-auto">

          <TabsTrigger value="general"><Settings2 className="h-3.5 w-3.5 mr-1.5" />General</TabsTrigger>
          <TabsTrigger value="notificaciones"><Bell className="h-3.5 w-3.5 mr-1.5" />Notificaciones</TabsTrigger>
          <TabsTrigger value="horarios"><Clock className="h-3.5 w-3.5 mr-1.5" />Horarios Acceso</TabsTrigger>
          <TabsTrigger value="asistencia"><QrCode className="h-3.5 w-3.5 mr-1.5" />Asistencia</TabsTrigger>
          <TabsTrigger value="usuarios"><Users className="h-3.5 w-3.5 mr-1.5" />Usuarios</TabsTrigger>
          {isSuperadmin && (
            <TabsTrigger value="demo"><Mail className="h-3.5 w-3.5 mr-1.5" />Solicitudes de demo</TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="general"><GeneralTab /></TabsContent>
        <TabsContent value="notificaciones"><NotificacionesTab /></TabsContent>
        <TabsContent value="horarios"><HorariosAccesoTab /></TabsContent>
        <TabsContent value="asistencia"><AsistenciaConfigTab /></TabsContent>
        <TabsContent value="usuarios"><UsuariosTab /></TabsContent>
        {isSuperadmin && <TabsContent value="demo"><DemoLeadsTab /></TabsContent>}

      </Tabs>
    </div>
  );
}

function GeneralTab() {
  const { data: config, isLoading } = useConfigGrupo();
  const qc = useQueryClient();
  const [form, setForm] = useState({ nombre_grupo: "", logo_url: "", domicilio: "", cuit: "", telefono: "", email: "", email_remitente: "" });

  useEffect(() => {
    if (config) {
      setForm({
        nombre_grupo: config.nombre_grupo || "",
        logo_url: config.logo_url || "",
        domicilio: config.domicilio || "",
        cuit: config.cuit || "",
        telefono: config.telefono || "",
        email: config.email || "",
        email_remitente: (config as any).email_remitente || "onboarding@resend.dev",
      });
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("configuracion_grupo").update({
        nombre_grupo: form.nombre_grupo,
        logo_url: form.logo_url || null,
        domicilio: form.domicilio || null,
        cuit: form.cuit || null,
        telefono: form.telefono || null,
        email: form.email || null,
        email_remitente: form.email_remitente || null,
      } as any).eq("id", config!.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Configuración guardada"); qc.invalidateQueries({ queryKey: ["configuracion_grupo"] }); },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = `grupo/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("logos-empresas").upload(path, file);
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("logos-empresas").getPublicUrl(path);
    setForm((p) => ({ ...p, logo_url: data.publicUrl }));
    toast.success("Logo subido");
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
      <h3 className="text-sm font-medium">Datos del Grupo Empresario</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label className="text-xs">Nombre del Grupo</Label><Input value={form.nombre_grupo} onChange={(e) => setForm({ ...form, nombre_grupo: e.target.value })} /></div>
        <div className="space-y-1.5"><Label className="text-xs">CUIT</Label><Input value={form.cuit} onChange={(e) => setForm({ ...form, cuit: e.target.value })} /></div>
      </div>
      <div className="space-y-1.5"><Label className="text-xs">Domicilio</Label><Input value={form.domicilio} onChange={(e) => setForm({ ...form, domicilio: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5"><Label className="text-xs">Teléfono</Label><Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></div>
        <div className="space-y-1.5"><Label className="text-xs">Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Email Remitente (Resend)</Label>
        <Input value={form.email_remitente} onChange={(e) => setForm({ ...form, email_remitente: e.target.value })} placeholder="rrhh@tudominio.com" />
        <p className="text-xs text-muted-foreground">Dirección desde la que se envían los emails. Usá onboarding@resend.dev para testing.</p>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Logo del Grupo</Label>
        <div className="flex items-center gap-3">
          {form.logo_url && <img src={form.logo_url} alt="Logo" className="h-12 w-12 object-contain rounded border" />}
          <label className="text-xs text-primary hover:underline cursor-pointer">
            {form.logo_url ? "Cambiar logo" : "Subir logo"}
            <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </label>
        </div>
      </div>
      <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
        {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
        Guardar
      </Button>
    </div>
  );
}

function NotificacionesTab() {
  const { data: config, isLoading } = useConfigGrupo();
  const qc = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: async (value: boolean) => {
      const { error } = await supabase.from("configuracion_grupo").update({
        notificaciones_email_activas: value,
      } as any).eq("id", config!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configuración actualizada");
      qc.invalidateQueries({ queryKey: ["configuracion_grupo"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
      <h3 className="text-sm font-medium">Notificaciones por Email</h3>
      <div className="flex items-center justify-between rounded-lg border px-4 py-3">
        <div>
          <p className="text-sm font-medium">Enviar email al aprobar/rechazar permisos y vacaciones</p>
          <p className="text-xs text-muted-foreground mt-0.5">Se enviará un email automático al empleado cuando se apruebe o rechace una solicitud.</p>
        </div>
        <Switch
          checked={(config as any)?.notificaciones_email_activas ?? false}
          onCheckedChange={(checked) => toggleMutation.mutate(checked)}
          disabled={toggleMutation.isPending}
        />
      </div>
    </div>
  );
}

function HorariosAccesoTab() {
  const { data: restricciones = [], isLoading } = useQuery({
    queryKey: ["restricciones_horario"],
    queryFn: async () => {
      const { data, error } = await supabase.from("restricciones_horario").select("*").order("role");
      if (error) throw error;
      return data;
    },
  });
  const qc = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (params: { id: string; hora_desde?: string; hora_hasta?: string; activo?: boolean }) => {
      const { id, ...updates } = params;
      const { error } = await supabase.from("restricciones_horario").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Restricción actualizada");
      qc.invalidateQueries({ queryKey: ["restricciones_horario"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const roleLabel = (role: string) => ROLES.find((r) => r.value === role)?.label || role;

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
      <div>
        <h3 className="text-sm font-medium">Restricción de Horario por Rol</h3>
        <p className="text-xs text-muted-foreground mt-1">Configurá el rango horario en que cada rol puede acceder al sistema. Admin no tiene restricción.</p>
      </div>

      <div className="space-y-2">
        {restricciones.map((r: any) => (
          <div key={r.id} className="flex items-center gap-4 rounded-lg border px-4 py-3">
            <div className="w-40">
              <p className="text-sm font-medium">{roleLabel(r.role)}</p>
            </div>
            <Switch
              checked={r.activo}
              onCheckedChange={(v) => updateMutation.mutate({ id: r.id, activo: v })}
            />
            <div className="flex items-center gap-2">
              <Label className="text-xs">Desde</Label>
              <Input
                type="time"
                value={r.hora_desde}
                onChange={(e) => updateMutation.mutate({ id: r.id, hora_desde: e.target.value })}
                className="w-28 h-8 text-xs"
                disabled={!r.activo}
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Hasta</Label>
              <Input
                type="time"
                value={r.hora_hasta}
                onChange={(e) => updateMutation.mutate({ id: r.id, hora_hasta: e.target.value })}
                className="w-28 h-8 text-xs"
                disabled={!r.activo}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsuariosTab() {
  const { data: roles = [], isLoading } = useUsuariosConRoles();
  const { data: empleados = [] } = useEmpleados();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", password: "", role: "usuario", empleado_id: "" });
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newUser.email || !newUser.password) { toast.error("Completá email y contraseña"); return; }
    if (newUser.role === "empleado" && !newUser.empleado_id) { toast.error("Seleccioná el legajo del empleado"); return; }
    setCreating(true);
    try {
      await callUserAdmin({ action: "create-user", ...newUser });
      toast.success(`Usuario ${newUser.email} creado con rol ${newUser.role}`);
      qc.invalidateQueries({ queryKey: ["usuarios-roles"] });
      qc.invalidateQueries({ queryKey: ["empleados"] });
      setCreateOpen(false);
      setNewUser({ email: "", password: "", role: "usuario", empleado_id: "" });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      await callUserAdmin({ action: "update-role", user_role_id: id, role });
    },
    onSuccess: () => { toast.success("Rol actualizado"); qc.invalidateQueries({ queryKey: ["usuarios-roles"] }); },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Usuarios y Roles</h3>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <UserPlus className="h-4 w-4 mr-1" />Crear Usuario
        </Button>
      </div>

      {roles.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay roles asignados.</p>
      ) : (
        <div className="space-y-2">
          {roles.map((r: any) => (
            <div key={r.id} className="flex items-center gap-3 rounded-lg border px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.email || r.user_id}</p>
              </div>
              <Select value={r.role} onValueChange={(v) => updateRole.mutate({ id: r.id, role: v })}>
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((rl) => (
                    <SelectItem key={rl.value} value={rl.value}>{rl.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Crear Nuevo Usuario</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Email</Label><Input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} /></div>
            <div><Label className="text-xs">Contraseña</Label><Input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} minLength={6} /></div>
            <div>
              <Label className="text-xs">Rol</Label>
              <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v, empleado_id: v === "empleado" ? newUser.empleado_id : "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((rl) => (
                    <SelectItem key={rl.value} value={rl.value}>{rl.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newUser.role === "empleado" && (
              <div>
                <Label className="text-xs">Legajo vinculado</Label>
                <Select value={newUser.empleado_id} onValueChange={(v) => setNewUser({ ...newUser, empleado_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar empleado..." /></SelectTrigger>
                  <SelectContent>
                    {empleados.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.apellido}, {emp.nombre} · Legajo {emp.legajo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AsistenciaConfigTab() {
  const { data: config, isLoading } = useConfigGrupo();
  const qc = useQueryClient();
  const [duracion, setDuracion] = useState<number>(10);
  const [divisor, setDivisor] = useState<number>(200);
  const [minimoExtra, setMinimoExtra] = useState<number>(15);

  useEffect(() => {
    if (config?.qr_duracion_segundos) setDuracion(config.qr_duracion_segundos);
    if (config?.divisor_hora) setDivisor(config.divisor_hora);
    if (config?.extra_minimo_minutos != null) setMinimoExtra(config.extra_minimo_minutos);
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase.from("configuracion_grupo").update(updates as any).eq("id", config!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configuración actualizada");
      qc.invalidateQueries({ queryKey: ["configuracion_grupo"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm space-y-5">
      <h3 className="text-sm font-medium">Métodos de Fichada</h3>

      <div className="flex items-center justify-between rounded-lg border px-4 py-3">
        <div>
          <p className="text-sm font-medium">Fichado por QR dinámico</p>
          <p className="text-xs text-muted-foreground mt-0.5">La terminal muestra un QR que se renueva y el empleado lo escanea con su celular.</p>
        </div>
        <Switch
          checked={(config as any)?.fichado_qr_activo ?? true}
          onCheckedChange={(checked) => updateMutation.mutate({ fichado_qr_activo: checked })}
          disabled={updateMutation.isPending}
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border px-4 py-3">
        <div>
          <p className="text-sm font-medium">Fichado por ubicación (geocerca)</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            El empleado ficha desde su celular sin terminal, sólo si está dentro del radio de su sucursal.
            Cargá la ubicación de cada sucursal en Empresas → Sucursales.
          </p>
        </div>
        <Switch
          checked={(config as any)?.fichado_geo_activo ?? false}
          onCheckedChange={(checked) => updateMutation.mutate({ fichado_geo_activo: checked })}
          disabled={updateMutation.isPending}
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border px-4 py-3">
        <div>
          <p className="text-sm font-medium">Exigir ubicación al fichar con QR</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Además de escanear el QR, el celular tiene que estar dentro de la geocerca. Evita que alguien fiche
            desde otro lugar con una foto del QR que le reenvían.
          </p>
        </div>
        <Switch
          checked={(config as any)?.geo_exigir_en_qr ?? false}
          onCheckedChange={(checked) => updateMutation.mutate({ geo_exigir_en_qr: checked })}
          disabled={updateMutation.isPending}
        />
      </div>

      <div className="flex items-center justify-between rounded-lg border px-4 py-3">
        <div>
          <p className="text-sm font-medium">Fichado por reconocimiento facial</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            La terminal reconoce al empleado con la cámara web y le pide un gesto (parpadear o girar la cabeza) para evitar fotos.
            Cada empleado registra su rostro una vez, con consentimiento, desde Autogestión o su legajo.
          </p>
        </div>
        <Switch
          checked={(config as any)?.fichado_facial_activo ?? true}
          onCheckedChange={(checked) => updateMutation.mutate({ fichado_facial_activo: checked })}
          disabled={updateMutation.isPending}
        />
      </div>

      <div className="space-y-1.5 max-w-xs">
        <Label className="text-xs">Duración del QR (segundos)</Label>
        <div className="flex gap-2">
          <Input
            type="number"
            min={5}
            max={60}
            value={duracion}
            onChange={(e) => setDuracion(Number(e.target.value))}
          />
          <Button
            variant="outline"
            onClick={() => updateMutation.mutate({ qr_duracion_segundos: Math.min(60, Math.max(5, duracion)) })}
            disabled={updateMutation.isPending}
          >
            <Save className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Menos segundos = más seguridad. Recomendado: 10.</p>
      </div>

      <div className="border-t pt-5 space-y-4">
        <h3 className="text-sm font-medium">Horas extra</h3>
        <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
          <div className="space-y-1.5">
            <Label className="text-xs">Divisor del valor hora</Label>
            <div className="flex gap-2">
              <Input type="number" min={100} max={300} value={divisor} onChange={(e) => setDivisor(Number(e.target.value))} />
              <Button variant="outline" disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate({ divisor_hora: Math.min(300, Math.max(100, Math.round(divisor))) })}><Save className="h-4 w-4" /></Button>
            </div>
            <p className="text-xs text-muted-foreground">Valor hora = remuneración mensual ÷ divisor. 200 para jornada completa; revisá tu convenio.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Minutos de cortesía</Label>
            <div className="flex gap-2">
              <Input type="number" min={0} max={120} value={minimoExtra} onChange={(e) => setMinimoExtra(Number(e.target.value))} />
              <Button variant="outline" disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate({ extra_minimo_minutos: Math.min(120, Math.max(0, Math.round(minimoExtra))) })}><Save className="h-4 w-4" /></Button>
            </div>
            <p className="text-xs text-muted-foreground">Las extras más cortas que esto no se cuentan (por ejemplo, quedarse 10 min).</p>
          </div>
        </div>
      </div>
    </div>
  );
}
