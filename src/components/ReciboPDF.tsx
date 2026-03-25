import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface LineaRecibo {
  descripcion: string;
  tipo: string;
  monto: number;
  codigo?: string;
}

interface ReciboData {
  empleadoNombre: string;
  empleadoLegajo: string;
  periodo: string;
  sueldoBasico: number;
  lineas: LineaRecibo[];
  totalRemunerativo: number;
  totalNoRemunerativo: number;
  totalDeducciones: number;
  neto: number;
}

export function generarReciboPDF(data: ReciboData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("RECIBO DE SUELDO", pageWidth / 2, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Empleado: ${data.empleadoNombre}`, 14, 35);
  doc.text(`Legajo: ${data.empleadoLegajo}`, 14, 41);
  doc.text(`Período: ${data.periodo}`, pageWidth - 14, 35, { align: "right" });

  doc.setDrawColor(200);
  doc.line(14, 46, pageWidth - 14, 46);

  // Haberes table
  const haberes: (string | number)[][] = [
    ["Sueldo Básico", fmt(data.sueldoBasico)],
  ];
  data.lineas
    .filter((l) => l.tipo === "remunerativo")
    .forEach((l) => haberes.push([l.descripcion, fmt(l.monto)]));
  data.lineas
    .filter((l) => l.tipo === "no_remunerativo")
    .forEach((l) => haberes.push([`${l.descripcion} (NR)`, fmt(l.monto)]));

  const deducciones: (string | number)[][] = [];
  data.lineas
    .filter((l) => l.tipo === "deduccion")
    .forEach((l) => deducciones.push([l.descripcion, fmt(l.monto)]));

  let yPos = 50;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("HABERES", 14, yPos);
  yPos += 2;

  autoTable(doc, {
    startY: yPos,
    head: [["Concepto", "Monto"]],
    body: haberes,
    theme: "grid",
    headStyles: { fillColor: [66, 66, 66], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: "right" } },
    margin: { left: 14, right: pageWidth / 2 + 5 },
    tableWidth: pageWidth / 2 - 19,
  });

  doc.setFont("helvetica", "bold");
  doc.text("DEDUCCIONES", pageWidth / 2 + 5, 50);

  autoTable(doc, {
    startY: 52,
    head: [["Concepto", "Monto"]],
    body: deducciones.length > 0 ? deducciones : [["Sin deducciones", "-"]],
    theme: "grid",
    headStyles: { fillColor: [66, 66, 66], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: "right" } },
    margin: { left: pageWidth / 2 + 5, right: 14 },
    tableWidth: pageWidth / 2 - 19,
  });

  // Totals
  const finalY = Math.max(
    (doc as any).lastAutoTable?.finalY ?? 120,
    120
  );

  const totalsY = finalY + 10;
  doc.setDrawColor(200);
  doc.line(14, totalsY - 3, pageWidth - 14, totalsY - 3);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Total Remunerativo:", 14, totalsY + 4);
  doc.text(fmt(data.totalRemunerativo), pageWidth / 2 - 5, totalsY + 4, { align: "right" });

  doc.text("Total No Remunerativo:", 14, totalsY + 10);
  doc.text(fmt(data.totalNoRemunerativo), pageWidth / 2 - 5, totalsY + 10, { align: "right" });

  doc.text("Total Deducciones:", pageWidth / 2 + 5, totalsY + 4);
  doc.text(`-${fmt(data.totalDeducciones)}`, pageWidth - 14, totalsY + 4, { align: "right" });

  doc.setDrawColor(0);
  doc.line(14, totalsY + 15, pageWidth - 14, totalsY + 15);

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("NETO A COBRAR:", 14, totalsY + 23);
  doc.text(fmt(data.neto), pageWidth - 14, totalsY + 23, { align: "right" });

  // Footer
  const footerY = totalsY + 45;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setDrawColor(200);
  doc.line(14, footerY, 80, footerY);
  doc.line(pageWidth - 80, footerY, pageWidth - 14, footerY);
  doc.text("Firma Empleado", 47, footerY + 5, { align: "center" });
  doc.text("Firma Empleador", pageWidth - 47, footerY + 5, { align: "center" });

  doc.save(`recibo_${data.empleadoLegajo}_${data.periodo}.pdf`);
}

function fmt(n: number): string {
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}
