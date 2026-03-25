import { useState } from "react";
import { useEmpresas, useSucursales } from "@/hooks/useEmpleados";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Building2, Pencil, Trash2, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

export default function Empresas() {
  const { data: empresas = [], isLoading } = useEmpresas();
  const [empresaDialog, setEmpresaDialog] = useState<{ open: boolean; empresa?: any }>({ open: false });
  const [sucursalDialog, setSucursalDialog] = useState<{ open: boolean; empresaId?: string; sucursal?: any }>({ open: false });
  const [expandedEmpresa, setExpandedEmpresa] = useState<string | null>(null);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="animate-fade-in flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Empresas y Sucursales</h1>
          <p className="text-sm text-muted-foreground mt-1">Administrá las empresas del grupo y sus sucursales</p>
        </div>
        <Button onClick={() => setEmpresaDialog({ open: true })} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Nueva Empresa
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : empresas.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground shadow-sm">
          No hay empresas cargadas. Creá la primera para empezar.
        </div>
      ) : (
        <div className="space-y-4">
          {empresas.map((empresa: any) => (
            <EmpresaCard
              key={empresa.id}
              empresa={empresa}
              expanded={expandedEmpresa === empresa.id}
              onToggle={() => setExpandedEmpresa(expandedEmpresa === empresa.id ? null : empresa.id)}
              onEdit={() => setEmpresaDialog({ open: true, empresa })}
              onAddSucursal={() => setSucursalDialog({ open: true, empresaId: empresa.id })}
              onEditSucursal={(s: any) => setSucursalDialog({ open: true, empresaId: empresa.id, sucursal: s })}
            />
          ))}
        </div>
      )}

      <EmpresaFormDialog
        open={empresaDialog.open}
        onOpenChange={(open) => setEmpresaDialog({ open })}
        empresa={empresaDialog.empresa}
      />
      <SucursalFormDialog
        open={sucursalDialog.open}
        onOpenChange={(open) => setSucursalDialog({ open })}
        empresaId={sucursalDialog.empresaId}
        sucursal={sucursalDialog.sucursal}
      />
    </div>
  );
}

function EmpresaCard({ empresa, expanded, onToggle, onEdit, onAddSucursal, onEditSucursal }: any) {
  const details = [
    empresa.razon_social && `Razón Social: ${empresa.razon_social}`,
    empresa.cuit && `CUIT: ${empresa.cuit}`,
    empresa.actividad_principal && `Actividad: ${empresa.actividad_principal}`,
    empresa.convenio_colectivo && `CCT: ${empresa.convenio_colectivo}`,
  ].filter(Boolean);

  return (
    <div className="animate-slide-up rounded-xl border bg-card shadow-sm overflow-hidden">
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggle}
      >
        {empresa.logo_url ? (
          <img src={empresa.logo_url} alt={empresa.nombre} className="h-10 w-10 rounded-lg object-contain shrink-0" />
        ) : (
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium">{empresa.nombre}</p>
          {details.length > 0 && (
            <p className="text-xs text-muted-foreground">{details.join(" · ")}</p>
          )}
          {empresa.domicilio_fiscal && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{[empresa.domicilio_fiscal, empresa.localidad, empresa.provincia].filter(Boolean).join(", ")}</p>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>
      {expanded && (
        <SucursalesList empresaId={empresa.id} onAdd={onAddSucursal} onEdit={onEditSucursal} />
      )}
    </div>
  );
}

function SucursalesList({ empresaId, onAdd, onEdit }: { empresaId: string; onAdd: () => void; onEdit: (s: any) => void }) {
  const { data: sucursales = [], isLoading } = useSucursales(empresaId);
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sucursales").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sucursal eliminada");
      queryClient.invalidateQueries({ queryKey: ["sucursales", empresaId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="border-t px-5 py-3 bg-muted/20">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sucursales</p>
        <Button variant="ghost" size="sm" onClick={onAdd} className="text-xs h-7">
          <Plus className="h-3 w-3 mr-1" />Agregar
        </Button>
      </div>
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto my-2" />
      ) : sucursales.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">Sin sucursales.</p>
      ) : (
        <div className="space-y-1">
          {sucursales.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-background transition-colors group">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm">{s.nombre}</p>
                {s.direccion && <p className="text-xs text-muted-foreground">{s.direccion}</p>}
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => onEdit(s)}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => deleteMutation.mutate(s.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmpresaFormDialog({ open, onOpenChange, empresa }: { open: boolean; onOpenChange: (o: boolean) => void; empresa?: any }) {
  const [form, setForm] = useState({
    nombre: "", cuit: "", razon_social: "", domicilio_fiscal: "", localidad: "",
    provincia: "", cp: "", telefono: "", email: "", actividad_principal: "",
    fecha_inicio_actividades: "", convenio_colectivo: "", logo_url: "",
  });
  const queryClient = useQueryClient();

  const resetAndOpen = () => {
    setForm({
      nombre: empresa?.nombre ?? "",
      cuit: empresa?.cuit ?? "",
      razon_social: empresa?.razon_social ?? "",
      domicilio_fiscal: empresa?.domicilio_fiscal ?? "",
      localidad: empresa?.localidad ?? "",
      provincia: empresa?.provincia ?? "",
      cp: empresa?.cp ?? "",
      telefono: empresa?.telefono ?? "",
      email: empresa?.email ?? "",
      actividad_principal: empresa?.actividad_principal ?? "",
      fecha_inicio_actividades: empresa?.fecha_inicio_actividades ?? "",
      convenio_colectivo: empresa?.convenio_colectivo ?? "",
      logo_url: empresa?.logo_url ?? "",
    });
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.nombre.trim()) throw new Error("El nombre es requerido");
      const payload = {
        nombre: form.nombre.trim(),
        cuit: form.cuit.trim() || null,
        razon_social: form.razon_social.trim() || null,
        domicilio_fiscal: form.domicilio_fiscal.trim() || null,
        localidad: form.localidad.trim() || null,
        provincia: form.provincia.trim() || null,
        cp: form.cp.trim() || null,
        telefono: form.telefono.trim() || null,
        email: form.email.trim() || null,
        actividad_principal: form.actividad_principal.trim() || null,
        fecha_inicio_actividades: form.fecha_inicio_actividades || null,
        convenio_colectivo: form.convenio_colectivo.trim() || null,
        logo_url: form.logo_url || null,
      } as any;
      if (empresa) {
        const { error } = await supabase.from("empresas").update(payload).eq("id", empresa.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("empresas").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(empresa ? "Empresa actualizada" : "Empresa creada");
      queryClient.invalidateQueries({ queryKey: ["empresas"] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateField = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (o) resetAndOpen(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{empresa ? "Editar Empresa" : "Nueva Empresa"}</DialogTitle>
          <DialogDescription>{empresa ? "Modificá los datos de la empresa." : "Ingresá los datos de la nueva empresa."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Datos principales</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre *</Label>
              <Input value={form.nombre} onChange={(e) => updateField("nombre", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Razón Social</Label>
              <Input value={form.razon_social} onChange={(e) => updateField("razon_social", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">CUIT</Label>
              <Input value={form.cuit} onChange={(e) => updateField("cuit", e.target.value)} placeholder="XX-XXXXXXXX-X" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Actividad Principal</Label>
              <Input value={form.actividad_principal} onChange={(e) => updateField("actividad_principal", e.target.value)} />
            </div>
          </div>

          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-2">Domicilio fiscal</p>
          <div className="space-y-1.5">
            <Label className="text-xs">Dirección</Label>
            <Input value={form.domicilio_fiscal} onChange={(e) => updateField("domicilio_fiscal", e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Localidad</Label>
              <Input value={form.localidad} onChange={(e) => updateField("localidad", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Provincia</Label>
              <Input value={form.provincia} onChange={(e) => updateField("provincia", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">C.P.</Label>
              <Input value={form.cp} onChange={(e) => updateField("cp", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Logo de la Empresa</Label>
            <div className="flex items-center gap-3">
              {form.logo_url && <img src={form.logo_url} alt="Logo" className="h-12 w-12 object-contain rounded border" />}
              <label className="text-xs text-primary hover:underline cursor-pointer">
                {form.logo_url ? "Cambiar logo" : "Subir logo"}
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const path = `empresas/${Date.now()}_${file.name}`;
                  const { error } = await supabase.storage.from("logos-empresas").upload(path, file);
                  if (error) { toast.error(error.message); return; }
                  const { data } = supabase.storage.from("logos-empresas").getPublicUrl(path);
                  setForm((p) => ({ ...p, logo_url: data.publicUrl }));
                  toast.success("Logo subido");
                }} />
              </label>
            </div>
          </div>

          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-2">Contacto y convenio</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Teléfono</Label>
              <Input value={form.telefono} onChange={(e) => updateField("telefono", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Inicio Actividades</Label>
              <Input type="date" value={form.fecha_inicio_actividades} onChange={(e) => updateField("fecha_inicio_actividades", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Convenio Colectivo</Label>
              <Input value={form.convenio_colectivo} onChange={(e) => updateField("convenio_colectivo", e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {empresa ? "Guardar" : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SucursalFormDialog({ open, onOpenChange, empresaId, sucursal }: { open: boolean; onOpenChange: (o: boolean) => void; empresaId?: string; sucursal?: any }) {
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const queryClient = useQueryClient();

  const resetAndOpen = () => {
    setNombre(sucursal?.nombre ?? "");
    setDireccion(sucursal?.direccion ?? "");
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!nombre.trim()) throw new Error("El nombre es requerido");
      if (!empresaId) throw new Error("Empresa no seleccionada");
      if (sucursal) {
        const { error } = await supabase.from("sucursales").update({ nombre: nombre.trim(), direccion: direccion.trim() || null }).eq("id", sucursal.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("sucursales").insert({ empresa_id: empresaId, nombre: nombre.trim(), direccion: direccion.trim() || null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(sucursal ? "Sucursal actualizada" : "Sucursal creada");
      queryClient.invalidateQueries({ queryKey: ["sucursales", empresaId] });
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (o) resetAndOpen(); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{sucursal ? "Editar Sucursal" : "Nueva Sucursal"}</DialogTitle>
          <DialogDescription>{sucursal ? "Modificá los datos de la sucursal." : "Ingresá los datos de la nueva sucursal."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Nombre *</Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Dirección</Label>
            <Input value={direccion} onChange={(e) => setDireccion(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {sucursal ? "Guardar" : "Crear"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
