import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import DemoAccessDialog from "@/components/DemoAccessDialog";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo_total_rh.png";
import shotDashboard from "@/assets/landing/dashboard.jpg";
import shotLegajo from "@/assets/landing/legajo_detalle.jpg";
import shotLiquidacion from "@/assets/landing/liquidacion.jpg";
import shotAsistencia from "@/assets/landing/asistencia.jpg";
import shotVacaciones from "@/assets/landing/vacaciones.jpg";
import shotMemorandums from "@/assets/landing/memorandums.jpg";
import shotReclutamiento from "@/assets/landing/reclutamiento.jpg";
import shotReportes from "@/assets/landing/reportes.jpg";
import shotEmpresas from "@/assets/landing/empresas.jpg";
import shotTerminal from "@/assets/landing/terminal_qr.jpg";
import shotMovilPortal from "@/assets/landing/movil_portal.jpg";
import shotMovilFichar from "@/assets/landing/movil_fichar.jpg";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileText,
  KeyRound,
  Lock,
  QrCode,
  Scale,
  Smartphone,
  Users,
  Wallet,
  BarChart3,
} from "lucide-react";

function Shot({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="rounded-xl border bg-card shadow-lg overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b bg-muted/60">
        <span className="h-2.5 w-2.5 rounded-full bg-destructive/40" />
        <span className="h-2.5 w-2.5 rounded-full bg-primary/30" />
        <span className="h-2.5 w-2.5 rounded-full bg-accent/40" />
      </div>
      <img src={src} alt={alt} loading="lazy" className="w-full block" />
    </div>
  );
}

const MODULOS = [
  { icon: FileText, titulo: "Legajo digital 360°", img: shotLegajo, texto: "Datos personales, domicilio, grupo familiar, estudios, datos médicos, documentación con vencimientos y línea de tiempo laboral. Firma digital según Ley 25.506." },
  { icon: Wallet, titulo: "Liquidación CCT 130/75", img: shotLiquidacion, texto: "Motor de cálculo con básicos, antigüedad, presentismo, aportes y contribuciones. Recibos en PDF con membrete de cada empresa y liquidación masiva por período." },
  { icon: QrCode, titulo: "Asistencia con QR anti-fraude", img: shotAsistencia, texto: "Terminal en sucursal con QR rotativo, importación de relojes biométricos, turnos, novedades y control de llegadas tarde." },
  { icon: CalendarDays, titulo: "Vacaciones según LCT", img: shotVacaciones, texto: "Días corridos calculados por antigüedad, calendario corporativo, solicitudes desde el celular y aprobación con un clic." },
  { icon: Scale, titulo: "Memorándums y sanciones", img: shotMemorandums, texto: "Envío individual o masivo por grupo, empresa o selección de empleados, PDF adjunto y descargo del empleado con cierre único." },
  { icon: Users, titulo: "Reclutamiento (ATS)", img: shotReclutamiento, texto: "Vacantes por empresa y pipeline de candidatos tipo kanban, desde la postulación hasta la contratación." },
  { icon: BarChart3, titulo: "Reportes y BI", img: shotReportes, texto: "Dashboard ejecutivo con dotación, rotación, ausentismo y costo laboral. Exportaciones a Excel y formatos AFIP." },
];

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
          <div className="flex items-center gap-2">
            {logged && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/app">Volver al sistema</Link>
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
                Legajos digitales, liquidación bajo CCT 130/75, fichado por QR imposible de delegar, vacaciones según LCT,
                memorándums con validez legal y reportes para dirección. Multiempresa y multisucursal.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button size="lg" className="gap-2" onClick={() => setDemoOpen(true)}>
                  Probar la demo <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="#modulos">Ver funcionalidades</a>
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
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { t: "Información dispersa", d: "Legajos en papel, planillas sueltas y carpetas compartidas: nadie sabe cuál es la versión válida." },
              { t: "Fichado manipulable", d: "Planillas firmadas por terceros, relojes que se comparten y horas que no coinciden con la liquidación." },
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

        {/* Solución */}
        <section className="bg-muted/40 border-y">
          <div className="mx-auto max-w-6xl px-4 py-16 grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className="space-y-4">
              <h2 className="text-2xl sm:text-3xl font-semibold">Todo el personal en una sola pantalla</h2>
              <p className="text-muted-foreground">
                Dotación activa, ausencias del día, vencimientos de documentación, solicitudes pendientes y costo laboral
                del período. Cada rol ve exactamente lo que le corresponde.
              </p>
              <ul className="space-y-2 text-sm">
                {["Alta de empleados en minutos", "Alertas automáticas de documentación", "Notificaciones por email", "Exportaciones a Excel"].map((i) => (
                  <li key={i} className="flex gap-2 items-start">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> {i}
                  </li>
                ))}
              </ul>
            </div>
            <Shot src={shotDashboard} alt="Vista general del sistema TotalRH" />
          </div>
        </section>

        {/* Módulos */}
        <section id="modulos" className="mx-auto max-w-6xl px-4 py-16 space-y-14">
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold">Módulos clave</h2>
            <p className="text-muted-foreground mt-2">Capturas reales del sistema en funcionamiento.</p>
          </div>
          {MODULOS.map((m, i) => (
            <div key={m.titulo} className={`grid gap-8 lg:grid-cols-2 lg:items-center ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}>
              <div className="space-y-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <m.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-xl font-semibold">{m.titulo}</h3>
                <p className="text-muted-foreground">{m.texto}</p>
              </div>
              <Shot src={m.img} alt={`Pantalla de ${m.titulo} en TotalRH`} />
            </div>
          ))}
        </section>

        {/* Fichado QR */}
        <section className="bg-muted/40 border-y">
          <div className="mx-auto max-w-6xl px-4 py-16 grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className="space-y-5">
              <h2 className="text-2xl sm:text-3xl font-semibold">Fichado por QR: se termina el fichado por terceros</h2>
              <ol className="space-y-3">
                {[
                  "La terminal de la sucursal muestra un QR que se renueva cada 10 segundos.",
                  "El empleado abre su portal en el celular y toca “Fichar ahora”.",
                  "Escanea el QR: el sistema valida el código, la sucursal y la hora del servidor.",
                  "La fichada queda registrada y aparece al instante en la terminal.",
                ].map((p, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="h-6 w-6 shrink-0 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">{idx + 1}</span>
                    <span className="text-sm text-muted-foreground">{p}</span>
                  </li>
                ))}
              </ol>
              <p className="text-sm text-muted-foreground">
                El QR es de un solo uso y expira: no se puede fotografiar, compartir ni reutilizar.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 items-start">
              <Shot src={shotTerminal} alt="Terminal de fichado con código QR rotativo" />
              <Shot src={shotMovilFichar} alt="Pantalla de fichado en el celular del empleado" />
            </div>
          </div>
        </section>

        {/* Cumplimiento + Seguridad */}
        <section className="mx-auto max-w-6xl px-4 py-16 grid gap-8 lg:grid-cols-2">
          <div className="rounded-xl border bg-card p-6">
            <Scale className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold mt-3">Cumplimiento argentino</h2>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {["Vacaciones y licencias según la LCT", "Escalas y conceptos del CCT 130/75", "Validación de CUIL / CUIT", "Documentos firmados bajo Ley 25.506", "Exportaciones para AFIP y libro de sueldos"].map((i) => (
                <li key={i} className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />{i}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border bg-card p-6">
            <Lock className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold mt-3">Seguridad de los datos</h2>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {["Permisos por rol: cada usuario ve solo lo suyo", "Restricción horaria de acceso por rol", "Documentos privados con enlaces temporales", "Registro de acciones sensibles", "Hora tomada del servidor, no del dispositivo"].map((i) => (
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
                Estructura Grupo &gt; Empresas &gt; Sucursales. Cada empresa con su CUIT, membrete, convenio y sucursales,
                y una mirada consolidada del grupo para la dirección.
              </p>
            </div>
            <Shot src={shotEmpresas} alt="Administración de empresas y sucursales" />
          </div>
        </section>

        {/* Móvil */}
        <section className="mx-auto max-w-6xl px-4 py-16 grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-4">
            <Smartphone className="h-6 w-6 text-primary" />
            <h2 className="text-2xl sm:text-3xl font-semibold">El empleado, desde su celular</h2>
            <p className="text-muted-foreground">
              Portal de autogestión instalable como app (PWA): fichar, ver recibos, solicitar vacaciones y permisos,
              consultar memorándums y presentar descargos. Menos consultas al área de RRHH.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <Shot src={shotMovilPortal} alt="Portal del empleado en el celular" />
            <Shot src={shotMovilFichar} alt="Fichado por QR desde el celular" />
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
