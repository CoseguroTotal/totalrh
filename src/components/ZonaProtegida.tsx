import { cn } from "@/lib/utils";

// Una app web no puede bloquear las capturas de pantalla (sólo una app nativa de Android puede).
// Esto las desalienta: no se puede seleccionar ni copiar el texto, y al imprimir no sale el contenido.

/** Envuelve pantallas con datos sensibles (recibos, legajos, memorándums, liquidaciones). */
export default function ZonaProtegida({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("zona-protegida relative", className)} onContextMenu={(e) => e.preventDefault()} onCopy={(e) => e.preventDefault()}>
      {children}
    </div>
  );
}
