import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { CameraOff, CheckCircle2, Loader2, LogIn, LogOut, RotateCcw, ScanFace, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { invocarFuncion } from "@/lib/sesion";
import { cn } from "@/lib/utils";
import {
  PruebaDeVida, TEXTO_DESAFIO, cargarFaceApi, detectarPuntos, detectarRostro, mirandoDeFrente,
  mismaPosicion, tieneDescriptor, type Deteccion,
} from "@/lib/faceRecognition";
import { MUESTRAS_REGISTRO, distancia, muestrasConsistentes } from "../../../supabase/functions/_shared/face-match";
import { AutorizarRostroDialog } from "@/components/asistencia/AutorizarRostroDialog";
import { errorDeCamara, errorDeModelos, type ErrorCamara } from "@/lib/errorCamara";

const INTERVALO_MS = 120;
const TIEMPO_DESAFIO_MS = 10_000;
const TAMANO_MINIMO = 0.18;
/** Tolerancia para confirmar que sigue la misma persona durante la prueba de vida (no identifica a nadie). */
const MISMA_PERSONA_SESION = 0.6;
/** Si el reconocimiento no terminó de descargarse en este tiempo, se avisa (conexión lenta). */
const ESPERA_MODELOS_MS = 60_000;
/** Pasado este tiempo sin imagen o sin reconocimiento se explica qué está esperando. */
const AVISO_DEMORA_MS = 5_000;

type Espera = "permiso" | "descarga" | null;

export const TEXTO_CONSENTIMIENTO =
  "Autorizo a mi empleador a generar y guardar una plantilla numérica de mi rostro con el único fin de " +
  "registrar mi asistencia. Si lo registro desde mi celular, también se guarda una foto que sólo ve RRHH " +
  "para autorizar el registro y que se borra apenas lo autoriza o lo rechaza. Entiendo que es un dato sensible según la Ley 25.326 de " +
  "Protección de Datos Personales, que puedo seguir fichando con QR y que puedo revocar este consentimiento " +
  "y pedir que se borre en cualquier momento desde Autogestión o a través de RRHH.";

/* ─────────────── Cámara ─────────────── */

function useCamara(activa: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [lista, setLista] = useState(false);
  const [error, setError] = useState<ErrorCamara | null>(null);
  const [intento, setIntento] = useState(0);
  const [espera, setEspera] = useState<Espera>(null);
  const reintentar = useCallback(() => setIntento((n) => n + 1), []);

  useEffect(() => {
    if (!activa) return;
    let stream: MediaStream | null = null;
    let cancelado = false;
    const detener = () => { stream?.getTracks().forEach((t) => t.stop()); stream = null; };
    let aviso: ReturnType<typeof setTimeout> | undefined;
    const avisarSiTarda = (e: Espera) => {
      clearTimeout(aviso);
      setEspera(null);
      if (e) aviso = setTimeout(() => { if (!cancelado) setEspera(e); }, AVISO_DEMORA_MS);
    };
    setError(null);
    setLista(false);
    avisarSiTarda("permiso");

    (async () => {
      const ua = navigator.userAgent;
      // Los modelos se descargan en paralelo, pero la imagen se muestra apenas hay permiso
      const modelos = cargarFaceApi();
      modelos.catch(() => undefined);
      let s: MediaStream;
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error("Sin soporte de cámara"), { name: "SinSoporte" });
        try {
          s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
        } catch (e) {
          // Webcams que no informan cámara frontal o no aceptan la resolución pedida
          const nombre = e instanceof DOMException ? e.name : "";
          if (nombre === "NotAllowedError" || nombre === "SecurityError") throw e;
          s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
      } catch (e) {
        console.warn("Cámara:", e);
        avisarSiTarda(null);
        if (!cancelado) setError(errorDeCamara(e, ua));
        return;
      }
      if (cancelado) { s.getTracks().forEach((t) => t.stop()); return; }
      stream = s;
      avisarSiTarda("descarga");
      const v = videoRef.current;
      if (v) {
        v.srcObject = s;
        v.play().catch(() => undefined);
      }
      try {
        await Promise.race([
          modelos,
          new Promise((_, rechazar) => setTimeout(() => rechazar(new Error("timeout")), ESPERA_MODELOS_MS)),
        ]);
      } catch (e) {
        console.warn("Reconocimiento facial:", e);
        avisarSiTarda(null);
        if (!cancelado) { detener(); setError(errorDeModelos(e)); }
        return;
      }
      if (cancelado) return;
      avisarSiTarda(null);
      setLista(true);
    })();

    return () => {
      cancelado = true;
      clearTimeout(aviso);
      detener();
    };
  }, [activa, intento]);

  return { videoRef, lista, error, reintentar, espera };
}

/** Texto bajo el "cargando" cuando la cámara tarda. */
function TextoEspera({ espera }: { espera: Espera }) {
  if (!espera) return null;
  return (
    <p className="px-6 text-center text-xs text-white/80">
      {espera === "permiso"
        ? "Si el celular te pregunta, tocá «Permitir» para usar la cámara."
        : "Descargando el reconocimiento facial (unos 7 MB). Con conexión lenta puede tardar un poco."}
    </p>
  );
}

/** Por qué no arrancó la cámara, qué hacer, el código para pasarle a RRHH y Reintentar. */
function AvisoErrorCamara({ error, onReintentar, nota, className }: {
  error: ErrorCamara; onReintentar: () => void; nota?: string; className?: string;
}) {
  return (
    <div className={cn("text-center space-y-2", className)}>
      <CameraOff className="h-8 w-8 mx-auto text-destructive" />
      <p className="text-sm font-medium text-destructive">{error.mensaje}</p>
      {error.ayuda && <p className="text-xs text-muted-foreground max-w-sm mx-auto">{error.ayuda}</p>}
      <Button variant="outline" size="sm" onClick={onReintentar}><RotateCcw className="h-4 w-4 mr-1.5" />Reintentar</Button>
      {nota && <p className="text-xs text-muted-foreground">{nota}</p>}
      <p className="text-[10px] text-muted-foreground/70">Código: {error.codigo}</p>
    </div>
  );
}

/** Ejecuta la detección en bucle mientras `activo` sea true. */
function useBucleDeteccion(
  videoRef: React.RefObject<HTMLVideoElement>,
  activo: boolean,
  onDeteccion: (d: Deteccion | null) => void | Promise<void>,
  liviana = false,
) {
  const modo = useRef(liviana);
  modo.current = liviana;
  const cb = useRef(onDeteccion);
  cb.current = onDeteccion;

  useEffect(() => {
    if (!activo) return;
    let vivo = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      const v = videoRef.current;
      if (v && v.readyState >= 2 && !document.hidden) {
        try { await cb.current(await (modo.current ? detectarPuntos(v) : detectarRostro(v))); } catch { /* frame perdido */ }
      }
      if (vivo) timer = setTimeout(tick, INTERVALO_MS);
    };
    tick();
    return () => { vivo = false; clearTimeout(timer); };
  }, [activo, videoRef]);
}

const VistaCamara = forwardRef<HTMLDivElement, {
  videoRef: React.RefObject<HTMLVideoElement>;
  estado: "neutro" | "activo" | "ok" | "error";
  children?: React.ReactNode;
}>(function VistaCamara({ videoRef, estado, children }, ref) {
  return (
    <div ref={ref} className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-2xl bg-black">
      <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover -scale-x-100" />
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
});

/* ─────────────── Terminal: fichada por rostro ─────────────── */

type EstadoTerminal =
  | { fase: "buscando"; aviso?: string }
  // capturando: la prueba de vida ya se cumplió y falta una foto completa para identificar
  | { fase: "desafio"; texto: string; progreso: number; capturando?: boolean }
  | { fase: "verificando" }
  | { fase: "resultado"; ok: boolean; titulo: string; detalle: string; tipo?: "entrada" | "salida" };

export function FaceTerminal({ onFichada }: { onFichada?: () => void }) {
  const { videoRef, lista, error, reintentar, espera } = useCamara(true);
  const [estado, setEstado] = useState<EstadoTerminal>({ fase: "buscando" });
  const ref = useRef<{ prueba: PruebaDeVida | null; inicial: number[] | null; caja: Deteccion["box"] | null; desde: number; sinCara: number }>({
    prueba: null, inicial: null, caja: null, desde: 0, sinCara: 0,
  });

  const reiniciar = useCallback((aviso?: string) => {
    ref.current = { prueba: null, inicial: null, caja: null, desde: 0, sinCara: 0 };
    setEstado({ fase: "buscando", aviso });
  }, []);

  const mostrarResultado = useCallback((r: Extract<EstadoTerminal, { fase: "resultado" }>) => {
    setEstado(r);
    setTimeout(() => reiniciar(), r.ok ? 4000 : 3500);
  }, [reiniciar]);

  const fichar = useCallback(async (descriptor: number[]) => {
    setEstado({ fase: "verificando" });
    const { data, error: fnError } = await invocarFuncion("validate-attendance-token", { action: "face-fichar", descriptor, prueba_vida: true });
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
      if (!tieneDescriptor(d)) return;
      s.inicial = d.descriptor;
      s.caja = d.box;
      s.prueba = new PruebaDeVida();
      s.desde = Date.now();
      s.sinCara = 0;
      setEstado({ fase: "desafio", texto: TEXTO_DESAFIO, progreso: 0 });
      return;
    }

    if (estado.fase === "desafio" && s.prueba) {
      if (Date.now() - s.desde > TIEMPO_DESAFIO_MS) { reiniciar("Se agotó el tiempo. Girá la cabeza despacio hacia un costado y volvé al centro"); return; }
      if (!d) {
        if (++s.sinCara > 12) reiniciar("Perdimos tu rostro, volvé a ubicarte");
        return;
      }
      s.sinCara = 0;

      if (estado.capturando) {
        // Foto completa final: tiene que ser la misma persona que empezó el desafío
        if (!tieneDescriptor(d)) return;
        if (!mirandoDeFrente(d)) { setEstado({ ...estado, texto: "¡Bien! Ahora mirá de frente" }); return; }
        if (s.inicial && distancia(s.inicial, d.descriptor) > MISMA_PERSONA_SESION) { reiniciar("Empecemos de nuevo, de a una persona"); return; }
        s.prueba = null;
        await fichar(d.descriptor);
        return;
      }

      // Durante el gesto se usan detecciones livianas (sin descriptor): se controla que la cara no salte de lugar
      if (s.caja && !mismaPosicion(s.caja, d.box)) { reiniciar("Empecemos de nuevo, de a una persona"); return; }
      s.caja = d.box;
      const completo = s.prueba.actualizar(d);
      setEstado(completo
        ? { fase: "desafio", texto: "¡Bien! Ahora mirá de frente", progreso: 0.95, capturando: true }
        : { fase: "desafio", texto: TEXTO_DESAFIO, progreso: s.prueba.progreso });
    }
  }, estado.fase === "desafio" && !estado.capturando);

  if (error) {
    return (
      <AvisoErrorCamara error={error} onReintentar={reintentar} className="rounded-2xl border bg-card p-8"
        nota="Mientras tanto, los empleados pueden fichar con el código QR." />
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
            <TextoEspera espera={espera} />
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

/** Foto chica del cuadro actual de la cámara, para que RRHH autorice un registro hecho a distancia. */
function fotoDeCamara(video: HTMLVideoElement | null): string | null {
  if (!video?.videoWidth) return null;
  const ancho = 360;
  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = Math.round((video.videoHeight / video.videoWidth) * ancho);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  // Igual que la vista previa (espejada), para que RRHH vea lo mismo que vio el empleado
  ctx.translate(ancho, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.8);
}

function CapturaRegistro({ empleadoId, onListo }: { empleadoId: string; onListo: () => void }) {
  const cantidad = MUESTRAS;
  const { videoRef, lista, error, reintentar: reintentarCamara, espera } = useCamara(true);
  const [fase, setFase] = useState<"desafio" | "muestras" | "guardando" | "error">("desafio");
  const [mensaje, setMensaje] = useState("Ubicá tu rostro dentro del óvalo");
  const [progreso, setProgreso] = useState(0);
  const prueba = useRef(new PruebaDeVida());
  const muestras = useRef<number[][]>([]);
  const foto = useRef<string | null>(null);
  const ultimaMuestra = useRef(0);

  const guardar = async () => {
    setFase("guardando");
    if (!muestrasConsistentes(muestras.current)) {
      setFase("error");
      setMensaje("Las capturas no coinciden. Probá de nuevo con buena luz.");
      return;
    }
    const { data, error: fnError } = await invocarFuncion("validate-attendance-token",
      { action: "face-enroll", empleado_id: empleadoId, descriptores: muestras.current, consentimiento_texto: TEXTO_CONSENTIMIENTO, foto: foto.current });
    let msg: string | undefined = data?.error;
    if (fnError && !msg) {
      try { msg = (await (fnError as { context?: Response }).context?.json())?.error; } catch { /* sin cuerpo */ }
    }
    if (msg || fnError) {
      setFase("error");
      setMensaje(msg ?? "No se pudo guardar el registro");
      return;
    }
    if (data?.verificado) toast.success("Rostro registrado. Ya puede fichar con la cámara.");
    else toast.success("Rostro registrado. RRHH revisa tu foto y te habilita para fichar con la cámara.", { duration: 7000 });
    onListo();
  };

  const reintentar = () => {
    prueba.current = new PruebaDeVida();
    muestras.current = [];
    foto.current = null;
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
      setMensaje(TEXTO_DESAFIO);
      setProgreso(p.progreso * 40);
      return;
    }

    if (fase === "muestras") {
      // Una detección liviana que quedó en curso al terminar el desafío no sirve como muestra
      if (!tieneDescriptor(d)) return;
      if (!mirandoDeFrente(d)) { setMensaje("Mirá de frente a la cámara"); return; }
      if (Date.now() - ultimaMuestra.current < 350) return;
      ultimaMuestra.current = Date.now();
      // La foto se toma con la primera muestra de frente, después de la prueba de vida
      if (!foto.current) foto.current = fotoDeCamara(videoRef.current);
      muestras.current.push(d.descriptor);
      setProgreso(40 + (muestras.current.length / cantidad) * 60);
      if (muestras.current.length >= cantidad) await guardar();
    }
  }, fase === "desafio");

  if (error) {
    return <AvisoErrorCamara error={error} onReintentar={reintentarCamara} className="py-6" nota="Mientras tanto podés fichar con QR." />;
  }

  return (
    <div className="space-y-3">
      <VistaCamara videoRef={videoRef} estado={fase === "error" ? "error" : fase === "guardando" ? "ok" : lista ? "activo" : "neutro"}>
        {!lista && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-white">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">Iniciando cámara…</p>
            <TextoEspera espera={espera} />
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
  const [registro, setRegistro] = useState<{ consentimiento_at: string; verificado_at: string | null; foto_path: string | null } | null | undefined>(undefined);
  const [abierto, setAbierto] = useState(false);
  const [autorizando, setAutorizando] = useState(false);
  const [borrando, setBorrando] = useState(false);

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from("rostros_empleados")
      .select("empleado_id, consentimiento_at, verificado_at, foto_path")
      .eq("empleado_id", empleadoId)
      .maybeSingle();
    setRegistro(data ?? null);
  }, [empleadoId]);

  useEffect(() => { cargar(); }, [cargar]);

  const borrar = async () => {
    if (!confirm(esPropio ? "¿Revocar tu consentimiento y borrar tu registro facial?" : "¿Borrar el registro facial de este empleado?")) return;
    setBorrando(true);
    // Por la función: además de la plantilla borra la foto de autorización, si quedó alguna
    const { data, error } = await invocarFuncion("validate-attendance-token", { action: "face-borrar", empleado_id: empleadoId });
    setBorrando(false);
    if (error || data?.error) return toast.error("No se pudo borrar el registro");
    toast.success("Registro facial eliminado");
    cargar();
  };

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className={cn("rounded-full p-2", registro?.verificado_at ? "bg-success/15 text-success" : registro ? "bg-warning/20 text-warning-foreground" : "bg-muted text-muted-foreground")}>
          {registro?.verificado_at ? <CheckCircle2 className="h-5 w-5" /> : registro ? <ShieldCheck className="h-5 w-5" /> : <ScanFace className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Fichada con reconocimiento facial</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {registro === undefined ? "Consultando…"
              : registro?.verificado_at ? `Rostro registrado el ${new Date(registro.consentimiento_at).toLocaleDateString("es-AR")} y verificado.`
              : registro ? (esPropio
                ? "Rostro registrado. RRHH revisa tu foto y te habilita; mientras tanto fichá con QR."
                : registro.foto_path ? "Registrado por el empleado. Falta autorizarlo mirando la foto."
                : "Registrado sin foto: que lo registre de nuevo desde su celular.")
                : esPropio ? "Registrá tu rostro una vez y fichá mirando la cámara de la terminal." : "Sin rostro registrado."}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {registro && !registro.verificado_at && !esPropio && registro.foto_path && (
              <Button size="sm" onClick={() => setAutorizando(true)}><ShieldCheck className="h-4 w-4 mr-1.5" />Ver foto y autorizar</Button>
            )}
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
      <FaceEnrollDialog open={abierto} onOpenChange={setAbierto}
        empleadoId={empleadoId} nombreEmpleado={esPropio ? undefined : nombreEmpleado} onRegistrado={cargar} />
      {autorizando && (
        <AutorizarRostroDialog empleadoId={empleadoId} nombre={nombreEmpleado ?? "el empleado"}
          onCerrar={() => setAutorizando(false)} onListo={cargar} />
      )}
    </div>
  );
}
