import jsPDF from "jspdf";
import { aplicarMembrete, aplicarFooterMembrete } from "./MembretePDF";

interface MembreteInfo {
  nombre: string;
  razonSocial?: string | null;
  cuit?: string | null;
  domicilio?: string | null;
  telefono?: string | null;
  email?: string | null;
  logoUrl?: string | null;
}

interface SolicitudData {
  empleadoNombre: string;
  areaTrabajo: string;
  motivo: string;
  motivoDetalle?: string | null;
  fechaDesde: string;
  fechaHasta: string;
  horaReintegro?: string | null;
  sujetoDescuento: boolean;
  fechaSolicitud: string;
  empresa?: MembreteInfo | null;
  grupo?: MembreteInfo | null;
}

export async function generarSolicitudPermisoPDF(data: SolicitudData) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();

  // Apply letterhead if empresa or grupo data available
  const membreteConfig = data.empresa || data.grupo || null;
  let y = membreteConfig ? await aplicarMembrete(doc, membreteConfig) : 25;

  doc.setFontSize(10);
  doc.text("REGISTRO", w - 30, y);

  y += 10;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Solicitud de Permiso", w / 2, y, { align: "center" });

  y += 12;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const fSol = data.fechaSolicitud ? new Date(data.fechaSolicitud) : new Date();
  doc.text(`Salta, ${fSol.toLocaleDateString("es-AR")}`, 20, y);

  y += 10;
  doc.text("Sr. Gerente", 20, y);

  y += 10;
  doc.text(`Área de Trabajo: ${data.areaTrabajo}`, 20, y);

  y += 10;
  doc.text(`Sujeto a Descuento:   ${data.sujetoDescuento ? "[X] SÍ   [ ] NO" : "[ ] SÍ   [X] NO"}`, 20, y);

  y += 12;
  doc.text("Por la presente solicito autorización para gozar de un Permiso por el siguiente motivo:", 20, y, { maxWidth: w - 40 });

  y += 14;
  const motivos = [
    "Lic. por Paternidad",
    "Lic. por Estudio",
    "Mudanza",
    "Trámites Personales",
    "Lic. por Fallecimiento",
    "Lic. Sin goce de haberes",
    "Otros",
  ];
  motivos.forEach((m) => {
    const checked = data.motivo === m;
    let line = `${checked ? "[X]" : "[ ]"} ${m}`;
    if (checked && m === "Lic. por Fallecimiento" && data.motivoDetalle) {
      line += ` — ${data.motivoDetalle}`;
    }
    if (checked && m === "Otros" && data.motivoDetalle) {
      line += `: ${data.motivoDetalle}`;
    }
    doc.text(line, 25, y);
    y += 7;
  });

  y += 6;
  const fDesde = new Date(data.fechaDesde).toLocaleDateString("es-AR");
  const fHasta = new Date(data.fechaHasta).toLocaleDateString("es-AR");
  doc.text(`Desde el día ${fDesde}, hasta el día ${fHasta}${data.horaReintegro ? `, reintegrándose a horas ${data.horaReintegro}` : ""}.`, 20, y, { maxWidth: w - 40 });

  y += 16;
  doc.text("Sin más, saludo a Ud. muy atte.", 20, y);

  y += 25;
  doc.line(20, y, 80, y);
  doc.setFontSize(9);
  doc.text("Empleado Solicitante", 30, y + 5);
  doc.text(data.empleadoNombre, 30, y + 10);

  doc.line(w / 2 - 20, y, w / 2 + 40, y);
  doc.text("Firma Responsable Directo", w / 2 - 10, y + 5);

  y += 25;
  doc.line(20, y, 80, y);
  doc.text("Firma y sello Recursos Humanos", 22, y + 5);

  if (membreteConfig) {
    aplicarFooterMembrete(doc, membreteConfig);
  }

  doc.save(`solicitud_permiso_${data.empleadoNombre.replace(/\s+/g, "_")}.pdf`);
}
