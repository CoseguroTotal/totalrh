import { useUserRole } from "@/hooks/useUserRole";
import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function EmployeeGuard() {
  const { data: role, isLoading } = useUserRole();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (role === "empleado") {
    return <Navigate to="/autogestion" replace />;
  }

  return <Outlet />;
}
