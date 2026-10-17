import { Link } from "react-router-dom";
import {
  BarChart3, Briefcase, Building2, Clock, ClipboardList, DollarSign, FileCheck, FileText, Home, LayoutDashboard,
  MessageCircle, Palmtree, QrCode, Settings, ShieldAlert, UserCircle, Vote, FolderOpen, CalendarDays, CheckSquare, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { useNoLeidosTotal } from "@/hooks/useChat";
import { useEncuestasPendientes } from "@/hooks/useEncuestas";
import InstallPWAPrompt from "@/components/InstallPWAPrompt";
import { useSessionUserId } from "@/hooks/useMuro";
import { useTareasPendientes } from "@/hooks/useTareas";

interface App { label: string; to: string; icon: LucideIcon; color: string; roles?: string[]; badge?: number }

const GESTION = ["admin", "usuario", "gerente", "rrhh"];
const CONTADOR = [...GESTION, "contador"];
const PERSONAL = [...GESTION, "empleado"];

/** Pantalla de aplicaciones: todos los módulos como íconos grandes, como en una app del celular. */
export default function Apps() {
  const { data: role } = useUserRole();
  const noLeidos = useNoLeidosTotal();
  const encuestas = useEncuestasPendientes();
  const { data: yo } = useSessionUserId();
  const tareas = useTareasPendientes(yo);

  const secciones: { titulo: string; apps: App[] }[] = [
    {
      titulo: "Para vos",
      apps: [
        { label: "Inicio", to: "/muro", icon: Home, color: "text-primary bg-primary/10" },
        { label: "Mensajes", to: "/mensajes", icon: MessageCircle, color: "text-sky-600 bg-sky-500/10", badge: noLeidos },
        { label: "Encuestas", to: "/encuestas", icon: Vote, color: "text-violet-600 bg-violet-500/10", badge: encuestas },
        { label: "Tareas", to: "/tareas", icon: CheckSquare, color: "text-teal-600 bg-teal-500/10", badge: tareas },
        { label: "Eventos", to: "/eventos", icon: CalendarDays, color: "text-sky-600 bg-sky-500/10" },
        { label: "Fichar", to: "/autogestion?tab=token", icon: QrCode, color: "text-green-600 bg-green-500/10", roles: PERSONAL },
        { label: "Vacaciones", to: "/autogestion?tab=vacaciones", icon: Palmtree, color: "text-orange-600 bg-orange-500/10", roles: PERSONAL },
        { label: "Permisos", to: "/autogestion?tab=permisos", icon: ClipboardList, color: "text-indigo-600 bg-indigo-500/10", roles: PERSONAL },
        { label: "Mis recibos", to: "/autogestion?tab=recibos", icon: DollarSign, color: "text-emerald-600 bg-emerald-500/10", roles: PERSONAL },
        { label: "Documentos", to: "/autogestion?tab=documentos", icon: FolderOpen, color: "text-amber-600 bg-amber-500/10", roles: PERSONAL },
        { label: "Memorándums", to: "/autogestion?tab=memorandums", icon: FileCheck, color: "text-rose-600 bg-rose-500/10", roles: PERSONAL },
        { label: "Sanciones", to: "/autogestion?tab=sanciones", icon: ShieldAlert, color: "text-red-600 bg-red-500/10", roles: PERSONAL },
        { label: "Mi perfil", to: "/autogestion?tab=datos", icon: UserCircle, color: "text-teal-600 bg-teal-500/10", roles: PERSONAL },
      ],
    },
    {
      titulo: "Gestión",
      apps: [
        { label: "Dashboard", to: "/app", icon: LayoutDashboard, color: "text-sky-600 bg-sky-500/10", roles: CONTADOR },
        { label: "Legajos", to: "/legajos", icon: FileText, color: "text-amber-600 bg-amber-500/10", roles: CONTADOR },
        { label: "Asistencia", to: "/asistencia", icon: Clock, color: "text-green-600 bg-green-500/10", roles: CONTADOR },
        { label: "Vacaciones del equipo", to: "/vacaciones", icon: Palmtree, color: "text-orange-600 bg-orange-500/10", roles: CONTADOR },
        { label: "Liquidación", to: "/liquidacion", icon: DollarSign, color: "text-emerald-600 bg-emerald-500/10", roles: CONTADOR },
        { label: "Memorándums", to: "/memorandums", icon: FileCheck, color: "text-rose-600 bg-rose-500/10", roles: GESTION },
        { label: "Reclutamiento", to: "/reclutamiento", icon: Briefcase, color: "text-indigo-600 bg-indigo-500/10", roles: GESTION },
        { label: "Empresas", to: "/empresas", icon: Building2, color: "text-slate-600 bg-slate-500/10", roles: GESTION },
        { label: "Reportes", to: "/reportes", icon: BarChart3, color: "text-fuchsia-600 bg-fuchsia-500/10", roles: CONTADOR },
        { label: "Configuración", to: "/configuracion", icon: Settings, color: "text-zinc-600 bg-zinc-500/10", roles: ["admin"] },
      ],
    },
  ];

  const visibles = secciones
    .map((s) => ({ ...s, apps: s.apps.filter((a) => !a.roles || (!!role && a.roles.includes(role))) }))
    .filter((s) => s.apps.length);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Apps</h1>
      <InstallPWAPrompt />
      {visibles.map((s) => (
        <section key={s.titulo}>
          {visibles.length > 1 && <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{s.titulo}</h2>}
          <ul className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5">
            {s.apps.map((a) => (
              <li key={a.to + a.label}>
                <Link to={a.to} className="group flex flex-col items-center gap-2 text-center">
                  <span className={cn("relative flex h-[72px] w-[72px] items-center justify-center rounded-[22px] shadow-sm ring-1 ring-black/5 transition-transform group-hover:scale-105 group-active:scale-95 bg-card", )}>
                    <span className={cn("flex h-full w-full items-center justify-center rounded-[22px]", a.color)}>
                      <a.icon className="h-8 w-8" strokeWidth={1.8} />
                    </span>
                    {!!a.badge && (
                      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-destructive-foreground">
                        {a.badge > 99 ? "99+" : a.badge}
                      </span>
                    )}
                  </span>
                  <span className="text-[13px] font-medium leading-tight">{a.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
