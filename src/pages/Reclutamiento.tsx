import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useVacantes, useAllCandidatos, useSaveVacante, useSaveCandidato, useUpdateCandidatoEstado } from "@/hooks/useReclutamiento";
import { useEmpresas } from "@/hooks/useEmpleados";
import { Plus, Briefcase, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatoFecha } from "@/lib/vacacionesCalendario";

const ESTADO_VACANTE_LABEL: Record<string, string> = { abierta: "Abierta", cerrada: "Cerrada", pausada: "Pausada" };
const ESTADO_VACANTE_BADGE: Record<string, string> = { abierta: "bg-success/15 text-success", cerrada: "bg-muted text-muted-foreground", pausada: "bg-warning/15 text-warning" };

const PIPELINE_COLS = [
  { key: "postulado", label: "Postulados", color: "border-t-blue-400" },
  { key: "entrevista", label: "Entrevista", color: "border-t-amber-400" },
  { key: "evaluacion", label: "Evaluación", color: "border-t-purple-400" },
  { key: "oferta", label: "Oferta", color: "border-t-cyan-400" },
  { key: "contratado", label: "Contratado", color: "border-t-green-400" },
  { key: "descartado", label: "Descartado", color: "border-t-red-400" },
];

export default function Reclutamiento() {
  const { data: vacantes = [], isLoading: loadV } = useVacantes();
  const { data: candidatos = [], isLoading: loadC } = useAllCandidatos();
  const { data: empresas = [] } = useEmpresas();
  const saveVacante = useSaveVacante();
  const saveCandidato = useSaveCandidato();
  const updateEstado = useUpdateCandidatoEstado();

  const [vacDialog, setVacDialog] = useState<{ open: boolean; vac?: any }>({ open: false });
  const [candDialog, setCandDialog] = useState<{ open: boolean; vacanteId?: string }>({ open: false });
  const [vacForm, setVacForm] = useState({ titulo: "", descripcion: "", requisitos: "", empresa_id: "", estado: "abierta" });
  const [candForm, setCandForm] = useState({ nombre: "", email: "", telefono: "", notas: "" });

  const openVacDialog = (vac?: any) => {
    setVacForm({
      titulo: vac?.titulo ?? "", descripcion: vac?.descripcion ?? "", requisitos: vac?.requisitos ?? "",
      empresa_id: vac?.empresa_id ?? "", estado: vac?.estado ?? "abierta",
    });
    setVacDialog({ open: true, vac });
  };

  const handleSaveVacante = () => {
    if (!vacForm.titulo || !vacForm.empresa_id) { toast.error("Completá título y empresa"); return; }
    saveVacante.mutate(
      { id: vacDialog.vac?.id, ...vacForm, estado: vacForm.estado as any },
      { onSuccess: () => { setVacDialog({ open: false }); toast.success("Vacante guardada"); }, onError: (e: Error) => toast.error(e.message) }
    );
  };

  const handleSaveCandidato = () => {
    if (!candForm.nombre || !candDialog.vacanteId) { toast.error("Completá el nombre"); return; }
    saveCandidato.mutate(
      { vacante_id: candDialog.vacanteId, ...candForm, estado: "postulado" as any },
      { onSuccess: () => { setCandDialog({ open: false }); setCandForm({ nombre: "", email: "", telefono: "", notas: "" }); toast.success("Candidato agregado"); }, onError: (e: Error) => toast.error(e.message) }
    );
  };

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-semibold">Reclutamiento</h1>
        <p className="text-sm text-muted-foreground mt-1">Gestión de vacantes y pipeline de candidatos</p>
      </div>

      <Tabs defaultValue="vacantes" className="animate-slide-up">
        <TabsList>
          <TabsTrigger value="vacantes"><Briefcase className="h-3.5 w-3.5 mr-1" />Vacantes</TabsTrigger>
          <TabsTrigger value="pipeline"><Users className="h-3.5 w-3.5 mr-1" />Pipeline</TabsTrigger>
        </TabsList>

        <TabsContent value="vacantes">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">Vacantes</h3>
              <Button size="sm" onClick={() => openVacDialog()}><Plus className="h-4 w-4 mr-1" />Nueva Vacante</Button>
            </div>
            {loadV ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> : vacantes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay vacantes cargadas.</p>
            ) : (
              <div className="space-y-2">
                {vacantes.map((v: any) => (
                  <div key={v.id} className="flex items-center gap-3 rounded-lg border px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{v.titulo}</p>
                      <p className="text-xs text-muted-foreground">{(v.empresa as any)?.nombre} · {formatoFecha(v.fecha_publicacion)}</p>
                    </div>
                    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", ESTADO_VACANTE_BADGE[v.estado])}>
                      {ESTADO_VACANTE_LABEL[v.estado]}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => openVacDialog(v)}>Editar</Button>
                    <Button variant="outline" size="sm" onClick={() => setCandDialog({ open: true, vacanteId: v.id })}>
                      <Plus className="h-3 w-3 mr-1" />Candidato
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="pipeline">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-medium mb-4">Pipeline de Candidatos</h3>
            {loadC ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {PIPELINE_COLS.map((col) => {
                  const items = candidatos.filter((c: any) => c.estado === col.key);
                  return (
                    <div key={col.key} className={cn("rounded-lg border border-t-4 p-3 min-h-[200px]", col.color)}>
                      <p className="text-xs font-semibold mb-2">{col.label} ({items.length})</p>
                      <div className="space-y-2">
                        {items.map((c: any) => (
                          <div key={c.id} className="rounded-md border bg-background p-2 text-xs">
                            <p className="font-medium truncate">{c.nombre}</p>
                            <p className="text-muted-foreground truncate">{(c.vacante as any)?.titulo}</p>
                            <Select value={c.estado} onValueChange={(v) => updateEstado.mutate({ id: c.id, estado: v })}>
                              <SelectTrigger className="h-6 text-[10px] mt-1"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {PIPELINE_COLS.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Vacante Dialog */}
      <Dialog open={vacDialog.open} onOpenChange={(o) => setVacDialog({ open: o })}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{vacDialog.vac ? "Editar Vacante" : "Nueva Vacante"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Título *</Label><Input value={vacForm.titulo} onChange={(e) => setVacForm({ ...vacForm, titulo: e.target.value })} /></div>
            <div>
              <Label className="text-xs">Empresa *</Label>
              <Select value={vacForm.empresa_id} onValueChange={(v) => setVacForm({ ...vacForm, empresa_id: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>{empresas.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Descripción</Label><Textarea value={vacForm.descripcion} onChange={(e) => setVacForm({ ...vacForm, descripcion: e.target.value })} rows={3} /></div>
            <div><Label className="text-xs">Requisitos</Label><Textarea value={vacForm.requisitos} onChange={(e) => setVacForm({ ...vacForm, requisitos: e.target.value })} rows={2} /></div>
            <div>
              <Label className="text-xs">Estado</Label>
              <Select value={vacForm.estado} onValueChange={(v) => setVacForm({ ...vacForm, estado: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="abierta">Abierta</SelectItem>
                  <SelectItem value="pausada">Pausada</SelectItem>
                  <SelectItem value="cerrada">Cerrada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVacDialog({ open: false })}>Cancelar</Button>
            <Button onClick={handleSaveVacante} disabled={saveVacante.isPending}>{saveVacante.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}{vacDialog.vac ? "Guardar" : "Crear"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Candidato Dialog */}
      <Dialog open={candDialog.open} onOpenChange={(o) => setCandDialog({ open: o })}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Agregar Candidato</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Nombre *</Label><Input value={candForm.nombre} onChange={(e) => setCandForm({ ...candForm, nombre: e.target.value })} /></div>
            <div><Label className="text-xs">Email</Label><Input type="email" value={candForm.email} onChange={(e) => setCandForm({ ...candForm, email: e.target.value })} /></div>
            <div><Label className="text-xs">Teléfono</Label><Input value={candForm.telefono} onChange={(e) => setCandForm({ ...candForm, telefono: e.target.value })} /></div>
            <div><Label className="text-xs">Notas</Label><Textarea value={candForm.notas} onChange={(e) => setCandForm({ ...candForm, notas: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCandDialog({ open: false })}>Cancelar</Button>
            <Button onClick={handleSaveCandidato} disabled={saveCandidato.isPending}>{saveCandidato.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Agregar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
