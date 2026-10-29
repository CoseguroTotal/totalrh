import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { Loader2 } from "lucide-react";
import { asegurarSesion, cerrarSesionVencida } from "@/lib/sesion";

export default function ProtectedRoute() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const revisar = async () => {
      if (document.visibilityState !== "visible") return;
      if (!(await asegurarSesion())) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) await cerrarSesionVencida();
      }
    };
    revisar();
    document.addEventListener("visibilitychange", revisar);

    return () => { subscription.unsubscribe(); document.removeEventListener("visibilitychange", revisar); };
  }, []);

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
