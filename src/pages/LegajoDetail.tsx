import { useParams, Link, useNavigate } from "react-router-dom";
import { formatoFecha } from "@/lib/vacacionesCalendario";
import { AvisoPresentacion, ListaAdjuntosPermiso } from "@/components/AdjuntosPermiso";
import { useState } from "react";
import { useEmpleado, useEventosLegajo, useDocumentosLegajo, useGrupoFamiliar, useDatosMedicos } from "@/hooks/useEmpleados";
import { useEstudiosEmpleado, useSolicitudesPermiso } from "@/hooks/useAutogestion";
import { useFichadasEmpleado } from "@/hooks/useAsistencia";
import { useSolicitudesVacacionesEmpleado, useUpdateSolicitudVacaciones, useVacacionesConfig, calcDiasCorrespondientes } from "@/hooks/useVacaciones";
import { useSanciones } from "@/hooks/useSanciones";
import { useCanEdit, useCanSancion } from "@/hooks/useCanEdit";
import { RegistroFacialCard } from "@/components/asistencia/FaceCapture";
import HistorialCambios from "@/components/HistorialCambios";
import BlanquearClave from "@/components/BlanquearClave";
import { useConfigGrupo } from "@/hooks/useConfigGrupo";
import { sendNotificationEmailIfEnabled } from "@/lib/sendNotificationEmail";
import { ArrowLeft, Mail, Phone, Building2, Calendar, FileText, Award, AlertCircle, Loader2, Upload, Pencil, Plus, MapPin, Users, Trash2, GraduationCap, ClipboardList, Download, Check, X, Clock, Palmtree, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import EmpleadoFormDialog from "@/components/EmpleadoFormDialog";
import EventoFormDialog from "@/components/EventoFormDialog";
import FamiliarFormDialog from "@/components/FamiliarFormDialog";
import DatosMedicosForm from "@/components/DatosMedicosForm";
import EstudioFormDialog from "@/components/EstudioFormDialog";
import SancionFormDialog from "@/components/SancionFormDialog";
import { generarSolicitudPermisoPDF } from "@/components/SolicitudPermisoPDF";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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

const parentescoLabel: Record<string, string> = {
  conyuge: "Cónyuge", hijo: "Hijo/a", padre: "Padre/Madre", otro: "Otro",
};

const nivelLabel: Record<string, string> = {
  primario: "Primario", secundario: "Secundario", terciario: "Terciario", universitario: "Universitario", posgrado: "Posgrado",
};

const estadoEstudioLabel: Record<string, string> = {
  completo: "Completo", en_curso: "En curso", incompleto: "Incompleto",
};

const estadoSolicitudBadge: Record<string, string> = {
  pendiente: "bg-warning/15 text-warning",
  aprobada: "bg-success/15 text-success",
  rechazada: "bg-destructive/15 text-destructive",
};

const categoriasDocumento = [
  { value: "documento_personal", label: "Documento Personal" },
  { value: "permiso", label: "Permiso" },
  { value: "medico", label: "Médico" },
  { value: "contrato", label: "Contrato" },
  { value: "certificado", label: "Certificado" },
  { value: "otro", label: "Otro" },
];

const tipoSancionLabel: Record<string, string> = {
  apercibimiento: "Apercibimiento",
  amonestacion: "Amonestación",
  suspension: "Suspensión",
};

export default function LegajoDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [eventoOpen, setEventoOpen] = useState(false);
  const [familiarOpen, setFamiliarOpen] = useState<{ open: boolean; familiar?: any }>({ open: false });
  const [estudioOpen, setEstudioOpen] = useState<{ open: boolean; estudio?: any }>({ open: false });
  const [sancionOpen, setSancionOpen] = useState(false);
  const { data: emp, isLoading } = useEmpleado(id);
  const { data: events = [] } = useEventosLegajo(id);
  const { data: documentos = [] } = useDocumentosLegajo(id);
  const { data: familiares = [] } = useGrupoFamiliar(id);
  const { data: datosMedicos, isLoading: loadingMedicos } = useDatosMedicos(id);
  const { data: estudios = [] } = useEstudiosEmpleado(id);
  const { data: solicitudes = [] } = useSolicitudesPermiso(id);
  const { data: sanciones = [] } = useSanciones(id);
  const { canEdit, role } = useCanEdit("legajos");
  const { canSancion } = useCanSancion();
  const { data: configGrupo } = useConfigGrupo();
  const [mesFichadas, setMesFichadas] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const { data: fichadas = [] } = useFichadasEmpleado(id, mesFichadas);
  const { data: solicitudesVac = [] } = useSolicitudesVacacionesEmpleado(id);
  const { data: vacConfig = [] } = useVacacionesConfig(emp?.empresa_id);
  const updateVac = useUpdateSolicitudVacaciones();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadCategoria, setUploadCategoria] = useState("otro");
  const [uploadVencimiento, setUploadVencimiento] = useState("");

  const deleteEmpleadoMutation = useMutation({
    mutationFn: async () => {
      await supabase.from("eventos_legajo").delete().eq("empleado_id", id!);
      await supabase.from("documentos_legajo").delete().eq("empleado_id", id!);
      await supabase.from("grupo_familiar").delete().eq("empleado_id", id!);
      await supabase.from("datos_medicos").delete().eq("empleado_id", id!);
      await supabase.from("estudios_empleado").delete().eq("empleado_id", id!);
      await supabase.from("solicitudes_permiso").delete().eq("empleado_id", id!);
      await supabase.from("sanciones" as any).delete().eq("empleado_id", id!);
      const liqs = await supabase.from("liquidaciones").select("id").eq("empleado_id", id!);
      if (liqs.data?.length) {
        await supabase.from("liquidacion_lineas").delete().in("liquidacion_id", liqs.data.map((l) => l.id));
      }
      await supabase.from("liquidaciones").delete().eq("empleado_id", id!);
      const { error } = await supabase.from("empleados").delete().eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Empleado eliminado");
      queryClient.invalidateQueries({ queryKey: ["empleados"] });
      navigate("/legajos");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteFamiliarMutation = useMutation({
    mutationFn: async (familiarId: string) => {
      const { error } = await supabase.from("grupo_familiar").delete().eq("id", familiarId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Familiar eliminado");
      queryClient.invalidateQueries({ queryKey: ["grupo_familiar", id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteEstudioMutation = useMutation({
    mutationFn: async (estudioId: string) => {
      const { error } = await supabase.from("estudios_empleado").delete().eq("id", estudioId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Estudio eliminado");
      queryClient.invalidateQueries({ queryKey: ["estudios_empleado", id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateSolicitudMutation = useMutation({
    mutationFn: async ({ solId, estado }: { solId: string; estado: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("solicitudes_permiso").update({
        estado: estado as any,
        aprobado_por: user?.id || null,
      }).eq("id", solId);
      if (error) throw error;

      // Send email notification if enabled
      if (emp?.email) {
        const estadoLabel = estado === "aprobada" ? "aprobada ✅" : "rechazada ❌";
        await sendNotificationEmailIfEnabled(configGrupo, {
          to: emp.email,
          subject: `Solicitud de permiso ${estado}`,
          html: `<h2>Solicitud de Permiso ${estadoLabel}</h2><p>Hola ${emp.nombre},</p><p>Tu solicitud de permiso ha sido <strong>${estado}</strong>.</p><p>Saludos,<br/>RRHH</p>`,
        });
      }
    },
    onSuccess: (_, vars) => {
      toast.success(`Solicitud ${vars.estado === "aprobada" ? "aprobada" : "rechazada"}`);
      queryClient.invalidateQueries({ queryKey: ["solicitudes_permiso", id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    const storagePath = `${id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from("documentos-legajo").upload(storagePath, file);
    if (uploadError) { toast.error("Error al subir archivo: " + uploadError.message); return; }
    const { error: dbError } = await supabase.from("documentos_legajo").insert({
      empleado_id: id,
      nombre_archivo: file.name,
      storage_path: storagePath,
      tamano: file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(0)} KB` : `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      tipo_documento: file.type || "application/octet-stream",
      categoria: uploadCategoria,
      fecha_vencimiento: uploadVencimiento || null,
    });
    if (dbError) { toast.error("Error al registrar documento: " + dbError.message); return; }
    toast.success("Documento subido correctamente");
    queryClient.invalidateQueries({ queryKey: ["documentos_legajo", id] });
    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploadVencimiento("");
  };

  const handleDownload = async (storagePath: string, fileName: string) => {
    const { data, error } = await supabase.storage.from("documentos-legajo").download(storagePath);
    if (error) { toast.error("Error al descargar: " + error.message); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!emp) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p>Empleado no encontrado.</p>
        <Link to="/legajos" className="mt-4 text-sm text-primary hover:underline">Volver a legajos</Link>
      </div>
    );
  }

  const domicilio = [emp.domicilio_calle, emp.domicilio_numero, emp.domicilio_piso].filter(Boolean).join(" ");
  const domicilioFull = [domicilio, emp.domicilio_localidad, emp.domicilio_provincia, emp.domicilio_cp].filter(Boolean).join(", ");

  return (
    <div className="space-y-6 max-w-5xl">
      <Link to="/legajos" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors animate-fade-in">
        <ArrowLeft className="h-4 w-4" />Volver a Legajos
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
              <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", estadoBadge[emp.estado])}>{emp.estado}</span>
              {canEdit && (
                <div className="ml-auto flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
                    <Pencil className="h-3.5 w-3.5 mr-1.5" />Editar
                  </Button>
                  {(role === "admin" || role === "rrhh") && emp.user_id && <BlanquearClave empleadoId={emp.id} nombre={`${emp.nombre} ${emp.apellido}`} />}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />Dar de Baja
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar empleado?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Se eliminará a {emp.apellido}, {emp.nombre} y todos sus registros asociados. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteEmpleadoMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
            <EmpleadoFormDialog open={editOpen} onOpenChange={setEditOpen} empleado={emp} />
            <p className="text-sm text-muted-foreground mt-1">{emp.puesto}{emp.categoria ? ` · ${emp.categoria}` : ""}</p>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{emp.empresa?.nombre} — {emp.sucursal?.nombre}</span>
              {emp.email && <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{emp.email}</span>}
              {emp.telefono && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{emp.telefono}</span>}
              {domicilioFull && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{domicilioFull}</span>}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t pt-5">
          {[
            { label: "Legajo", value: emp.legajo },
            { label: "DNI", value: emp.dni },
            { label: "CUIL", value: emp.cuil },
            { label: "Ingreso", value: formatoFecha(emp.fecha_ingreso) },
            { label: "CCT", value: emp.cct },
            { label: "Categoría", value: emp.categoria },
            { label: "Sueldo Básico", value: emp.sueldo_basico != null ? `$${Number(emp.sueldo_basico).toLocaleString("es-AR")}` : null },
            { label: "Nacionalidad", value: emp.nacionalidad },
            { label: "Nacimiento", value: emp.fecha_nacimiento ? formatoFecha(emp.fecha_nacimiento) : null },
            { label: "Cód. Asistencia", value: (emp as any).codigo_asistencia },
          ].map((d) => (
            <div key={d.label}>
              <p className="text-xs text-muted-foreground">{d.label}</p>
              <p className="text-sm font-medium mt-0.5">{d.value || "—"}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="historial" className="animate-slide-up" style={{ animationDelay: "100ms" }}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="historial">Historial</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="familia">Familia</TabsTrigger>
          <TabsTrigger value="medico">Médico</TabsTrigger>
          <TabsTrigger value="estudios">Estudios</TabsTrigger>
          <TabsTrigger value="asistencia"><Clock className="h-3.5 w-3.5 mr-1" />Asistencia</TabsTrigger>
          <TabsTrigger value="permisos">Permisos</TabsTrigger>
          <TabsTrigger value="vacaciones"><Palmtree className="h-3.5 w-3.5 mr-1" />Vacaciones</TabsTrigger>
          <TabsTrigger value="sanciones"><ShieldAlert className="h-3.5 w-3.5 mr-1" />Sanciones</TabsTrigger>
        </TabsList>

        {/* Historial */}
        <TabsContent value="historial" className="space-y-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Historial de Eventos</h3>
              {canEdit && (
                <Button variant="ghost" size="sm" onClick={() => setEventoOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Agregar
                </Button>
              )}
            </div>
            <EventoFormDialog open={eventoOpen} onOpenChange={setEventoOpen} empleadoId={id!} />
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
                      <p className="text-xs text-muted-foreground">{formatoFecha(ev.fecha)}</p>
                      <p className="text-sm font-medium">{ev.titulo}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{ev.descripcion}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {id && <HistorialCambios empleadoId={id} />}
        </TabsContent>

        {/* Documentos */}
        <TabsContent value="documentos">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Documentación</h3>
              {canEdit && (
                <div className="flex items-center gap-2">
                  <Select value={uploadCategoria} onValueChange={setUploadCategoria}>
                    <SelectTrigger className="h-8 text-xs w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categoriasDocumento.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="date" className="h-8 text-xs w-36" value={uploadVencimiento} onChange={(e) => setUploadVencimiento(e.target.value)} />
                  <label className="text-xs text-primary hover:underline cursor-pointer inline-flex items-center gap-1 whitespace-nowrap">
                    <Upload className="h-3 w-3" />Subir
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
                  </label>
                </div>
              )}
            </div>
            {documentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin documentos cargados.</p>
            ) : (
              <div className="space-y-1">
                {documentos.map((doc) => (
                  <div key={doc.id} onClick={() => handleDownload(doc.storage_path, doc.nombre_archivo)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer group">
                    <div className="rounded-md bg-muted p-2"><FileText className="h-4 w-4 text-muted-foreground" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.nombre_archivo}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.tamano} · {new Date(doc.created_at).toLocaleDateString("es-AR")}
                        {(doc as any).categoria && (doc as any).categoria !== "otro" && (
                          <span className="ml-2 px-1.5 py-0.5 rounded bg-muted text-xs">{categoriasDocumento.find(c => c.value === (doc as any).categoria)?.label}</span>
                        )}
                        {doc.fecha_vencimiento && (
                          <span className="ml-2 text-warning">Vence: {formatoFecha(doc.fecha_vencimiento)}</span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Grupo Familiar */}
        <TabsContent value="familia">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium flex items-center gap-2"><Users className="h-4 w-4" />Grupo Familiar</h3>
              {canEdit && (
                <Button variant="ghost" size="sm" onClick={() => setFamiliarOpen({ open: true })}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Agregar
                </Button>
              )}
            </div>
            <FamiliarFormDialog open={familiarOpen.open} onOpenChange={(o) => setFamiliarOpen({ open: o })} empleadoId={id!} familiar={familiarOpen.familiar} />
            {familiares.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin familiares registrados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Nombre</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Parentesco</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs hidden sm:table-cell">DNI</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs hidden sm:table-cell">Nacimiento</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">A cargo</th>
                      {canEdit && <th className="px-3 py-2 w-16"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {familiares.map((f: any) => (
                      <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2">{f.apellido}, {f.nombre}</td>
                        <td className="px-3 py-2">{parentescoLabel[f.parentesco] || f.parentesco}</td>
                        <td className="px-3 py-2 hidden sm:table-cell">{f.dni || "—"}</td>
                        <td className="px-3 py-2 hidden sm:table-cell">{f.fecha_nacimiento ? formatoFecha(f.fecha_nacimiento) : "—"}</td>
                        <td className="px-3 py-2">{f.a_cargo ? "Sí" : "No"}{f.discapacidad ? " · Disc." : ""}</td>
                        {canEdit && (
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFamiliarOpen({ open: true, familiar: f })}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteFamiliarMutation.mutate(f.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Datos Médicos */}
        <TabsContent value="medico">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <DatosMedicosForm empleadoId={id!} datos={datosMedicos ?? null} isLoading={loadingMedicos} />
          </div>
        </TabsContent>

        {/* Estudios */}
        <TabsContent value="estudios">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium flex items-center gap-2"><GraduationCap className="h-4 w-4" />Formación Académica</h3>
              {canEdit && (
                <Button variant="ghost" size="sm" onClick={() => setEstudioOpen({ open: true })}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Agregar
                </Button>
              )}
            </div>
            <EstudioFormDialog
              open={estudioOpen.open}
              onOpenChange={(o) => setEstudioOpen({ open: o })}
              empleadoId={id!}
              estudio={estudioOpen.estudio}
            />
            {estudios.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin estudios registrados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Título</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Institución</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Nivel</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Estado</th>
                      {canEdit && <th className="px-3 py-2 w-16"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {estudios.map((est: any) => (
                      <tr key={est.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2">{est.titulo}</td>
                        <td className="px-3 py-2">{est.institucion || "—"}</td>
                        <td className="px-3 py-2">{nivelLabel[est.nivel] || est.nivel}</td>
                        <td className="px-3 py-2">
                          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            est.estado === "completo" ? "bg-success/15 text-success" : est.estado === "en_curso" ? "bg-info/15 text-info" : "bg-muted text-muted-foreground"
                          )}>{estadoEstudioLabel[est.estado]}</span>
                        </td>
                        {canEdit && (
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEstudioOpen({ open: true, estudio: est })}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteEstudioMutation.mutate(est.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Permisos */}
        <TabsContent value="permisos">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium flex items-center gap-2"><ClipboardList className="h-4 w-4" />Solicitudes de Permiso</h3>
            </div>
            {solicitudes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin solicitudes de permiso.</p>
            ) : (
              <div className="space-y-2">
                {solicitudes.map((sol: any) => (
                  <div key={sol.id} className="flex items-center gap-3 rounded-lg border px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{sol.motivo}{sol.motivo_detalle ? ` — ${sol.motivo_detalle}` : ""}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatoFecha(sol.fecha_desde)} al {formatoFecha(sol.fecha_hasta)}
                        {sol.sujeto_descuento && " · Con descuento"}
                      </p>
                      <ListaAdjuntosPermiso adjuntos={sol.adjuntos} />
                      {sol.estado === "pendiente" && Array.isArray(sol.adjuntos) && sol.adjuntos.length > 0 && <AvisoPresentacion creadaAt={sol.created_at} />}
                    </div>
                    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", estadoSolicitudBadge[sol.estado])}>
                      {sol.estado}
                    </span>
                    {sol.estado === "pendiente" && canEdit && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={() => updateSolicitudMutation.mutate({ solId: sol.id, estado: "aprobada" })} title="Aprobar">
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => updateSolicitudMutation.mutate({ solId: sol.id, estado: "rechazada" })} title="Rechazar">
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={async () => {
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
                    }} title="Descargar PDF">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Asistencia */}
        <TabsContent value="asistencia" className="space-y-4">
          {(role === "admin" || role === "rrhh") && id && (
            <RegistroFacialCard empleadoId={id} nombreEmpleado={emp ? `${emp.nombre} ${emp.apellido}` : undefined} esPropio={false} />
          )}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium flex items-center gap-2"><Clock className="h-4 w-4" />Asistencia</h3>
              <Input type="month" value={mesFichadas} onChange={(e) => setMesFichadas(e.target.value)} className="w-40 h-8 text-xs" />
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-success">{fichadas.filter((f: any) => f.estado === "presente").length}</p>
                <p className="text-xs text-muted-foreground">Presentes</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-warning">{fichadas.filter((f: any) => f.estado === "tardanza").length}</p>
                <p className="text-xs text-muted-foreground">Tardanzas</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-destructive">{fichadas.filter((f: any) => f.estado === "ausente").length}</p>
                <p className="text-xs text-muted-foreground">Ausencias</p>
              </div>
            </div>
            {fichadas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin fichadas para este período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Fecha</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Entrada</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Salida</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Estado</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fichadas.map((f: any) => (
                      <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-3 py-2">{formatoFecha(f.fecha)}</td>
                        <td className="px-3 py-2">{f.hora_entrada ? new Date(f.hora_entrada).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }) : "—"}</td>
                        <td className="px-3 py-2">{f.hora_salida ? new Date(f.hora_salida).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }) : "—"}</td>
                        <td className="px-3 py-2">
                          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            f.estado === "presente" ? "bg-success/15 text-success" : f.estado === "tardanza" ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"
                          )}>{f.estado}</span>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{f.observaciones || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Vacaciones */}
        <TabsContent value="vacaciones">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium flex items-center gap-2"><Palmtree className="h-4 w-4" />Vacaciones</h3>
            </div>
            {emp && vacConfig.length > 0 && (
              <div className="rounded-lg border p-3 mb-4 bg-muted/30">
                <p className="text-sm">Días correspondientes por antigüedad: <strong>{calcDiasCorrespondientes(emp.fecha_ingreso, vacConfig)}</strong></p>
                <p className="text-xs text-muted-foreground">Días usados este año: <strong>{solicitudesVac.filter((s: any) => s.estado === "aprobada" && s.periodo_anual === String(new Date().getFullYear())).reduce((sum: number, s: any) => sum + s.dias_solicitados, 0)}</strong></p>
              </div>
            )}
            {solicitudesVac.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin solicitudes de vacaciones.</p>
            ) : (
              <div className="space-y-2">
                {solicitudesVac.map((sol: any) => (
                  <div key={sol.id} className="flex items-center gap-3 rounded-lg border px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {formatoFecha(sol.fecha_desde)} al {formatoFecha(sol.fecha_hasta)}
                        {" · "}{sol.dias_solicitados} días · Período {sol.periodo_anual}
                      </p>
                      {sol.observaciones && <p className="text-xs text-muted-foreground">{sol.observaciones}</p>}
                    </div>
                    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", estadoSolicitudBadge[sol.estado] || "bg-muted text-muted-foreground")}>
                      {sol.estado}
                    </span>
                    {sol.estado === "pendiente" && canEdit && (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={async () => {
                          const { data: { user } } = await supabase.auth.getUser();
                          updateVac.mutate({ id: sol.id, estado: "aprobada", aprobado_por: user?.id }, {
                            onSuccess: async () => {
                              if (emp?.email) {
                                await sendNotificationEmailIfEnabled(configGrupo, {
                                  to: emp.email,
                                  subject: "Vacaciones aprobadas",
                                  html: `<h2>Vacaciones Aprobadas ✅</h2><p>Hola ${emp.nombre},</p><p>Tu solicitud de vacaciones del ${formatoFecha(sol.fecha_desde)} al ${formatoFecha(sol.fecha_hasta)} ha sido <strong>aprobada</strong>.</p><p>Saludos,<br/>RRHH</p>`,
                                });
                              }
                            }
                          });
                        }} title="Aprobar"><Check className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={async () => {
                          const { data: { user } } = await supabase.auth.getUser();
                          updateVac.mutate({ id: sol.id, estado: "rechazada", aprobado_por: user?.id }, {
                            onSuccess: async () => {
                              if (emp?.email) {
                                await sendNotificationEmailIfEnabled(configGrupo, {
                                  to: emp.email,
                                  subject: "Vacaciones rechazadas",
                                  html: `<h2>Vacaciones Rechazadas ❌</h2><p>Hola ${emp.nombre},</p><p>Tu solicitud de vacaciones del ${formatoFecha(sol.fecha_desde)} al ${formatoFecha(sol.fecha_hasta)} ha sido <strong>rechazada</strong>.</p><p>Saludos,<br/>RRHH</p>`,
                                });
                              }
                            }
                          });
                        }} title="Rechazar"><X className="h-3.5 w-3.5" /></Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Sanciones */}
        <TabsContent value="sanciones">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium flex items-center gap-2"><ShieldAlert className="h-4 w-4" />Sanciones</h3>
              {canSancion && (
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setSancionOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1" />Emitir Sanción
                </Button>
              )}
            </div>
            <SancionFormDialog open={sancionOpen} onOpenChange={setSancionOpen} empleadoId={id!} empleadoNombre={`${emp.apellido}, ${emp.nombre}`} />
            {sanciones.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin sanciones registradas.</p>
            ) : (
              <div className="space-y-2">
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
                        {s.descargo_cerrado ? "Con descargo" : "Sin descargo"}
                      </span>
                    </div>
                    {s.descargo_cerrado && s.descargo_texto && (
                      <div className="mt-2 rounded-md bg-muted/50 p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Descargo del empleado ({s.descargo_fecha ? new Date(s.descargo_fecha).toLocaleDateString("es-AR") : ""}):</p>
                        <p className="text-sm">{s.descargo_texto}</p>
                        {s.descargo_documento_url && (
                          <a href={s.descargo_documento_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block">Ver documento adjunto</a>
                        )}
                      </div>
                    )}
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
