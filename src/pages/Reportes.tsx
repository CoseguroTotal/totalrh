import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Download, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import * as XLSX from "xlsx";

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

function useReportData() {
  return useQuery({
    queryKey: ["reportes-bi"],
    queryFn: async () => {
      const [empRes, liqRes, fichRes, emprsRes] = await Promise.all([
        supabase.from("empleados").select("id, nombre, apellido, estado, fecha_ingreso, empresa_id, sexo, cct, empresa:empresas(nombre)"),
        supabase.from("liquidaciones").select("id, periodo, neto, sueldo_basico, empleado_id, estado, empresa:empleados(empresa_id, empresa:empresas(nombre))"),
        supabase.from("fichadas").select("id, fecha, estado, empleado_id"),
        supabase.from("empresas").select("id, nombre"),
      ]);
      return {
        empleados: empRes.data ?? [],
        liquidaciones: liqRes.data ?? [],
        fichadas: fichRes.data ?? [],
        empresas: emprsRes.data ?? [],
      };
    },
  });
}

export default function Reportes() {
  const { data, isLoading } = useReportData();
  const [filterEmpresa, setFilterEmpresa] = useState("all");

  const empleados = useMemo(() => {
    if (!data) return [];
    return filterEmpresa === "all" ? data.empleados : data.empleados.filter((e: any) => e.empresa_id === filterEmpresa);
  }, [data, filterEmpresa]);

  const activos = empleados.filter((e: any) => e.estado === "Activo");
  const bajas = empleados.filter((e: any) => e.estado === "Baja");
  const licencia = empleados.filter((e: any) => e.estado === "Licencia");

  // Headcount by company
  const headcountByCompany = useMemo(() => {
    const map: Record<string, number> = {};
    activos.forEach((e: any) => {
      const n = (e.empresa as any)?.nombre || "Sin empresa";
      map[n] = (map[n] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [activos]);

  // Distribution by estado
  const porEstado = [
    { name: "Activo", value: activos.length },
    { name: "Licencia", value: licencia.length },
    { name: "Baja", value: bajas.length },
  ];

  // By sex
  const porSexo = useMemo(() => {
    const map: Record<string, number> = {};
    activos.forEach((e: any) => { const s = e.sexo || "No especificado"; map[s] = (map[s] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [activos]);

  // By seniority
  const porAntiguedad = useMemo(() => {
    const now = new Date();
    const rangos: Record<string, number> = { "<1 año": 0, "1-3 años": 0, "3-5 años": 0, "5-10 años": 0, "10+ años": 0 };
    activos.forEach((e: any) => {
      const y = (now.getTime() - new Date(e.fecha_ingreso).getTime()) / (365.25 * 86400000);
      if (y < 1) rangos["<1 año"]++;
      else if (y < 3) rangos["1-3 años"]++;
      else if (y < 5) rangos["3-5 años"]++;
      else if (y < 10) rangos["5-10 años"]++;
      else rangos["10+ años"]++;
    });
    return Object.entries(rangos).map(([name, value]) => ({ name, value }));
  }, [activos]);

  // Liquidaciones by period
  const liqByPeriod = useMemo(() => {
    if (!data) return [];
    const map: Record<string, number> = {};
    data.liquidaciones.forEach((l: any) => { map[l.periodo] = (map[l.periodo] || 0) + Number(l.neto); });
    return Object.entries(map).sort().slice(-12).map(([periodo, total]) => ({ periodo, total }));
  }, [data]);

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(empleados.map((e: any) => ({
      Legajo: e.legajo, Nombre: e.nombre, Apellido: e.apellido, Estado: e.estado,
      Empresa: (e.empresa as any)?.nombre, "Fecha Ingreso": e.fecha_ingreso, Sexo: e.sexo, CCT: e.cct,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Empleados");
    XLSX.writeFile(wb, "reporte_empleados.xlsx");
  };

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="animate-fade-in flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Reportes BI</h1>
          <p className="text-sm text-muted-foreground mt-1">Indicadores y métricas de gestión de personal</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Select value={filterEmpresa} onValueChange={setFilterEmpresa}>
            <SelectTrigger className="h-9 min-w-0 flex-1 text-xs sm:w-[180px] sm:flex-none"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las empresas</SelectItem>
              {(data?.empresas ?? []).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportExcel}><Download className="h-4 w-4 mr-1" />Exportar Excel</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-slide-up">
        <KPI label="Total empleados" value={empleados.length} />
        <KPI label="Activos" value={activos.length} />
        <KPI label="En licencia" value={licencia.length} />
        <KPI label="Tasa rotación" value={`${empleados.length > 0 ? ((bajas.length / empleados.length) * 100).toFixed(1) : 0}%`} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="Dotación por Empresa">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={headcountByCompany}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis /><Tooltip /><Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} /></BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Distribución por Estado">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart><Pie data={porEstado} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
              {porEstado.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie><Tooltip /></PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Antigüedad">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={porAntiguedad}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis /><Tooltip /><Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} /></BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Distribución por Sexo">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart><Pie data={porSexo} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
              {porSexo.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie><Tooltip /></PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Total Liquidado por Período" className="md:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={liqByPeriod}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="periodo" tick={{ fontSize: 10 }} /><YAxis /><Tooltip formatter={(v: number) => `$${v.toLocaleString("es-AR")}`} /><Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} /></LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function ChartCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border bg-card p-5 shadow-sm ${className ?? ""}`}>
      <h3 className="text-sm font-medium mb-3 flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />{title}</h3>
      {children}
    </div>
  );
}
