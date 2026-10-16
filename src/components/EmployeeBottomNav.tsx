import { QrCode, Palmtree, Home, MessageCircle, User } from "lucide-react";
import { useNoLeidosTotal } from "@/hooks/useChat";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const items = [
  { tab: null, ruta: "/muro", label: "Inicio", icon: Home },
  { tab: null, ruta: "/mensajes", label: "Mensajes", icon: MessageCircle },
  { tab: "token", ruta: null, label: "Fichar", icon: QrCode },
  { tab: "vacaciones", ruta: null, label: "Vacaciones", icon: Palmtree },
  { tab: "datos", ruta: null, label: "Perfil", icon: User },
];

export default function EmployeeBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const current = params.get("tab") || "datos";
  const noLeidos = useNoLeidosTotal();

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navegación del empleado"
    >
      <ul className="grid grid-cols-5">
        {items.map((it) => {
          const active = it.ruta
            ? location.pathname.startsWith(it.ruta)
            : location.pathname.startsWith("/autogestion") && current === it.tab;
          const Icon = it.icon;
          return (
            <li key={it.label}>
              <button
                type="button"
                onClick={() => navigate(it.ruta ?? `/autogestion?tab=${it.tab}`)}
                className={cn(
                  "w-full min-h-[56px] flex flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
                aria-current={active ? "page" : undefined}
              >
                <span className="relative">
                  <Icon className={cn("h-5 w-5", active && "text-primary")} />
                  {it.ruta === "/mensajes" && noLeidos > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                      {noLeidos > 9 ? "9+" : noLeidos}
                    </span>
                  )}
                </span>
                <span className="leading-none">{it.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
