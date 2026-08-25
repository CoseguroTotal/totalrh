import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import { Search } from "lucide-react";
import NotificacionesBell from "@/components/NotificacionesBell";
import EmployeeBottomNav from "@/components/EmployeeBottomNav";
import { useUserRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";

export default function AppLayout() {
  const { data: role } = useUserRole();
  const isEmpleado = role === "empleado";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 sm:h-14 flex items-center justify-between border-b bg-card px-3 sm:px-4 shrink-0 pt-safe">
            <div className="flex items-center gap-2 min-w-0">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div className="flex items-center gap-2 sm:hidden min-w-0">
                <img src="/logo_total_rh.png" alt="TotalRH" className="h-6 w-6 object-contain" />
                <span className="text-sm font-semibold truncate">TotalRH</span>
              </div>
              <div className="hidden sm:flex items-center gap-2 ml-4 rounded-md bg-muted px-3 py-1.5">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar empleado, legajo..."
                  className="bg-transparent text-sm outline-none placeholder:text-muted-foreground w-64"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <NotificacionesBell />
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-xs font-medium text-primary-foreground">
                AR
              </div>
            </div>
          </header>
          <main
            className={cn(
              "flex-1 overflow-auto p-3 sm:p-6",
              isEmpleado ? "pb-24 sm:pb-16" : "pb-16"
            )}
          >
            <Outlet />
          </main>
          <footer
            className={cn(
              "shrink-0 border-t bg-card/50 px-4 py-2 flex items-center justify-center gap-2 text-[10px] sm:text-[11px] text-muted-foreground/60 text-center",
              isEmpleado && "hidden sm:flex"
            )}
          >
            <img src="/logo_total_rh.png" alt="TotalRH" className="h-4 w-4 opacity-50" />
            <span>TotalRH — Gestión de Personal · Sky Studio 2026 todos los derechos reservados</span>
          </footer>
          {isEmpleado && <EmployeeBottomNav />}
        </div>
      </div>
    </SidebarProvider>
  );
}
