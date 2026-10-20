import { useCallback, useEffect, useRef, useState } from "react";
import { CameraOff, CheckCircle2, Loader2, LogIn, LogOut, ScanFace, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  PruebaDeVida, TEXTO_DESAFIO, cargarFaceApi, desafioAleatorio, detectarRostro, mirandoDeFrente,
  type Deteccion,
} from "@/lib/faceRecognition";
import { MUESTRAS_REGISTRO, distancia, muestrasConsistentes } from "../../../supabase/functions/_shared/face-match";

const INTERVALO_MS = 120;
const TIEMPO_DESAFIO_MS = 10_000;
const TAMANO_MINIMO = 0.18;
/** Tolerancia para confirmar que sigue la misma persona durante la prueba de vida (no identifica a nadie). */
const MISMA_PERSONA_SESION = 0.6;

export const TEXTO_CONSENTIMIENTO =
  "Autorizo a mi empleador a generar y guardar una plantilla numérica de mi rostro (no se guardan fotos) " +
  "con el único fin de registrar mi asistencia. Entiendo que es un dato sensible según la Ley 25.326 de " +
  "Protección de Datos Personales, que puedo seguir fichando con QR y que puedo revocar este consentimiento " +
  "y pedir que se borre en cualquier momento desde Autogestión o a través de RRHH.";

/* ─────────────── Cámara ─────────────── */

function useCamara(activa: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [lista, setLista] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activa) return;
    let stream: MediaStream | null = null;
    let cancelado = false;
    setError(null);
    setLista(false);

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Este navegador no permite usar la cámara.");
        const [s] = await Promise.all([
          navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false }),
          cargarFaceApi(),
        ]);
        if (cancelado) { s.getTracks().forEach((t) => t.stop()); return; }
        stream = s;
        const v = videoRef.current;
        if (v) {
          v.srcObject = s;
          await v.play().catch(() => undefined);
        }
        setLista(true);
      } catch (e) {
        const nombre = e instanceof DOMException ? e.name : "";
        setError(
          nombre === "NotAllowedError" ? "Permití el acceso a la cámara en el navegador para continuar."
            : nombre === "NotFoundError" ? "No se encontró ninguna cámara conectada."
              : e instanceof Error ? e.message : "No se pudo iniciar la cámara."
        );
      }
    })();

    return () => {
      cancelado = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [activa]);

  return { videoRef, lista, error };
}

/** Ejecuta la detección en bucle mientras `activo` sea true. */
function useBucleDeteccion(
  videoRef: React.RefObject<HTMLVideoElement>,
  activo: boolean,
  onDeteccion: (d: Deteccion | null) => void | Promise<void>,
) {
  const cb = useRef(onDeteccion);
  cb.current = onDeteccion;

  useEffect(() => {
    if (!activo) return;
    let vivo = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      const v = videoRef.current;
      if (v && v.readyState >= 2 && !document.hidden) {
        try { await cb.current(await detectarRostro(v)); } catch { /* frame perdido */ }
      }
      if (vivo) timer = setTimeout(tick, INTERVALO_MS);
    };
    tick();
    return () => { vivo = false; clearTimeout(timer); };
  }, [activo, videoRef]);
}

function VistaCamara({
  videoRef, estado, children,
}: {
  videoRef: React.RefObject<HTMLVideoElement>;
  estado: "neutro" | "activo" | "ok" | "error";
  children?: React.ReactNode;
}) {
  return (
    <div className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-2xl bg-black">
      <video ref={videoRef} playsInline muted className="h-full w-full object-cover -scale-x-100" />
      <div
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 h-[72%] aspect-[3/4] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-4 transition-colors",
          estado === "neutro" && "border-white/50",
          estado === "activo" && "border-primary",
          estado === "ok" && "border-success",
          estado === "error" && "border-destructive",
        )}
      />
      {children}
    </div>
  );
}

/* ─────────────── Terminal: fichada por rostro ─────────────── */

type EstadoTerminal =
  | { fase: "buscando"; aviso?: string }
  | { fase: "desafio"; texto: string; progreso: number }
  | { fase: "verificando" }
  | { fase: "resultado"; ok: boolean; titulo: string; detalle: string; tipo?: "entrada" | "salida" };

export function FaceTerminal({ onFichada }: { onFichada?: () => void }) {
  const { videoRef, lista, error } = useCamara(true);
  const [estado, setEstado] = useState<EstadoTerminal>({ fase: "buscando" });
  const ref = useRef<{ prueba: PruebaDeVida | null; inicial: number[] | null; desde: number; sinCara: number }>({
    prueba: null, inicial: null, desde: 0, sinCara: 0,
  });

  const reiniciar = useCallback((aviso?: string) => {
    ref.current = { prueba: null, inicial: null, desde: 0, sinCara: 0 };
    setEstado({ fase: "buscando", aviso });
  }, []);

  const mostrarResultado = useCallback((r: Extract<EstadoTerminal, { fase: "resultado" }>) => {
    setEstado(r);
    setTimeout(() => reiniciar(), r.ok ? 4000 : 3500);
  }, [reiniciar]);

  const fichar = useCallback(async (descriptor: number[]) => {
    setEstado({ fase: "verificando" });
    const { data, error: fnError } = await supabase.functions.invoke("validate-attendance-token", {
      body: { action: "face-fichar", descriptor, prueba_vida: true },
    });
    // Los errores 4xx traen el mensaje en el cuerpo de la respuesta
    let mensaje: string | undefined = data?.error;
    if (fnError && !mensaje) {
      try { mensaje = (await (fnError as { context?: Response }).context?.json())?.error; } catch { /* sin cuerpo */ }
    }
    if (mensaje || fnError) {
      mostrarResultado({ fase: "resultado", ok: false, titulo: "No se pudo fichar", detalle: mensaje ?? "Error de conexión" });
      return;
    }
    const hora = new Date(data.hora).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    const nombre = `${data.empleado.nombre} ${data.empleado.apellido}`;
    if (data.repetida) {
      mostrarResultado({ fase: "resultado", ok: true, tipo: data.tipo, titulo: nombre, detalle: `Ya registraste tu ${data.tipo} a las ${hora}` });
    } else {
      mostrarResultado({
        fase: "resultado", ok: true, tipo: data.tipo, titulo: nombre,
        detalle: `${data.tipo === "entrada" ? "Entrada" : "Salida"} registrada a las ${hora}`,
      });
      onFichada?.();
    }
  }, [mostrarResultado, onFichada]);

  const activo = lista && (estado.fase === "buscando" || estado.fase === "desafio");

  useBucleDeteccion(videoRef, activo, async (d) => {
    const s = ref.current;
    if (estado.fase === "buscando") {
      if (!d) return;
      if (d.tamano < TAMANO_MINIMO) { setEstado({ fase: "buscando", aviso: "Acercate un poco a la cámara" }); return; }
      if (!mirandoDeFrente(d)) { setEstado({ fase: "buscando", aviso: "Mirá de frente a la cámara" }); return; }
      s.inicial = d.descriptor;
      s.prueba = new PruebaDeVida(desafioAleatorio());
      s.desde = Date.now();
      s.sinCara = 0;
      setEstado({ fase: "desafio", texto: TEXTO_DESAFIO[s.prueba.desafio], progreso: 0 });
      return;
    }

    if (estado.fase === "desafio" && s.prueba) {
      if (Date.now() - s.desde > TIEMPO_DESAFIO_MS) { reiniciar("Se agotó el tiempo, probá de nuevo"); return; }
      if (!d) {
        if (++s.sinCara > 12) reiniciar("Perdimos tu rostro, volvé a ubicarte");
        return;
      }
      s.sinCara = 0;
      // Si aparece otra persona en medio del desafío, se empieza de cero. Sólo se compara de
      // frente: con la cabeza girada el descriptor de la misma persona se aleja bastante.
      if (s.inicial && mirandoDeFrente(d) && distancia(s.inicial, d.descriptor) > MISMA_PERSONA_SESION) { reiniciar(); return; }
      const completo = s.prueba.actualizar(d);
      if (!completo) {
        setEstado({ fase: "desafio", texto: TEXTO_DESAFIO[s.prueba.desafio], progreso: s.prueba.progreso });
        return;
      }
      if (!mirandoDeFrente(d)) {
        setEstado({ fase: "desafio", texto: "¡Bien! Ahora mirá de frente", progreso: 0.9 });
        return;
      }
      s.prueba = null;
      await fichar(d.descriptor);
    }
  });

  if (error) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <CameraOff className="h-8 w-8 mx-auto text-destructive mb-3" />
        <p className="text-sm text-destructive">{error}</p>
        <p className="text-xs text-muted-foreground mt-2">Mientras tanto, los empleados pueden fichar con el código QR.</p>
      </div>
    );
  }

  const marco = estado.fase === "resultado" ? (estado.ok ? "ok" : "error") : estado.fase === "buscando" ? "neutro" : "activo";

  return (
    <div className="space-y-3">
      <VistaCamara videoRef={videoRef} estado={marco}>
        {!lista && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-white">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">Preparando reconocimiento facial…</p>
          </div>
        )}
        {estado.fase === "resultado" && (
          <div className={cn("absolute inset-x-0 bottom-0 p-4 text-white", estado.ok ? "bg-success/90" : "bg-destructive/90")}>
            <div className="flex items-center gap-3">
              {estado.ok
                ? (estado.tipo === "salida" ? <LogOut className="h-8 w-8 shrink-0" /> : <LogIn className="h-8 w-8 shrink-0" />)
                : <XCircle className="h-8 w-8 shrink-0" />}
              <div className="text-left">
                <p className="text-lg font-semibold leading-tight">{estado.titulo}</p>
                <p className="text-sm opacity-90">{estado.detalle}</p>
              </div>
            </div>
          </div>
        )}
        {estado.fase === "verificando" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}
      </VistaCamara>

      <div className="min-h-[56px] rounded-xl border bg-card px-4 py-3 text-center">
        {estado.fase === "buscando" && (
          <p className="text-sm flex items-center justify-center gap-2">
            <ScanFace className="h-4 w-4 text-primary" />
            {estado.aviso ?? "Ubicá tu rostro dentro del óvalo"}
          </p>
        )}
        {estado.fase === "desafio" && (
          <div className="space-y-2">
            <p className="text-base font-medium">{estado.texto}</p>
            <Progress value={estado.progreso * 100} className="h-1.5" />
          </div>
        )}
        {estado.fase === "verificando" && <p className="text-sm text-muted-foreground">Verificando identidad…</p>}
        {estado.fase === "resultado" && (
          <p className="text-sm text-muted-foreground">{estado.ok ? "¡Listo! Que tengas buena jornada." : "Probá de nuevo o usá el código QR."}</p>
        )}
      </div>
    </div>
  );
}

/* ─────────────── Registro del rostro (con consentimiento) ─────────────── */

const MUESTRAS = MUESTRAS_REGISTRO;

export function FaceEnrollDialog({
  open, onOpenChange, empleadoId, nombreEmpleado, onRegistrado,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  empleadoId: string;
  nombreEmpleado?: string;
  onRegistrado?: () => void;
}) {
  const [acepta, setAcepta] = useState(false);
  const [paso, setPaso] = useState<"consentimiento" | "captura">("consentimiento");

  useEffect(() => {
    if (!open) { setPaso("consentimiento"); setAcepta(false); }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ScanFace className="h-5 w-5 text-primary" />Registrar rostro para fichar</DialogTitle>
          <DialogDescription>
            {nombreEmpleado ? `${nombreEmpleado} podrá fichar mirando a la cámara de la terminal.` : "Vas a poder fichar mirando a la cámara de la terminal."}
          </DialogDescription>
        </DialogHeader>

        {paso === "consentimiento" ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-3 text-sm leading-relaxed">
              <p className="font-medium flex items-center gap-1.5 mb-1.5"><ShieldCheck className="h-4 w-4 text-primary" />Consentimiento informado</p>
              {TEXTO_CONSENTIMIENTO}
            </div>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <Checkbox checked={acepta} onCheckedChange={(v) => setAcepta(v === true)} className="mt-0.5" />
              <span>{nombreEmpleado ? `${nombreEmpleado} leyó y acepta` : "Leí y acepto"} el uso de sus datos biométricos para fichar.</span>
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button disabled={!acepta} onClick={() => setPaso("captura")}>Continuar</Button>
            </div>
          </div>
        ) : (
          <CapturaRegistro
            empleadoId={empleadoId}
            onListo={() => { onOpenChange(false); onRegistrado?.(); }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CapturaRegistro({ empleadoId, onListo }: { empleadoId: string; onListo: () => void }) {
  const { videoRef, lista, error } = useCamara(true);
  const [fase, setFase] = useState<"desafio" | "muestras" | "guardando" | "error">("desafio");
  const [mensaje, setMensaje] = useState("Ubicá tu rostro dentro del óvalo");
  const [progreso, setProgreso] = useState(0);
  const prueba = useRef(new PruebaDeVida(desafioAleatorio()));
  const muestras = useRef<number[][]>([]);
  const ultimaMuestra = useRef(0);

  const guardar = async () => {
    setFase("guardando");
    if (!muestrasConsistentes(muestras.current)) {
      setFase("error");
      setMensaje("Las capturas no coinciden. Probá de nuevo con buena luz.");
      return;
    }
    const { data, error: fnError } = await supabase.functions.invoke("validate-attendance-token", {
      body: {
        action: "face-enroll",
        empleado_id: empleadoId,
        descriptores: muestras.current,
        consentimiento_texto: TEXTO_CONSENTIMIENTO,
      },
    });
    let msg: string | undefined = data?.error;
    if (fnError && !msg) {
      try { msg = (await (fnError as { context?: Response }).context?.json())?.error; } catch { /* sin cuerpo */ }
    }
    if (msg || fnError) {
      setFase("error");
      setMensaje(msg ?? "No se pudo guardar el registro");
      return;
    }
    toast.success("Rostro registrado. Ya podés fichar con la cámara.");
    onListo();
  };

  const reintentar = () => {
    prueba.current = new PruebaDeVida(desafioAleatorio());
    muestras.current = [];
    setProgreso(0);
    setMensaje("Ubicá tu rostro dentro del óvalo");
    setFase("desafio");
  };

  useBucleDeteccion(videoRef, lista && (fase === "desafio" || fase === "muestras"), async (d) => {
    if (!d) { setMensaje("Ubicá tu rostro dentro del óvalo"); return; }
    if (d.tamano < TAMANO_MINIMO) { setMensaje("Acercate un poco a la cámara"); return; }

    if (fase === "desafio") {
      const p = prueba.current;
      if (p.actualizar(d)) { setFase("muestras"); setMensaje("¡Perfecto! Mirá de frente y quedate quieto"); return; }
      setMensaje(TEXTO_DESAFIO[p.desafio]);
      setProgreso(p.progreso * 40);
      return;
    }

    if (fase === "muestras") {
      if (!mirandoDeFrente(d)) { setMensaje("Mirá de frente a la cámara"); return; }
      if (Date.now() - ultimaMuestra.current < 350) return;
      ultimaMuestra.current = Date.now();
      muestras.current.push(d.descriptor);
      setProgreso(40 + (muestras.current.length / MUESTRAS) * 60);
      if (muestras.current.length >= MUESTRAS) await guardar();
    }
  });

  if (error) {
    return (
      <div className="py-6 text-center">
        <CameraOff className="h-8 w-8 mx-auto text-destructive mb-3" />
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <VistaCamara videoRef={videoRef} estado={fase === "error" ? "error" : fase === "guardando" ? "ok" : lista ? "activo" : "neutro"}>
        {!lista && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-white">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">Iniciando cámara…</p>
          </div>
        )}
      </VistaCamara>
      <Progress value={progreso} className="h-1.5" />
      <p className={cn("text-center text-sm font-medium", fase === "error" && "text-destructive")}>
        {fase === "guardando" ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Guardando…</span> : mensaje}
      </p>
      {fase === "error" && (
        <div className="flex justify-center"><Button variant="outline" onClick={reintentar}>Intentar de nuevo</Button></div>
      )}
    </div>
  );
}

/* ─────────────── Estado del registro facial de un empleado ─────────────── */

export function RegistroFacialCard({ empleadoId, nombreEmpleado, esPropio }: { empleadoId: string; nombreEmpleado?: string; esPropio: boolean }) {
  const [registro, setRegistro] = useState<{ consentimiento_at: string } | null | undefined>(undefined);
  const [abierto, setAbierto] = useState(false);
  const [borrando, setBorrando] = useState(false);

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from("rostros_empleados")
      .select("empleado_id, consentimiento_at")
      .eq("empleado_id", empleadoId)
      .maybeSingle();
    setRegistro(data ?? null);
  }, [empleadoId]);

  useEffect(() => { cargar(); }, [cargar]);

  const borrar = async () => {
    if (!confirm(esPropio ? "¿Revocar tu consentimiento y borrar tu registro facial?" : "¿Borrar el registro facial de este empleado?")) return;
    setBorrando(true);
    const { error } = await supabase.from("rostros_empleados").delete().eq("empleado_id", empleadoId);
    setBorrando(false);
    if (error) return toast.error("No se pudo borrar el registro");
    toast.success("Registro facial eliminado");
    cargar();
  };

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className={cn("rounded-full p-2", registro ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
          {registro ? <CheckCircle2 className="h-5 w-5" /> : <ScanFace className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Fichada con reconocimiento facial</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {registro === undefined ? "Consultando…"
              : registro ? `Rostro registrado el ${new Date(registro.consentimiento_at).toLocaleDateString("es-AR")}`
                : esPropio ? "Registrá tu rostro una vez y fichá mirando la cámara de la terminal." : "Sin rostro registrado."}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button size="sm" variant={registro ? "outline" : "default"} onClick={() => setAbierto(true)}>
              <ScanFace className="h-4 w-4 mr-1.5" />{registro ? "Volver a registrar" : "Registrar rostro"}
            </Button>
            {registro && (
              <Button size="sm" variant="ghost" className="text-destructive" disabled={borrando} onClick={borrar}>
                {esPropio ? "Revocar y borrar" : "Borrar registro"}
              </Button>
            )}
          </div>
        </div>
      </div>
      <FaceEnrollDialog open={abierto} onOpenChange={setAbierto} empleadoId={empleadoId} nombreEmpleado={esPropio ? undefined : nombreEmpleado} onRegistrado={cargar} />
    </div>
  );
}
