import { Users, TrendingDown, Clock, DollarSign, Building2, AlertTriangle } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";

const headcountByCompany = [
  { name: "Logística SA", empleados: 245 },
  { name: "Comercial SRL", empleados: 128 },
  { name: "Industrial SA", empleados: 312 },
  { name: "Servicios SAS", empleados: 87 },
];

const rotacionMensual = [
  { mes: "Oct", tasa: 3.2 },
  { mes: "Nov", tasa: 2.8 },
  { mes: "Dic", tasa: 4.1 },
  { mes: "Ene", tasa: 3.5 },
  { mes: "Feb", tasa: 2.9 },
  { mes: "Mar", tasa: 3.1 },
];

const ausentismoPorTipo = [
  { name: "Enfermedad", value: 42, color: "hsl(var(--chart-1))" },
  { name: "Licencia", value: 28, color: "hsl(var(--chart-2))" },
  { name: "Injustificada", value: 12, color: "hsl(var(--chart-5))" },
  { name: "Otros", value: 18, color: "hsl(var(--chart-3))" },
];

const alertas = [
  { text: "12 carnets de conducir vencen en 15 días", type: "warning" as const },
  { text: "Paritaria Comercio: nuevos básicos desde 01/04", type: "info" as const },
  { text: "3 empleados sin CUIL registrado", type: "error" as const },
  { text: "Cierre de novedades marzo: faltan 8 sectores", type: "warning" as const },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Vista general del grupo empresario — Marzo 2026</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} title="Dotación Total" value="772" change="+14 vs. mes anterior" changeType="positive" delay={0} />
        <StatCard icon={TrendingDown} title="Rotación Mensual" value="3.1%" change="-0.4pp vs. feb" changeType="positive" delay={80} />
        <StatCard icon={Clock} title="Ausentismo" value="4.8%" change="+0.3pp vs. feb" changeType="negative" delay={160} />
        <StatCard icon={DollarSign} title="Costo Laboral" value="$148.2M" change="+6.2% vs. feb" changeType="neutral" delay={240} />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Headcount by company */}
        <div className="animate-slide-up rounded-xl border bg-card p-5 shadow-sm lg:col-span-1" style={{ animationDelay: "300ms" }}>
          <h3 className="text-sm font-medium mb-4">Dotación por Empresa</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={headcountByCompany} layout="vertical" margin={{ left: 0, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={100} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 13 }} />
              <Bar dataKey="empleados" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Rotation trend */}
        <div className="animate-slide-up rounded-xl border bg-card p-5 shadow-sm lg:col-span-1" style={{ animationDelay: "380ms" }}>
          <h3 className="text-sm font-medium mb-4">Tendencia de Rotación</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={rotacionMensual} margin={{ left: -10, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} unit="%" />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 13 }} />
              <Line type="monotone" dataKey="tasa" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--accent))" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Absenteeism pie */}
        <div className="animate-slide-up rounded-xl border bg-card p-5 shadow-sm lg:col-span-1" style={{ animationDelay: "460ms" }}>
          <h3 className="text-sm font-medium mb-4">Ausentismo por Tipo</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={ausentismoPorTipo} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {ausentismoPorTipo.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 13 }} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alerts */}
      <div className="animate-slide-up rounded-xl border bg-card p-5 shadow-sm" style={{ animationDelay: "540ms" }}>
        <h3 className="text-sm font-medium mb-3">Alertas y Novedades</h3>
        <div className="space-y-2">
          {alertas.map((a, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-2.5 text-sm">
              <AlertTriangle className={`h-4 w-4 shrink-0 ${
                a.type === "error" ? "text-destructive" : a.type === "warning" ? "text-warning" : "text-info"
              }`} />
              <span>{a.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
