import { useState, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, Clock, LogIn, LogOut, Upload, FileSpreadsheet } from "lucide-react";
import { useTurnos, useSaveTurno, useDeleteTurno, useFichadas, useRegistrarFichada, useNovedades, useSaveNovedad } from "@/hooks/useAsistencia";
import { useEmpleados } from "@/hooks/useEmpleados";
import { useCanEdit } from "@/hooks/useCanEdit";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ETIQUETA_METODO, asignacionVigente, horaCorta, hoyArgentina, minutosExtra, minutosTardanza } from "@/lib/asistencia";
import { enlaceMapa } from "@/lib/ubicacion";
import { formatoFecha } from "@/lib/vacacionesCalendario";
import { MapPin } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const tiposNovedad = ["ausencia", "tardanza", "licencia", "feriado", "justificado"];
const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function Asistencia() {
  const [turnoDialog, setTurnoDialog] = useState<{ open: boolean; turno?: any }>({ open: false });
  const { canEdit } = useCanEdit("asistencia");

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-semibold">Control de Asistencia</h1>
        <p className="text-sm text-muted-foreground mt-1">Fichada, turnos, novedades y planillas de horario</p>
      </div>

      <Tabs defaultValue="fichada" className="animate-slide-up">
        <TabsList className="flex-wrap">
          <TabsTrigger value="fichada">Fichada</TabsTrigger>
          <TabsTrigger value="turnos">Turnos</TabsTrigger>
          <TabsTrigger value="novedades">Novedades</TabsTrigger>
          <TabsTrigger value="planillas">Planillas</TabsTrigger>
        </TabsList>

        <TabsContent value="fichada"><FichadaTab canEdit={canEdit} /></TabsContent>
        <TabsContent value="turnos"><TurnosTab dialogState={turnoDialog} setDialog={setTurnoDialog} canEdit={canEdit} /></TabsContent>
        <TabsContent value="novedades"><NovedadesTab canEdit={canEdit} /></TabsContent>
        <TabsContent value="planillas"><PlanillasTab canEdit={canEdit} /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ── Fichada ── */
function FichadaTab({ canEdit }: { canEdit: boolean }) {
  const hoy = hoyArgentina();
  const [fecha, setFecha] = useState(hoy);
  const { data: fichadas, isLoading } = useFichadas(fecha);
  const { data: empleados } = useEmpleados();
  const { data: turnos } = useTurnos();
  const registrar = useRegistrarFichada();

  const [empId, setEmpId] = useState("");
  const [turnoId, setTurnoId] = useState("");

  const activos = (empleados ?? []).filter((e) => e.estado === "Activo");

  const handleFichar = (tipo: "entrada" | "salida") => {
    if (!empId) { toast.error("Seleccioná un empleado"); return; }
    registrar.mutate({ empleado_id: empId, turno_id: turnoId || undefined, tipo }, {
      onSuccess: () => toast.success(tipo === "entrada" ? "Entrada registrada" : "Salida registrada"),
      onError: (err: Error) => toast.error(err.message),
    });
  };

  const { data: asignaciones = [] } = useQuery({
    queryKey: ["asignaciones_turno_all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("asignaciones_turno").select("*");
      if (error) throw error;
      return data;
    },
  });

  // Horario vigente del día (sin el corrimiento de UTC que tomaba el día anterior) y tolerancia del turno
  const computeTardanza = (fichada: any) => {
    if (!fichada.hora_entrada) return null;
    const asig = asignacionVigente(asignaciones, fichada.empleado_id, fichada.fecha);
    if (!asig) return null;
    return minutosTardanza(fichada.fecha, fichada.hora_entrada, asig.hora_entrada, fichada.turno?.tolerancia_minutos ?? 0);
  };

  const computeHorasExtra = (fichada: any) => {
    if (!fichada.hora_entrada || !fichada.hora_salida) return null;
    const asig = asignacionVigente(asignaciones, fichada.empleado_id, fichada.fecha);
    if (!asig) return null;
    return minutosExtra(fichada.fecha, fichada.hora_salida, asig.hora_entrada, asig.hora_salida);
  };

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h3 className="text-sm font-medium mb-4">Registrar Fichada</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div>
              <Label className="text-xs">Empleado</Label>
              <Select value={empId} onValueChange={setEmpId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {activos.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.apellido}, {e.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Turno (opcional)</Label>
              <Select value={turnoId} onValueChange={setTurnoId}>
                <SelectTrigger><SelectValue placeholder="Sin turno" /></SelectTrigger>
                <SelectContent>
                  {(turnos ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => handleFichar("entrada")} disabled={registrar.isPending} className="gap-1.5">
              <LogIn className="h-4 w-4" /> Entrada
            </Button>
            <Button onClick={() => handleFichar("salida")} disabled={registrar.isPending} variant="outline" className="gap-1.5">
              <LogOut className="h-4 w-4" /> Salida
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium">Fichadas del día</h3>
          <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-auto" />
        </div>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (fichadas ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin fichadas para esta fecha.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Empleado</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Turno</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Entrada</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Salida</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Cómo fichó</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Estado</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Tardanza</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Hs Extra</th>
                </tr>
              </thead>
              <tbody>
                {(fichadas ?? []).map((f: any) => {
                  const tardanza = computeTardanza(f);
                  const hsExtra = computeHorasExtra(f);
                  return (
                    <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2">{f.empleado?.apellido}, {f.empleado?.nombre}</td>
                      <td className="px-3 py-2">{f.turno?.nombre ?? "—"}</td>
                      <td className="px-3 py-2 tabular-nums">{f.hora_entrada ? horaCorta(f.hora_entrada) : "—"}</td>
                      <td className="px-3 py-2 tabular-nums">
                        {f.hora_salida ? horaCorta(f.hora_salida) : "—"}
                        {f.hora_salida && f.hora_entrada && new Date(f.hora_salida).toDateString() !== new Date(f.hora_entrada).toDateString() && <span className="ml-1 text-[10px] text-muted-foreground">(+1 día)</span>}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span className="flex items-center gap-1">
                          {f.metodo === "geo" && <MapPin className="h-3 w-3 text-primary" />}
                          {ETIQUETA_METODO[f.metodo] ?? f.metodo ?? "—"}
                          {f.distancia_m != null && (
                            <a href={enlaceMapa(f.latitud, f.longitud)} target="_blank" rel="noreferrer" className="text-muted-foreground hover:underline" title={`Precisión ±${f.precision_m ?? "?"} m`}>
                              · {f.distancia_m} m
                            </a>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          f.estado === "presente" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                        )}>{f.estado}</span>
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {tardanza != null && tardanza > 0 ? (
                          <span className="text-destructive text-xs font-medium">{tardanza} min</span>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {hsExtra != null && hsExtra > 0 ? (
                          <span className="text-success text-xs font-medium">{Math.floor(hsExtra / 60)}h {hsExtra % 60}m</span>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Turnos ── */
function TurnosTab({ dialogState, setDialog, canEdit }: { dialogState: { open: boolean; turno?: any }; setDialog: (s: any) => void; canEdit: boolean }) {
  const { data: turnos, isLoading } = useTurnos();
  const saveTurno = useSaveTurno();
  const deleteTurno = useDeleteTurno();

  const [form, setForm] = useState({ nombre: "", hora_entrada: "08:00", hora_salida: "17:00", tolerancia_minutos: 15 });

  const openEdit = (t: any) => {
    setForm({ nombre: t.nombre, hora_entrada: t.hora_entrada, hora_salida: t.hora_salida, tolerancia_minutos: t.tolerancia_minutos });
    setDialog({ open: true, turno: t });
  };

  const openNew = () => {
    setForm({ nombre: "", hora_entrada: "08:00", hora_salida: "17:00", tolerancia_minutos: 15 });
    setDialog({ open: true });
  };

  const handleSave = () => {
    saveTurno.mutate({ id: dialogState.turno?.id, ...form }, {
      onSuccess: () => { toast.success("Turno guardado"); setDialog({ open: false }); },
      onError: (err: Error) => toast.error(err.message),
    });
  };

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium">Gestión de Turnos</h3>
        {canEdit && <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nuevo Turno</Button>}
      </div>

      <Dialog open={dialogState.open} onOpenChange={(o) => setDialog({ open: o })}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialogState.turno ? "Editar Turno" : "Nuevo Turno"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div><Label className="text-xs">Nombre</Label><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Hora Entrada</Label><Input type="time" value={form.hora_entrada} onChange={(e) => setForm({ ...form, hora_entrada: e.target.value })} /></div>
              <div><Label className="text-xs">Hora Salida</Label><Input type="time" value={form.hora_salida} onChange={(e) => setForm({ ...form, hora_salida: e.target.value })} /></div>
            </div>
            <div><Label className="text-xs">Tolerancia (min)</Label><Input type="number" value={form.tolerancia_minutos} onChange={(e) => setForm({ ...form, tolerancia_minutos: Number(e.target.value) })} /></div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={saveTurno.isPending || !form.nombre}>
              {saveTurno.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (turnos ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin turnos configurados.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Nombre</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Entrada</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Salida</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Tolerancia</th>
                {canEdit && <th className="px-3 py-2 w-20"></th>}
              </tr>
            </thead>
            <tbody>
              {(turnos ?? []).map((t) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2 font-medium">{t.nombre}</td>
                  <td className="px-3 py-2 tabular-nums">{t.hora_entrada}</td>
                  <td className="px-3 py-2 tabular-nums">{t.hora_salida}</td>
                  <td className="px-3 py-2">{t.tolerancia_minutos} min</td>
                  {canEdit && (
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteTurno.mutate(t.id, {
                          onSuccess: () => toast.success("Turno eliminado"),
                          onError: (err: Error) => toast.error(err.message),
                        })}>
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
  );
}

/* ── Novedades ── */
function NovedadesTab({ canEdit }: { canEdit: boolean }) {
  const [mes, setMes] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const { data: novedades, isLoading } = useNovedades(mes);
  const { data: empleados } = useEmpleados();
  const saveNovedad = useSaveNovedad();
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ empleado_id: "", fecha: hoyArgentina(), tipo: "ausencia", descripcion: "" });

  const activos = (empleados ?? []).filter((e) => e.estado === "Activo");

  const handleSave = () => {
    saveNovedad.mutate(form, {
      onSuccess: () => { toast.success("Novedad registrada"); setDialog(false); },
      onError: (err: Error) => toast.error(err.message),
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium">Novedades de Asistencia</h3>
          <div className="flex items-center gap-2">
            <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="w-auto" />
            {canEdit && <Button size="sm" onClick={() => setDialog(true)}><Plus className="h-4 w-4 mr-1" /> Nueva</Button>}
          </div>
        </div>

        <Dialog open={dialog} onOpenChange={setDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Nueva Novedad</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              <div>
                <Label className="text-xs">Empleado</Label>
                <Select value={form.empleado_id} onValueChange={(v) => setForm({ ...form, empleado_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {activos.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.apellido}, {e.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Fecha</Label><Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></div>
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {tiposNovedad.map((t) => (
                        <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label className="text-xs">Descripción</Label><Input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button onClick={handleSave} disabled={saveNovedad.isPending || !form.empleado_id}>
                {saveNovedad.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (novedades ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin novedades para este mes.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Empleado</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Fecha</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Tipo</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Descripción</th>
                </tr>
              </thead>
              <tbody>
                {(novedades ?? []).map((n: any) => (
                  <tr key={n.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2">{n.empleado?.apellido}, {n.empleado?.nombre}</td>
                    <td className="px-3 py-2">{formatoFecha(n.fecha)}</td>
                    <td className="px-3 py-2 capitalize">{n.tipo}</td>
                    <td className="px-3 py-2 text-muted-foreground">{n.descripcion || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Planillas ── */
function PlanillasTab({ canEdit }: { canEdit: boolean }) {
  const { data: empleados } = useEmpleados();
  const queryClient = useQueryClient();
  const activos = (empleados ?? []).filter((e) => e.estado === "Activo");

  const { data: asignaciones = [] } = useQuery({
    queryKey: ["asignaciones_turno_all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("asignaciones_turno").select("*, empleado:empleados(nombre, apellido)");
      if (error) throw error;
      return data;
    },
  });

  const { data: turnos = [] } = useTurnos();

  const [editDialog, setEditDialog] = useState<{ open: boolean; empId?: string }>({ open: false });
  const [editForm, setEditForm] = useState<Record<number, { hora_entrada: string; hora_salida: string }>>({});

  const openEditForEmployee = (empId: string) => {
    const empAsig = asignaciones.filter((a: any) => a.empleado_id === empId);
    const formData: Record<number, { hora_entrada: string; hora_salida: string }> = {};
    for (let d = 0; d <= 6; d++) {
      const existing = empAsig.find((a: any) => a.dia_semana === d);
      formData[d] = existing ? { hora_entrada: existing.hora_entrada, hora_salida: existing.hora_salida } : { hora_entrada: "", hora_salida: "" };
    }
    setEditForm(formData);
    setEditDialog({ open: true, empId });
  };

  const savePlanillaMutation = useMutation({
    mutationFn: async () => {
      const empId = editDialog.empId!;
      await supabase.from("asignaciones_turno").delete().eq("empleado_id", empId);
      const inserts = Object.entries(editForm)
        .filter(([, v]) => v.hora_entrada && v.hora_salida)
        .map(([d, v]) => ({
          empleado_id: empId,
          dia_semana: Number(d),
          hora_entrada: v.hora_entrada,
          hora_salida: v.hora_salida,
        }));
      if (inserts.length > 0) {
        const { error } = await supabase.from("asignaciones_turno").insert(inserts);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Planilla guardada");
      queryClient.invalidateQueries({ queryKey: ["asignaciones_turno_all"] });
      setEditDialog({ open: false });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleImportXLSX = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ab = await file.arrayBuffer();
    const wb = XLSX.read(ab);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(ws);
    let count = 0;
    for (const row of rows) {
      const legajo = String(row["Legajo"] || "").trim();
      const emp = activos.find((e) => e.legajo === legajo);
      if (!emp) continue;
      await supabase.from("asignaciones_turno").delete().eq("empleado_id", emp.id);
      const inserts: any[] = [];
      for (let d = 0; d <= 6; d++) {
        const dayKey = diasSemana[d];
        const val = row[dayKey];
        if (!val) continue;
        const parts = String(val).split("-").map((s: string) => s.trim());
        if (parts.length === 2) {
          inserts.push({ empleado_id: emp.id, dia_semana: d, hora_entrada: parts[0], hora_salida: parts[1] });
        }
      }
      if (inserts.length > 0) {
        await supabase.from("asignaciones_turno").insert(inserts);
        count++;
      }
    }
    toast.success(`Se importaron planillas de ${count} empleados`);
    queryClient.invalidateQueries({ queryKey: ["asignaciones_turno_all"] });
  };

  const fileRef = useRef<HTMLInputElement>(null);

  const handleImportBiometrico = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ab = await file.arrayBuffer();
    const wb = XLSX.read(ab);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
    let imported = 0;
    let notMatched = 0;

    for (const row of rows) {
      const userId = String(row["User ID"] || row["UserID"] || "").trim();
      if (!userId) continue;
      const emp = activos.find((e) => (e as any).codigo_asistencia === userId);
      if (!emp) { notMatched++; continue; }

      const dateStr = String(row["Date"] || "").trim();
      if (!dateStr) continue;

      // Parse date - handle formats like "03/15/2025" or "2025-03-15"
      let fecha: string;
      if (dateStr.includes("/")) {
        const parts = dateStr.split("/");
        fecha = `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
      } else {
        fecha = dateStr.slice(0, 10);
      }

      const p1In = String(row["Period1 In"] || row["P1 In"] || "").trim();
      const p1Out = String(row["Period1 Out"] || row["P1 Out"] || "").trim();

      if (!p1In && !p1Out) continue;

      const horaEntrada = p1In ? `${fecha}T${p1In}:00` : null;
      const horaSalida = p1Out ? `${fecha}T${p1Out}:00` : null;

      await supabase.from("fichadas").insert({
        empleado_id: emp.id,
        fecha,
        hora_entrada: horaEntrada,
        hora_salida: horaSalida,
        estado: "presente",
        observaciones: "Importado desde lector biométrico",
      });
      imported++;
    }

    toast.success(`Importado: ${imported} fichadas. ${notMatched > 0 ? `${notMatched} sin match.` : ""}`);
    queryClient.invalidateQueries({ queryKey: ["fichadas"] });
  };

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium">Planillas de Horario</h3>
        {canEdit && (
          <div className="flex gap-2">
            <label className="inline-flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer">
              <Upload className="h-3 w-3" />Importar Horarios XLSX
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportXLSX} />
            </label>
            <label className="inline-flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer">
              <FileSpreadsheet className="h-3 w-3" />Importar Lector Biométrico
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportBiometrico} />
            </label>
          </div>
        )}
      </div>

      <Dialog open={editDialog.open} onOpenChange={(o) => setEditDialog({ open: o })}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar Planilla Semanal</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {diasSemana.map((dia, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 items-center">
                <span className="text-xs font-medium">{dia}</span>
                <Input type="time" className="h-8 text-xs" value={editForm[i]?.hora_entrada || ""} onChange={(e) => setEditForm({ ...editForm, [i]: { ...editForm[i], hora_entrada: e.target.value } })} />
                <Input type="time" className="h-8 text-xs" value={editForm[i]?.hora_salida || ""} onChange={(e) => setEditForm({ ...editForm, [i]: { ...editForm[i], hora_salida: e.target.value } })} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => savePlanillaMutation.mutate()} disabled={savePlanillaMutation.isPending}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-2 py-2 text-left font-medium text-muted-foreground text-xs">Empleado</th>
              {diasSemana.map((d) => (
                <th key={d} className="px-1 py-2 text-center font-medium text-muted-foreground text-xs">{d.slice(0, 3)}</th>
              ))}
              {canEdit && <th className="px-1 py-2 w-10"></th>}
            </tr>
          </thead>
          <tbody>
            {activos.map((emp) => {
              const empAsig = asignaciones.filter((a: any) => a.empleado_id === emp.id);
              return (
                <tr key={emp.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-2 py-2 font-medium whitespace-nowrap">{emp.apellido}, {emp.nombre}</td>
                  {diasSemana.map((_, d) => {
                    const asig = empAsig.find((a: any) => a.dia_semana === d);
                    return (
                      <td key={d} className="px-1 py-2 text-center text-xs tabular-nums">
                        {asig ? `${asig.hora_entrada.slice(0, 5)}-${asig.hora_salida.slice(0, 5)}` : <span className="text-muted-foreground">—</span>}
                      </td>
                    );
                  })}
                  {canEdit && (
                    <td className="px-1 py-2">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditForEmployee(emp.id)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
