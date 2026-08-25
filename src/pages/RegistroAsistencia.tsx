import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle, LogOut, QrCode, KeyRound } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import logoTotalRH from "@/assets/logo_total_rh.png";
import QRCode from "qrcode";
import { useUserRole } from "@/hooks/useUserRole";

interface FichadaResult {
  success: boolean;
  tipo?: string;
  empleado?: { nombre: string; apellido: string; legajo: string };
  hora?: string;
  error?: string;
}

export default function RegistroAsistencia() {
  const navigate = useNavigate();
  const { data: role, isLoading } = useUserRole();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (role !== "registro_asistencia" && role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="absolute top-4 right-4">
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
          <LogOut className="h-4 w-4 mr-1.5" />Salir
        </Button>
      </div>

      <div className="w-full max-w-md space-y-6 text-center">
        <div>
          <img src={logoTotalRH} alt="TotalRH" className="h-16 w-16 mx-auto rounded-xl object-contain" />
          <h1 className="text-xl font-semibold mt-4">Registro de Asistencia</h1>
          <p className="text-sm text-muted-foreground mt-1">Escaneá el QR con la app del empleado</p>
        </div>

        <QrTerminal />
      </div>
    </div>
  );
}


/* ── Modo QR dinámico ── */
function QrTerminal() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [duracion, setDuracion] = useState(10);
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [ultimas, setUltimas] = useState<
    { nombre: string; apellido: string; legajo: string; tipo: string; hora: string }[]
  >([]);

  const issue = useCallback(async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke("validate-attendance-token", {
        body: { action: "qr-issue" },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      const dur = data.duracion_segundos ?? 10;
      setDuracion(dur);
      setSecondsLeft(dur);
      setError(null);
      if (canvasRef.current) {
        await QRCode.toCanvas(canvasRef.current, data.codigo, { width: 280, margin: 1 });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo generar el QR");
    }
  }, []);

  useEffect(() => { issue(); }, [issue]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.hidden) return;
      setSecondsLeft((prev) => {
        if (prev <= 1) { issue(); return duracion; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [issue, duracion]);

  // Panel de últimas fichadas de esta terminal
  const fetchUltimas = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) return;
    const hoy = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("fichadas")
      .select("hora_entrada, hora_salida, empleado:empleados(nombre, apellido, legajo)")
      .eq("terminal_user_id", uid)
      .eq("fecha", hoy)
      .order("created_at", { ascending: false })
      .limit(5);
    setUltimas(
      (data ?? []).map((f: any) => ({
        nombre: f.empleado?.nombre ?? "",
        apellido: f.empleado?.apellido ?? "",
        legajo: f.empleado?.legajo ?? "",
        tipo: f.hora_salida ? "salida" : "entrada",
        hora: f.hora_salida ?? f.hora_entrada,
      }))
    );
  }, []);

  useEffect(() => {
    fetchUltimas();
    const interval = setInterval(fetchUltimas, 5000);
    return () => clearInterval(interval);
  }, [fetchUltimas]);

  const progress = (secondsLeft / duracion) * 100;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        {error ? (
          <div className="py-8">
            <XCircle className="h-8 w-8 mx-auto text-destructive mb-3" />
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={issue}>Reintentar</Button>
          </div>
        ) : (
          <>
            <canvas ref={canvasRef} className="mx-auto rounded-lg" />
            <div className="mt-4">
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary transition-all duration-1000 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Se renueva en <span className="font-semibold">{secondsLeft}s</span>
              </p>
            </div>
          </>
        )}
      </div>

      <div className="rounded-xl border bg-card p-4 text-left">
        <h3 className="text-xs font-medium text-muted-foreground mb-2">Últimas fichadas</h3>
        {ultimas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin registros todavía.</p>
        ) : (
          <ul className="space-y-1.5">
            {ultimas.map((u, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span>{u.apellido}, {u.nombre}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {u.tipo === "entrada" ? "Entrada" : "Salida"}{" "}
                  {u.hora ? new Date(u.hora).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
