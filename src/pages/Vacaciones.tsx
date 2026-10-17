import { useState, useMemo } from "react";
import { useEmpresas, useEmpleados } from "@/hooks/useEmpleados";
import {
  useVacacionesConfig, useSaveVacacionesConfig, useDeleteVacacionesConfig,
  useSolicitudesVacaciones, useUpdateSolicitudVacaciones, calcDiasCorrespondientes,
} from "@/hooks/useVacaciones";
import { useCanEdit } from "@/hooks/useCanEdit";
import { useConfigGrupo } from "@/hooks/useConfigGrupo";
import { sendNotificationEmailIfEnabled } from "@/lib/sendNotificationEmail";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, Check, X, CalendarDays, FileDown, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import CalendarioVacaciones from "@/components/vacaciones/CalendarioVacaciones";
import { fechaLocal, formatoFecha, type SolicitudCal } from "@/lib/vacacionesCalendario";

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
            <CalendarioTab empresaId={empresaId} empresas={empresas} />
          </TabsContent>

          <TabsContent value="configuracion">
            <ConfiguracionTab empresaId={empresaId} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

/* ── Solicitudes ── */
function SolicitudesTab({ empresaId }: { empresaId: string }) {
  const { data: solicitudes = [], isLoading } = useSolicitudesVacaciones(empresaId);
  const updateSolicitud = useUpdateSolicitudVacaciones();
  const { canEdit } = useCanEdit("vacaciones");
  const { data: configGrupo } = useConfigGrupo();

  const filtered = solicitudes.filter((s: any) => s.empleado?.empresa_id === empresaId);

  const handleEstado = async (sol: any, estado: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    updateSolicitud.mutate({ id: sol.id, estado, aprobado_por: user?.id }, {
      onSuccess: async () => {
        toast.success(`Solicitud ${estado}`);
        // Send email notification if enabled
        const empleadoEmail = sol.empleado?.email;
        if (empleadoEmail) {
          const estadoLabel = estado === "aprobada" ? "aprobadas ✅" : "rechazadas ❌";
          const fechaDesde = formatoFecha(sol.fecha_desde);
          const fechaHasta = formatoFecha(sol.fecha_hasta);
          await sendNotificationEmailIfEnabled(configGrupo, {
            to: empleadoEmail,
            subject: `Vacaciones ${estado}`,
            html: `<h2>Vacaciones ${estadoLabel}</h2><p>Hola ${sol.empleado?.nombre},</p><p>Tu solicitud de vacaciones del ${fechaDesde} al ${fechaHasta} ha sido <strong>${estado}</strong>.</p><p>Saludos,<br/>RRHH</p>`,
          });
        }
      },
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
                  {formatoFecha(sol.fecha_desde)} al {formatoFecha(sol.fecha_hasta)}
                  {" · "}{sol.dias_solicitados} días · Período {sol.periodo_anual}
                </p>
                {sol.observaciones && <p className="text-xs text-muted-foreground mt-0.5">{sol.observaciones}</p>}
              </div>
              <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", estadoBadge[sol.estado])}>
                {sol.estado}
              </span>
              {sol.estado === "pendiente" && canEdit && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={() => handleEstado(sol, "aprobada")} title="Aprobar">
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleEstado(sol, "rechazada")} title="Rechazar">
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

/* ── Calendario ── */
function CalendarioTab({ empresaId, empresas }: { empresaId: string; empresas: any[] }) {
  const { data: solicitudes = [] } = useSolicitudesVacaciones(empresaId);
  const delaEmpresa = useMemo(
    () => solicitudes.filter((s: any) => s.empleado?.empresa_id === empresaId) as SolicitudCal[],
    [solicitudes, empresaId]
  );
  const empresa = empresas.find((e: any) => e.id === empresaId);

  // Exporta las solicitudes que tocan el mes elegido
  const delMes = (mes: string) => {
    const [y, m] = mes.split("-").map(Number);
    const inicio = new Date(y, m - 1, 1), fin = new Date(y, m, 0);
    return delaEmpresa.filter((s) => fechaLocal(s.fecha_hasta) >= inicio && fechaLocal(s.fecha_desde) <= fin);
  };

  const exportPDF = (mes: string) => {
    const [y, m] = mes.split("-").map(Number);
    const monthName = new Date(y, m - 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Vacaciones — ${empresa?.nombre || ""}`, 14, 18);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Período: ${monthName}`, 14, 26);

    autoTable(doc, {
      startY: 32,
      head: [["Empleado", "Legajo", "Sucursal", "Desde", "Hasta", "Días", "Estado"]],
      body: delMes(mes).map((s: any) => [
        `${s.empleado?.apellido}, ${s.empleado?.nombre}`,
        s.empleado?.legajo || "",
        s.empleado?.sucursal?.nombre || "",
        formatoFecha(s.fecha_desde),
        formatoFecha(s.fecha_hasta),
        String(s.dias_solicitados),
        s.estado,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [38, 166, 154] },
    });

    doc.save(`vacaciones_${empresa?.nombre || "empresa"}_${mes}.pdf`);
    toast.success("PDF exportado");
  };

  const exportExcel = (mes: string) => {
    const rows = delMes(mes).map((s: any) => ({
      Empleado: `${s.empleado?.apellido}, ${s.empleado?.nombre}`,
      Legajo: s.empleado?.legajo || "",
      Sucursal: s.empleado?.sucursal?.nombre || "",
      Desde: formatoFecha(s.fecha_desde),
      Hasta: formatoFecha(s.fecha_hasta),
      Días: s.dias_solicitados,
      Estado: s.estado,
      Período: s.periodo_anual,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vacaciones");
    XLSX.writeFile(wb, `vacaciones_${empresa?.nombre || "empresa"}_${mes}.xlsx`);
    toast.success("Excel exportado");
  };

  return <CalendarioVacaciones solicitudes={delaEmpresa} onExportarPDF={exportPDF} onExportarExcel={exportExcel} />;
}

function ConfiguracionTab({ empresaId }: { empresaId: string }) {
  const { data: configs = [], isLoading } = useVacacionesConfig(empresaId);
  const saveConfig = useSaveVacacionesConfig();
  const deleteConfig = useDeleteVacacionesConfig();
  const { canEdit } = useCanEdit("vacaciones");
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
              {canEdit && <th className="px-3 py-2 w-10"></th>}
            </tr>
          </thead>
          <tbody>
            {configs.map((c: any) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="px-3 py-2">{c.anios_antiguedad_min}</td>
                <td className="px-3 py-2">{c.anios_antiguedad_max >= 999 ? "+" : c.anios_antiguedad_max}</td>
                <td className="px-3 py-2 font-medium">{c.dias_correspondientes}</td>
                {canEdit && (
                  <td className="px-3 py-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteConfig.mutate(c.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canEdit && (
        <div className="flex gap-2 items-end">
          <div><Label className="text-xs">Desde</Label><Input type="number" className="w-20 h-8" value={form.min} onChange={(e) => setForm({ ...form, min: e.target.value })} /></div>
          <div><Label className="text-xs">Hasta</Label><Input type="number" className="w-20 h-8" value={form.max} onChange={(e) => setForm({ ...form, max: e.target.value })} /></div>
          <div><Label className="text-xs">Días</Label><Input type="number" className="w-20 h-8" value={form.dias} onChange={(e) => setForm({ ...form, dias: e.target.value })} /></div>
          <Button size="sm" onClick={handleAdd}><Plus className="h-3.5 w-3.5 mr-1" />Agregar</Button>
        </div>
      )}
    </div>
  );
}
