import { useState } from "react";
import { useMemorandums, useSaveMemorandum, useDeleteMemorandum, useUpdateEstadoMemorandum } from "@/hooks/useMemorandums";
import { useEmpleados, useEmpresas } from "@/hooks/useEmpleados";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Send, FileText, Download, Mail, Users, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { generarMemorandumPDF } from "@/components/MemorandumPDF";
import { uploadMemoPdfAndGetUrl } from "@/lib/uploadMemoPdf";
import EnviarEmailDialog from "@/components/EnviarEmailDialog";
import EnvioMasivoMemoDialog from "@/components/EnvioMasivoMemoDialog";

const estadoBadge: Record<string, string> = {
  borrador: "bg-muted text-muted-foreground",
  enviado: "bg-info/15 text-info",
  recibido: "bg-warning/15 text-warning",
  firmado: "bg-success/15 text-success",
};

const ESTADOS = [
  { value: "todos", label: "Todos" },
  { value: "borrador", label: "Borrador" },
  { value: "enviado", label: "Enviado" },
  { value: "recibido", label: "Recibido" },
  { value: "firmado", label: "Firmado" },
];

export default function Memorandums() {
  const { data: memos = [], isLoading } = useMemorandums();
  const { data: empleados = [] } = useEmpleados();
  const { data: empresas = [] } = useEmpresas();
  const saveMemo = useSaveMemorandum();
  const deleteMemo = useDeleteMemorandum();
  const updateEstado = useUpdateEstadoMemorandum();
  const { data: config } = useQuery({
    queryKey: ["configuracion_grupo"],
    queryFn: async () => {
      const { data, error } = await supabase.from("configuracion_grupo").select("*").limit(1).single();
      if (error) throw error;
      return data;
    },
  });

  const [dialog, setDialog] = useState<{ open: boolean; memo?: any }>({ open: false });
  const [form, setForm] = useState({
    titulo: "", contenido: "", empresa_id: "", destinatario_empleado_id: "",
    destinatario_nombre: "", fecha: new Date().toISOString().slice(0, 10),
  });
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("todos");
  const [emailDialog, setEmailDialog] = useState<{ open: boolean; memo?: any; pdfUrl?: string }>({ open: false });
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
  const [masivoOpen, setMasivoOpen] = useState(false);

  const getMemoDataForPdf = (m: any) => {
    const empresa = empresas.find((e: any) => e.id === m.empresa_id);
    return {
      id: m.id,
      numero: m.numero,
      titulo: m.titulo,
      contenido: m.contenido,
      destinatarioNombre: m.destinatario_nombre || (m.destinatario ? `${m.destinatario.apellido}, ${m.destinatario.nombre}` : ""),
      fecha: m.fecha,
      empresa: empresa ? { nombre: empresa.nombre, razon_social: (empresa as any).razon_social, cuit: (empresa as any).cuit, domicilio: (empresa as any).domicilio_fiscal, telefono: (empresa as any).telefono, email: (empresa as any).email, logo_url: (empresa as any).logo_url } : null,
      grupo: config ? { nombre: config.nombre_grupo, cuit: config.cuit, domicilio: config.domicilio, telefono: config.telefono, email: config.email, logo_url: config.logo_url } : null,
    };
  };

  const getEmailHtml = (m: any, pdfUrl?: string) => {
    const empresa = empresas.find((e: any) => e.id === m.empresa_id);
    const nombreEmpresa = empresa?.nombre || config?.nombre_grupo || "Grupo Empresario";
    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#333;border-bottom:2px solid #2563eb;padding-bottom:10px;">Memorándum #${m.numero}</h2>
        <p style="color:#666;font-size:14px;"><strong>Empresa:</strong> ${nombreEmpresa}</p>
        <p style="color:#666;font-size:14px;"><strong>Fecha:</strong> ${new Date(m.fecha).toLocaleDateString("es-AR")}</p>
        ${m.destinatario_nombre ? `<p style="color:#666;font-size:14px;"><strong>Para:</strong> ${m.destinatario_nombre}</p>` : ""}
        <h3 style="color:#333;margin-top:20px;">${m.titulo}</h3>
        <div style="color:#444;font-size:14px;line-height:1.6;white-space:pre-wrap;">${m.contenido}</div>
        ${pdfUrl ? `
        <div style="margin-top:25px;text-align:center;">
          <a href="${pdfUrl}" target="_blank" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">
            📄 Descargar PDF del Memorándum
          </a>
        </div>` : ""}
        <hr style="margin-top:30px;border:none;border-top:1px solid #ddd;"/>
        <p style="color:#999;font-size:12px;">${nombreEmpresa}</p>
      </div>
    `;
  };

  const openNew = () => {
    setForm({ titulo: "", contenido: "", empresa_id: "", destinatario_empleado_id: "", destinatario_nombre: "", fecha: new Date().toISOString().slice(0, 10) });
    setDialog({ open: true });
  };

  const openEdit = (m: any) => {
    setForm({
      titulo: m.titulo, contenido: m.contenido, empresa_id: m.empresa_id || "",
      destinatario_empleado_id: m.destinatario_empleado_id || "",
      destinatario_nombre: m.destinatario_nombre || "",
      fecha: m.fecha,
    });
    setDialog({ open: true, memo: m });
  };

  const handleSave = () => {
    if (!form.titulo.trim()) { toast.error("El título es requerido"); return; }
    saveMemo.mutate({
      id: dialog.memo?.id,
      titulo: form.titulo,
      contenido: form.contenido,
      empresa_id: form.empresa_id === "grupo" ? null : (form.empresa_id || null),
      destinatario_empleado_id: form.destinatario_empleado_id || null,
      destinatario_nombre: form.destinatario_nombre || null,
      fecha: form.fecha,
    }, {
      onSuccess: () => { toast.success("Memorándum guardado"); setDialog({ open: false }); },
      onError: (err: Error) => toast.error(err.message),
    });
  };

  const handleEnviar = (m: any) => {
    updateEstado.mutate({ id: m.id, estado: "enviado" }, {
      onSuccess: () => toast.success("Memorándum marcado como enviado"),
    });
  };

  const handleDescargarPDF = async (m: any) => {
    await generarMemorandumPDF(getMemoDataForPdf(m));
  };

  const handleEmailConPdf = async (m: any) => {
    setGeneratingPdf(m.id);
    const pdfUrl = await uploadMemoPdfAndGetUrl(getMemoDataForPdf(m));
    setGeneratingPdf(null);
    setEmailDialog({ open: true, memo: m, pdfUrl: pdfUrl || undefined });
  };

  const filtered = memos.filter((m: any) => {
    const matchSearch = !search || m.titulo.toLowerCase().includes(search.toLowerCase()) || String(m.numero).includes(search);
    const matchEstado = estadoFilter === "todos" || m.estado === estadoFilter;
    return matchSearch && matchEstado;
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="animate-fade-in flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Memorándums</h1>
          <p className="text-sm text-muted-foreground mt-1">Archivo de memorándums numerados</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setMasivoOpen(true)} size="sm" variant="outline"><Users className="h-4 w-4 mr-1.5" />Envío Masivo</Button>
          <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1.5" />Nuevo</Button>
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <Input placeholder="Buscar por título o número..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ESTADOS.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Dialog open={dialog.open} onOpenChange={(o) => setDialog({ open: o })}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialog.memo ? "Editar Memorándum" : "Nuevo Memorándum"}</DialogTitle>
            <DialogDescription>Completá los datos del memorándum.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label className="text-xs">Título *</Label><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Empresa</Label>
                <Select value={form.empresa_id} onValueChange={(v) => setForm({ ...form, empresa_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grupo">Total Group (Grupo Empresario)</SelectItem>
                    {empresas.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Fecha</Label><Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Destinatario (empleado)</Label>
                <Select value={form.destinatario_empleado_id} onValueChange={(v) => {
                  const emp = empleados.find((e) => e.id === v);
                  setForm({ ...form, destinatario_empleado_id: v, destinatario_nombre: emp ? `${emp.apellido}, ${emp.nombre}` : "", empresa_id: emp?.empresa_id || form.empresa_id });
                }}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>{empleados.filter((e) => e.estado === "Activo").map((e) => <SelectItem key={e.id} value={e.id}>{e.apellido}, {e.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">O nombre libre</Label><Input value={form.destinatario_nombre} onChange={(e) => setForm({ ...form, destinatario_nombre: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Contenido</Label><Textarea rows={6} value={form.contenido} onChange={(e) => setForm({ ...form, contenido: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false })}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saveMemo.isPending}>{saveMemo.isPending ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground shadow-sm">Sin memorándums.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((m: any) => (
            <div key={m.id} className="rounded-xl border bg-card px-5 py-4 shadow-sm flex items-center gap-4 hover:bg-muted/30 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">#{m.numero} — {m.titulo}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(m.fecha).toLocaleDateString("es-AR")}
                  {m.destinatario_nombre && ` · Para: ${m.destinatario_nombre}`}
                  {m.empresa && ` · ${m.empresa.nombre}`}
                </p>
              </div>
              <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full capitalize", estadoBadge[m.estado])}>{m.estado}</span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDescargarPDF(m)} title="Descargar PDF"><Download className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEmailConPdf(m)} disabled={generatingPdf === m.id} title="Enviar por email con PDF">
                  {generatingPdf === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                </Button>
                {m.estado === "borrador" && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEnviar(m)} title="Marcar enviado"><Send className="h-3.5 w-3.5" /></Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)}><Pencil className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMemo.mutate(m.id, { onSuccess: () => toast.success("Eliminado") })}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {emailDialog.memo && (
        <EnviarEmailDialog
          open={emailDialog.open}
          onOpenChange={(o) => setEmailDialog({ open: o })}
          defaultTo={emailDialog.memo.destinatario?.email || ""}
          defaultSubject={`Memorándum #${emailDialog.memo.numero} — ${emailDialog.memo.titulo}`}
          htmlContent={getEmailHtml(emailDialog.memo, emailDialog.pdfUrl)}
          previewText={emailDialog.memo.contenido?.substring(0, 200)}
        />
      )}

      <EnvioMasivoMemoDialog
        open={masivoOpen}
        onOpenChange={setMasivoOpen}
        memos={memos}
        empleados={empleados}
        empresas={empresas}
        config={config}
      />
    </div>
  );
}
