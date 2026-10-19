import { useState } from "react";
import { CalendarX2, ChevronLeft, ChevronRight, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatoFecha } from "@/lib/vacacionesCalendario";
import { TIPOS_FERIADO, useEliminarFeriado, useFeriados, useGuardarFeriado, type TipoFeriado } from "@/hooks/useFeriados";

/** Carga y baja de feriados, puentes y asuetos (RRHH). */
export default function FeriadosDialog({ open, onOpenChange, puedeEditar }: { open: boolean; onOpenChange: (o: boolean) => void; puedeEditar: boolean }) {
  const [anio, setAnio] = useState(new Date().getFullYear());
  const { data: feriados = [], isLoading } = useFeriados(anio);
  const guardar = useGuardarFeriado();
  const eliminar = useEliminarFeriado();
  const [fecha, setFecha] = useState("");
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<TipoFeriado>("puente");

  const agregar = () => {
    if (!fecha || nombre.trim().length < 2) { toast.error("Completá la fecha y el nombre"); return; }
    guardar.mutate({ fecha, nombre, tipo }, {
      onSuccess: () => { toast.success("Feriado agregado"); setFecha(""); setNombre(""); },
      onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo guardar"),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CalendarX2 className="h-5 w-5 text-red-500" />Feriados</DialogTitle>
          <DialogDescription>Se usan en los calendarios, en las horas extra al 100 % y en los plazos de días hábiles.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setAnio((a) => a - 1)} aria-label="Año anterior"><ChevronLeft className="h-4 w-4" /></Button>
          <span className="w-16 text-center font-semibold">{anio}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setAnio((a) => a + 1)} aria-label="Año siguiente"><ChevronRight className="h-4 w-4" /></Button>
        </div>

        {puedeEditar && (
          <div className="space-y-2 rounded-xl border bg-muted/40 p-3">
            <p className="text-sm font-medium">Agregar</p>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Fecha</Label><Input type="date" className="mt-1 h-9" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as TipoFeriado)}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TIPOS_FERIADO).map(([k, t]) => <SelectItem key={k} value={k}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Input className="h-9" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej.: Día puente turístico" maxLength={120} />
              <Button size="sm" className="h-9" onClick={agregar} disabled={guardar.isPending}>{guardar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}</Button>
            </div>
            <p className="text-[11px] text-muted-foreground">Los días no laborables son optativos para el empleador: se muestran, pero no cuentan como feriado para las horas extra.</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : feriados.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No hay feriados cargados para {anio}.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {feriados.map((f) => (
              <li key={f.id} className="flex items-center gap-3 px-3 py-2">
                <span className="w-24 shrink-0 text-sm font-medium tabular-nums">{formatoFecha(f.fecha)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{f.nombre}</p>
                  <span className={cn("inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold", TIPOS_FERIADO[f.tipo].color)}>{TIPOS_FERIADO[f.tipo].label}</span>
                </div>
                {puedeEditar && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label={`Quitar ${f.nombre}`}
                    onClick={() => { if (confirm(`¿Quitar "${f.nombre}" del ${formatoFecha(f.fecha)}?`)) eliminar.mutate(f.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] text-muted-foreground">Los feriados nacionales 2026 vienen precargados según la Ley 27.399. Verificalos con el calendario oficial y agregá los días puente que decrete el Gobierno.</p>
      </DialogContent>
    </Dialog>
  );
}
