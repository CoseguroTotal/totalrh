import { useState, useEffect } from "react";
import { Download, X, Share } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
    const isSafari = /safari/i.test(navigator.userAgent) && !/chrome|crios/i.test(navigator.userAgent);

    if (isIOS && isSafari) {
      const wasDismissed = localStorage.getItem("pwa-ios-dismissed");
      if (!wasDismissed) setShowIOSPrompt(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    setDeferredPrompt(null);
    setShowIOSPrompt(false);
    localStorage.setItem("pwa-ios-dismissed", "1");
  };

  if (dismissed) return null;

  if (deferredPrompt) {
    return (
      <div className="flex items-center gap-3 rounded-xl border bg-primary/5 border-primary/20 px-4 py-3">
        <Download className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Instalá TotalRH en tu dispositivo</p>
          <p className="text-xs text-muted-foreground">Acceso rápido desde tu pantalla de inicio.</p>
        </div>
        <Button size="sm" onClick={handleInstall}>Instalar</Button>
        <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (showIOSPrompt) {
    return (
      <div className="flex items-center gap-3 rounded-xl border bg-primary/5 border-primary/20 px-4 py-3">
        <Share className="h-5 w-5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Instalá TotalRH en tu iPhone</p>
          <p className="text-xs text-muted-foreground">
            Tocá <Share className="inline h-3 w-3" /> y luego <strong>"Agregar a inicio"</strong>.
          </p>
        </div>
        <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return null;
}
