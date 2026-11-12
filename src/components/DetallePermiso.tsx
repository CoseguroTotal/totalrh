import { useEffect, useState } from "react";
import { Check, Download, Loader2, PenLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AvisoPresentacion, ListaAdjuntosPermiso } from "@/components/AdjuntosPermiso";
import { formatoFecha } from "@/lib/vacacionesCalendario";
import { fechaHoraAR, leyendaFirma, type FirmaPermiso } from "@/lib/firmaPermiso";
import { cn } from "@/lib/utils";

export const ESTADO_PERMISO_BADGE: Record<string, string> = {
  pendiente: "bg-warning/15 text-warning",
  aprobada: "bg-success/15 text-success",
  rechazada: "bg-destructive/15 text-destructive",
};

export interface Resolucion {
  estado: "aprobada" | "rechazada";
  observaciones: string;
  nombre: string;
  cargo: string;
}

/** Quién firmó y las observaciones, para mostrar debajo de cada solicitud. */
export function ResolucionPermiso({ sol, className }: { sol: FirmaPermiso; className?: string }) {
  const leyenda = leyendaFirma(sol);
  const obs = sol.observaciones?.trim();
  if (!leyenda && !obs) return null;
  return (
    <div className={cn("mt-1.5 space-y-0.5 text-xs", className)}>
      {leyenda && (
        <p className={cn("flex items-center gap-1 font-medium", sol.estado === "aprobada" ? "text-success" : "text-destructive")}>
          <PenLine className="h-3 w-3 shrink-0" />{leyenda}
        </p>
      )}
      {obs && <p className="text-muted-foreground whitespace-pre-line"><span className="font-medium">Observaciones:</span> {obs}</p>}
    </div>
  );
}

function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{etiqueta}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

/**
 * Solicitud de permiso completa. Si `onResolver` viene, RRHH la puede aprobar o
 * rechazar firmando con su nombre y cargo y dejando observaciones.
 */
export function DetallePermisoDialog({
  sol, empleado, open, onOpenChange, firmaInicial, onResolver, resolviendo, onDescargarPDF,
}: {
  sol: any | null;
  empleado: { nombre: string; puesto?: string | null };
  open: boolean;
  onOpenChange: (o: boolean) => void;
  firmaInicial?: { nombre: string; cargo: string };
  onResolver?: (r: Resolucion) => void;
  resolviendo?: boolean;
  onDescargarPDF?: () => void;
}) {
  const [obs, setObs] = useState("");
  const [nombre, setNombre] = useState("");
  const [cargo, setCargo] = useState("");

  useEffect(() => {
    if (!open) return;
    setObs(sol?.observaciones ?? "");
    setNombre(firmaInicial?.nombre ?? "");
    setCargo(firmaInicial?.cargo ?? "");
    // Sólo al abrir: si el perfil llega después, completa la firma sin pisar lo escrito
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sol?.id]);

  useEffect(() => {
    if (!open || !firmaInicial) return;
    setNombre((n) => n || firmaInicial.nombre);
    setCargo((c) => c || firmaInicial.cargo);
  }, [open, firmaInicial?.nombre, firmaInicial?.cargo]);

  if (!sol) return null;
  const pendiente = sol.estado === "pendiente";
  const puedeResolver = pendiente && !!onResolver;
  const resolver = (estado: Resolucion["estado"]) =>
    onResolver?.({ estado, observaciones: obs.trim(), nombre: nombre.trim(), cargo: cargo.trim() });
  const mismoDia = !sol.fecha_hasta || sol.fecha_hasta === sol.fecha_desde;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Solicitud de permiso
            <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", ESTADO_PERMISO_BADGE[sol.estado])}>{sol.estado}</span>
          </DialogTitle>
          <DialogDescription>{empleado.nombre}{empleado.puesto ? ` · ${empleado.puesto}` : ""}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border p-3">
          <div className="col-span-2">
            <Dato etiqueta="Motivo">{sol.motivo}</Dato>
          </div>
          {sol.motivo_detalle && (
            <div className="col-span-2">
              <Dato etiqueta="Detalle"><p className="whitespace-pre-line">{sol.motivo_detalle}</p></Dato>
            </div>
          )}
          <Dato etiqueta={mismoDia ? "Fecha" : "Desde"}>{formatoFecha(sol.fecha_desde)}</Dato>
          {!mismoDia && <Dato etiqueta="Hasta">{formatoFecha(sol.fecha_hasta)}</Dato>}
          <Dato etiqueta="Reintegro">{sol.hora_reintegro ? `${String(sol.hora_reintegro).slice(0, 5)} hs` : "—"}</Dato>
          <Dato etiqueta="Descuento">{sol.sujeto_descuento ? "Sujeto a descuento" : "Sin descuento"}</Dato>
          <Dato etiqueta="Pedida el">{sol.created_at ? fechaHoraAR(sol.created_at) : formatoFecha(sol.fecha_solicitud)}</Dato>
          {Array.isArray(sol.adjuntos) && sol.adjuntos.length > 0 && (
            <div className="col-span-2">
              <Dato etiqueta="Documentación">
                <ListaAdjuntosPermiso adjuntos={sol.adjuntos} />
                {pendiente && <AvisoPresentacion creadaAt={sol.created_at} />}
              </Dato>
            </div>
          )}
        </div>

        {!pendiente && (
          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-xs font-semibold mb-1">Resolución</p>
            <ResolucionPermiso sol={sol} className="mt-0" />
            {!leyendaFirma(sol) && !sol.observaciones && <p className="text-xs text-muted-foreground">Resuelta sin firma registrada.</p>}
          </div>
        )}

        {puedeResolver && (
          <div className="rounded-lg border bg-muted/40 p-3 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Observaciones para el empleado</Label>
              <Textarea rows={3} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional. Ej.: presentar el certificado al reintegrarse" />
            </div>
            <p className="text-xs font-semibold flex items-center gap-1.5"><PenLine className="h-3.5 w-3.5" />Firma de quien autoriza</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Nombre *</Label><Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre y apellido" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Cargo</Label><Input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ej.: Jefa de RRHH" /></div>
            </div>
            <p className="text-[11px] text-muted-foreground">Al firmar se registran la fecha y la hora. El empleado ve quién autorizó y las observaciones.</p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {onDescargarPDF && (
            <Button variant="outline" onClick={onDescargarPDF} className="sm:mr-auto"><Download className="h-4 w-4 mr-1.5" />PDF</Button>
          )}
          {puedeResolver ? (
            <>
              <Button variant="outline" className="text-destructive" disabled={resolviendo || !nombre.trim()} onClick={() => resolver("rechazada")}>
                <X className="h-4 w-4 mr-1.5" />Rechazar
              </Button>
              <Button disabled={resolviendo || !nombre.trim()} onClick={() => resolver("aprobada")}>
                {resolviendo ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Check className="h-4 w-4 mr-1.5" />}Aprobar y firmar
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
