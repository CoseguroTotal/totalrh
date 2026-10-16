import { useNavigate } from "react-router-dom";
import { LogOut, Newspaper, UserCircle } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { usePerfiles, useSessionUserId } from "@/hooks/useMuro";
import { UserAvatar, nombreCompleto } from "@/components/muro/MuroComponents";
import { ROLE_LABELS } from "@/components/navigation";

export default function UserMenu() {
  const navigate = useNavigate();
  const { data: userId } = useSessionUserId();
  const { data: role } = useUserRole();
  const { data: perfiles } = usePerfiles(userId ? [userId] : []);
  const perfil = userId ? perfiles?.get(userId) : null;

  const salir = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Menú de usuario">
        <UserAvatar perfil={perfil} size="sm" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium truncate">{nombreCompleto(perfil)}</p>
          <p className="text-xs text-muted-foreground">{role ? ROLE_LABELS[role] ?? role : ""}{perfil?.puesto ? ` · ${perfil.puesto}` : ""}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {role !== "registro_asistencia" && (
          <>
            <DropdownMenuItem onClick={() => navigate("/muro")}><Newspaper className="h-4 w-4 mr-2" />Muro</DropdownMenuItem>
            {role !== "contador" && (
              <DropdownMenuItem onClick={() => navigate("/autogestion?tab=datos")}><UserCircle className="h-4 w-4 mr-2" />Mi perfil</DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={salir} className="text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4 mr-2" />Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
