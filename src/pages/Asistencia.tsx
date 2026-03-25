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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const tiposNovedad = ["ausencia", "tardanza", "licencia", "feriado", "justificado"];
const diasSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function Asistencia() {
  const [turnoDialog, setTurnoDialog] = useState<{ open: boolean; turno?: any }>({ open: false });

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

        <TabsContent value="fichada"><FichadaTab /></TabsContent>
        <TabsContent value="turnos"><TurnosTab dialogState={turnoDialog} setDialog={setTurnoDialog} /></TabsContent>
        <TabsContent value="novedades"><NovedadesTab /></TabsContent>
        <TabsContent value="planillas"><PlanillasTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ── Fichada ── */
function FichadaTab() {
  const hoy = new Date().toISOString().slice(0, 10);
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

  // Load shift assignments for comparison
  const { data: asignaciones = [] } = useQuery({
    queryKey: ["asignaciones_turno_all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("asignaciones_turno").select("*");
      if (error) throw error;
      return data;
    },
  });

  const computeTardanza = (fichada: any) => {
    if (!fichada.hora_entrada) return null;
    const diaSemana = new Date(fichada.fecha).getDay();
    const asig = asignaciones.find((a: any) => a.empleado_id === fichada.empleado_id && a.dia_semana === diaSemana);
    if (!asig) return null;
    const entradaReal = new Date(fichada.hora_entrada);
    const [h, m] = (asig as any).hora_entrada.split(":").map(Number);
    const entradaProgramada = new Date(fichada.fecha + "T" + (asig as any).hora_entrada);
    const diffMin = Math.floor((entradaReal.getTime() - entradaProgramada.getTime()) / 60000);
    return diffMin > 0 ? diffMin : 0;
  };

  const computeHorasExtra = (fichada: any) => {
    if (!fichada.hora_entrada || !fichada.hora_salida) return null;
    const diaSemana = new Date(fichada.fecha).getDay();
    const asig = asignaciones.find((a: any) => a.empleado_id === fichada.empleado_id && a.dia_semana === diaSemana);
    if (!asig) return null;
    const salidaReal = new Date(fichada.hora_salida);
    const salidaProgramada = new Date(fichada.fecha + "T" + (asig as any).hora_salida);
    const diffMin = Math.floor((salidaReal.getTime() - salidaProgramada.getTime()) / 60000);
    return diffMin > 0 ? diffMin : 0;
  };

  return (
    <div className="space-y-4">
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
                      <td className="px-3 py-2 tabular-nums">{f.hora_entrada ? new Date(f.hora_entrada).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                      <td className="px-3 py-2 tabular-nums">{f.hora_salida ? new Date(f.hora_salida).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                      <td className="px-3 py-2">
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          f.estado === "presente" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                        )}>{f.estado}</span>
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        {tardanza != null && tardanza > 0 ? (
                          <span className="text-destructive text-xs font-medium">{tardanza} min</span>
                        ) : tardanza === 0 ? "—" : "—"}
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
function TurnosTab({ dialogState, setDialog }: { dialogState: { open: boolean; turno?: any }; setDialog: (s: any) => void }) {
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
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nuevo Turno</Button>
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
                <th className="px-3 py-2 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {(turnos ?? []).map((t) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2 font-medium">{t.nombre}</td>
                  <td className="px-3 py-2 tabular-nums">{t.hora_entrada}</td>
                  <td className="px-3 py-2 tabular-nums">{t.hora_salida}</td>
                  <td className="px-3 py-2">{t.tolerancia_minutos} min</td>
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
function NovedadesTab() {
  const [mes, setMes] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const { data: novedades, isLoading } = useNovedades(mes);
  const { data: empleados } = useEmpleados();
  const saveNovedad = useSaveNovedad();
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({ empleado_id: "", fecha: new Date().toISOString().slice(0, 10), tipo: "ausencia", descripcion: "" });

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
            <Button size="sm" onClick={() => setDialog(true)}><Plus className="h-4 w-4 mr-1" /> Nueva</Button>
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
          <p className="text-sm text-muted-foreground">Sin novedades para este período.</p>
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
                    <td className="px-3 py-2 tabular-nums">{new Date(n.fecha).toLocaleDateString("es-AR")}</td>
                    <td className="px-3 py-2">
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        n.tipo === "ausencia" ? "bg-destructive/15 text-destructive" :
                        n.tipo === "tardanza" ? "bg-warning/15 text-warning" :
                        "bg-info/15 text-info"
                      )}>{n.tipo}</span>
                    </td>
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

/* ── Planillas Excel ── */
function PlanillasTab() {
  const { data: empleados = [] } = useEmpleados();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<any[] | null>(null);
  const [vigente, setVigente] = useState(new Date().toISOString().slice(0, 10));

  const { data: asignaciones = [], isLoading } = useQuery({
    queryKey: ["asignaciones_turno"],
    queryFn: async () => {
      const { data, error } = await supabase.from("asignaciones_turno").select("*, empleado:empleados(id, nombre, apellido, legajo)").order("empleado_id");
      if (error) throw error;
      return data;
    },
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);
      // Expected columns: legajo, lunes_entrada, lunes_salida, martes_entrada, martes_salida...
      const parsed: any[] = [];
      const dayMap: Record<string, number> = { lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6, domingo: 0 };

      rows.forEach((row) => {
        const legajo = String(row.legajo || row.Legajo || "").trim();
        const emp = empleados.find((e) => e.legajo === legajo);
        if (!emp) return;
        Object.entries(dayMap).forEach(([dia, num]) => {
          const entrada = row[`${dia}_entrada`] || row[`${dia.charAt(0).toUpperCase() + dia.slice(1)}_Entrada`];
          const salida = row[`${dia}_salida`] || row[`${dia.charAt(0).toUpperCase() + dia.slice(1)}_Salida`];
          if (entrada && salida) {
            parsed.push({ empleado_id: emp.id, legajo, nombre: `${emp.apellido}, ${emp.nombre}`, dia_semana: num, dia_nombre: diasSemana[num], hora_entrada: String(entrada), hora_salida: String(salida) });
          }
        });
      });
      setPreview(parsed);
    };
    reader.readAsBinaryString(file);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!preview?.length) return;
      // Delete existing for these employees
      const empIds = [...new Set(preview.map((p) => p.empleado_id))];
      for (const eid of empIds) {
        await supabase.from("asignaciones_turno").delete().eq("empleado_id", eid);
      }
      // Insert new
      const inserts = preview.map((p) => ({
        empleado_id: p.empleado_id,
        dia_semana: p.dia_semana,
        hora_entrada: p.hora_entrada,
        hora_salida: p.hora_salida,
        vigente_desde: vigente,
      }));
      const { error } = await supabase.from("asignaciones_turno").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Planilla importada correctamente");
      setPreview(null);
      qc.invalidateQueries({ queryKey: ["asignaciones_turno"] });
      if (fileRef.current) fileRef.current.value = "";
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Group asignaciones by employee
  const grouped = asignaciones.reduce((acc: any, a: any) => {
    const key = a.empleado_id;
    if (!acc[key]) acc[key] = { empleado: a.empleado, dias: [] };
    acc[key].dias.push(a);
    return acc;
  }, {} as Record<string, any>);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium">Carga de Planilla de Horarios</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Subí un archivo Excel con columnas: legajo, lunes_entrada, lunes_salida, martes_entrada, martes_salida, etc.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input type="date" value={vigente} onChange={(e) => setVigente(e.target.value)} className="w-auto h-8 text-xs" />
            <label className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline cursor-pointer">
              <Upload className="h-4 w-4" />Subir Excel
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
            </label>
          </div>
        </div>

        {preview && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">{preview.length} asignaciones encontradas — Preview:</p>
            <div className="overflow-x-auto max-h-64">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-2 py-1.5 text-left">Legajo</th>
                    <th className="px-2 py-1.5 text-left">Empleado</th>
                    <th className="px-2 py-1.5 text-left">Día</th>
                    <th className="px-2 py-1.5 text-left">Entrada</th>
                    <th className="px-2 py-1.5 text-left">Salida</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 50).map((p, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-2 py-1.5 font-mono">{p.legajo}</td>
                      <td className="px-2 py-1.5">{p.nombre}</td>
                      <td className="px-2 py-1.5">{p.dia_nombre}</td>
                      <td className="px-2 py-1.5 tabular-nums">{p.hora_entrada}</td>
                      <td className="px-2 py-1.5 tabular-nums">{p.hora_salida}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />}
                Confirmar Importación
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = ""; }}>Cancelar</Button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="text-sm font-medium mb-4">Asignaciones de Turno Vigentes</h3>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : Object.keys(grouped).length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin asignaciones. Importá una planilla Excel para comenzar.</p>
        ) : (
          <div className="space-y-3">
            {Object.values(grouped).map((g: any) => (
              <div key={g.empleado?.id} className="rounded-lg border px-4 py-3">
                <p className="text-sm font-medium">{g.empleado?.apellido}, {g.empleado?.nombre} <span className="text-muted-foreground font-mono text-xs ml-1">#{g.empleado?.legajo}</span></p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {g.dias.sort((a: any, b: any) => a.dia_semana - b.dia_semana).map((d: any) => (
                    <span key={d.id} className="text-xs bg-muted px-2 py-1 rounded">
                      {diasSemana[d.dia_semana]}: {d.hora_entrada}–{d.hora_salida}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
