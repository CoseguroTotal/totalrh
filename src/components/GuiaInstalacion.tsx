import { useEffect, useState } from "react";
import { CheckCircle2, Download, MoreVertical, PlusSquare, Share, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NOMBRE_APP } from "@/marca";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Plataforma = "android" | "iphone" | "otro";

function detectar(): { plataforma: Plataforma; safari: boolean; instalada: boolean } {
  const ua = navigator.userAgent;
  const iphone = /iphone|ipad|ipod/i.test(ua);
  return {
    plataforma: iphone ? "iphone" : /android/i.test(ua) ? "android" : "otro",
    // En iPhone sólo Safari puede agregar la app a la pantalla de inicio
    safari: iphone && /safari/i.test(ua) && !/crios|fxios|edgios|instagram|fban|whatsapp/i.test(ua),
    instalada: window.matchMedia?.("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true,
  };
}

const PASOS: Record<Exclude<Plataforma, "otro">, { icono: typeof Share; texto: React.ReactNode }[]> = {
  android: [
    { icono: MoreVertical, texto: <>Abrí este enlace en <b>Chrome</b> y tocá el menú <b>⋮</b> (arriba a la derecha).</> },
    { icono: Download, texto: <>Elegí <b>Instalar aplicación</b> (o <b>Agregar a pantalla principal</b>).</> },
    { icono: Smartphone, texto: <>Confirmá con <b>Instalar</b>. El ícono queda junto a tus otras apps.</> },
  ],
  iphone: [
    { icono: Share, texto: <>Abrí este enlace en <b>Safari</b> y tocá <b>Compartir</b> (el cuadrado con la flecha, abajo).</> },
    { icono: PlusSquare, texto: <>Deslizá y elegí <b>Agregar a inicio</b>.</> },
    { icono: Smartphone, texto: <>Tocá <b>Agregar</b>. El ícono queda en tu pantalla de inicio.</> },
  ],
};

/** Instrucciones para instalar la app (PWA) según el celular del empleado. */
export default function GuiaInstalacion({ compacta = false }: { compacta?: boolean }) {
  const [info] = useState(detectar);
  const [vista, setVista] = useState<Exclude<Plataforma, "otro">>(info.plataforma === "iphone" ? "iphone" : "android");
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [instalada, setInstalada] = useState(info.instalada);

  useEffect(() => {
    const antes = (e: Event) => { e.preventDefault(); setPrompt(e as BeforeInstallPromptEvent); };
    const listo = () => setInstalada(true);
    window.addEventListener("beforeinstallprompt", antes);
    window.addEventListener("appinstalled", listo);
    return () => { window.removeEventListener("beforeinstallprompt", antes); window.removeEventListener("appinstalled", listo); };
  }, []);

  if (instalada) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 p-4 text-sm">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
        <p>La app ya está instalada en este dispositivo.</p>
      </div>
    );
  }

  const instalar = async () => {
    if (!prompt) return;
    await prompt.prompt();
    if ((await prompt.userChoice).outcome === "accepted") setInstalada(true);
    setPrompt(null);
  };

  return (
    <div className={cn("space-y-4", !compacta && "rounded-2xl border bg-card p-5 shadow-sm")}>
      {!compacta && (
        <div>
          <h2 className="flex items-center gap-2 font-semibold"><Smartphone className="h-5 w-5 text-primary" />Instalá {NOMBRE_APP} en tu celular</h2>
          <p className="mt-1 text-sm text-muted-foreground">Es gratis, no ocupa casi lugar y entrás con un toque, como cualquier app.</p>
        </div>
      )}

      {prompt && (
        <Button className="h-11 w-full gap-2" onClick={instalar}><Download className="h-4 w-4" />Instalar ahora</Button>
      )}

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="tablist" aria-label="Tipo de celular">
        {([["android", "Android"], ["iphone", "iPhone"]] as const).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={vista === id} onClick={() => setVista(id)}
            className={cn("rounded-lg px-3 py-2 text-sm font-medium", vista === id ? "bg-card shadow-sm" : "text-muted-foreground")}>
            {label}
          </button>
        ))}
      </div>

      {vista === "iphone" && info.plataforma === "iphone" && !info.safari && (
        <p className="rounded-lg bg-warning/15 px-3 py-2 text-sm">
          Estás en otro navegador (por ejemplo, el de WhatsApp). Copiá el enlace y abrilo en <b>Safari</b> para poder instalarla.
        </p>
      )}

      <ol className="space-y-3">
        {PASOS[vista].map((p, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{i + 1}</span>
            <p className="pt-0.5 text-sm"><p.icono className="mr-1 inline h-4 w-4 text-primary" />{p.texto}</p>
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted-foreground">Después abrí la app desde el ícono e ingresá con tu DNI o email y tu contraseña.</p>
    </div>
  );
}
