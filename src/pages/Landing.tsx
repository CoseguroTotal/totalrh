import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import DemoAccessDialog from "@/components/DemoAccessDialog";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo_total_rh.png";
import shotDashboard from "@/assets/landing/dashboard.jpg";
import shotMuro from "@/assets/landing/muro.jpg";
import shotMensajes from "@/assets/landing/mensajes.jpg";
import shotEncuesta from "@/assets/landing/encuesta.jpg";
import shotEventos from "@/assets/landing/eventos.jpg";
import shotTareas from "@/assets/landing/tareas.jpg";
import shotLegajo from "@/assets/landing/legajo_detalle.jpg";
import shotLiquidacion from "@/assets/landing/liquidacion.jpg";
import shotAsistencia from "@/assets/landing/asistencia.jpg";
import shotVacaciones from "@/assets/landing/vacaciones.jpg";
import shotMemorandums from "@/assets/landing/memorandums.jpg";
import shotReclutamiento from "@/assets/landing/reclutamiento.jpg";
import shotReportes from "@/assets/landing/reportes.jpg";
import shotEmpresas from "@/assets/landing/empresas.jpg";
import shotConfigFichado from "@/assets/landing/configuracion.jpg";
import shotTerminal from "@/assets/landing/terminal_qr.jpg";
import shotMovilMuro from "@/assets/landing/movil_muro.jpg";
import shotMovilFichar from "@/assets/landing/movil_autogestion.jpg";
import shotMovilChat from "@/assets/landing/movil_chat.jpg";
import shotMovilEncuesta from "@/assets/landing/movil_encuesta.jpg";
import shotMovilTareas from "@/assets/landing/movil_tareas.jpg";
import shotMovilEventos from "@/assets/landing/movil_eventos.jpg";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  Cake,
  CalendarDays,
  CheckCircle2,
  Download,
  FileText,
  KeyRound,
  ListChecks,
  Lock,
  MapPin,
  Megaphone,
  MessagesSquare,
  QrCode,
  Receipt,
  Scale,
  ScanFace,
  Smartphone,
  Sparkles,
  UserPlus,
  Users,
  Vote,
  Wallet,
  type LucideIcon,
} from "lucide-react";

function Shot({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="rounded-xl border bg-card shadow-lg overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b bg-muted/60">
        <span className="h-2.5 w-2.5 rounded-full bg-destructive/40" />
        <span className="h-2.5 w-2.5 rounded-full bg-primary/30" />
        <span className="h-2.5 w-2.5 rounded-full bg-accent/40" />
      </div>
      <img src={src} alt={alt} loading="lazy" width={1800} height={1125} className="w-full h-auto block" />
    </div>
  );
}

/** Captura de celular con marco de teléfono */
function Phone({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`rounded-[2rem] border-[6px] border-foreground/85 bg-foreground/85 shadow-xl overflow-hidden ${className}`}>
      <img src={src} alt={alt} loading="lazy" width={780} height={1688} className="w-full h-auto block rounded-[1.6rem]" />
    </div>
  );
}

type Modulo = { icon: LucideIcon; titulo: string; img: string; texto: string; puntos?: string[]; nuevo?: boolean };

const COMUNICACION: Modulo[] = [
  {
    icon: Megaphone, titulo: "Muro de la empresa", img: shotMuro, nuevo: true,
    texto: "Una red interna para todo el personal: comunicados oficiales, publicaciones con fotos, comentarios y reacciones.",
    puntos: ["Comunicados fijados con confirmación de lectura", "Cumpleaños y aniversarios del equipo, para saludar con un toque", "Muro general y por grupos o sectores"],
  },
  {
    icon: MessagesSquare, titulo: "Mensajes del equipo", img: shotMensajes, nuevo: true,
    texto: "Chat interno, uno a uno o en grupo, sin mezclar el trabajo con el WhatsApp personal.",
    puntos: ["Fotos, archivos y mensajes de voz", "Directorio de compañeros de todo el grupo", "Aviso en el celular con cada mensaje nuevo"],
  },
  {
    icon: Vote, titulo: "Encuestas con imagen", img: shotEncuesta, nuevo: true,
    texto: "Medí el clima laboral o pedí opinión en minutos. La encuesta se anuncia sola en el muro y en el celular de cada uno.",
    puntos: ["Opción única, múltiple, escala o respuesta libre", "Anónimas o nominales, con fecha de cierre", "Resultados y participación al instante"],
  },
  {
    icon: CalendarDays, titulo: "Eventos y calendario", img: shotEventos, nuevo: true,
    texto: "Capacitaciones, reuniones, celebraciones y feriados en un calendario compartido por todo el grupo.",
    puntos: ["Confirmación de asistencia: voy, quizás, no voy", "Feriados nacionales precargados", "Anuncio automático en el muro"],
  },
  {
    icon: ListChecks, titulo: "Tareas", img: shotTareas, nuevo: true,
    texto: "Cada uno sabe qué tiene que hacer y para cuándo. Los superiores asignan y siguen el avance.",
    puntos: ["Prioridad, vencimiento y estado", "Aviso al asignar y al completar", "Vista de mis tareas y de las que asigné"],
  },
];

const GESTION: Modulo[] = [
  { icon: FileText, titulo: "Legajo digital 360°", img: shotLegajo, texto: "Datos personales, domicilio, grupo familiar, estudios, datos médicos, documentación con vencimientos, historial de cambios y línea de tiempo laboral." },
  { icon: Wallet, titulo: "Liquidación CCT 130/75", img: shotLiquidacion, texto: "Motor de cálculo con básicos, antigüedad, presentismo, horas extras, aportes y contribuciones. Liquidación masiva por período, simulador de recibo, liquidación final y recibos en PDF con el membrete de cada empresa." },
  { icon: QrCode, titulo: "Control de asistencia", img: shotAsistencia, texto: "Fichadas del día con el método de cada una (rostro, QR o ubicación), turnos, horas extra, llegadas tarde, novedades y planillas de horario." },
  { icon: CalendarDays, titulo: "Vacaciones según LCT", img: shotVacaciones, texto: "Días corridos calculados por antigüedad, calendario del equipo, solicitudes desde el celular y aprobación con un clic." },
  { icon: Scale, titulo: "Memorándums y sanciones", img: shotMemorandums, texto: "Envío individual o masivo por grupo, empresa o selección de empleados, PDF adjunto y descargo del empleado con cierre único." },
  { icon: Users, titulo: "Reclutamiento (ATS)", img: shotReclutamiento, texto: "Vacantes por empresa y pipeline de candidatos tipo kanban, desde la postulación hasta la contratación." },
  { icon: BarChart3, titulo: "Reportes y BI", img: shotReportes, texto: "Dashboard ejecutivo con dotación, rotación, licencias, antigüedad y distribución del personal. Exportación a Excel." },
];

const TODO: { icon: LucideIcon; t: string; nuevo?: boolean }[] = [
  { icon: Megaphone, t: "Muro y comunicados con lectura confirmada", nuevo: true },
  { icon: MessagesSquare, t: "Chat del equipo con fotos y audios", nuevo: true },
  { icon: Vote, t: "Encuestas con imagen", nuevo: true },
  { icon: CalendarDays, t: "Eventos con confirmación de asistencia", nuevo: true },
  { icon: ListChecks, t: "Tareas con prioridad y vencimiento", nuevo: true },
  { icon: Bell, t: "Avisos en el celular, aun con la app cerrada", nuevo: true },
  { icon: ScanFace, t: "Fichaje con reconocimiento facial", nuevo: true },
  { icon: MapPin, t: "Fichaje con GPS dentro del radio de la sucursal", nuevo: true },
  { icon: QrCode, t: "Fichaje por QR rotativo" },
  { icon: Cake, t: "Cumpleaños y aniversarios" },
  { icon: FileText, t: "Legajo digital completo" },
  { icon: Wallet, t: "Liquidación CCT 130/75 y liquidación final" },
  { icon: Receipt, t: "Recibos en PDF y envío por email" },
  { icon: CalendarDays, t: "Vacaciones y permisos" },
  { icon: Scale, t: "Memorándums con descargo" },
  { icon: Users, t: "Reclutamiento con pipeline" },
  { icon: UserPlus, t: "Alta del empleado con código de la empresa" },
  { icon: BarChart3, t: "Reportes y exportación a Excel" },
  { icon: Building2, t: "Multiempresa y multisucursal" },
  { icon: Download, t: "App instalable en iPhone y Android" },
];

function Badge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
      <Sparkles className="h-3 w-3" /> Nuevo
    </span>
  );
}

function Filas({ items }: { items: Modulo[] }) {
  return (
    <>
      {items.map((m, i) => (
        <div key={m.titulo} className={`grid gap-8 lg:grid-cols-2 lg:items-center ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <m.icon className="h-5 w-5 text-primary" />
              </div>
              {m.nuevo && <Badge />}
            </div>
            <h3 className="text-xl font-semibold">{m.titulo}</h3>
            <p className="text-muted-foreground">{m.texto}</p>
            {m.puntos && (
              <ul className="space-y-1.5 text-sm">
                {m.puntos.map((p) => (
                  <li key={p} className="flex gap-2 items-start">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> {p}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Shot src={m.img} alt={`Pantalla de ${m.titulo} en TotalRH`} />
        </div>
      ))}
    </>
  );
}

export default function Landing() {
  const [demoOpen, setDemoOpen] = useState(false);
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setLogged(!!session));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <DemoAccessDialog open={demoOpen} onOpenChange={setDemoOpen} />

      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Logo de TotalRH" className="h-9 w-9 object-contain" />
            <span className="font-semibold">TotalRH</span>
          </div>
          <nav className="hidden md:flex items-center gap-5 text-sm text-muted-foreground">
            <a href="#funciones" className="hover:text-foreground">Funciones</a>
            <a href="#comunicacion" className="hover:text-foreground">Comunicación</a>
            <a href="#fichaje" className="hover:text-foreground">Fichaje</a>
            <a href="#celular" className="hover:text-foreground">App</a>
          </nav>
          <div className="flex items-center gap-2">
            {logged && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/muro">Volver al sistema</Link>
              </Button>
            )}
            <Button size="sm" onClick={() => setDemoOpen(true)}>Acceder a la demo</Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" aria-hidden="true" />
          <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-24 grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Hecho para empresas argentinas
              </span>
              <h1 className="text-3xl sm:text-5xl font-bold tracking-tight leading-tight">
                Toda la gestión de personal de tu grupo empresario, en un solo sistema
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground">
                Legajos digitales, liquidación bajo CCT 130/75, fichaje con reconocimiento facial, GPS o QR, vacaciones según LCT
                y una app para que tu equipo se comunique: muro, chat, encuestas, eventos y tareas. Multiempresa y multisucursal.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button size="lg" className="gap-2" onClick={() => setDemoOpen(true)}>
                  Probar la demo <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="#funciones">Ver funcionalidades</a>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Te enviamos por email un código de acceso para recorrer el sistema con datos de ejemplo.
              </p>
            </div>
            <Shot src={shotDashboard} alt="Dashboard de TotalRH con indicadores de personal" />
          </div>
        </section>

        {/* Problema */}
        <section className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl sm:text-3xl font-semibold">El problema de gestionar RRHH con planillas</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { t: "Información dispersa", d: "Legajos en papel, planillas sueltas y carpetas compartidas: nadie sabe cuál es la versión válida." },
              { t: "Fichado manipulable", d: "Planillas firmadas por terceros, relojes que se comparten y horas que no coinciden con la liquidación." },
              { t: "Avisos que se pierden", d: "Comunicados en grupos de WhatsApp personales, sin saber quién los leyó." },
              { t: "Riesgo legal", d: "Sanciones sin descargo, vacaciones mal calculadas y documentación vencida frente a una inspección." },
            ].map((x) => (
              <div key={x.t} className="rounded-xl border bg-card p-5">
                <AlertTriangle className="h-5 w-5 text-destructive mb-3" />
                <h3 className="font-medium">{x.t}</h3>
                <p className="text-sm text-muted-foreground mt-1.5">{x.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Todo lo que incluye */}
        <section id="funciones" className="bg-muted/40 border-y scroll-mt-16">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-2xl sm:text-3xl font-semibold">Todo lo que incluye TotalRH</h2>
            <p className="text-muted-foreground mt-2">Todas las funciones vienen incluidas, sin módulos extra.</p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {TODO.map((x) => (
                <li key={x.t} className="flex items-start gap-3 rounded-xl border bg-card p-4">
                  <span className="h-9 w-9 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                    <x.icon className="h-[18px] w-[18px] text-primary" />
                  </span>
                  <span className="text-sm leading-snug">
                    {x.t}
                    {x.nuevo && <span className="block mt-1"><Badge /></span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Comunicación interna */}
        <section id="comunicacion" className="mx-auto max-w-6xl px-4 py-16 space-y-14 scroll-mt-16">
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold">Tu equipo, comunicado</h2>
            <p className="text-muted-foreground mt-2">
              Muro, chat, encuestas, eventos y tareas en la misma app del personal. Capturas reales del sistema en funcionamiento.
            </p>
          </div>
          <Filas items={COMUNICACION} />
        </section>

        {/* Fichaje */}
        <section id="fichaje" className="bg-muted/40 border-y scroll-mt-16">
          <div className="mx-auto max-w-6xl px-4 py-16 space-y-10">
            <div className="max-w-3xl">
              <h2 className="text-2xl sm:text-3xl font-semibold">Fichaje que nadie puede hacer por otro</h2>
              <p className="text-muted-foreground mt-2">
                Elegí uno o varios métodos por empresa. La hora la pone el servidor, no el dispositivo, y cada fichada queda registrada con su método.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { icon: ScanFace, t: "Reconocimiento facial", d: "La terminal reconoce al empleado con la cámara y le pide girar la cabeza: una foto no sirve. Cada uno registra su rostro una sola vez, con su consentimiento." },
                { icon: MapPin, t: "GPS con geocerca", d: "El empleado ficha desde su celular solo si está dentro del radio de su sucursal. Queda registrada la distancia y la precisión de la ubicación." },
                { icon: QrCode, t: "QR rotativo", d: "La terminal muestra un QR que se renueva cada pocos segundos y es de un solo uso: no se puede fotografiar ni compartir." },
              ].map((m) => (
                <div key={m.t} className="rounded-xl border bg-card p-5">
                  <div className="flex items-center gap-3">
                    <span className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><m.icon className="h-5 w-5 text-primary" /></span>
                    <h3 className="font-semibold">{m.t}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">{m.d}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="grid gap-4 sm:grid-cols-2">
                <Shot src={shotConfigFichado} alt="Configuración de los métodos de fichado: QR, ubicación y reconocimiento facial" />
                <Shot src={shotTerminal} alt="Terminal de fichado con código QR rotativo" />
              </div>
              <Phone src={shotMovilFichar} alt="Fichar con la ubicación desde el celular del empleado" className="w-48 sm:w-56 mx-auto" />
            </div>
          </div>
        </section>

        {/* Gestión */}
        <section className="mx-auto max-w-6xl px-4 py-16 space-y-14">
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold">Gestión de personal completa</h2>
            <p className="text-muted-foreground mt-2">Del alta a la liquidación final, con las reglas argentinas incorporadas.</p>
          </div>
          <Filas items={GESTION} />
        </section>

        {/* Cumplimiento + Seguridad */}
        <section className="mx-auto max-w-6xl px-4 pb-16 grid gap-8 lg:grid-cols-2">
          <div className="rounded-xl border bg-card p-6">
            <Scale className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold mt-3">Cumplimiento argentino</h2>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {["Vacaciones y licencias según la LCT", "Escalas y conceptos del CCT 130/75", "Validación de CUIL / CUIT", "Feriados nacionales precargados", "Memorándums con descargo del empleado"].map((i) => (
                <li key={i} className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />{i}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border bg-card p-6">
            <Lock className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold mt-3">Seguridad de los datos</h2>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {["Permisos por rol: cada usuario ve solo lo suyo", "Restricción horaria de acceso por rol", "Documentos privados con enlaces temporales", "Registro de cambios en los legajos", "Hora tomada del servidor, no del dispositivo"].map((i) => (
                <li key={i} className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />{i}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* Multiempresa */}
        <section className="bg-muted/40 border-y">
          <div className="mx-auto max-w-6xl px-4 py-16 grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className="space-y-4">
              <Building2 className="h-6 w-6 text-primary" />
              <h2 className="text-2xl sm:text-3xl font-semibold">Pensado para grupos empresarios</h2>
              <p className="text-muted-foreground">
                Estructura Grupo &gt; Empresas &gt; Sucursales. Cada empresa con su CUIT, membrete, convenio y sucursales
                con su ubicación para el fichaje por GPS, y una mirada consolidada del grupo para la dirección.
              </p>
            </div>
            <Shot src={shotEmpresas} alt="Administración de empresas y sucursales" />
          </div>
        </section>

        {/* Celular */}
        <section id="celular" className="mx-auto max-w-6xl px-4 py-16 space-y-10 scroll-mt-16">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-end">
            <div className="space-y-4">
              <Smartphone className="h-6 w-6 text-primary" />
              <h2 className="text-2xl sm:text-3xl font-semibold">El empleado, desde su celular</h2>
              <p className="text-muted-foreground">
                TotalRH se instala en un minuto desde el navegador, en iPhone o Android, sin pasar por la tienda de apps.
                Cada uno ficha, ve sus recibos, pide vacaciones y permisos, responde encuestas y chatea con su equipo.
              </p>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2 text-sm">
              {["Avisos en el celular aunque la app esté cerrada", "Recibos de sueldo en PDF", "Vacaciones y permisos", "Memorándums y descargos", "Actualización de datos personales", "Historial de fichadas"].map((i) => (
                <li key={i} className="flex gap-2 items-start"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />{i}</li>
              ))}
            </ul>
          </div>
          <div className="-mx-4 px-4 overflow-x-auto pb-2">
            <div className="flex gap-5 w-max lg:w-full lg:justify-between">
              <Phone src={shotMovilMuro} alt="Muro de la empresa en el celular" className="w-44 sm:w-48 shrink-0" />
              <Phone src={shotMovilChat} alt="Chat entre compañeros en el celular" className="w-44 sm:w-48 shrink-0" />
              <Phone src={shotMovilEncuesta} alt="Encuesta con imagen en el celular" className="w-44 sm:w-48 shrink-0" />
              <Phone src={shotMovilTareas} alt="Tareas asignadas en el celular" className="w-44 sm:w-48 shrink-0" />
              <Phone src={shotMovilEventos} alt="Calendario de eventos en el celular" className="w-44 sm:w-48 shrink-0" />
            </div>
          </div>
        </section>

        {/* Cierre */}
        <section className="border-t bg-gradient-to-br from-primary/10 via-background to-accent/10">
          <div className="mx-auto max-w-3xl px-4 py-16 text-center space-y-5">
            <KeyRound className="h-8 w-8 text-primary mx-auto" />
            <h2 className="text-2xl sm:text-3xl font-semibold">Probá TotalRH con datos de ejemplo</h2>
            <p className="text-muted-foreground">
              Dejanos tu email y te enviamos un código para recorrer el sistema completo, con todos los módulos activos.
            </p>
            <Button size="lg" className="gap-2" onClick={() => setDemoOpen(true)}>
              Acceder a la demo <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t bg-card">
        <div className="mx-auto max-w-6xl px-4 py-6 flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-muted-foreground text-center">
          <img src={logo} alt="TotalRH" className="h-5 w-5 opacity-60" />
          <span>TotalRH — Gestión de Personal · Sky Studio 2026 todos los derechos reservados</span>
        </div>
      </footer>
    </div>
  );
}
