import { useState, useMemo } from "react";
import { useEmpresas, useEmpleados } from "@/hooks/useEmpleados";
import {
  useVacacionesConfig, useSaveVacacionesConfig, useDeleteVacacionesConfig,
  useSolicitudesVacaciones, useUpdateSolicitudVacaciones, calcDiasCorrespondientes,
} from "@/hooks/useVacaciones";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, Check, X, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const estadoBadge: Record<string, string> = {
  pendiente: "bg-warning/15 text-warning",
  aprobada: "bg-success/15 text-success",
  rechazada: "bg-destructive/15 text-destructive",
  cancelada: "bg-muted text-muted-foreground",
};

export default function Vacaciones() {
  const { data: empresas = [] } = useEmpresas();
  const [empresaId, setEmpresaId] = useState("");

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-semibold">Gestión de Vacaciones</h1>
        <p className="text-sm text-muted-foreground mt-1">Configuración por empresa, calendario y aprobación de solicitudes</p>
      </div>

      <div className="max-w-xs">
        <Label className="text-xs">Empresa</Label>
        <Select value={empresaId} onValueChange={setEmpresaId}>
          <SelectTrigger><SelectValue placeholder="Seleccionar empresa..." /></SelectTrigger>
          <SelectContent>
            {empresas.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {empresaId && (
        <Tabs defaultValue="solicitudes" className="animate-slide-up">
          <TabsList>
            <TabsTrigger value="solicitudes">Solicitudes</TabsTrigger>
            <TabsTrigger value="calendario">Calendario</TabsTrigger>
            <TabsTrigger value="configuracion">Configuración</TabsTrigger>
          </TabsList>

          <TabsContent value="solicitudes">
            <SolicitudesTab empresaId={empresaId} />
          </TabsContent>

          <TabsContent value="calendario">
            <CalendarioTab empresaId={empresaId} />
          </TabsContent>

          <TabsContent value="configuracion">
            <ConfiguracionTab empresaId={empresaId} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function SolicitudesTab({ empresaId }: { empresaId: string }) {
  const { data: solicitudes = [], isLoading } = useSolicitudesVacaciones(empresaId);
  const updateSolicitud = useUpdateSolicitudVacaciones();

  const filtered = solicitudes.filter((s: any) => s.empleado?.empresa_id === empresaId);

  const handleEstado = async (id: string, estado: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    updateSolicitud.mutate({ id, estado, aprobado_por: user?.id }, {
      onSuccess: () => toast.success(`Solicitud ${estado}`),
    });
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <h3 className="text-sm font-medium mb-4">Solicitudes de Vacaciones</h3>
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin solicitudes para esta empresa.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((sol: any) => (
            <div key={sol.id} className="flex items-center gap-3 rounded-lg border px-4 py-3 hover:bg-muted/30 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{sol.empleado?.apellido}, {sol.empleado?.nombre} ({sol.empleado?.legajo})</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(sol.fecha_desde).toLocaleDateString("es-AR")} al {new Date(sol.fecha_hasta).toLocaleDateString("es-AR")}
                  {" · "}{sol.dias_solicitados} días · Período {sol.periodo_anual}
                </p>
                {sol.observaciones && <p className="text-xs text-muted-foreground mt-0.5">{sol.observaciones}</p>}
              </div>
              <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", estadoBadge[sol.estado])}>
                {sol.estado}
              </span>
              {sol.estado === "pendiente" && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={() => handleEstado(sol.id, "aprobada")} title="Aprobar">
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleEstado(sol.id, "rechazada")} title="Rechazar">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CalendarioTab({ empresaId }: { empresaId: string }) {
  const { data: solicitudes = [] } = useSolicitudesVacaciones(empresaId);
  const [mes, setMes] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const aprobadas = solicitudes.filter((s: any) => s.estado === "aprobada" && s.empleado?.empresa_id === empresaId);

  const year = parseInt(mes.split("-")[0]);
  const month = parseInt(mes.split("-")[1]) - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const vacByDay = useMemo(() => {
    const map = new Map<number, any[]>();
    for (const sol of aprobadas) {
      const desde = new Date(sol.fecha_desde);
      const hasta = new Date(sol.fecha_hasta);
      for (let d = new Date(desde); d <= hasta; d.setDate(d.getDate() + 1)) {
        if (d.getMonth() === month && d.getFullYear() === year) {
          const day = d.getDate();
          if (!map.has(day)) map.set(day, []);
          map.get(day)!.push(sol);
        }
      }
    }
    return map;
  }, [aprobadas, month, year]);

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium flex items-center gap-2"><CalendarDays className="h-4 w-4" />Calendario de Vacaciones</h3>
        <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="w-40 h-8 text-xs" />
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
          <div key={d} className="text-xs font-medium text-muted-foreground py-1">{d}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const vacs = vacByDay.get(day) || [];
          const hasVac = vacs.length > 0;
          return (
            <div key={day} className={cn(
              "rounded-md p-1 min-h-[40px] text-xs border",
              hasVac ? "bg-primary/10 border-primary/30" : "border-transparent"
            )} title={vacs.map((v: any) => `${v.empleado?.apellido}, ${v.empleado?.nombre}`).join("\n")}>
              <span className="font-medium">{day}</span>
              {hasVac && <div className="text-[10px] text-primary font-medium mt-0.5">{vacs.length} emp.</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConfiguracionTab({ empresaId }: { empresaId: string }) {
  const { data: configs = [], isLoading } = useVacacionesConfig(empresaId);
  const saveConfig = useSaveVacacionesConfig();
  const deleteConfig = useDeleteVacacionesConfig();
  const [form, setForm] = useState({ min: "0", max: "5", dias: "14" });

  const handleAdd = () => {
    saveConfig.mutate({
      empresa_id: empresaId,
      anios_antiguedad_min: parseInt(form.min),
      anios_antiguedad_max: parseInt(form.max),
      dias_correspondientes: parseInt(form.dias),
    }, {
      onSuccess: () => {
        toast.success("Rango agregado");
        setForm({ min: "0", max: "5", dias: "14" });
      },
    });
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
      <h3 className="text-sm font-medium">Días de vacaciones por antigüedad (LCT)</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Desde (años)</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Hasta (años)</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground text-xs">Días</th>
              <th className="px-3 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {configs.map((c: any) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="px-3 py-2">{c.anios_antiguedad_min}</td>
                <td className="px-3 py-2">{c.anios_antiguedad_max >= 999 ? "+" : c.anios_antiguedad_max}</td>
                <td className="px-3 py-2 font-medium">{c.dias_correspondientes}</td>
                <td className="px-3 py-2">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteConfig.mutate(c.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 items-end">
        <div><Label className="text-xs">Desde</Label><Input type="number" className="w-20 h-8" value={form.min} onChange={(e) => setForm({ ...form, min: e.target.value })} /></div>
        <div><Label className="text-xs">Hasta</Label><Input type="number" className="w-20 h-8" value={form.max} onChange={(e) => setForm({ ...form, max: e.target.value })} /></div>
        <div><Label className="text-xs">Días</Label><Input type="number" className="w-20 h-8" value={form.dias} onChange={(e) => setForm({ ...form, dias: e.target.value })} /></div>
        <Button size="sm" onClick={handleAdd}><Plus className="h-3.5 w-3.5 mr-1" />Agregar</Button>
      </div>
    </div>
  );
}
