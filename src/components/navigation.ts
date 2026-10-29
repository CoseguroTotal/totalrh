import {
  LayoutDashboard, FileText, DollarSign, UserCircle, Clock, Briefcase, BarChart3,
  Settings, FileCheck, Palmtree, Building2, Home, MessageCircle, Vote, CalendarDays, CheckSquare, Users, UserPlus, type LucideIcon,
} from "lucide-react";

export interface ModuloNav {
  title: string;
  url: string;
  icon: LucideIcon;
  /** Descripción corta para el buscador global. */
  desc: string;
  /** Roles que lo ven. Sin definir = todos menos empleado y terminal. */
  roles?: string[];
}

export interface SeccionNav {
  label: string;
  items: ModuloNav[];
}

const GESTION = ["admin", "usuario", "gerente", "rrhh"];
const GESTION_Y_CONTADOR = [...GESTION, "contador"];

export const SECCIONES: SeccionNav[] = [
  {
    label: "Inicio",
    items: [
      { title: "Inicio", url: "/muro", icon: Home, desc: "Muro: novedades, comunicados y cumpleaños", roles: [...GESTION_Y_CONTADOR, "empleado"] },
      { title: "Mensajes", url: "/mensajes", icon: MessageCircle, desc: "Chat interno con fotos, audios y documentos", roles: [...GESTION_Y_CONTADOR, "empleado"] },
      { title: "Grupos", url: "/grupos", icon: Users, desc: "Muro de cada área o equipo", roles: [...GESTION_Y_CONTADOR, "empleado"] },
      { title: "Encuestas", url: "/encuestas", icon: Vote, desc: "Respondé encuestas y mirá resultados", roles: [...GESTION_Y_CONTADOR, "empleado"] },
      { title: "Tareas", url: "/tareas", icon: CheckSquare, desc: "Pendientes propios y asignados", roles: [...GESTION_Y_CONTADOR, "empleado"] },
      { title: "Eventos", url: "/eventos", icon: CalendarDays, desc: "Calendario de eventos y capacitaciones", roles: [...GESTION_Y_CONTADOR, "empleado"] },
      { title: "Dashboard", url: "/app", icon: LayoutDashboard, desc: "Indicadores del grupo", roles: GESTION_Y_CONTADOR },
      { title: "Autogestión", url: "/autogestion", icon: UserCircle, desc: "Mis datos, recibos, vacaciones y fichada", roles: [...GESTION, "empleado"] },
    ],
  },
  {
    label: "Personas",
    items: [
      { title: "Legajos", url: "/legajos", icon: FileText, desc: "Ficha digital de cada empleado", roles: GESTION_Y_CONTADOR },
      { title: "Altas de empleados", url: "/altas", icon: UserPlus, desc: "Enlace de registro y cuentas por aprobar", roles: ["admin", "rrhh"] },
      { title: "Empresas", url: "/empresas", icon: Building2, desc: "Empresas y sucursales del grupo", roles: GESTION },
      { title: "Reclutamiento", url: "/reclutamiento", icon: Briefcase, desc: "Vacantes y candidatos", roles: GESTION },
    ],
  },
  {
    label: "Día a día",
    items: [
      { title: "Asistencia", url: "/asistencia", icon: Clock, desc: "Fichadas, turnos y novedades", roles: GESTION_Y_CONTADOR },
      { title: "Vacaciones", url: "/vacaciones", icon: Palmtree, desc: "Solicitudes y saldos", roles: GESTION_Y_CONTADOR },
      { title: "Memorándums", url: "/memorandums", icon: FileCheck, desc: "Notificaciones formales al personal", roles: GESTION },
    ],
  },
  {
    label: "Sueldos y análisis",
    items: [
      { title: "Liquidación", url: "/liquidacion", icon: DollarSign, desc: "Liquidación de haberes y recibos", roles: GESTION_Y_CONTADOR },
      { title: "Reportes BI", url: "/reportes", icon: BarChart3, desc: "Rotación, ausentismo y costos", roles: GESTION_Y_CONTADOR },
    ],
  },
  {
    label: "Administración",
    items: [
      { title: "Configuración", url: "/configuracion", icon: Settings, desc: "Usuarios, horarios y métodos de fichada", roles: ["admin"] },
    ],
  },
];

export const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  usuario: "Usuario",
  contador: "Contador",
  gerente: "Gerente",
  rrhh: "RRHH",
  empleado: "Empleado",
  registro_asistencia: "Registro",
};

export function seccionesParaRol(role: string | null | undefined): SeccionNav[] {
  if (role === "registro_asistencia") {
    return [{ label: "Terminal", items: [{ title: "Registro", url: "/registro-asistencia", icon: Clock, desc: "Pantalla de fichada" }] }];
  }
  return SECCIONES
    .map((s) => ({ ...s, items: s.items.filter((i) => !i.roles || (role ? i.roles.includes(role) : false)) }))
    .filter((s) => s.items.length > 0);
}
