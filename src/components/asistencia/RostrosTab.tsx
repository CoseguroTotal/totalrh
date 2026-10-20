import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, ScanFace, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useEmpleados } from "@/hooks/useEmpleados";
import { cn } from "@/lib/utils";
import { FaceEnrollDialog } from "@/components/asistencia/FaceCapture";

const KEY = ["rostros_empleados"];

/** Quién tiene rostro registrado (sólo fecha de consentimiento; las plantillas no salen de la base). */
function useRostrosRegistrados() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from("rostros_empleados").select("empleado_id, consentimiento_at");
      if (error) throw error;
      return new Map((data ?? []).map((r) => [r.empleado_id, r.consentimiento_at]));
    },
  });
}

type Filtro = "todos" | "sin" | "con";

/** Alta y baja de rostros para fichar en la terminal, para todo el personal activo. */
export default function RostrosTab() {
  const qc = useQueryClient();
  const { data: empleados = [], isLoading } = useEmpleados();
  const { data: registrados = new Map<string, string>(), isLoading: cargandoRostros } = useRostrosRegistrados();
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [registrando, setRegistrando] = useState<{ id: string; nombre: string } | null>(null);
  const [borrando, setBorrando] = useState<string | null>(null);

  const activos = useMemo(() => empleados.filter((e) => e.estado !== "Baja"), [empleados]);
  const conRostro = activos.filter((e) => registrados.has(e.id)).length;

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return activos.filter((e) => {
      if (filtro === "sin" && registrados.has(e.id)) return false;
      if (filtro === "con" && !registrados.has(e.id)) return false;
      return !q || `${e.apellido} ${e.nombre} ${e.legajo ?? ""}`.toLowerCase().includes(q);
    });
  }, [activos, busqueda, filtro, registrados]);

  const borrar = async (id: string, nombre: string) => {
    if (!confirm(`¿Borrar el registro facial de ${nombre}? Va a tener que fichar con QR hasta registrarse de nuevo.`)) return;
    setBorrando(id);
    const { error } = await supabase.from("rostros_empleados").delete().eq("empleado_id", id);
    setBorrando(null);
    if (error) { toast.error("No se pudo borrar el registro"); return; }
    toast.success("Registro facial eliminado");
    qc.invalidateQueries({ queryKey: KEY });
  };

  const cargando = isLoading || cargandoRostros;
  const porcentaje = activos.length ? Math.round((conRostro / activos.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 font-semibold"><ScanFace className="h-5 w-5 text-primary" />Rostros para fichar</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Registrá el rostro de cada persona con la cámara de esta computadora (idealmente la misma de la terminal).
              Se guarda una plantilla numérica, no fotos, y hace falta el consentimiento del empleado.
            </p>
          </div>
          <div className="min-w-[180px] text-right">
            <p className="text-2xl font-bold tabular-nums">{conRostro}<span className="text-base font-normal text-muted-foreground"> / {activos.length}</span></p>
            <p className="text-xs text-muted-foreground">empleados con rostro registrado</p>
            <Progress value={porcentaje} className="mt-2 h-1.5" />
          </div>
        </div>
        <ul className="mt-4 grid gap-1 text-xs text-muted-foreground sm:grid-cols-3">
          <li>1. Buena luz de frente, sin anteojos de sol ni gorra.</li>
          <li>2. El empleado hace el gesto que pide la pantalla (prueba de vida).</li>
          <li>3. En la terminal el sistema se ajusta solo con cada fichada.</li>
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nombre o legajo" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <div className="flex rounded-lg border p-0.5" role="tablist">
          {([["todos", "Todos"], ["sin", "Sin registrar"], ["con", "Registrados"]] as const).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={filtro === id} onClick={() => setFiltro(id)}
              className={cn("rounded-md px-3 py-1.5 text-sm", filtro === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {cargando ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : visibles.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          {filtro === "sin" && activos.length > 0 ? "Todo el personal activo tiene el rostro registrado." : "No hay empleados para mostrar."}
        </div>
      ) : (
        <ul className="divide-y rounded-xl border bg-card shadow-sm">
          {visibles.map((e) => {
            const nombre = `${e.nombre} ${e.apellido}`;
            const fecha = registrados.get(e.id);
            return (
              <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className={cn("rounded-full p-2", fecha ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
                  {fecha ? <CheckCircle2 className="h-4 w-4" /> : <ScanFace className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.apellido}, {e.nombre}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[e.legajo && `Legajo ${e.legajo}`, e.sucursal?.nombre ?? e.empresa?.nombre].filter(Boolean).join(" · ")}
                    {" · "}{fecha ? `Registrado el ${new Date(fecha).toLocaleDateString("es-AR")}` : "Sin registrar"}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant={fecha ? "outline" : "default"} onClick={() => setRegistrando({ id: e.id, nombre })}>
                    <ScanFace className="mr-1.5 h-4 w-4" />{fecha ? "Volver a registrar" : "Registrar"}
                  </Button>
                  {fecha && (
                    <Button size="icon" variant="ghost" className="h-9 w-9 text-destructive" aria-label={`Borrar registro de ${nombre}`}
                      disabled={borrando === e.id} onClick={() => borrar(e.id, nombre)}>
                      {borrando === e.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {registrando && (
        <FaceEnrollDialog
          open
          onOpenChange={(o) => { if (!o) setRegistrando(null); }}
          empleadoId={registrando.id}
          nombreEmpleado={registrando.nombre}
          onRegistrado={() => qc.invalidateQueries({ queryKey: KEY })}
        />
      )}
    </div>
  );
}
