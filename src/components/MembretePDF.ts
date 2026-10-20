import jsPDF from "jspdf";

interface MembreteConfig {
  nombre: string;
  razonSocial?: string | null;
  cuit?: string | null;
  domicilio?: string | null;
  telefono?: string | null;
  email?: string | null;
  logoUrl?: string | null;
}

export async function aplicarMembrete(doc: jsPDF, config: MembreteConfig): Promise<number> {
  const w = doc.internal.pageSize.getWidth();
  const y = 12;

  // Try to load logo
  if (config.logoUrl) {
    try {
      const img = await loadImage(config.logoUrl);
      doc.addImage(img, "PNG", 14, y, 30, 30);
    } catch {
      // Skip logo if can't load
    }
  }

  const textX = config.logoUrl ? 50 : 14;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(config.nombre, textX, y + 8);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const details: string[] = [];
  if (config.razonSocial) details.push(config.razonSocial);
  if (config.cuit) details.push(`CUIT: ${config.cuit}`);
  if (details.length) doc.text(details.join(" — "), textX, y + 14);

  const contact: string[] = [];
  if (config.domicilio) contact.push(config.domicilio);
  if (config.telefono) contact.push(`Tel: ${config.telefono}`);
  if (config.email) contact.push(config.email);
  if (contact.length) doc.text(contact.join(" | "), textX, y + 19);

  const lineY = Math.max(y + 25, config.logoUrl ? y + 34 : y + 25);
  doc.setDrawColor(180);
  doc.line(14, lineY, w - 14, lineY);

  return lineY + 6;
}

export function aplicarFooterMembrete(doc: jsPDF, config: MembreteConfig) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setDrawColor(180);
  doc.line(14, h - 20, w - 14, h - 20);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  const footerText = [config.nombre, config.razonSocial, config.cuit ? `CUIT ${config.cuit}` : null].filter(Boolean).join(" — ");
  doc.text(footerText, w / 2, h - 15, { align: "center" });
  doc.setTextColor(0);
}

function loadImage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = url;
  });
}
