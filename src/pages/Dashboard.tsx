import { Users, TrendingDown, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { useDashboardStats } from "@/hooks/useDashboardStats";

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Vista general del grupo empresario</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} title="Dotación Activa" value={String(stats.activos)} change={`${stats.total} totales`} changeType="neutral" delay={0} />
        <StatCard icon={TrendingDown} title="Rotación (Bajas)" value={`${stats.tasaRotacion}%`} change={`${stats.bajas} baja(s)`} changeType={Number(stats.tasaRotacion) > 5 ? "negative" : "positive"} delay={80} />
        <StatCard icon={Clock} title="En Licencia" value={String(stats.licencia)} change="empleados" changeType="neutral" delay={160} />
        <StatCard icon={AlertTriangle} title="Docs por Vencer" value={String(stats.alertas.length)} change="próximos 30 días" changeType={stats.alertas.length > 0 ? "negative" : "positive"} delay={240} />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Headcount by company */}
        <div className="animate-slide-up rounded-xl border bg-card p-5 shadow-sm" style={{ animationDelay: "300ms" }}>
          <h3 className="text-sm font-medium mb-4">Dotación por Empresa</h3>
          {stats.headcountByCompany.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin datos.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.headcountByCompany} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={100} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 13 }} />
                <Bar dataKey="empleados" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Estado distribution */}
        <div className="animate-slide-up rounded-xl border bg-card p-5 shadow-sm" style={{ animationDelay: "380ms" }}>
          <h3 className="text-sm font-medium mb-4">Distribución por Estado</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={stats.porEstado} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {stats.porEstado.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 13 }} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Seniority */}
        <div className="animate-slide-up rounded-xl border bg-card p-5 shadow-sm" style={{ animationDelay: "460ms" }}>
          <h3 className="text-sm font-medium mb-4">Antigüedad</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.porAntiguedad} margin={{ left: -10, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 13 }} />
              <Bar dataKey="value" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alertas de documentos */}
      {stats.alertas.length > 0 && (
        <div className="animate-slide-up rounded-xl border bg-card p-5 shadow-sm" style={{ animationDelay: "540ms" }}>
          <h3 className="text-sm font-medium mb-3">Documentos próximos a vencer</h3>
          <div className="space-y-2">
            {stats.alertas.map((doc: any) => (
              <div key={doc.id} className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-2.5 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
                <span>{doc.nombre_archivo} — vence {new Date(doc.fecha_vencimiento).toLocaleDateString("es-AR")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
