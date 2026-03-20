import { useLocation } from "react-router-dom";
import { Construction } from "lucide-react";

const moduleNames: Record<string, { title: string; desc: string }> = {
  "/liquidacion": { title: "Liquidación de Haberes", desc: "Motor de liquidación con configurador de conceptos, simulador de recibo y exportaciones legales (Libro de Sueldos Digital, F.931, bancos)." },
  "/autogestion": { title: "Portal de Autogestión", desc: "Portal mobile-first para empleados: recibos, licencias, comunicación interna y credencial digital." },
  "/asistencia": { title: "Control de Asistencia", desc: "Fichada multimodal, gestión de turnos rotativos, monitor de asistencia en tiempo real y cierre de novedades." },
  "/reclutamiento": { title: "Reclutamiento y Onboarding", desc: "Pipeline Kanban de candidatos, multi-posting de vacantes, scorecard de entrevistas y kit de bienvenida digital." },
  "/reportes": { title: "Reportes e Inteligencia de Negocio", desc: "Dashboard ejecutivo con KPIs, análisis de brecha salarial y reportes por empresa, sucursal o CCT." },
};

export default function PlaceholderModule() {
  const { pathname } = useLocation();
  const mod = moduleNames[pathname] || { title: "Módulo", desc: "En desarrollo." };

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="rounded-2xl bg-muted p-5 mb-5">
        <Construction className="h-10 w-10 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-semibold">{mod.title}</h1>
      <p className="text-sm text-muted-foreground mt-2 max-w-md">{mod.desc}</p>
      <p className="text-xs text-muted-foreground mt-6">Este módulo se implementará en próximas iteraciones.</p>
    </div>
  );
}
