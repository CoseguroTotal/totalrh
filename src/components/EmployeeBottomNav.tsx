import { QrCode, ClipboardList, Palmtree, FileText, User } from "lucide-react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const items = [
  { tab: "token", label: "Fichar", icon: QrCode },
  { tab: "permisos", label: "Permisos", icon: ClipboardList },
  { tab: "vacaciones", label: "Vacaciones", icon: Palmtree },
  { tab: "documentos", label: "Docs", icon: FileText },
  { tab: "datos", label: "Perfil", icon: User },
];

export default function EmployeeBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const current = params.get("tab") || "datos";

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navegación del empleado"
    >
      <ul className="grid grid-cols-5">
        {items.map((it) => {
          const active = location.pathname.startsWith("/autogestion") && current === it.tab;
          const Icon = it.icon;
          return (
            <li key={it.tab}>
              <button
                type="button"
                onClick={() => navigate(`/autogestion?tab=${it.tab}`)}
                className={cn(
                  "w-full min-h-[56px] flex flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className={cn("h-5 w-5", active && "text-primary")} />
                <span className="leading-none">{it.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
