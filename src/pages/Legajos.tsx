import { useState } from "react";
import { useEmpleados, useEmpresas } from "@/hooks/useEmpleados";
import { Search, Filter, ChevronRight, Loader2, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import EmpleadoFormDialog from "@/components/EmpleadoFormDialog";

const estadoBadge: Record<string, string> = {
  Activo: "bg-success/15 text-success",
  Licencia: "bg-warning/15 text-warning",
  Baja: "bg-destructive/15 text-destructive",
};

export default function Legajos() {
  const [search, setSearch] = useState("");
  const [filterEmpresa, setFilterEmpresa] = useState("Todas");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: empleados, isLoading } = useEmpleados();
  const { data: empresas } = useEmpresas();

  const empresaOptions = ["Todas", ...(empresas?.map((e) => e.nombre) ?? [])];

  const filtered = (empleados ?? []).filter((e) => {
    const matchSearch = `${e.nombre} ${e.apellido} ${e.legajo} ${e.dni}`.toLowerCase().includes(search.toLowerCase());
    const matchEmpresa = filterEmpresa === "Todas" || e.empresa?.nombre === filterEmpresa;
    return matchSearch && matchEmpresa;
  });

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-semibold">Legajos Digitales</h1>
        <p className="text-sm text-muted-foreground mt-1">Gestión centralizada de legajos del personal</p>
      </div>

      {/* Filters */}
      <div className="animate-slide-up flex flex-col sm:flex-row gap-3" style={{ animationDelay: "100ms" }}>
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 flex-1 max-w-md">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nombre, legajo o DNI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm outline-none placeholder:text-muted-foreground w-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={filterEmpresa}
            onChange={(e) => setFilterEmpresa(e.target.value)}
            className="rounded-lg border bg-card px-3 py-2 text-sm outline-none"
          >
            {empresaOptions.map((emp) => (
              <option key={emp} value={emp}>{emp}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Employee Table */}
      <div className="animate-slide-up rounded-xl border bg-card shadow-sm overflow-hidden" style={{ animationDelay: "200ms" }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Empleado</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Legajo</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Empresa</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Puesto</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estado</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => (
                  <tr key={emp.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                          {emp.nombre[0]}{emp.apellido[0]}
                        </div>
                        <div>
                          <p className="font-medium">{emp.apellido}, {emp.nombre}</p>
                          <p className="text-xs text-muted-foreground md:hidden">{emp.legajo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell tabular-nums">{emp.legajo}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">{emp.empresa?.nombre}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">{emp.puesto}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", estadoBadge[emp.estado])}>
                        {emp.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/legajos/${emp.id}`}
                        className="p-1.5 rounded-md hover:bg-muted transition-colors inline-flex"
                      >
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No se encontraron empleados con esos criterios.
          </div>
        )}
      </div>
    </div>
  );
}
