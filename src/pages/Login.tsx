import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { invocar } from "@/hooks/useRegistro";
import { pareceDni, soloDigitos } from "../../supabase/functions/_shared/registro-rules";
import { MarcaLockup } from "@/components/Marca";
import { CLIENTE } from "@/marca";
import { Button } from "@/components/ui/button";

async function getTargetPathForUser(userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (data?.role === "registro_asistencia") return "/registro-asistencia";
  // El muro es el inicio para todos (la terminal va directo a fichar)
  return "/muro";
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get("vencida") ? "Tu sesión venció. Volvé a iniciar sesión." : null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const userId = session?.user.id;
      if (!userId) return;
      const targetPath = await getTargetPathForUser(userId);
      if (active) navigate(targetPath, { replace: true });
    });

    return () => {
      active = false;
    };
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Se puede entrar con el DNI (las cuentas creadas desde el portal) o con el email
    let userId: string | undefined;
    if (pareceDni(email)) {
      const { data, error: errDni } = await invocar<{ access_token: string; refresh_token: string }>("registro-empleado", {
        action: "login-dni", dni: soloDigitos(email), password,
      });
      if (errDni) { setError(errDni); setLoading(false); return; }
      const { data: sesion, error: errSesion } = await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
      if (errSesion) { setError("No se pudo iniciar sesión. Probá de nuevo."); setLoading(false); return; }
      userId = sesion.user?.id;
    } else {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) {
        setError(
          /banned/i.test(authError.message) ? "Tu alta todavía está en revisión. RRHH te avisa cuando quede aprobada."
            : /invalid login credentials/i.test(authError.message) ? "Email o contraseña incorrectos"
              : authError.message
        );
        setLoading(false);
        return;
      }
      userId = authData.user?.id;
    }

    // Check time restrictions for the user's role
    if (userId) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      const role = roleData?.role;

      // Admin has no restrictions
      if (role && role !== "admin") {
        const { data: restriccion } = await supabase
          .from("restricciones_horario")
          .select("hora_desde, hora_hasta, activo")
          .eq("role", role)
          .maybeSingle();

        if (restriccion?.activo) {
          // Use server time to prevent client manipulation
          const { data: serverTimeData } = await supabase.rpc("get_server_time" as any);
          const serverTime = serverTimeData ? String(serverTimeData).substring(0, 5) : null;
          const currentTime = serverTime || `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;

          if (currentTime < restriccion.hora_desde || currentTime > restriccion.hora_hasta) {
            await supabase.auth.signOut();
            setError(`Acceso restringido. Tu horario es de ${restriccion.hora_desde} a ${restriccion.hora_hasta}.`);
            setLoading(false);
            return;
          }
        }
      }
      navigate(await getTargetPathForUser(userId), { replace: true });
      return;
    }

    navigate("/muro", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8 animate-fade-in">
        <div className="flex flex-col items-center gap-3">
          <MarcaLockup />
          <div className="text-center">
            <h1 className="text-xl font-semibold">{CLIENTE?.nombre ?? "TotalRH"}</h1>
            <p className="text-sm text-muted-foreground mt-1">Iniciá sesión para continuar</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium" htmlFor="email">DNI o email</label>
            <input
              id="email"
              type="text"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="DNI (sólo números) o tu@email.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium" htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full gap-2 h-11"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Iniciar Sesión
          </Button>
        </form>

        <div className="space-y-2 text-center text-sm">
          <p className="text-muted-foreground">¿Sos empleado y todavía no tenés cuenta?</p>
          <Button asChild variant="outline" className="w-full"><Link to="/registro">Crear mi cuenta</Link></Button>
          <p className="text-xs text-muted-foreground">¿Olvidaste tu contraseña? Pedile a RRHH que la blanquee.</p>
          <Link to="/instalar" className="inline-block text-xs text-primary hover:underline">Cómo instalar la app en el celular</Link>
        </div>
      </div>
    </div>
  );
}
