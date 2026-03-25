import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logoTotalRH from "@/assets/logo_total_rh.png";

export default function RegistroAsistencia() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    tipo?: string;
    empleado?: { nombre: string; apellido: string; legajo: string };
    hora?: string;
    error?: string;
  } | null>(null);
  const navigate = useNavigate();

  const handleFichar = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("validate-attendance-token", {
        body: { action: "validate", token: code },
      });
      if (error) throw error;
      if (data.error) {
        setResult({ success: false, error: data.error });
      } else {
        setResult({ success: true, ...data });
      }
    } catch (err: any) {
      setResult({ success: false, error: err.message || "Error de conexión" });
    } finally {
      setLoading(false);
      setCode("");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="absolute top-4 right-4">
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
          <LogOut className="h-4 w-4 mr-1.5" />Salir
        </Button>
      </div>

      <div className="w-full max-w-sm space-y-8 text-center">
        <div>
          <img src={logoTotalRH} alt="TotalRH" className="h-16 w-16 mx-auto rounded-xl object-contain" />
          <h1 className="text-xl font-semibold mt-4">Registro de Asistencia</h1>
          <p className="text-sm text-muted-foreground mt-1">Ingresá tu código de fichada</p>
        </div>

        <div className="space-y-4">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className="text-center text-3xl tracking-[0.5em] h-16 font-mono"
            maxLength={6}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleFichar()}
          />
          <Button
            onClick={handleFichar}
            disabled={code.length !== 6 || loading}
            className="w-full h-12 text-base"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
            Fichar
          </Button>
        </div>

        {result && (
          <div className={`rounded-xl border p-6 ${result.success ? "bg-success/10 border-success/30" : "bg-destructive/10 border-destructive/30"}`}>
            {result.success ? (
              <>
                <CheckCircle2 className="h-10 w-10 mx-auto text-success mb-3" />
                <p className="text-lg font-semibold">{result.empleado?.apellido}, {result.empleado?.nombre}</p>
                <p className="text-sm text-muted-foreground">Legajo: {result.empleado?.legajo}</p>
                <div className="mt-3 inline-flex items-center rounded-full bg-success/15 px-3 py-1 text-sm font-medium text-success capitalize">
                  {result.tipo === "entrada" ? "✅ Entrada registrada" : "🏁 Salida registrada"}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {result.hora ? new Date(result.hora).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : ""}
                </p>
              </>
            ) : (
              <>
                <XCircle className="h-10 w-10 mx-auto text-destructive mb-3" />
                <p className="text-sm font-medium text-destructive">{result.error}</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
