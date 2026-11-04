import { useUserRole } from "@/hooks/useUserRole";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function AdminRoute({ children, allow = ["admin"] }: { children: React.ReactNode; allow?: string[] }) {
  const { data: role, isLoading } = useUserRole();
  const isAdmin = !!role && allow.includes(role);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/muro" replace />;
  }

  return <>{children}</>;
}
