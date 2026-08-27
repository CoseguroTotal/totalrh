import { Navigate, Outlet } from "react-router-dom";
import { hasDemoAccess } from "@/lib/demoAccess";

export default function DemoGate() {
  if (!hasDemoAccess()) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
