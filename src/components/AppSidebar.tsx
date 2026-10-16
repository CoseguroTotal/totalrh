import { LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useUserRole } from "@/hooks/useUserRole";
import { useEffect, useState } from "react";
import logoTotalRH from "@/assets/logo_total_rh.png";
import { ROLE_LABELS, seccionesParaRol } from "@/components/navigation";

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const navigate = useNavigate();
  const { data: role } = useUserRole();
  const secciones = seccionesParaRol(role);

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

  // En el celular el menú es un panel: se cierra al elegir una opción
  const alNavegar = () => { if (isMobile) setOpenMobile(false); };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <img src={logoTotalRH} alt="TotalRH" className={collapsed ? "h-8 w-8 shrink-0 rounded-lg object-contain" : "h-12 w-12 shrink-0 rounded-lg object-contain"} />
          {!collapsed && (
            <div className="animate-fade-in">
              <p className="text-sm font-semibold text-sidebar-accent-foreground">TotalRH</p>
              <p className="text-xs text-sidebar-foreground">Gestión de Personal</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {secciones.map((seccion) => (
          <SidebarGroup key={seccion.label} className="py-1">
            {!collapsed && (
              <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-sidebar-foreground/60">
                {seccion.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {seccion.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild tooltip={item.title} className="h-10">
                      <NavLink
                        to={item.url}
                        end={item.url === "/app"}
                        onClick={alNavegar}
                        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="h-[18px] w-[18px] shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
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
            <SidebarMenuButton onClick={handleLogout} tooltip="Cerrar sesión" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Cerrar sesión</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
