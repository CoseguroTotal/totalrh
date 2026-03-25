import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Legajos from "@/pages/Legajos";
import LegajoDetail from "@/pages/LegajoDetail";
import Empresas from "@/pages/Empresas";
import Liquidacion from "@/pages/Liquidacion";
import Asistencia from "@/pages/Asistencia";
import Autogestion from "@/pages/Autogestion";
import Configuracion from "@/pages/Configuracion";
import Memorandums from "@/pages/Memorandums";
import Reclutamiento from "@/pages/Reclutamiento";
import Reportes from "@/pages/Reportes";
import Vacaciones from "@/pages/Vacaciones";
import NotFound from "./pages/NotFound";
import EmployeeGuard from "@/components/EmployeeGuard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/autogestion" element={<Autogestion />} />
              <Route element={<EmployeeGuard />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/legajos" element={<Legajos />} />
                <Route path="/legajos/:id" element={<LegajoDetail />} />
                <Route path="/empresas" element={<Empresas />} />
                <Route path="/liquidacion" element={<Liquidacion />} />
                <Route path="/memorandums" element={<Memorandums />} />
                <Route path="/asistencia" element={<Asistencia />} />
                <Route path="/vacaciones" element={<Vacaciones />} />
                <Route path="/configuracion" element={<Configuracion />} />
                <Route path="/reclutamiento" element={<Reclutamiento />} />
                <Route path="/reportes" element={<Reportes />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
