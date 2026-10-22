import { Navigate, Outlet } from "react-router-dom";
import { hasDemoAccess } from "@/lib/demoAccess";
import { ES_DEMO } from "@/lib/modo";

export default function DemoGate() {
  // Fuera de la demo el login es libre (los usuarios los crea el administrador)
  if (ES_DEMO && !hasDemoAccess()) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
