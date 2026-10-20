import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { hoyArgentina, sumarDias } from "@/lib/asistencia";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard_stats"],
    queryFn: async () => {
      const { data: empleados, error } = await supabase
        .from("empleados")
        .select("id, estado, fecha_ingreso, empresa_id, empresa:empresas(nombre)");
      if (error) throw error;

      const hoy = hoyArgentina();
      const { data: docsVencen } = await supabase
        .from("documentos_legajo")
        .select("id, nombre_archivo, fecha_vencimiento, empleado_id")
        .not("fecha_vencimiento", "is", null)
        .lte("fecha_vencimiento", sumarDias(hoy, 30))
        .gte("fecha_vencimiento", hoy);

      const total = empleados.length;
      const activos = empleados.filter((e: any) => e.estado === "Activo").length;
      const licencia = empleados.filter((e: any) => e.estado === "Licencia").length;
      const bajas = empleados.filter((e: any) => e.estado === "Baja").length;
      const tasaRotacion = total > 0 ? ((bajas / total) * 100).toFixed(1) : "0";

      // By company
      const porEmpresa: Record<string, number> = {};
      empleados.filter((e: any) => e.estado === "Activo").forEach((e: any) => {
        const name = (e.empresa as any)?.nombre || "Sin empresa";
        porEmpresa[name] = (porEmpresa[name] || 0) + 1;
      });
      const headcountByCompany = Object.entries(porEmpresa).map(([name, empleados]) => ({ name, empleados }));

      // By estado
      const porEstado = [
        { name: "Activo", value: activos, color: "hsl(var(--chart-1))" },
        { name: "Licencia", value: licencia, color: "hsl(var(--chart-2))" },
        { name: "Baja", value: bajas, color: "hsl(var(--chart-5))" },
      ];

      // By seniority
      const now = new Date();
      const rangos = { "<1 año": 0, "1-3 años": 0, "3-5 años": 0, "5-10 años": 0, "10+ años": 0 };
      empleados.filter((e: any) => e.estado === "Activo").forEach((e: any) => {
        const years = (now.getTime() - new Date(e.fecha_ingreso).getTime()) / (365.25 * 86400000);
        if (years < 1) rangos["<1 año"]++;
        else if (years < 3) rangos["1-3 años"]++;
        else if (years < 5) rangos["3-5 años"]++;
        else if (years < 10) rangos["5-10 años"]++;
        else rangos["10+ años"]++;
      });
      const porAntiguedad = Object.entries(rangos).map(([name, value]) => ({ name, value }));

      return {
        total, activos, licencia, bajas, tasaRotacion,
        headcountByCompany, porEstado, porAntiguedad,
        alertas: docsVencen ?? [],
      };
    },
  });
}
