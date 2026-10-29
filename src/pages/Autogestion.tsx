import { useState, useRef } from "react";
import { formatoFecha } from "@/lib/vacacionesCalendario";
import { AvisoPresentacion, ListaAdjuntosPermiso } from "@/components/AdjuntosPermiso";
import { useMiEmpleado, useSolicitudesPermiso } from "@/hooks/useAutogestion";
import { RegistroFacialCard } from "@/components/asistencia/FaceCapture";
import { useDocumentosLegajo } from "@/hooks/useEmpleados";
import { useMemorandumsEmpleado, useUpdateEstadoMemorandum } from "@/hooks/useMemorandums";
import { useSolicitudesVacacionesEmpleado, useSaveSolicitudVacaciones, useVacacionesConfig, calcDiasCorrespondientes, calcDiasHabiles } from "@/hooks/useVacaciones";
import { useSanciones, useUpdateDescargo } from "@/hooks/useSanciones";
import { useFichadasEmpleado } from "@/hooks/useAsistencia";
import { useLiquidacionesEmpleado } from "@/hooks/useLiquidacion";
import { Loader2, User, FileText, ClipboardList, Download, Plus, FileCheck, Palmtree, ShieldAlert, Upload, Clock, DollarSign, Lock, QrCode, Pencil } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import SolicitudPermisoFormDialog from "@/components/SolicitudPermisoFormDialog";
import { generarSolicitudPermisoPDF } from "@/components/SolicitudPermisoPDF";
import InstallPWAPrompt from "@/components/InstallPWAPrompt";
import MisDatosDialog from "@/components/MisDatosDialog";
import HistorialCambios from "@/components/HistorialCambios";
import PanelFichar from "@/components/asistencia/PanelFichar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import ZonaProtegida from "@/components/ZonaProtegida";
import { mensajeErrorPassword, problemaPassword } from "../../supabase/functions/_shared/registro-rules";

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

const tipoSancionLabel: Record<string, string> = {
  apercibimiento: "Apercibimiento",
  amonestacion: "Amonestación",
  suspension: "Suspensión",
};

/** El personal no ve sus sanciones en Autogestión (RRHH las gestiona desde el legajo). */
const MOSTRAR_SANCIONES = false;

export default function Autogestion() {
  const { data: emp, isLoading } = useMiEmpleado();
  const { data: solicitudes = [] } = useSolicitudesPermiso(emp?.id);
  const { data: documentos = [] } = useDocumentosLegajo(emp?.id);
  const { data: memos = [] } = useMemorandumsEmpleado(emp?.id);
  const { data: solicitudesVac = [] } = useSolicitudesVacacionesEmpleado(emp?.id);
  const { data: vacConfig = [] } = useVacacionesConfig(emp?.empresa_id);
  const { data: sanciones = [] } = useSanciones(emp?.id);
  const saveSolVac = useSaveSolicitudVacaciones();
  const updateEstadoMemo = useUpdateEstadoMemorandum();
  const updateDescargo = useUpdateDescargo();
  const [solicitudOpen, setSolicitudOpen] = useState(false);
  const [editarDatos, setEditarDatos] = useState(false);
  const [vacForm, setVacForm] = useState({ fecha_desde: "", fecha_hasta: "", observaciones: "" });
  const [descargoForm, setDescargoForm] = useState<{ sancionId: string; texto: string } | null>(null);
  const descargoFileRef = useRef<HTMLInputElement>(null);
  const [passwordForm, setPasswordForm] = useState({ current: "", new: "", confirm: "" });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const { data: misRecibos = [] } = useLiquidacionesEmpleado(emp?.id);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "datos";
  const setTab = (value: string) => setSearchParams({ tab: value }, { replace: true });


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

  const handleDownloadPDF = async (sol: any) => {
    let empresaData = null;
    if (emp.empresa) {
      const { data: empFull } = await supabase.from("empresas").select("*").eq("id", emp.empresa.id).single();
      if (empFull) {
        empresaData = { nombre: empFull.nombre, razonSocial: empFull.razon_social, cuit: empFull.cuit, domicilio: empFull.domicilio_fiscal, telefono: empFull.telefono, email: empFull.email, logoUrl: empFull.logo_url };
      }
    }
    await generarSolicitudPermisoPDF({
      empleadoNombre: `${emp.apellido}, ${emp.nombre}`,
      areaTrabajo: emp.puesto,
      motivo: sol.motivo,
      motivoDetalle: sol.motivo_detalle,
      fechaDesde: sol.fecha_desde,
      fechaHasta: sol.fecha_hasta,
      horaReintegro: sol.hora_reintegro,
      sujetoDescuento: sol.sujeto_descuento,
      fechaSolicitud: sol.fecha_solicitud,
      empresa: empresaData,
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

  const handleSubmitDescargo = async (sancionId: string) => {
    if (!descargoForm?.texto) { toast.error("Escribí tu descargo"); return; }
    
    let docUrl: string | undefined;
    const file = descargoFileRef.current?.files?.[0];
    if (file) {
      const path = `${emp.id}/descargos/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("documentos-legajo").upload(path, file);
      if (error) { toast.error("Error al subir documento"); return; }
      const { data } = supabase.storage.from("documentos-legajo").getPublicUrl(path);
      docUrl = data.publicUrl;
    }

    updateDescargo.mutate({
      sancionId,
      empleadoId: emp.id,
      descargo_texto: descargoForm.texto,
      descargo_documento_url: docUrl,
    }, {
      onSuccess: () => {
        toast.success("Descargo presentado exitosamente");
        setDescargoForm(null);
      },
      onError: (err: Error) => toast.error(err.message),
    });
  };

  const domicilio = [emp.domicilio_calle, emp.domicilio_numero, emp.domicilio_piso].filter(Boolean).join(" ");
  const domicilioFull = [domicilio, emp.domicilio_localidad, emp.domicilio_provincia].filter(Boolean).join(", ");

  return (
    <ZonaProtegida className="space-y-4 sm:space-y-6 max-w-4xl animate-fade-in">
      <InstallPWAPrompt />
      <div>
        <h1 className="text-lg sm:text-2xl font-semibold">Portal de Autogestión</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Consultá tus datos, solicitá permisos y accedé a tus documentos.</p>
      </div>

      <div className={cn(tab === "token" && "hidden sm:block")}>
        <PanelFichar variante="hero" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="hidden sm:flex w-full overflow-x-auto flex-nowrap justify-start scrollbar-none h-auto p-1">
          <TabsTrigger value="datos" className="text-xs sm:text-sm shrink-0"><User className="h-3.5 w-3.5 mr-1 hidden sm:inline-block" />Datos</TabsTrigger>
          <TabsTrigger value="permisos" className="text-xs sm:text-sm shrink-0"><ClipboardList className="h-3.5 w-3.5 mr-1 hidden sm:inline-block" />Permisos</TabsTrigger>
          <TabsTrigger value="vacaciones" className="text-xs sm:text-sm shrink-0"><Palmtree className="h-3.5 w-3.5 mr-1 hidden sm:inline-block" />Vacaciones</TabsTrigger>
          <TabsTrigger value="documentos" className="text-xs sm:text-sm shrink-0"><FileText className="h-3.5 w-3.5 mr-1 hidden sm:inline-block" />Docs</TabsTrigger>
          <TabsTrigger value="memorandums" className="text-xs sm:text-sm shrink-0"><FileCheck className="h-3.5 w-3.5 mr-1 hidden sm:inline-block" />Memos</TabsTrigger>
          {MOSTRAR_SANCIONES && <TabsTrigger value="sanciones" className="text-xs sm:text-sm shrink-0"><ShieldAlert className="h-3.5 w-3.5 mr-1 hidden sm:inline-block" />Sanciones</TabsTrigger>}
          <TabsTrigger value="fichadas" className="text-xs sm:text-sm shrink-0"><Clock className="h-3.5 w-3.5 mr-1 hidden sm:inline-block" />Fichadas</TabsTrigger>
          <TabsTrigger value="recibos" className="text-xs sm:text-sm shrink-0"><DollarSign className="h-3.5 w-3.5 mr-1 hidden sm:inline-block" />Recibos</TabsTrigger>
          <TabsTrigger value="token" className="text-xs sm:text-sm shrink-0"><QrCode className="h-3.5 w-3.5 mr-1 hidden sm:inline-block" />Fichar</TabsTrigger>
          <TabsTrigger value="password" className="text-xs sm:text-sm shrink-0"><Lock className="h-3.5 w-3.5 mr-1 hidden sm:inline-block" />Clave</TabsTrigger>
        </TabsList>

        {/* Mobile: accesos secundarios (los principales están en la barra inferior) */}
        <TabsList className="sm:hidden w-full overflow-x-auto flex-nowrap justify-start scrollbar-none h-auto p-1 gap-1">
          <TabsTrigger value="permisos" className="text-xs shrink-0 min-h-[38px]">Permisos</TabsTrigger>
          <TabsTrigger value="documentos" className="text-xs shrink-0 min-h-[38px]">Docs</TabsTrigger>
          <TabsTrigger value="memorandums" className="text-xs shrink-0 min-h-[38px]">Memos</TabsTrigger>
          {MOSTRAR_SANCIONES && <TabsTrigger value="sanciones" className="text-xs shrink-0 min-h-[38px]">Sanciones</TabsTrigger>}
          <TabsTrigger value="recibos" className="text-xs shrink-0 min-h-[38px]">Recibos</TabsTrigger>
          <TabsTrigger value="fichadas" className="text-xs shrink-0 min-h-[38px]">Fichadas</TabsTrigger>
          <TabsTrigger value="password" className="text-xs shrink-0 min-h-[38px]">Clave</TabsTrigger>
        </TabsList>

        <TabsContent value="datos">
          <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-sm font-medium">Datos Personales</h3>
              <Button size="sm" variant="outline" onClick={() => setEditarDatos(true)}><Pencil className="mr-1.5 h-3.5 w-3.5" />Actualizar mis datos</Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {[
                { label: "Nombre", value: `${emp.apellido}, ${emp.nombre}` },
                { label: "Legajo", value: emp.legajo },
                { label: "DNI", value: emp.dni },
                { label: "CUIL", value: emp.cuil },
                { label: "Puesto", value: emp.puesto },
                { label: "Empresa", value: (emp as any).empresa?.nombre },
                { label: "Sucursal", value: (emp as any).sucursal?.nombre },
                { label: "Ingreso", value: formatoFecha(emp.fecha_ingreso) },
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
          <HistorialCambios empleadoId={emp.id} titulo="Historial de cambios de mis datos" limite={20} />
          <MisDatosDialog open={editarDatos} onOpenChange={setEditarDatos} empleado={emp} />
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
                  <div key={sol.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-lg border px-3 sm:px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{sol.motivo}{sol.motivo_detalle ? ` — ${sol.motivo_detalle}` : ""}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatoFecha(sol.fecha_desde)} al {formatoFecha(sol.fecha_hasta)}
                        {sol.sujeto_descuento && " · Con descuento"}
                      </p>
                      <ListaAdjuntosPermiso adjuntos={sol.adjuntos} />
                      {sol.estado === "pendiente" && Array.isArray(sol.adjuntos) && sol.adjuntos.length > 0 && <AvisoPresentacion creadaAt={sol.created_at} />}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", estadoBadge[sol.estado])}>
                        {sol.estado}
                      </span>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownloadPDF(sol)} title="Descargar PDF">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="vacaciones">
          <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2"><Palmtree className="h-4 w-4" />Mis Vacaciones</h3>
            {emp && vacConfig.length > 0 && (() => {
              const diasCorr = calcDiasCorrespondientes(emp.fecha_ingreso, vacConfig);
              const anioActual = String(new Date().getFullYear());
              const diasUsados = solicitudesVac
                .filter((s: any) => s.estado === "aprobada" && s.periodo_anual === anioActual)
                .reduce((sum: number, s: any) => sum + s.dias_solicitados, 0);
              const saldo = diasCorr - diasUsados;
              return (
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <div className="rounded-lg border p-2 sm:p-3 text-center"><p className="text-xl sm:text-2xl font-bold text-primary">{diasCorr}</p><p className="text-[10px] sm:text-xs text-muted-foreground">Corresponden</p></div>
                  <div className="rounded-lg border p-2 sm:p-3 text-center"><p className="text-xl sm:text-2xl font-bold text-warning">{diasUsados}</p><p className="text-[10px] sm:text-xs text-muted-foreground">Usados</p></div>
                  <div className="rounded-lg border p-2 sm:p-3 text-center"><p className="text-xl sm:text-2xl font-bold text-success">{saldo}</p><p className="text-[10px] sm:text-xs text-muted-foreground">Disponibles</p></div>
                </div>
              );
            })()}

            <div className="rounded-lg border p-4 space-y-3">
              <h4 className="text-sm font-medium">Solicitar Vacaciones</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div><Label className="text-xs">Desde</Label><Input type="date" value={vacForm.fecha_desde} onChange={(e) => setVacForm({ ...vacForm, fecha_desde: e.target.value })} /></div>
                <div><Label className="text-xs">Hasta</Label><Input type="date" value={vacForm.fecha_hasta} onChange={(e) => setVacForm({ ...vacForm, fecha_hasta: e.target.value })} /></div>
                <div><Label className="text-xs">Observaciones</Label><Input value={vacForm.observaciones} onChange={(e) => setVacForm({ ...vacForm, observaciones: e.target.value })} placeholder="Opcional" /></div>
              </div>
              {vacForm.fecha_desde && vacForm.fecha_hasta && (
                <p className="text-xs text-muted-foreground">Días corridos: <strong>{calcDiasHabiles(vacForm.fecha_desde, vacForm.fecha_hasta)}</strong></p>
              )}
              <Button size="sm" disabled={!vacForm.fecha_desde || !vacForm.fecha_hasta || saveSolVac.isPending} onClick={() => {
                const dias = calcDiasHabiles(vacForm.fecha_desde, vacForm.fecha_hasta);
                const diasCorr = vacConfig.length > 0 ? calcDiasCorrespondientes(emp!.fecha_ingreso, vacConfig) : 14;
                saveSolVac.mutate({
                  empleado_id: emp!.id,
                  fecha_desde: vacForm.fecha_desde,
                  fecha_hasta: vacForm.fecha_hasta,
                  dias_solicitados: dias,
                  dias_correspondientes: diasCorr,
                  periodo_anual: String(new Date().getFullYear()),
                  observaciones: vacForm.observaciones || undefined,
                }, {
                  onSuccess: () => {
                    toast.success("Solicitud de vacaciones enviada");
                    setVacForm({ fecha_desde: "", fecha_hasta: "", observaciones: "" });
                  },
                });
              }}>
                {saveSolVac.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                Solicitar
              </Button>
            </div>

            {solicitudesVac.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Historial</h4>
                {solicitudesVac.map((sol: any) => (
                  <div key={sol.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-lg border px-3 sm:px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {formatoFecha(sol.fecha_desde)} al {formatoFecha(sol.fecha_hasta)}
                        {" · "}{sol.dias_solicitados} días
                      </p>
                      {sol.observaciones && <p className="text-xs text-muted-foreground">{sol.observaciones}</p>}
                    </div>
                    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", vacEstadoBadge[sol.estado])}>
                      {sol.estado}
                    </span>
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
                          {formatoFecha(m.fecha)}
                          {m.empresa && ` · ${m.empresa.nombre}`}
                          {(m.emisor_sector || m.emisor_nombre) && ` · Emite: ${[m.emisor_sector, m.emisor_nombre].filter(Boolean).join(" — ")}`}
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

        {MOSTRAR_SANCIONES && (
        <TabsContent value="sanciones">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-medium mb-4 flex items-center gap-2"><ShieldAlert className="h-4 w-4" />Mis Sanciones</h3>
            {sanciones.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tenés sanciones registradas.</p>
            ) : (
              <div className="space-y-3">
                {sanciones.map((s: any) => (
                  <div key={s.id} className="rounded-lg border px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{tipoSancionLabel[s.tipo] || s.tipo}: {s.motivo}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatoFecha(s.fecha)}
                          {s.descripcion && ` · ${s.descripcion}`}
                        </p>
                      </div>
                      <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        s.descargo_cerrado ? "bg-info/15 text-info" : "bg-warning/15 text-warning"
                      )}>
                        {s.descargo_cerrado ? "Descargo presentado" : "Pendiente de descargo"}
                      </span>
                    </div>

                    {/* Show existing descargo */}
                    {s.descargo_cerrado && s.descargo_texto && (
                      <div className="mt-2 rounded-md bg-muted/50 p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Tu descargo ({s.descargo_fecha ? new Date(s.descargo_fecha).toLocaleDateString("es-AR") : ""}):</p>
                        <p className="text-sm">{s.descargo_texto}</p>
                        {s.descargo_documento_url && (
                          <a href={s.descargo_documento_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block">Ver documento adjunto</a>
                        )}
                      </div>
                    )}

                    {/* Descargo form - only if not closed and no previous descargo */}
                    {!s.descargo_cerrado && !s.descargo_texto && (
                      <div className="mt-3">
                        {descargoForm?.sancionId === s.id ? (
                          <div className="space-y-3 rounded-md border p-3 bg-muted/30">
                            <div>
                              <Label className="text-xs">Descargo</Label>
                              <Textarea
                                value={descargoForm.texto}
                                onChange={(e) => setDescargoForm({ ...descargoForm, texto: e.target.value })}
                                placeholder="Escribí tu descargo..."
                                rows={4}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Documento adjunto (opcional)</Label>
                              <Input ref={descargoFileRef} type="file" className="text-xs" />
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleSubmitDescargo(s.id)} disabled={updateDescargo.isPending}>
                                {updateDescargo.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
                                Presentar Descargo
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setDescargoForm(null)}>Cancelar</Button>
                            </div>
                            <p className="text-xs text-destructive">⚠️ Una vez presentado, el descargo no podrá ser editado.</p>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setDescargoForm({ sancionId: s.id, texto: "" })}>
                            Presentar Descargo
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
        )}

        <TabsContent value="fichadas">
          <FichadasTab empleadoId={emp.id} />
        </TabsContent>

        <TabsContent value="recibos">
          <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2"><DollarSign className="h-4 w-4" />Mis Recibos de Sueldo</h3>
            {misRecibos.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tenés recibos disponibles aún.</p>
            ) : (
              <div className="space-y-2">
                {misRecibos.map((liq: any) => (
                  <div key={liq.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">Período: {liq.periodo}</p>
                      <p className="text-xs text-muted-foreground">Neto: ${Number(liq.neto).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</p>
                    </div>
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-success/15 text-success">Confirmada</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="token">
          <div className="space-y-4">
            <PanelFichar />
            {emp?.id && <div className="max-w-md mx-auto"><RegistroFacialCard empleadoId={emp.id} esPropio /></div>}
          </div>
        </TabsContent>


        <TabsContent value="password">
          <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm space-y-4 max-w-md">
            <h3 className="text-sm font-medium flex items-center gap-2"><Lock className="h-4 w-4" />Cambiar Contraseña</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (passwordForm.new !== passwordForm.confirm) { toast.error("Las contraseñas no coinciden"); return; }
                const debil = problemaPassword(passwordForm.new);
                if (debil) { toast.error(debil); return; }
                setPasswordLoading(true);
                const { error } = await supabase.auth.updateUser({ password: passwordForm.new });
                setPasswordLoading(false);
                if (error) { toast.error(mensajeErrorPassword(error)); return; }
                toast.success("Contraseña actualizada");
                setPasswordForm({ current: "", new: "", confirm: "" });
              }}
              className="space-y-3"
            >
              <div>
                <Label className="text-xs">Nueva Contraseña</Label>
                <Input type="password" minLength={8} required value={passwordForm.new} onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Confirmar Contraseña</Label>
                <Input type="password" minLength={8} required value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} />
              </div>
              <Button type="submit" disabled={passwordLoading} size="sm">
                {passwordLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Cambiar Contraseña
              </Button>
            </form>
          </div>
        </TabsContent>
      </Tabs>
    </ZonaProtegida>
  );
}

const fichadaEstadoBadge: Record<string, string> = {
  presente: "bg-success/15 text-success",
  ausente: "bg-destructive/15 text-destructive",
  tardanza: "bg-warning/15 text-warning",
  justificado: "bg-info/15 text-info",
};

function FichadasTab({ empleadoId }: { empleadoId: string }) {
  const [mes, setMes] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const { data: fichadas = [], isLoading } = useFichadasEmpleado(empleadoId, mes);

  return (
    <div className="rounded-xl border bg-card p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h3 className="text-sm font-medium flex items-center gap-2"><Clock className="h-4 w-4" />Mis Fichadas</h3>
        <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="w-full sm:w-auto" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : fichadas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin fichadas en este período.</p>
      ) : (
        <>
        {/* Mobile: tarjetas */}
        <div className="sm:hidden space-y-2">
          {fichadas.map((f: any) => (
            <div key={f.id} className="rounded-lg border px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{new Date(f.fecha + "T12:00:00").toLocaleDateString("es-AR")}</p>
                <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", fichadaEstadoBadge[f.estado] || "bg-muted text-muted-foreground")}>
                  {f.estado}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Entrada: {f.hora_entrada ? new Date(f.hora_entrada).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }) : "—"}
                {" · "}
                Salida: {f.hora_salida ? new Date(f.hora_salida).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }) : "—"}
              </p>
            </div>
          ))}
        </div>
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Entrada</th>
                <th className="py-2 pr-4">Salida</th>
                <th className="py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {fichadas.map((f: any) => (
                <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 pr-4 font-medium">{new Date(f.fecha + "T12:00:00").toLocaleDateString("es-AR")}</td>
                  <td className="py-2.5 pr-4">{f.hora_entrada ? new Date(f.hora_entrada).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }) : "—"}</td>
                  <td className="py-2.5 pr-4">{f.hora_salida ? new Date(f.hora_salida).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }) : "—"}</td>
                  <td className="py-2.5">
                    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", fichadaEstadoBadge[f.estado] || "bg-muted text-muted-foreground")}>
                      {f.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}




