import { useParams, Link } from "react-router-dom";
import { employees, timelineEvents, TimelineEvent } from "@/data/mockEmployees";
import { ArrowLeft, Mail, Phone, Building2, Calendar, FileText, FolderOpen, Award, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const eventIcon: Record<TimelineEvent["type"], { icon: typeof Award; color: string }> = {
  ingreso: { icon: Award, color: "text-success bg-success/15" },
  promocion: { icon: Award, color: "text-info bg-info/15" },
  sancion: { icon: AlertCircle, color: "text-destructive bg-destructive/15" },
  licencia: { icon: Calendar, color: "text-warning bg-warning/15" },
  cambio: { icon: Building2, color: "text-primary bg-primary/15" },
};

const mockDocuments = [
  { name: "DNI Frente y Dorso.pdf", size: "1.2 MB", date: "2018-03-15" },
  { name: "Constancia CUIL.pdf", size: "340 KB", date: "2018-03-15" },
  { name: "Contrato de Trabajo.pdf", size: "2.1 MB", date: "2018-03-15" },
  { name: "Certificado Art. 80.pdf", size: "890 KB", date: "2023-12-01" },
  { name: "Carnet de Conducir.pdf", size: "560 KB", date: "2025-01-10" },
];

export default function LegajoDetail() {
  const { id } = useParams();
  const emp = employees.find((e) => e.id === id);

  if (!emp) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p>Empleado no encontrado.</p>
        <Link to="/legajos" className="mt-4 text-sm text-primary hover:underline">Volver a legajos</Link>
      </div>
    );
  }

  const events = timelineEvents[emp.id] || [];

  const estadoBadge: Record<string, string> = {
    Activo: "bg-success/15 text-success",
    Licencia: "bg-warning/15 text-warning",
    Baja: "bg-destructive/15 text-destructive",
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back */}
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
              <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{emp.empresa} — {emp.sucursal}</span>
              <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{emp.email}</span>
              <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{emp.telefono}</span>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t pt-5">
          {[
            { label: "Legajo", value: emp.legajo },
            { label: "DNI", value: emp.dni },
            { label: "CUIL", value: emp.cuil },
            { label: "Ingreso", value: new Date(emp.fechaIngreso).toLocaleDateString("es-AR") },
            { label: "CCT", value: emp.cct },
            { label: "Categoría", value: emp.categoria },
          ].map((d) => (
            <div key={d.label}>
              <p className="text-xs text-muted-foreground">{d.label}</p>
              <p className="text-sm font-medium mt-0.5">{d.value}</p>
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
                const { icon: Icon, color } = eventIcon[ev.type];
                return (
                  <div key={ev.id} className="relative">
                    <div className={cn("absolute -left-6 top-0.5 h-5 w-5 rounded-full flex items-center justify-center", color)}>
                      <Icon className="h-3 w-3" />
                    </div>
                    <p className="text-xs text-muted-foreground">{new Date(ev.date).toLocaleDateString("es-AR")}</p>
                    <p className="text-sm font-medium">{ev.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{ev.description}</p>
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
            <button className="text-xs text-primary hover:underline">Subir archivo</button>
          </div>
          <div className="space-y-1">
            {mockDocuments.map((doc, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer group">
                <div className="rounded-md bg-muted p-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">{doc.size} · {new Date(doc.date).toLocaleDateString("es-AR")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
