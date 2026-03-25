import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Users, Settings2 } from "lucide-react";
import AdminRoute from "@/components/AdminRoute";

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

function useUsuariosConRoles() {
  return useQuery({
    queryKey: ["usuarios-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data;
    },
  });
}

export default function Configuracion() {
  return (
    <AdminRoute>
      <ConfiguracionContent />
    </AdminRoute>
  );
}

function ConfiguracionContent() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-semibold">Configuración</h1>
        <p className="text-sm text-muted-foreground mt-1">Gestión de usuarios y configuración del grupo empresario</p>
      </div>
      <Tabs defaultValue="general" className="animate-slide-up">
        <TabsList>
          <TabsTrigger value="general"><Settings2 className="h-3.5 w-3.5 mr-1.5" />General</TabsTrigger>
          <TabsTrigger value="usuarios"><Users className="h-3.5 w-3.5 mr-1.5" />Usuarios</TabsTrigger>
        </TabsList>
        <TabsContent value="general"><GeneralTab /></TabsContent>
        <TabsContent value="usuarios"><UsuariosTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function GeneralTab() {
  const { data: config, isLoading } = useConfigGrupo();
  const qc = useQueryClient();
  const [form, setForm] = useState({ nombre_grupo: "", logo_url: "", domicilio: "", cuit: "", telefono: "", email: "" });

  useEffect(() => {
    if (config) {
      setForm({
        nombre_grupo: config.nombre_grupo || "",
        logo_url: config.logo_url || "",
        domicilio: config.domicilio || "",
        cuit: config.cuit || "",
        telefono: config.telefono || "",
        email: config.email || "",
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
      }).eq("id", config!.id);
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

function UsuariosTab() {
  const { data: roles = [], isLoading } = useUsuariosConRoles();
  const qc = useQueryClient();

  const updateRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase.from("user_roles").upsert({ user_id: userId, role: role as any }, { onConflict: "user_id,role" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Rol actualizado"); qc.invalidateQueries({ queryKey: ["usuarios-roles"] }); },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h3 className="text-sm font-medium mb-4">Usuarios y Roles</h3>
      {roles.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay roles asignados.</p>
      ) : (
        <div className="space-y-2">
          {roles.map((r: any) => (
            <div key={r.id} className="flex items-center gap-3 rounded-lg border px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium font-mono">{r.user_id}</p>
              </div>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-primary/10 text-primary capitalize">{r.role}</span>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground mt-4">Para agregar usuarios, creá cuentas desde el sistema de login. Los roles se asignan automáticamente al admin principal.</p>
    </div>
  );
}
