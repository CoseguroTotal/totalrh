import { useParams, Link } from "react-router-dom";
import { useEmpleado, useEventosLegajo, useDocumentosLegajo } from "@/hooks/useEmpleados";
import { ArrowLeft, Mail, Phone, Building2, Calendar, FileText, Award, AlertCircle, Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { toast } from "sonner";

const eventIcon: Record<string, { icon: typeof Award; color: string }> = {
  ingreso: { icon: Award, color: "text-success bg-success/15" },
  promocion: { icon: Award, color: "text-info bg-info/15" },
  sancion: { icon: AlertCircle, color: "text-destructive bg-destructive/15" },
  licencia: { icon: Calendar, color: "text-warning bg-warning/15" },
  cambio: { icon: Building2, color: "text-primary bg-primary/15" },
};

const estadoBadge: Record<string, string> = {
  Activo: "bg-success/15 text-success",
  Licencia: "bg-warning/15 text-warning",
  Baja: "bg-destructive/15 text-destructive",
};

export default function LegajoDetail() {
  const { id } = useParams();
  const { data: emp, isLoading } = useEmpleado(id);
  const { data: events = [] } = useEventosLegajo(id);
  const { data: documentos = [] } = useDocumentosLegajo(id);
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    const storagePath = `${id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("documentos-legajo")
      .upload(storagePath, file);

    if (uploadError) {
      toast.error("Error al subir archivo: " + uploadError.message);
      return;
    }

    const { error: dbError } = await supabase.from("documentos_legajo").insert({
      empleado_id: id,
      nombre_archivo: file.name,
      storage_path: storagePath,
      tamano: file.size < 1024 * 1024
        ? `${(file.size / 1024).toFixed(0)} KB`
        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      tipo_documento: file.type || "application/octet-stream",
    });

    if (dbError) {
      toast.error("Error al registrar documento: " + dbError.message);
      return;
    }

    toast.success("Documento subido correctamente");
    queryClient.invalidateQueries({ queryKey: ["documentos_legajo", id] });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownload = async (storagePath: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from("documentos-legajo")
      .download(storagePath);

    if (error) {
      toast.error("Error al descargar: " + error.message);
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!emp) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p>Empleado no encontrado.</p>
        <Link to="/legajos" className="mt-4 text-sm text-primary hover:underline">Volver a legajos</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <Link to="/legajos" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors animate-fade-in">
        <ArrowLeft className="h-4 w-4" />
        Volver a Legajos
      </Link>

      {/* Profile Header */}
      <div className="animate-slide-up rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-5">
          <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl font-semibold text-primary shrink-0">
            {emp.nombre[0]}{emp.apellido[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-semibold">{emp.apellido}, {emp.nombre}</h1>
              <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", estadoBadge[emp.estado])}>
                {emp.estado}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{emp.puesto} · {emp.categoria}</p>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{emp.empresa?.nombre} — {emp.sucursal?.nombre}</span>
              {emp.email && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{emp.email}</span>}
              {emp.telefono && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{emp.telefono}</span>}
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t pt-5">
          {[
            { label: "Legajo", value: emp.legajo },
            { label: "DNI", value: emp.dni },
            { label: "CUIL", value: emp.cuil },
            { label: "Ingreso", value: new Date(emp.fecha_ingreso).toLocaleDateString("es-AR") },
            { label: "CCT", value: emp.cct },
            { label: "Categoría", value: emp.categoria },
          ].map((d) => (
            <div key={d.label}>
              <p className="text-xs text-muted-foreground">{d.label}</p>
              <p className="text-sm font-medium mt-0.5">{d.value || "—"}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Timeline */}
        <div className="animate-slide-up rounded-xl border bg-card p-5 shadow-sm" style={{ animationDelay: "100ms" }}>
          <h3 className="text-sm font-medium mb-4">Historial de Eventos</h3>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin eventos registrados.</p>
          ) : (
            <div className="relative space-y-4 pl-6 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-px before:bg-border">
              {events.map((ev) => {
                const config = eventIcon[ev.tipo] || eventIcon.cambio;
                const Icon = config.icon;
                return (
                  <div key={ev.id} className="relative">
                    <div className={cn("absolute -left-6 top-0.5 h-5 w-5 rounded-full flex items-center justify-center", config.color)}>
                      <Icon className="h-3 w-3" />
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(ev.fecha).toLocaleDateString("es-AR")}</p>
                    <p className="text-sm font-medium">{ev.titulo}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{ev.descripcion}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Documents */}
        <div className="animate-slide-up rounded-xl border bg-card p-5 shadow-sm" style={{ animationDelay: "180ms" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">Documentación</h3>
            <label className="text-xs text-primary hover:underline cursor-pointer inline-flex items-center gap-1">
              <Upload className="h-3 w-3" />
              Subir archivo
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleUpload}
              />
            </label>
          </div>
          {documentos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin documentos cargados.</p>
          ) : (
            <div className="space-y-1">
              {documentos.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => handleDownload(doc.storage_path, doc.nombre_archivo)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer group"
                >
                  <div className="rounded-md bg-muted p-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.nombre_archivo}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.tamano} · {new Date(doc.created_at).toLocaleDateString("es-AR")}
                      {doc.fecha_vencimiento && (
                        <span className="ml-2 text-warning">Vence: {new Date(doc.fecha_vencimiento).toLocaleDateString("es-AR")}</span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
