import { History, Loader2 } from "lucide-react";
import { ETIQUETA_CAMPO, ETIQUETA_ORIGEN, useCambiosEmpleado, type CambioEmpleado } from "@/hooks/useRegistro";
import { formatoFecha } from "@/lib/vacacionesCalendario";
import { cn } from "@/lib/utils";

/** Los ids no le dicen nada a nadie: se muestra sólo que cambió. */
const OCULTOS = new Set(["empresa_id", "sucursal_id", "user_id"]);

function valor(c: CambioEmpleado, v: string | null) {
  if (v === null || v === "") return "—";
  if (OCULTOS.has(c.campo)) return c.campo === "user_id" ? "vinculada" : "otra";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return formatoFecha(v);
  return v;
}

/** Historial de modificaciones de los datos del legajo (quién, cuándo, antes y después). */
export default function HistorialCambios({ empleadoId, titulo = "Cambios en los datos", limite = 50 }: { empleadoId: string; titulo?: string; limite?: number }) {
  const { data: cambios = [], isLoading } = useCambiosEmpleado(empleadoId, limite);

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-medium"><History className="h-4 w-4 text-primary" />{titulo}</h3>
      {isLoading ? (
        <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
      ) : cambios.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay cambios registrados.</p>
      ) : (
        <ul className="divide-y text-sm">
          {cambios.map((c) => (
            <li key={c.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-2">
              <span className="font-medium">{ETIQUETA_CAMPO[c.campo] ?? c.campo}</span>
              {c.campo === "user_id" ? (
                <span className="text-muted-foreground">{c.valor_nuevo ? "Se vinculó la cuenta del empleado" : "Se desvinculó la cuenta"}</span>
              ) : (
                <span className="min-w-0 break-words text-muted-foreground">
                  <span className="line-through decoration-muted-foreground/50">{valor(c, c.valor_anterior)}</span>
                  {" → "}
                  <span className="text-foreground">{valor(c, c.valor_nuevo)}</span>
                </span>
              )}
              <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
                <span className={cn("mr-1.5 rounded px-1.5 py-0.5", c.origen === "empleado" ? "bg-primary/10 text-primary" : "bg-muted")}>{ETIQUETA_ORIGEN[c.origen]}</span>
                {new Date(c.created_at).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short", hourCycle: "h23" })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
