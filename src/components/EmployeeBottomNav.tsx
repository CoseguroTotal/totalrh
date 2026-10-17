import { QrCode, Palmtree, Home, MessageCircle, User, Menu, FileText, DollarSign, type LucideIcon } from "lucide-react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useNoLeidosTotal } from "@/hooks/useChat";
import { useUserRole } from "@/hooks/useUserRole";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface Item {
  label: string;
  icon: LucideIcon;
  /** Ruta propia, o pestaña de Autogestión */
  ruta?: string;
  tab?: string;
  /** Abre el menú lateral completo */
  menu?: boolean;
}

function itemsParaRol(role: string | null | undefined): Item[] {
  const base: Item[] = [
    { ruta: "/muro", label: "Inicio", icon: Home },
    { ruta: "/mensajes", label: "Mensajes", icon: MessageCircle },
  ];
  if (role === "empleado") {
    return [...base,
      { tab: "token", label: "Fichar", icon: QrCode },
      { tab: "vacaciones", label: "Vacaciones", icon: Palmtree },
      { tab: "datos", label: "Perfil", icon: User },
    ];
  }
  if (role === "contador") {
    return [...base,
      { ruta: "/liquidacion", label: "Sueldos", icon: DollarSign },
      { ruta: "/vacaciones", label: "Vacaciones", icon: Palmtree },
      { menu: true, label: "Menú", icon: Menu },
    ];
  }
  return [...base,
    { ruta: "/legajos", label: "Legajos", icon: FileText },
    { ruta: "/vacaciones", label: "Vacaciones", icon: Palmtree },
    { menu: true, label: "Menú", icon: Menu },
  ];
}

/** Barra inferior tipo app en el celular, con los accesos de cada rol. */
export default function EmployeeBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const current = params.get("tab") || "datos";
  const noLeidos = useNoLeidosTotal();
  const { data: role } = useUserRole();
  const { setOpenMobile, openMobile } = useSidebar();
  const items = itemsParaRol(role);

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navegación principal"
    >
      <ul className="grid grid-cols-5">
        {items.map((it) => {
          const active = it.menu
            ? openMobile
            : it.ruta
              ? location.pathname.startsWith(it.ruta)
              : location.pathname.startsWith("/autogestion") && current === it.tab;
          const Icon = it.icon;
          return (
            <li key={it.label}>
              <button
                type="button"
                onClick={() => {
                  if (it.menu) { setOpenMobile(!openMobile); return; }
                  setOpenMobile(false);
                  navigate(it.ruta ?? `/autogestion?tab=${it.tab}`);
                }}
                className={cn(
                  "w-full min-h-[58px] flex flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium transition-colors active:scale-95",
                  active ? "text-primary" : "text-muted-foreground"
                )}
                aria-current={active && !it.menu ? "page" : undefined}
              >
                <span className={cn("relative flex h-7 w-12 items-center justify-center rounded-full transition-colors", active && "bg-primary/10")}>
                  <Icon className={cn("h-[22px] w-[22px]", active && "text-primary")} strokeWidth={active ? 2.4 : 2} />
                  {it.ruta === "/mensajes" && noLeidos > 0 && (
                    <span className="absolute right-0.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
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
