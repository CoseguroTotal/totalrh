import { useState } from "react";
import { useMiEmpleado, useSolicitudesPermiso } from "@/hooks/useAutogestion";
import { useDocumentosLegajo } from "@/hooks/useEmpleados";
import { useMemorandumsEmpleado, useUpdateEstadoMemorandum } from "@/hooks/useMemorandums";
import { useSolicitudesVacacionesEmpleado, useSaveSolicitudVacaciones, useVacacionesConfig, calcDiasCorrespondientes, calcDiasHabiles } from "@/hooks/useVacaciones";
import { Loader2, User, FileText, ClipboardList, Download, Plus, FileCheck, Palmtree } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import SolicitudPermisoFormDialog from "@/components/SolicitudPermisoFormDialog";
import { generarSolicitudPermisoPDF } from "@/components/SolicitudPermisoPDF";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const estadoBadge: Record<string, string> = {
  pendiente: "bg-warning/15 text-warning",
  aprobada: "bg-success/15 text-success",
  rechazada: "bg-destructive/15 text-destructive",
};

const vacEstadoBadge: Record<string, string> = {
  pendiente: "bg-warning/15 text-warning",
  aprobada: "bg-success/15 text-success",
  rechazada: "bg-destructive/15 text-destructive",
  cancelada: "bg-muted text-muted-foreground",
};

const memoEstadoBadge: Record<string, string> = {
  enviado: "bg-info/15 text-info",
  recibido: "bg-warning/15 text-warning",
  firmado: "bg-success/15 text-success",
};

export default function Autogestion() {
  const { data: emp, isLoading } = useMiEmpleado();
  const { data: solicitudes = [] } = useSolicitudesPermiso(emp?.id);
  const { data: documentos = [] } = useDocumentosLegajo(emp?.id);
  const { data: memos = [] } = useMemorandumsEmpleado(emp?.id);
  const { data: solicitudesVac = [] } = useSolicitudesVacacionesEmpleado(emp?.id);
  const { data: vacConfig = [] } = useVacacionesConfig(emp?.empresa_id);
  const saveSolVac = useSaveSolicitudVacaciones();
  const updateEstadoMemo = useUpdateEstadoMemorandum();
  const [solicitudOpen, setSolicitudOpen] = useState(false);
  const [vacForm, setVacForm] = useState({ fecha_desde: "", fecha_hasta: "", observaciones: "" });

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!emp) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <User className="h-10 w-10 text-muted-foreground mb-4" />
        <h1 className="text-xl font-semibold">Portal de Autogestión</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          Tu email no está asociado a un legajo de empleado. Contactá a RRHH para vincular tu cuenta.
        </p>
      </div>
    );
  }

  const handleDownloadPDF = (sol: any) => {
    generarSolicitudPermisoPDF({
      empleadoNombre: `${emp.apellido}, ${emp.nombre}`,
      areaTrabajo: emp.puesto,
      motivo: sol.motivo,
      motivoDetalle: sol.motivo_detalle,
      fechaDesde: sol.fecha_desde,
      fechaHasta: sol.fecha_hasta,
      horaReintegro: sol.hora_reintegro,
      sujetoDescuento: sol.sujeto_descuento,
      fechaSolicitud: sol.fecha_solicitud,
    });
  };

  const handleDownloadDoc = async (storagePath: string, fileName: string) => {
    const { data, error } = await supabase.storage.from("documentos-legajo").download(storagePath);
    if (error) { toast.error("Error al descargar"); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);
  };

  const handleAcuseRecibo = async (memoId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    updateEstadoMemo.mutate({ id: memoId, estado: "recibido" }, {
      onSuccess: () => toast.success("Acuse de recibo registrado"),
    });
  };

  const handleFirmar = async (memoId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    updateEstadoMemo.mutate({ id: memoId, estado: "firmado", firmado_por: user?.id }, {
      onSuccess: () => toast.success("Firma digital registrada"),
    });
  };

  const domicilio = [emp.domicilio_calle, emp.domicilio_numero, emp.domicilio_piso].filter(Boolean).join(" ");
  const domicilioFull = [domicilio, emp.domicilio_localidad, emp.domicilio_provincia].filter(Boolean).join(", ");

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold">Portal de Autogestión</h1>
        <p className="text-sm text-muted-foreground mt-1">Consultá tus datos, solicitá permisos y accedé a tus documentos.</p>
      </div>

      <Tabs defaultValue="datos">
        <TabsList className="flex-wrap">
          <TabsTrigger value="datos"><User className="h-3.5 w-3.5 mr-1.5" />Mis Datos</TabsTrigger>
          <TabsTrigger value="permisos"><ClipboardList className="h-3.5 w-3.5 mr-1.5" />Solicitudes</TabsTrigger>
          <TabsTrigger value="vacaciones"><Palmtree className="h-3.5 w-3.5 mr-1.5" />Vacaciones</TabsTrigger>
          <TabsTrigger value="documentos"><FileText className="h-3.5 w-3.5 mr-1.5" />Documentos</TabsTrigger>
          <TabsTrigger value="memorandums"><FileCheck className="h-3.5 w-3.5 mr-1.5" />Memorándums</TabsTrigger>
        </TabsList>

        <TabsContent value="datos">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-medium mb-4">Datos Personales</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: "Nombre", value: `${emp.apellido}, ${emp.nombre}` },
                { label: "Legajo", value: emp.legajo },
                { label: "DNI", value: emp.dni },
                { label: "CUIL", value: emp.cuil },
                { label: "Puesto", value: emp.puesto },
                { label: "Empresa", value: (emp as any).empresa?.nombre },
                { label: "Sucursal", value: (emp as any).sucursal?.nombre },
                { label: "Ingreso", value: new Date(emp.fecha_ingreso).toLocaleDateString("es-AR") },
                { label: "Email", value: emp.email },
                { label: "Teléfono", value: emp.telefono },
                { label: "Domicilio", value: domicilioFull || null },
              ].map((d) => (
                <div key={d.label}>
                  <p className="text-xs text-muted-foreground">{d.label}</p>
                  <p className="text-sm font-medium mt-0.5">{d.value || "—"}</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="permisos">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Solicitudes de Permiso</h3>
              <Button size="sm" onClick={() => setSolicitudOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" />Nueva Solicitud
              </Button>
            </div>
            <SolicitudPermisoFormDialog open={solicitudOpen} onOpenChange={setSolicitudOpen} empleadoId={emp.id} />
            {solicitudes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin solicitudes registradas.</p>
            ) : (
              <div className="space-y-2">
                {solicitudes.map((sol: any) => (
                  <div key={sol.id} className="flex items-center gap-3 rounded-lg border px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{sol.motivo}{sol.motivo_detalle ? ` — ${sol.motivo_detalle}` : ""}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sol.fecha_desde).toLocaleDateString("es-AR")} al {new Date(sol.fecha_hasta).toLocaleDateString("es-AR")}
                        {sol.sujeto_descuento && " · Con descuento"}
                      </p>
                    </div>
                    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", estadoBadge[sol.estado])}>
                      {sol.estado}
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownloadPDF(sol)} title="Descargar PDF">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="documentos">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-medium mb-4">Mis Documentos</h3>
            {documentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin documentos cargados.</p>
            ) : (
              <div className="space-y-1">
                {documentos.map((doc: any) => (
                  <div key={doc.id} onClick={() => handleDownloadDoc(doc.storage_path, doc.nombre_archivo)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.nombre_archivo}</p>
                      <p className="text-xs text-muted-foreground">{doc.tamano} · {new Date(doc.created_at).toLocaleDateString("es-AR")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="memorandums">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-medium mb-4">Memorándums Recibidos</h3>
            {memos.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tenés memorándums.</p>
            ) : (
              <div className="space-y-2">
                {memos.map((m: any) => (
                  <div key={m.id} className="rounded-lg border px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">#{m.numero} — {m.titulo}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(m.fecha).toLocaleDateString("es-AR")}
                          {m.empresa && ` · ${m.empresa.nombre}`}
                        </p>
                      </div>
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full capitalize", memoEstadoBadge[m.estado])}>
                        {m.estado}
                      </span>
                    </div>
                    {m.contenido && (
                      <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{m.contenido}</p>
                    )}
                    <div className="flex gap-2 mt-3">
                      {m.estado === "enviado" && (
                        <Button size="sm" variant="outline" onClick={() => handleAcuseRecibo(m.id)}>Acusar Recibo</Button>
                      )}
                      {(m.estado === "enviado" || m.estado === "recibido") && (
                        <Button size="sm" onClick={() => handleFirmar(m.id)}>Firmar Digitalmente</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
