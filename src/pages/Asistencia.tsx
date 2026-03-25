import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2, Clock, LogIn, LogOut } from "lucide-react";
import { useTurnos, useSaveTurno, useDeleteTurno, useFichadas, useRegistrarFichada, useNovedades, useSaveNovedad } from "@/hooks/useAsistencia";
import { useEmpleados } from "@/hooks/useEmpleados";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const tiposNovedad = ["ausencia", "tardanza", "licencia", "feriado", "justificado"];

export default function Asistencia() {
  const [turnoDialog, setTurnoDialog] = useState<{ open: boolean; turno?: any }>({ open: false });

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-semibold">Control de Asistencia</h1>
        <p className="text-sm text-muted-foreground mt-1">Fichada, turnos y novedades de asistencia</p>
      </div>

      <Tabs defaultValue="fichada" className="animate-slide-up">
        <TabsList>
          <TabsTrigger value="fichada">Fichada</TabsTrigger>
          <TabsTrigger value="turnos">Turnos</TabsTrigger>
          <TabsTrigger value="novedades">Novedades</TabsTrigger>
        </TabsList>

        <TabsContent value="fichada"><FichadaTab /></TabsContent>
        <TabsContent value="turnos"><TurnosTab dialogState={turnoDialog} setDialog={setTurnoDialog} /></TabsContent>
        <TabsContent value="novedades"><NovedadesTab /></TabsContent>
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
                </tr>
              </thead>
              <tbody>
                {(fichadas ?? []).map((f: any) => (
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
