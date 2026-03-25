import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import { Search } from "lucide-react";
import NotificacionesBell from "@/components/NotificacionesBell";

export default function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-card px-4 shrink-0">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div className="hidden sm:flex items-center gap-2 ml-4 rounded-md bg-muted px-3 py-1.5">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar empleado, legajo..."
                  className="bg-transparent text-sm outline-none placeholder:text-muted-foreground w-64"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <NotificacionesBell />
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-xs font-medium text-primary-foreground">
                  AR
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6 pb-16">
            <Outlet />
          </main>
          <footer className="shrink-0 border-t bg-card/50 px-4 py-2 flex items-center justify-center gap-2 text-[11px] text-muted-foreground/60">
            <img src="/logo_total_rh.png" alt="TotalRH" className="h-4 w-4 opacity-50" />
            <span>TotalRH — Gestión de Personal · Sky Studio 2026 todos los derechos reservados</span>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
