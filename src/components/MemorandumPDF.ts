import jsPDF from "jspdf";
import { aplicarMembrete, aplicarFooterMembrete } from "./MembretePDF";
import { formatoFecha } from "@/lib/vacacionesCalendario";

interface MemoData {
  numero: number;
  titulo: string;
  contenido: string;
  destinatarioNombre: string;
  fecha: string;
  /** Quién emite el memorándum (persona y sector de RRHH) */
  emisor?: { nombre?: string | null; cargo?: string | null; sector?: string | null } | null;
  empresa?: { nombre: string; razon_social?: string | null; cuit?: string | null; domicilio?: string | null; telefono?: string | null; email?: string | null; logo_url?: string | null } | null;
  grupo?: { nombre: string; cuit?: string | null; domicilio?: string | null; telefono?: string | null; email?: string | null; logo_url?: string | null } | null;
}

async function buildMemorandumDoc(data: MemoData) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();

  const config = data.empresa
    ? { nombre: data.empresa.nombre, razonSocial: data.empresa.razon_social, cuit: data.empresa.cuit, domicilio: data.empresa.domicilio, telefono: data.empresa.telefono, email: data.empresa.email, logoUrl: data.empresa.logo_url }
    : data.grupo
    ? { nombre: data.grupo.nombre, cuit: data.grupo.cuit, domicilio: data.grupo.domicilio, telefono: data.grupo.telefono, email: data.grupo.email, logoUrl: data.grupo.logo_url || "/logo_total_rh.png" }
    : { nombre: "TotalRH", logoUrl: "/logo_total_rh.png" };

  let y = await aplicarMembrete(doc, config);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`MEMORÁNDUM N° ${data.numero}`, w / 2, y, { align: "center" });
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const fFecha = formatoFecha(data.fecha);
  doc.text(`Fecha: ${fFecha}`, 20, y);
  y += 7;
  if (data.destinatarioNombre) {
    doc.text(`Para: ${data.destinatarioNombre}`, 20, y);
    y += 7;
  }
  const emite = [data.emisor?.sector, data.emisor?.nombre].filter(Boolean).join(" — ");
  if (emite) {
    doc.text(`De: ${emite}`, 20, y);
    y += 7;
  }
  doc.text(`Asunto: ${data.titulo}`, 20, y);
  y += 4;
  doc.setDrawColor(200);
  doc.line(20, y, w - 20, y);
  y += 8;

  doc.setFontSize(10);
  const lines = doc.splitTextToSize(data.contenido, w - 40);
  doc.text(lines, 20, y);

  const sigY = Math.max(y + lines.length * 5 + 30, 220);
  doc.line(20, sigY, 80, sigY);
  doc.setFontSize(8);
  // Firma de quien emite: nombre, cargo y sector debajo de la línea
  const firma = [data.emisor?.nombre, data.emisor?.cargo, data.emisor?.sector].filter(Boolean) as string[];
  if (firma.length) {
    doc.setFont("helvetica", "bold");
    doc.text(firma[0], 50, sigY + 5, { align: "center" });
    doc.setFont("helvetica", "normal");
    firma.slice(1).forEach((t, i) => doc.text(t, 50, sigY + 9 + i * 4, { align: "center" }));
    doc.text("Firma del emisor", 50, sigY + 9 + (firma.length - 1) * 4, { align: "center" });
  } else {
    doc.text("Firma y Sello", 35, sigY + 5);
  }

  doc.line(w / 2 + 10, sigY, w / 2 + 70, sigY);
  doc.text("Acuse de Recibo", w / 2 + 25, sigY + 5);

  aplicarFooterMembrete(doc, config);

  return doc;
}

export async function generarMemorandumPDF(data: MemoData) {
  const doc = await buildMemorandumDoc(data);
  doc.save(`memorandum_${data.numero}.pdf`);
}

/** Returns the PDF as a Blob for upload/attachment purposes */
export async function generarMemorandumBlob(data: MemoData): Promise<Blob> {
  const doc = await buildMemorandumDoc(data);
  return doc.output("blob");
}
