import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Loader2, CameraOff } from "lucide-react";

interface QrScannerProps {
  onScan: (text: string) => void;
  paused?: boolean;
}

export default function QrScanner({ onScan, paused }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const lastRef = useRef<string>("");

  useEffect(() => {
    let controls: { stop: () => void } | null = null;
    let cancelled = false;
    const reader = new BrowserMultiFormatReader();

    (async () => {
      try {
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          videoRef.current!,
          (result) => {
            if (!result || cancelled) return;
            const text = result.getText();
            if (text === lastRef.current) return;
            lastRef.current = text;
            onScan(text);
            setTimeout(() => { lastRef.current = ""; }, 2500);
          }
        );
        if (!cancelled) setReady(true);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "";
        setError(
          /permission|denied|NotAllowed/i.test(msg)
            ? "Permiso de cámara denegado. Habilitalo en los ajustes del navegador y volvé a intentar."
            : "No se pudo acceder a la cámara del dispositivo."
        );
      }
    })();

    return () => {
      cancelled = true;
      try { controls?.stop(); } catch { /* ignore */ }
    };
  }, [onScan]);

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
        <CameraOff className="h-8 w-8 mx-auto text-destructive mb-3" />
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-sm mx-auto aspect-square overflow-hidden rounded-2xl border bg-muted">
      <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      <div className="pointer-events-none absolute inset-8 rounded-xl border-2 border-primary/70" />
      {paused && <div className="absolute inset-0 bg-background/70" />}
    </div>
  );
}
