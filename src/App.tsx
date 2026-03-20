import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
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
import PlaceholderModule from "@/pages/PlaceholderModule";
import NotFound from "./pages/NotFound";

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
              <Route path="/" element={<Dashboard />} />
              <Route path="/legajos" element={<Legajos />} />
              <Route path="/legajos/:id" element={<LegajoDetail />} />
              <Route path="/empresas" element={<Empresas />} />
              <Route path="/liquidacion" element={<PlaceholderModule />} />
              <Route path="/autogestion" element={<PlaceholderModule />} />
              <Route path="/asistencia" element={<PlaceholderModule />} />
              <Route path="/reclutamiento" element={<PlaceholderModule />} />
              <Route path="/reportes" element={<PlaceholderModule />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
