import { Fragment, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronDown, ChevronRight, FileSpreadsheet, Info, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useConfigGrupo } from "@/hooks/useConfigGrupo";
import { esFeriadoPleno, useFeriados } from "@/hooks/useFeriados";
import { asignacionVigente, ultimoDiaDelMes, type AsignacionTurno } from "@/lib/asistencia";
import { clasificarExtras, hhmm, importeExtras, resumirExtras, TOPE_DIARIO_MIN, type ExtrasDia } from "@/lib/horasExtra";
import { formatoFecha } from "@/lib/vacacionesCalendario";
import { cn } from "@/lib/utils";

const pesos = (n: number) => n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

interface FilaEmpleado {
  id: string;
  nombre: string;
  legajo: string;
  sueldo: number;
  dias: { fecha: string; extras: ExtrasDia; feriado: boolean }[];
}

/** Resumen mensual de horas extra por empleado, al 50 % y al 100 % (art. 201 LCT). */
export default function HorasExtraTab() {
  const hoy = new Date();
  const [mes, setMes] = useState(`${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`);
  const [abierto, setAbierto] = useState<string | null>(null);
  const anio = Number(mes.slice(0, 4));
  const { data: config } = useConfigGrupo();
  const divisor = config?.divisor_hora ?? 200;
  const minimo = config?.extra_minimo_minutos ?? 15;
  const { data: feriadosAnio = [] } = useFeriados(anio);
  const feriados = useMemo(() => new Set(feriadosAnio.filter(esFeriadoPleno).map((f) => f.fecha)), [feriadosAnio]);

  const { data, isLoading } = useQuery({
    queryKey: ["horas_extra", mes],
    queryFn: async () => {
      const [{ data: fichadas, error }, { data: asig, error: e2 }] = await Promise.all([
        supabase.from("fichadas")
          .select("empleado_id, fecha, hora_entrada, hora_salida, empleado:empleados(id, nombre, apellido, legajo, sueldo_basico)")
          .gte("fecha", `${mes}-01`).lte("fecha", ultimoDiaDelMes(mes))
          .not("hora_entrada", "is", null).not("hora_salida", "is", null)
          .order("fecha"),
        supabase.from("asignaciones_turno").select("empleado_id, dia_semana, hora_entrada, hora_salida, vigente_desde"),
      ]);
      if (error) throw error;
      if (e2) throw e2;
      return { fichadas: fichadas ?? [], asignaciones: (asig ?? []) as AsignacionTurno[] };
    },
  });

  const filas = useMemo(() => {
    if (!data) return [];
    const porEmp = new Map<string, FilaEmpleado>();
    for (const f of data.fichadas as any[]) {
      const emp = f.empleado;
      if (!emp) continue;
      const feriado = feriados.has(f.fecha);
      const horario = asignacionVigente(data.asignaciones, f.empleado_id, f.fecha);
      const extras = clasificarExtras(f.fecha, f.hora_entrada, f.hora_salida, horario, feriado, minimo);
      if (!porEmp.has(emp.id)) porEmp.set(emp.id, { id: emp.id, nombre: `${emp.apellido}, ${emp.nombre}`, legajo: emp.legajo, sueldo: Number(emp.sueldo_basico) || 0, dias: [] });
      if (extras.al50 || extras.al100) porEmp.get(emp.id)!.dias.push({ fecha: f.fecha, extras, feriado });
    }
    return [...porEmp.values()]
      .map((e) => ({ ...e, resumen: resumirExtras(e.dias), importe: importeExtras(e.sueldo, divisor, resumirExtras(e.dias)) }))
      .filter((e) => e.resumen.total > 0)
      .sort((a, b) => b.resumen.total - a.resumen.total);
  }, [data, feriados, minimo, divisor]);

  const exportar = () => {
    const hoja = filas.map((e) => ({
      Empleado: e.nombre, Legajo: e.legajo,
      "Extra 50 % (h)": +(e.resumen.al50 / 60).toFixed(2),
      "Extra 100 % (h)": +(e.resumen.al100 / 60).toFixed(2),
      "Valor hora": Math.round(e.importe.valorHora),
      "Importe 50 %": e.importe.i50, "Importe 100 %": e.importe.i100,
      "Días sobre 3 h": e.resumen.diasSobreTopeDiario.map(formatoFecha).join(", "),
      "Supera 30 h/mes": e.resumen.superaMensual ? "Sí" : "No",
    }));
    const ws = XLSX.utils.json_to_sheet(hoja);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Horas extra");
    XLSX.writeFile(wb, `horas_extra_${mes}.xlsx`);
    toast.success("Excel exportado");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold">Horas extra del mes</h3>
          <p className="text-xs text-muted-foreground">Según fichadas con entrada y salida, horario asignado y feriados cargados.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="h-9 w-40" />
          <Button variant="outline" size="sm" onClick={exportar} disabled={!filas.length}><FileSpreadsheet className="mr-1.5 h-4 w-4" />Excel</Button>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Art. 201 LCT: recargo del <b>50 %</b> en días comunes y del <b>100 %</b> los sábados después de las 13 h, domingos y feriados.
          Topes del Decreto 484/2000: 3 h por día, 30 h por mes y 200 h por año. Valor hora = remuneración ÷ {divisor}
          {" "}(ajustable en Configuración según el convenio). No se cuentan extras menores a {minimo} min. Las horas extra
          tienen que estar autorizadas: este cálculo es para revisar antes de pasarlas a liquidación.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : filas.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">No hay horas extra registradas en {mes}.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                <th className="px-3 py-2 text-left font-medium">Empleado</th>
                <th className="px-3 py-2 text-right font-medium">Al 50 %</th>
                <th className="px-3 py-2 text-right font-medium">Al 100 %</th>
                <th className="px-3 py-2 text-right font-medium">Importe estimado</th>
                <th className="px-3 py-2 text-left font-medium">Avisos</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((e) => (
                <Fragment key={e.id}>
                  <tr className="cursor-pointer border-b hover:bg-muted/30" onClick={() => setAbierto(abierto === e.id ? null : e.id)}>
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-1.5">
                        {abierto === e.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <span className="font-medium">{e.nombre}</span><span className="text-xs text-muted-foreground">#{e.legajo}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{hhmm(e.resumen.al50)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{hhmm(e.resumen.al100)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{e.sueldo ? pesos(e.importe.i50 + e.importe.i100) : <span className="text-xs text-muted-foreground">Sin sueldo cargado</span>}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {e.resumen.superaMensual && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:text-red-300">Supera 30 h/mes</span>}
                        {e.resumen.diasSobreTopeDiario.length > 0 && (
                          <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                            <AlertTriangle className="h-3 w-3" />{e.resumen.diasSobreTopeDiario.length} {e.resumen.diasSobreTopeDiario.length === 1 ? "día" : "días"} con más de 3 h
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                  {abierto === e.id && (
                    <tr className="border-b bg-muted/20">
                      <td colSpan={5} className="px-6 py-2">
                        <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                          {e.dias.map((d) => (
                            <li key={d.fecha} className={cn("flex items-center justify-between rounded-lg px-2 py-1 text-xs", d.extras.al50 + d.extras.al100 > TOPE_DIARIO_MIN ? "bg-amber-500/10" : "bg-card")}>
                              <span>{formatoFecha(d.fecha)}{d.feriado && <span className="ml-1 text-red-600">(feriado)</span>}</span>
                              <span className="tabular-nums">
                                {d.extras.al50 > 0 && <>{hhmm(d.extras.al50)} al 50 %</>}
                                {d.extras.al50 > 0 && d.extras.al100 > 0 && " · "}
                                {d.extras.al100 > 0 && <>{hhmm(d.extras.al100)} al 100 %</>}
                              </span>
                            </li>
                          ))}
                        </ul>
                        {e.sueldo > 0 && <p className="mt-2 text-xs text-muted-foreground">Valor hora: {pesos(e.importe.valorHora)} · 50 %: {pesos(e.importe.i50)} · 100 %: {pesos(e.importe.i100)}</p>}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
