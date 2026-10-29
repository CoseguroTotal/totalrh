import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import EmployeeGuard from "@/components/EmployeeGuard";
import AdminRoute from "@/components/AdminRoute";
import RoleRoute from "@/components/RoleRoute";
import AutogestionGuard from "@/components/AutogestionGuard";
import DemoGate from "@/components/DemoGate";
import { ES_DEMO } from "@/lib/modo";

// Cada pantalla se descarga recién cuando se abre
const Landing = lazy(() => import("@/pages/Landing"));
const Login = lazy(() => import("@/pages/Login"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Muro = lazy(() => import("@/pages/Muro"));
const Mensajes = lazy(() => import("@/pages/Mensajes"));
const Encuestas = lazy(() => import("@/pages/Encuestas"));
const EncuestaEditor = lazy(() => import("@/pages/EncuestaEditor"));
const EncuestaDetalle = lazy(() => import("@/pages/EncuestaDetalle"));
const Apps = lazy(() => import("@/pages/Apps"));
const Eventos = lazy(() => import("@/pages/Eventos"));
const Tareas = lazy(() => import("@/pages/Tareas"));
const Grupos = lazy(() => import("@/pages/Grupos"));
const GrupoDetalle = lazy(() => import("@/pages/GrupoDetalle"));
const Legajos = lazy(() => import("@/pages/Legajos"));
const LegajoDetail = lazy(() => import("@/pages/LegajoDetail"));
const Empresas = lazy(() => import("@/pages/Empresas"));
const Liquidacion = lazy(() => import("@/pages/Liquidacion"));
const Asistencia = lazy(() => import("@/pages/Asistencia"));
const Autogestion = lazy(() => import("@/pages/Autogestion"));
const Configuracion = lazy(() => import("@/pages/Configuracion"));
const Memorandums = lazy(() => import("@/pages/Memorandums"));
const Reclutamiento = lazy(() => import("@/pages/Reclutamiento"));
const Reportes = lazy(() => import("@/pages/Reportes"));
const Vacaciones = lazy(() => import("@/pages/Vacaciones"));
const RegistroAsistencia = lazy(() => import("@/pages/RegistroAsistencia"));
const RegistroEmpleado = lazy(() => import("@/pages/RegistroEmpleado"));
const Instalar = lazy(() => import("@/pages/Instalar"));
const AltasPendientes = lazy(() => import("@/pages/AltasPendientes"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

/** Al cambiar de usuario se descarta la caché: evita ver por un instante el rol o los datos del anterior. */
function ResetCacheOnAuthChange() {
  const qc = useQueryClient();
  useEffect(() => {
    let ultimoUsuario: string | null | undefined;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const actual = session?.user?.id ?? null;
      if (ultimoUsuario !== undefined && actual !== ultimoUsuario) qc.clear();
      ultimoUsuario = actual;
    });
    return () => subscription.unsubscribe();
  }, [qc]);
  return null;
}

const Cargando = () => (
  <div className="flex min-h-[40vh] items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ResetCacheOnAuthChange />
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<Cargando />}>
          <Routes>
            <Route path="/" element={ES_DEMO ? <Landing /> : <Navigate to="/login" replace />} />
            <Route element={<DemoGate />}>
              <Route path="/login" element={<Login />} />
            </Route>
            {/* Públicas: alta del empleado con el código de la empresa y guía para instalar la app */}
            <Route path="/registro" element={<RegistroEmpleado />} />
            <Route path="/instalar" element={<Instalar />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/registro-asistencia" element={<RegistroAsistencia />} />
              <Route element={<AppLayout />}>
                <Route element={<AutogestionGuard />}>
                  <Route path="/muro" element={<Muro />} />
                  <Route path="/mensajes" element={<Mensajes />} />
                  <Route path="/mensajes/:id" element={<Mensajes />} />
                  <Route path="/encuestas" element={<Encuestas />} />
                  <Route path="/encuestas/nueva" element={<EncuestaEditor />} />
                  <Route path="/encuestas/:id" element={<EncuestaDetalle />} />
                  <Route path="/encuestas/:id/editar" element={<EncuestaEditor />} />
                  <Route path="/apps" element={<Apps />} />
                  <Route path="/eventos" element={<Eventos />} />
                  <Route path="/tareas" element={<Tareas />} />
                  <Route path="/grupos" element={<Grupos />} />
                  <Route path="/grupos/:id" element={<GrupoDetalle />} />
                  <Route path="/autogestion" element={<Autogestion />} />
                </Route>
                <Route element={<EmployeeGuard />}>
                  <Route path="/app" element={<Dashboard />} />
                  <Route path="/legajos" element={<Legajos />} />
                  <Route path="/legajos/:id" element={<LegajoDetail />} />
                  <Route path="/altas" element={<AltasPendientes />} />
                  <Route path="/liquidacion" element={<Liquidacion />} />
                  <Route path="/asistencia" element={<Asistencia />} />
                  <Route path="/vacaciones" element={<Vacaciones />} />
                  <Route path="/reportes" element={<Reportes />} />
                  <Route path="/configuracion" element={<AdminRoute><Configuracion /></AdminRoute>} />
                  <Route element={<RoleRoute deny={["contador"]} />}>
                    <Route path="/empresas" element={<Empresas />} />
                    <Route path="/memorandums" element={<Memorandums />} />
                    <Route path="/reclutamiento" element={<Reclutamiento />} />
                  </Route>
                </Route>
              </Route>
            </Route>
            <Route path="/dashboard" element={<Navigate to="/app" replace />} />
            <Route path="/inicio" element={<Navigate to="/muro" replace />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
