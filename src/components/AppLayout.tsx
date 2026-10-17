import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Suspense } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import NotificacionesBell from "@/components/NotificacionesBell";
import EmployeeBottomNav from "@/components/EmployeeBottomNav";
import { useUserRole } from "@/hooks/useUserRole";
import { useChatRealtime, useNoLeidosTotal } from "@/hooks/useChat";
import { cn } from "@/lib/utils";
import GlobalSearch from "@/components/GlobalSearch";
import UserMenu from "@/components/UserMenu";

function BotonMensajes() {
  const noLeidos = useNoLeidosTotal();
  return (
    <Link
      to="/mensajes"
      className="relative flex h-9 w-9 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/70"
      aria-label={noLeidos ? `Mensajes, ${noLeidos} sin leer` : "Mensajes"}
      title="Mensajes"
    >
      <MessageCircle className="h-5 w-5" />
      {noLeidos > 0 && (
        <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
          {noLeidos > 99 ? "99+" : noLeidos}
        </span>
      )}
    </Link>
  );
}

export default function AppLayout() {
  const { data: role } = useUserRole();
  const { pathname } = useLocation();

  const esTerminal = role === "registro_asistencia";
  // En el celular todos (menos la terminal) navegan con la barra inferior tipo app
  const conBarra = !!role && !esTerminal;
  // El chat ocupa toda la pantalla, sin márgenes ni pie
  const modoChat = pathname.startsWith("/mensajes");
  useChatRealtime();

  return (
    <SidebarProvider>
      <div className={cn("flex w-full", modoChat ? "h-[100dvh]" : "min-h-screen")}>
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 sm:h-14 flex items-center justify-between border-b bg-card px-3 sm:px-4 shrink-0 pt-safe">
            <div className="flex items-center gap-2 min-w-0">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <Link to="/muro" className="flex items-center gap-2 sm:hidden min-w-0" aria-label="Ir al inicio">
                <img src="/logo_total_rh.png" alt="TotalRH" className="h-6 w-6 object-contain" />
                <span className="text-sm font-semibold truncate">TotalRH</span>
              </Link>
              <div className="hidden sm:block"><GlobalSearch /></div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              <div className="sm:hidden"><GlobalSearch /></div>
              {!esTerminal && <BotonMensajes />}
              <NotificacionesBell />
              <UserMenu />
            </div>
          </header>
          <main
            className={cn(
              modoChat
                ? cn("flex-1 min-h-0 overflow-hidden", conBarra && "pb-[calc(58px+env(safe-area-inset-bottom))] sm:pb-0")
                : cn("flex-1 overflow-auto p-3 sm:p-6", conBarra ? "pb-24 sm:pb-16" : "pb-16")
            )}
          >
            <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
              <Outlet />
            </Suspense>
          </main>
          {!modoChat && (
            <footer
              className={cn(
                "shrink-0 border-t bg-card/50 px-4 py-2 flex items-center justify-center gap-2 text-[10px] sm:text-[11px] text-muted-foreground/60 text-center",
                conBarra && "hidden sm:flex"
              )}
            >
              <img src="/logo_total_rh.png" alt="TotalRH" className="h-4 w-4 opacity-50" />
              <span>TotalRH — Gestión de Personal · Sky Studio 2026 todos los derechos reservados</span>
            </footer>
          )}
          {conBarra && <EmployeeBottomNav />}
        </div>
      </div>
    </SidebarProvider>
  );
}
