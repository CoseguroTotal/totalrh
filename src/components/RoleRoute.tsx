import { useUserRole } from "@/hooks/useUserRole";
import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface RoleRouteProps {
  /** Roles que NO pueden acceder a estas rutas */
  deny: string[];
  /** A dónde redirigir si el rol está denegado */
  redirectTo?: string;
}

export default function RoleRoute({ deny, redirectTo = "/app" }: RoleRouteProps) {
  const { data: role, isLoading } = useUserRole();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (role && deny.includes(role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}
