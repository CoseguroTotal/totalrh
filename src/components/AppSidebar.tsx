import {
  LayoutDashboard, FileText, DollarSign, UserCircle,
  Clock, Briefcase, BarChart3, LogOut, Settings, FileCheck, Palmtree,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useUserRole";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useUserRole } from "@/hooks/useUserRole";
import { useEffect, useState } from "react";
import logoTotalRH from "@/assets/logo_total_rh.png";
import { Building2 } from "lucide-react";

const modules = [
  { title: "Dashboard", url: "/app", icon: LayoutDashboard },
  { title: "Legajos", url: "/legajos", icon: FileText },
  { title: "Empresas", url: "/empresas", icon: Building2 },
  { title: "Liquidación", url: "/liquidacion", icon: DollarSign },
  { title: "Memorándums", url: "/memorandums", icon: FileCheck },
  { title: "Autogestión", url: "/autogestion", icon: UserCircle },
  { title: "Asistencia", url: "/asistencia", icon: Clock },
  { title: "Vacaciones", url: "/vacaciones", icon: Palmtree },
  { title: "Reclutamiento", url: "/reclutamiento", icon: Briefcase },
  { title: "Reportes BI", url: "/reportes", icon: BarChart3 },
];

const employeeModules = [
  { title: "Autogestión", url: "/autogestion", icon: UserCircle },
];

const registroModules = [
  { title: "Registro", url: "/registro-asistencia", icon: Clock },
];

const contadorModules = [
  { title: "Dashboard", url: "/app", icon: LayoutDashboard },
  { title: "Legajos", url: "/legajos", icon: FileText },
  { title: "Liquidación", url: "/liquidacion", icon: DollarSign },
  { title: "Asistencia", url: "/asistencia", icon: Clock },
  { title: "Vacaciones", url: "/vacaciones", icon: Palmtree },
];

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  usuario: "Usuario",
  contador: "Contador",
  gerente: "Gerente",
  rrhh: "RRHH",
  empleado: "Empleado",
  registro_asistencia: "Registro",
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();
  const { data: role } = useUserRole();
  const isEmpleado = role === "empleado";
  const isContador = role === "contador";
  const isRegistro = role === "registro_asistencia";
  const visibleModules = isRegistro ? registroModules : isEmpleado ? employeeModules : isContador ? contadorModules : modules;

  const [userEmail, setUserEmail] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <img src={logoTotalRH} alt="TotalRH" className="h-14 w-14 shrink-0 rounded-lg object-contain" />
          {!collapsed && (
            <div className="animate-fade-in">
              <p className="text-sm font-semibold text-sidebar-accent-foreground">TotalRH</p>
              <p className="text-xs text-sidebar-foreground">Gestión de Personal</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-sidebar-foreground/60">
            {!collapsed && "Módulos"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleModules.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/app"}
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-sidebar-foreground/60">
              {!collapsed && "Admin"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/configuracion"
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <Settings className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>Configuración</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
        {!collapsed && userEmail && (
          <div className="px-3 py-2 mb-1">
            <p className="text-xs font-medium text-sidebar-foreground truncate">{userEmail}</p>
            {role && (
              <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wide mt-0.5">
                {ROLE_LABELS[role] || role}
              </p>
            )}
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Cerrar Sesión</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
