import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Legajos from "@/pages/Legajos";
import LegajoDetail from "@/pages/LegajoDetail";
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
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/legajos" element={<Legajos />} />
            <Route path="/legajos/:id" element={<LegajoDetail />} />
            <Route path="/liquidacion" element={<PlaceholderModule />} />
            <Route path="/autogestion" element={<PlaceholderModule />} />
            <Route path="/asistencia" element={<PlaceholderModule />} />
            <Route path="/reclutamiento" element={<PlaceholderModule />} />
            <Route path="/reportes" element={<PlaceholderModule />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
