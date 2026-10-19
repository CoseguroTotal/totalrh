import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, FileDown, Info, Scale } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEmpleados } from "@/hooks/useEmpleados";
import { useSolicitudesVacacionesEmpleado } from "@/hooks/useVacaciones";
import { CAUSAS, antiguedad, calcularLiquidacionFinal, diasVacacionesLCT, type CausaEgreso } from "@/lib/liquidacionFinal";
import { hoyArgentina } from "@/lib/asistencia";
import { formatoFecha } from "@/lib/vacacionesCalendario";

const pesos = (n: number) => n.toLocaleString("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 });
const num = (v: string) => (v.trim() === "" ? 0 : Number(v));

/** Calculadora de liquidación final por egreso (LCT). Es una estimación para revisar con el contador. */
export default function LiquidacionFinalTab() {
  const { data: empleados = [] } = useEmpleados();
  const [empleadoId, setEmpleadoId] = useState("");
  const emp = empleados.find((e) => e.id === empleadoId);
  const { data: vacaciones = [] } = useSolicitudesVacacionesEmpleado(empleadoId || undefined);

  const [causa, setCausa] = useState<CausaEgreso>("despido_sin_causa");
  const [fechaIngreso, setFechaIngreso] = useState("");
  const [fechaEgreso, setFechaEgreso] = useState(hoyArgentina());
  const [mejorRem, setMejorRem] = useState("");
  const [remMes, setRemMes] = useState("");
  const [mejorSem, setMejorSem] = useState("");
  const [diasVac, setDiasVac] = useState("14");
  const [diasGozados, setDiasGozados] = useState("0");
  const [preaviso, setPreaviso] = useState(false);
  const [tope, setTope] = useState("");
  const [aportes, setAportes] = useState("17");

  // Al elegir empleado se precargan los datos del legajo
  useEffect(() => {
    if (!emp) return;
    setFechaIngreso(emp.fecha_ingreso);
    const sueldo = emp.sueldo_basico ? String(emp.sueldo_basico) : "";
    setMejorRem(sueldo);
    setRemMes(sueldo);
    setMejorSem("");
  }, [emp]);

  const anioEgreso = Number(fechaEgreso.slice(0, 4));
  useEffect(() => {
    if (fechaIngreso && anioEgreso) setDiasVac(String(diasVacacionesLCT(fechaIngreso, anioEgreso)));
  }, [fechaIngreso, anioEgreso]);

  // Vacaciones aprobadas del año del egreso
  useEffect(() => {
    if (!empleadoId) return;
    const gozados = vacaciones
      .filter((v: any) => v.estado === "aprobada" && String(v.fecha_desde).startsWith(String(anioEgreso)))
      .reduce((s: number, v: any) => s + (v.dias_solicitados || 0), 0);
    setDiasGozados(String(gozados));
  }, [vacaciones, empleadoId, anioEgreso]);

  const valido = !!fechaIngreso && !!fechaEgreso && fechaEgreso >= fechaIngreso && num(mejorRem) > 0 && num(remMes) > 0;
  const resultado = useMemo(() => valido ? calcularLiquidacionFinal({
    causa, fechaIngreso, fechaEgreso,
    mejorRemuneracion: num(mejorRem),
    remuneracionMensual: num(remMes),
    mejorRemuneracionSemestre: mejorSem ? num(mejorSem) : undefined,
    diasVacacionesAnuales: num(diasVac),
    diasVacacionesGozados: num(diasGozados),
    preavisoOtorgado: preaviso,
    topeConvenio: tope ? num(tope) : null,
    porcentajeAportes: num(aportes),
  }) : null, [valido, causa, fechaIngreso, fechaEgreso, mejorRem, remMes, mejorSem, diasVac, diasGozados, preaviso, tope, aportes]);

  const ant = valido ? antiguedad(fechaIngreso, fechaEgreso) : null;
  const usaPreaviso = causa === "despido_sin_causa" || causa === "fuerza_mayor" || causa === "periodo_prueba";
  const usaTope = causa === "despido_sin_causa" || causa === "fuerza_mayor" || causa === "fallecimiento";

  const descargarPdf = () => {
    if (!resultado) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Liquidación final", 14, 18);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const datos = [
      emp ? `Empleado: ${emp.apellido}, ${emp.nombre} — Legajo ${emp.legajo} — CUIL ${emp.cuil}` : "Empleado: (no seleccionado)",
      `Causa: ${CAUSAS[causa].label}`,
      `Ingreso: ${formatoFecha(fechaIngreso)} — Egreso: ${formatoFecha(fechaEgreso)} — Antigüedad: ${ant!.anios} años, ${ant!.meses} meses y ${ant!.dias} días`,
      `Mejor remuneración mensual: ${pesos(num(mejorRem))}${tope ? ` — Tope de convenio: ${pesos(num(tope))}` : ""}`,
    ];
    datos.forEach((t, i) => doc.text(t, 14, 26 + i * 6));
    autoTable(doc, {
      startY: 26 + datos.length * 6 + 2,
      head: [["Concepto", "Base de cálculo", "Fundamento", "Importe"]],
      body: [
        ...resultado.lineas.map((l) => [l.concepto, l.base, l.fundamento, pesos(l.importe)]),
        [{ content: "Total remunerativo", colSpan: 3, styles: { fontStyle: "bold" } }, pesos(resultado.totalRemunerativo)],
        [{ content: "Total indemnizatorio (sin aportes)", colSpan: 3, styles: { fontStyle: "bold" } }, pesos(resultado.totalIndemnizatorio)],
        [{ content: `Aportes del trabajador (${aportes} % sobre remunerativo)`, colSpan: 3 }, `- ${pesos(resultado.aportes)}`],
        [{ content: "Neto a cobrar", colSpan: 3, styles: { fontStyle: "bold" } }, { content: pesos(resultado.neto), styles: { fontStyle: "bold" } }],
      ],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [38, 166, 154] },
      columnStyles: { 3: { halign: "right" } },
    });
    const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    doc.setFontSize(7);
    const notas = [...resultado.avisos, "Estimación generada por TotalRH. No reemplaza el asesoramiento contable o legal; verificar topes y adicionales del convenio aplicable."];
    doc.text(doc.splitTextToSize(notas.join(" "), 180), 14, y);
    doc.save(`liquidacion_final_${emp ? emp.legajo : "empleado"}_${fechaEgreso}.pdf`);
    toast.success("PDF descargado");
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
      <section className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><Scale className="h-4 w-4 text-primary" />Datos del egreso</h3>
        <div className="space-y-1.5">
          <Label className="text-xs">Empleado</Label>
          <Select value={empleadoId} onValueChange={setEmpleadoId}>
            <SelectTrigger><SelectValue placeholder="Elegí un empleado (opcional)" /></SelectTrigger>
            <SelectContent className="max-h-72">{empleados.map((e) => <SelectItem key={e.id} value={e.id}>{e.apellido}, {e.nombre} · #{e.legajo}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Causa</Label>
          <Select value={causa} onValueChange={(v) => setCausa(v as CausaEgreso)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(CAUSAS).map(([k, c]) => <SelectItem key={k} value={k}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">{CAUSAS[causa].ayuda}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label className="text-xs">Fecha de ingreso</Label><Input type="date" value={fechaIngreso} onChange={(e) => setFechaIngreso(e.target.value)} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Último día trabajado</Label><Input type="date" value={fechaEgreso} onChange={(e) => setFechaEgreso(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label className="text-xs">Mejor remuneración mensual</Label><Input type="number" min={0} value={mejorRem} onChange={(e) => setMejorRem(e.target.value)} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Remuneración del mes</Label><Input type="number" min={0} value={remMes} onChange={(e) => setRemMes(e.target.value)} /></div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Mejor remuneración del semestre (para el SAC)</Label>
          <Input type="number" min={0} value={mejorSem} onChange={(e) => setMejorSem(e.target.value)} placeholder="Si se deja vacío, se usa la mejor remuneración" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label className="text-xs">Días de vacaciones por año</Label><Input type="number" min={0} value={diasVac} onChange={(e) => setDiasVac(e.target.value)} /></div>
          <div className="space-y-1.5"><Label className="text-xs">Ya gozados en {anioEgreso || "el año"}</Label><Input type="number" min={0} value={diasGozados} onChange={(e) => setDiasGozados(e.target.value)} /></div>
        </div>
        {usaPreaviso && (
          <label className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
            <span>Se otorgó preaviso (trabajado)</span>
            <Switch checked={preaviso} onCheckedChange={setPreaviso} />
          </label>
        )}
        {usaTope && (
          <div className="space-y-1.5">
            <Label className="text-xs">Tope del convenio (art. 245, opcional)</Label>
            <Input type="number" min={0} value={tope} onChange={(e) => setTope(e.target.value)} placeholder="3 × promedio de remuneraciones del CCT" />
          </div>
        )}
        <div className="space-y-1.5">
          <Label className="text-xs">Aportes del trabajador (%)</Label>
          <Input type="number" min={0} max={30} value={aportes} onChange={(e) => setAportes(e.target.value)} />
          <p className="text-[11px] text-muted-foreground">Jubilación 11 % + Ley 19.032 3 % + obra social 3 %. Sumá la cuota sindical si corresponde.</p>
        </div>
      </section>

      <section className="space-y-4">
        {!resultado ? (
          <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">Completá fechas y remuneraciones para ver la liquidación.</div>
        ) : (
          <>
            <div className="rounded-xl border bg-card shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3">
                <div>
                  <p className="font-semibold">{CAUSAS[causa].label}{emp ? ` · ${emp.apellido}, ${emp.nombre}` : ""}</p>
                  <p className="text-xs text-muted-foreground">Antigüedad: {ant!.anios} años, {ant!.meses} meses y {ant!.dias} días ({ant!.aniosComputables} {ant!.aniosComputables === 1 ? "año computable" : "años computables"})</p>
                </div>
                <Button variant="outline" size="sm" onClick={descargarPdf}><FileDown className="mr-1.5 h-4 w-4" />PDF</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
                      <th className="px-4 py-2 text-left font-medium">Concepto</th>
                      <th className="px-4 py-2 text-left font-medium">Cálculo</th>
                      <th className="px-4 py-2 text-right font-medium">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.lineas.map((l) => (
                      <tr key={l.concepto} className="border-b">
                        <td className="px-4 py-2">
                          <p className="font-medium">{l.concepto}</p>
                          <p className="text-[11px] text-muted-foreground">{l.fundamento} · {l.remunerativo ? "Remunerativo" : "Sin aportes"}</p>
                        </td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">{l.base}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{pesos(l.importe)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="text-sm">
                    <tr className="border-b"><td colSpan={2} className="px-4 py-1.5 text-muted-foreground">Total remunerativo</td><td className="px-4 py-1.5 text-right tabular-nums">{pesos(resultado.totalRemunerativo)}</td></tr>
                    <tr className="border-b"><td colSpan={2} className="px-4 py-1.5 text-muted-foreground">Total indemnizatorio (sin aportes)</td><td className="px-4 py-1.5 text-right tabular-nums">{pesos(resultado.totalIndemnizatorio)}</td></tr>
                    <tr className="border-b"><td colSpan={2} className="px-4 py-1.5 text-muted-foreground">Aportes ({aportes} % sobre remunerativo)</td><td className="px-4 py-1.5 text-right tabular-nums text-destructive">- {pesos(resultado.aportes)}</td></tr>
                    <tr><td colSpan={2} className="px-4 py-2.5 text-base font-bold">Neto a cobrar</td><td className="px-4 py-2.5 text-right text-base font-bold tabular-nums">{pesos(resultado.neto)}</td></tr>
                  </tfoot>
                </table>
              </div>
            </div>
            {resultado.avisos.length > 0 && (
              <div className="space-y-1 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                {resultado.avisos.map((a) => <p key={a} className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{a}</p>)}
              </div>
            )}
          </>
        )}
        <p className="flex items-start gap-2 rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          Estimación según la Ley de Contrato de Trabajo: no incluye adicionales propios del convenio, multas por registración
          deficiente ni retención de Ganancias. Validá cada caso con el contador o el asesor legal antes de pagar.
        </p>
      </section>
    </div>
  );
}
