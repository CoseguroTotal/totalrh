import jsPDF from "jspdf";
import { aplicarMembrete, aplicarFooterMembrete } from "./MembretePDF";

interface MemoData {
  numero: number;
  titulo: string;
  contenido: string;
  destinatarioNombre: string;
  fecha: string;
  empresa?: { nombre: string; razon_social?: string | null; cuit?: string | null; domicilio?: string | null; telefono?: string | null; email?: string | null; logo_url?: string | null } | null;
  grupo?: { nombre: string; cuit?: string | null; domicilio?: string | null; telefono?: string | null; email?: string | null; logo_url?: string | null } | null;
}

export async function generarMemorandumPDF(data: MemoData) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();

  // Apply letterhead
  const config = data.empresa
    ? { nombre: data.empresa.nombre, razonSocial: data.empresa.razon_social, cuit: data.empresa.cuit, domicilio: data.empresa.domicilio, telefono: data.empresa.telefono, email: data.empresa.email, logoUrl: data.empresa.logo_url }
    : data.grupo
    ? { nombre: data.grupo.nombre, cuit: data.grupo.cuit, domicilio: data.grupo.domicilio, telefono: data.grupo.telefono, email: data.grupo.email, logoUrl: data.grupo.logo_url }
    : { nombre: "GrupoRH" };

  let y = await aplicarMembrete(doc, config);

  // Memo header
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`MEMORÁNDUM N° ${data.numero}`, w / 2, y, { align: "center" });
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const fFecha = new Date(data.fecha).toLocaleDateString("es-AR");
  doc.text(`Fecha: ${fFecha}`, 20, y);
  y += 7;
  if (data.destinatarioNombre) {
    doc.text(`Para: ${data.destinatarioNombre}`, 20, y);
    y += 7;
  }
  doc.text(`Asunto: ${data.titulo}`, 20, y);
  y += 4;
  doc.setDrawColor(200);
  doc.line(20, y, w - 20, y);
  y += 8;

  // Content
  doc.setFontSize(10);
  const lines = doc.splitTextToSize(data.contenido, w - 40);
  doc.text(lines, 20, y);

  // Signature area
  const sigY = Math.max(y + lines.length * 5 + 30, 220);
  doc.line(20, sigY, 80, sigY);
  doc.setFontSize(8);
  doc.text("Firma y Sello", 35, sigY + 5);

  doc.line(w / 2 + 10, sigY, w / 2 + 70, sigY);
  doc.text("Acuse de Recibo", w / 2 + 25, sigY + 5);

  aplicarFooterMembrete(doc, config);

  doc.save(`memorandum_${data.numero}.pdf`);
}
