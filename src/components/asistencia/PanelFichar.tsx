import { useCallback, useState } from "react";
import { Camera, CheckCircle2, Clock, Loader2, MapPin, QrCode, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import QrScanner from "@/components/QrScanner";
import { supabase } from "@/integrations/supabase/client";
import { useConfigGrupo } from "@/hooks/useConfigGrupo";
import { cn } from "@/lib/utils";
import { horaCorta } from "@/lib/asistencia";
import { obtenerUbicacion, ubicacionSiEsPosible } from "@/lib/ubicacion";

type Resultado = { ok: boolean; msg: string; detalle?: string };

/** Lee el mensaje de error de la edge function (en los 4xx viene en el cuerpo). */
async function mensajeDeError(data: { error?: string } | null, error: unknown) {
  if (data?.error) return data.error;
  try { return (await (error as { context?: Response }).context?.json())?.error ?? "No se pudo registrar la fichada"; } catch { return "No se pudo registrar la fichada"; }
}

function textoResultado(data: { tipo: string; hora: string; repetida?: boolean; distancia?: number | null }): Resultado {
  const tipo = data.tipo === "salida" ? "Salida" : "Entrada";
  if (data.repetida) return { ok: true, msg: `Ya registraste tu ${data.tipo} a las ${horaCorta(data.hora)}` };
  return {
    ok: true,
    msg: `${tipo} registrada a las ${horaCorta(data.hora)}`,
    detalle: data.distancia != null ? `A ${data.distancia} m de tu sucursal` : undefined,
  };
}

/**
 * Fichar desde el celular: con el QR de la terminal y/o con la ubicación (geocerca de la sucursal),
 * según lo que RRHH haya habilitado en Configuración → Asistencia.
 */
export default function PanelFichar({ variante = "tab" }: { variante?: "hero" | "tab" }) {
  const { data: config } = useConfigGrupo();
  const [scanning, setScanning] = useState(false);
  const [enviando, setEnviando] = useState<null | "qr" | "geo">(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const qrActivo = config?.fichado_qr_activo !== false;
  const geoActivo = !!config?.fichado_geo_activo;
  const exigirUbicacionQr = !!config?.geo_exigir_en_qr;

  const ficharQr = useCallback(async (codigo: string) => {
    if (enviando) return;
    setEnviando("qr");
    setResultado(null);
    try {
      // La ubicación acompaña al QR: obligatoria si RRHH lo pidió; si no, se manda cuando se puede
      let ubicacion = null;
      if (exigirUbicacionQr) {
        try { ubicacion = await obtenerUbicacion(); } catch (e) { setResultado({ ok: false, msg: (e as Error).message }); return; }
      } else {
        ubicacion = await ubicacionSiEsPosible(4000);
      }
      const { data, error } = await supabase.functions.invoke("validate-attendance-token", { body: { action: "qr-fichar", codigo, ubicacion } });
      if (error || data?.error) { setResultado({ ok: false, msg: await mensajeDeError(data, error) }); return; }
      setResultado(textoResultado(data));
      setScanning(false);
    } finally {
      setEnviando(null);
    }
  }, [enviando, exigirUbicacionQr]);

  const ficharGeo = async () => {
    setEnviando("geo");
    setResultado(null);
    try {
      const ubicacion = await obtenerUbicacion();
      const { data, error } = await supabase.functions.invoke("validate-attendance-token", { body: { action: "geo-fichar", ubicacion } });
      if (error || data?.error) { setResultado({ ok: false, msg: await mensajeDeError(data, error) }); return; }
      setResultado(textoResultado(data));
    } catch (e) {
      setResultado({ ok: false, msg: (e as Error).message });
    } finally {
      setEnviando(null);
    }
  };

  if (!qrActivo && !geoActivo) {
    return (
      <div className="rounded-2xl border bg-muted/30 p-4 sm:p-5 text-center text-sm text-muted-foreground">
        El fichado desde la app está desactivado. Consultá con Recursos Humanos.
      </div>
    );
  }

  const hero = variante === "hero";

  return (
    <div className={cn("space-y-4 shadow-sm", hero ? "rounded-2xl border bg-gradient-to-br from-primary/10 to-accent/10 p-4 sm:p-6" : "rounded-xl border bg-card p-4 sm:p-6")}>
      <div>
        <h2 className={cn("font-semibold flex items-center gap-2", hero ? "text-base sm:text-lg" : "text-sm")}>
          <Clock className="h-5 w-5 text-primary" />Fichar ahora
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          {geoActivo && qrActivo ? "Fichá con tu ubicación o escaneando el QR de la terminal."
            : geoActivo ? "Fichá con la ubicación de tu celular: tenés que estar en tu sucursal."
              : "Escaneá el QR de tu sucursal. El código cambia cada pocos segundos."}
          {qrActivo && exigirUbicacionQr && " Para fichar con QR también se pide tu ubicación."}
        </p>
      </div>

      {scanning ? (
        <div className="space-y-3">
          <QrScanner onScan={ficharQr} paused={!!enviando} />
          <Button variant="outline" className="w-full" onClick={() => setScanning(false)}>Cancelar</Button>
        </div>
      ) : (
        <div className={cn("grid gap-2", geoActivo && qrActivo && "sm:grid-cols-2")}>
          {geoActivo && (
            <Button className="h-14 w-full gap-2 text-base" onClick={ficharGeo} disabled={!!enviando}>
              {enviando === "geo" ? <Loader2 className="h-5 w-5 animate-spin" /> : <MapPin className="h-5 w-5" />}
              {enviando === "geo" ? "Verificando ubicación…" : "Fichar con mi ubicación"}
            </Button>
          )}
          {qrActivo && (
            <Button variant={geoActivo ? "outline" : "default"} className="h-14 w-full gap-2 text-base" disabled={!!enviando}
              onClick={() => { setResultado(null); setScanning(true); }}>
              {geoActivo ? <QrCode className="h-5 w-5" /> : <Camera className="h-5 w-5" />}Escanear QR
            </Button>
          )}
        </div>
      )}

      {enviando === "qr" && (
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Registrando…</p>
      )}

      {resultado && (
        <div className={cn("rounded-xl border p-4 text-center", resultado.ok ? "border-success/30 bg-success/10" : "border-destructive/30 bg-destructive/10")}>
          {resultado.ok ? <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-success" /> : <XCircle className="mx-auto mb-2 h-8 w-8 text-destructive" />}
          <p className={cn("text-sm font-medium", resultado.ok ? "text-success" : "text-destructive")}>{resultado.msg}</p>
          {resultado.detalle && <p className="mt-0.5 text-xs text-muted-foreground">{resultado.detalle}</p>}
        </div>
      )}
    </div>
  );
}
