import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { aplicarMembrete, aplicarFooterMembrete } from "./MembretePDF";

interface LineaRecibo {
  descripcion: string;
  tipo: string;
  monto: number;
  codigo?: string;
  base?: number;
  cantidad?: number;
  unidad?: string;
  es_haber?: boolean;
  grupo?: string;
}

interface EmpresaData {
  nombre: string;
  razon_social?: string | null;
  cuit?: string | null;
  domicilio_fiscal?: string | null;
  telefono?: string | null;
  email?: string | null;
  logo_url?: string | null;
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
  empresa?: EmpresaData | null;
}

export async function generarReciboPDF(data: ReciboData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  let startY = 18;

  // Apply letterhead if empresa data available
  if (data.empresa) {
    startY = await aplicarMembrete(doc, {
      nombre: data.empresa.nombre,
      razonSocial: data.empresa.razon_social,
      cuit: data.empresa.cuit,
      domicilio: data.empresa.domicilio_fiscal,
      telefono: data.empresa.telefono,
      email: data.empresa.email,
      logoUrl: data.empresa.logo_url,
    });
  }

  // Header
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("RECIBO DE SUELDO", pageWidth / 2, startY, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Empleado: ${data.empleadoNombre}`, 14, startY + 12);
  doc.text(`Legajo: ${data.empleadoLegajo}`, 14, startY + 17);
  doc.text(`Período: ${data.periodo}`, pageWidth - 14, startY + 12, { align: "right" });

  doc.setDrawColor(180);
  doc.line(14, startY + 21, pageWidth - 14, startY + 21);

  // Build table rows grouped
  const rows: (string | number)[][] = [];
  rows.push(["Sueldo Básico", "—", "30 días", fmt(data.sueldoBasico), ""]);

  const groupMap = new Map<string, LineaRecibo[]>();
  for (const l of data.lineas) {
    const g = l.grupo || "General";
    if (!groupMap.has(g)) groupMap.set(g, []);
    groupMap.get(g)!.push(l);
  }

  for (const [grupo, items] of groupMap) {
    rows.push([{ content: grupo, colSpan: 5, styles: { fontStyle: "bold", fillColor: [240, 240, 240] } } as any]);
    for (const l of items) {
      const esHaber = l.es_haber !== false && l.tipo !== "deduccion";
      const unidadStr = l.unidad === "dias" ? `${l.cantidad || 1} d` : l.unidad === "horas" ? `${l.cantidad || 1} hs` : l.cantidad && l.cantidad > 1 ? `${l.cantidad}` : "—";
      rows.push([
        `  ${l.descripcion}`,
        l.base && l.base > 0 ? fmt(l.base) : "—",
        unidadStr,
        esHaber ? fmt(l.monto) : "",
        !esHaber ? fmt(l.monto) : "",
      ]);
    }
  }

  autoTable(doc, {
    startY: startY + 24,
    head: [["Concepto", "Base", "Unidad", "Haberes", "Descuentos"]],
    body: rows,
    theme: "grid",
    headStyles: { fillColor: [50, 50, 50], fontSize: 8, halign: "center" },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { halign: "right", cellWidth: 28 },
      2: { halign: "center", cellWidth: 22 },
      3: { halign: "right", cellWidth: 30 },
      4: { halign: "right", cellWidth: 30 },
    },
    margin: { left: 14, right: 14 },
  });

  const finalY = (doc as any).lastAutoTable?.finalY ?? 160;

  const ty = finalY + 5;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Total Haberes:", 14, ty);
  doc.text(fmt(data.sueldoBasico + data.lineas.filter(l => l.es_haber !== false && l.tipo !== "deduccion").reduce((s, l) => s + l.monto, 0)), 100, ty, { align: "right" });

  doc.text("Total Descuentos:", 110, ty);
  doc.text(fmt(data.totalDeducciones), pageWidth - 14, ty, { align: "right" });

  doc.setDrawColor(0);
  doc.line(14, ty + 4, pageWidth - 14, ty + 4);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("NETO A COBRAR:", 14, ty + 11);
  doc.text(fmt(data.neto), pageWidth - 14, ty + 11, { align: "right" });

  const footerY = ty + 30;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setDrawColor(180);
  doc.line(14, footerY, 80, footerY);
  doc.line(pageWidth - 80, footerY, pageWidth - 14, footerY);
  doc.text("Firma Empleado", 47, footerY + 5, { align: "center" });
  doc.text("Firma Empleador", pageWidth - 47, footerY + 5, { align: "center" });

  if (data.empresa) {
    aplicarFooterMembrete(doc, {
      nombre: data.empresa.nombre,
      razonSocial: data.empresa.razon_social,
      cuit: data.empresa.cuit,
    });
  }

  doc.save(`recibo_${data.empleadoLegajo}_${data.periodo}.pdf`);
}

function fmt(n: number): string {
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}
