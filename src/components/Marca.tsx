import { CLIENTE, logoTotalRH } from "@/marca";
import { cn } from "@/lib/utils";

/** Logo de la pantalla de ingreso: "Cliente | TotalRH" en un cliente, solo TotalRH en el Demo. */
export function MarcaLockup({ className }: { className?: string }) {
  if (!CLIENTE) return <img src={logoTotalRH} alt="TotalRH" className={cn("h-40 w-auto", className)} />;
  return (
    <div className={cn("flex items-center justify-center gap-5", className)}>
      <img src={CLIENTE.logo} alt={CLIENTE.nombre} className="h-28 w-auto max-w-[45%] object-contain" />
      <span className="h-20 w-px bg-border" aria-hidden />
      <img src={logoTotalRH} alt="TotalRH" className="h-28 w-auto max-w-[45%] object-contain" />
    </div>
  );
}

/** Símbolo cuadrado de la instalación (cliente o TotalRH). */
export function MarcaSimbolo({ claro, className }: { claro?: boolean; className?: string }) {
  const src = CLIENTE ? (claro ? CLIENTE.simboloClaro : CLIENTE.simbolo) : logoTotalRH;
  return <img src={src} alt={CLIENTE?.nombre ?? "TotalRH"} className={cn("object-contain", className)} />;
}

/** Encabezado del muro con el logo del cliente. En el Demo no se muestra. */
export function MarcaMuroBanner() {
  if (!CLIENTE) return null;
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card px-4 py-3 shadow-sm">
      <img src={CLIENTE.logo} alt={CLIENTE.nombre} className="h-12 w-auto object-contain" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold truncate">Muro de {CLIENTE.nombre}</p>
        <p className="text-xs text-muted-foreground">Novedades, comunicados y celebraciones del equipo</p>
      </div>
      <img src={logoTotalRH} alt="TotalRH" title="Con TotalRH" className="h-8 w-8 object-contain opacity-70 shrink-0" />
    </div>
  );
}
