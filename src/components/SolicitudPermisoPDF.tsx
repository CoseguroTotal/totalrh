import jsPDF from "jspdf";
import { aplicarMembrete, aplicarFooterMembrete } from "./MembretePDF";
import { formatoFecha } from "@/lib/vacacionesCalendario";
import { fechaHoraAR, type FirmaPermiso } from "@/lib/firmaPermiso";
import { fraseHorario } from "@/lib/horarioPermiso";

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
  horaSalida?: string | null;
  horaReintegro?: string | null;
  sujetoDescuento: boolean;
  fechaSolicitud: string;
  empresa?: MembreteInfo | null;
  grupo?: MembreteInfo | null;
  /** Resolución firmada por RRHH (estado, quién, cuándo y observaciones) */
  resolucion?: FirmaPermiso | null;
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
  // La fecha viene como YYYY-MM-DD: leerla como UTC la corre un día para atrás en Argentina
  const fSol = data.fechaSolicitud ? formatoFecha(data.fechaSolicitud) : new Date().toLocaleDateString("es-AR");
  doc.text(`Salta, ${fSol}`, 20, y);

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
  const fDesde = formatoFecha(data.fechaDesde);
  const fHasta = formatoFecha(data.fechaHasta);
  doc.text(`Desde el día ${fDesde}, hasta el día ${fHasta}${fraseHorario({ hora_salida: data.horaSalida, hora_reintegro: data.horaReintegro })}.`, 20, y, { maxWidth: w - 40 });

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
  const res = data.resolucion;
  const resuelta = res && (res.estado === "aprobada" || res.estado === "rechazada");
  const obs = resuelta && res.observaciones?.trim()
    ? (doc.splitTextToSize(`Observaciones: ${res.observaciones.trim()}`, w / 2 - 10) as string[]).slice(0, 8)
    : [];
  const alto = resuelta ? 22 + obs.length * 4 : 10;
  if (y + alto > doc.internal.pageSize.getHeight() - 22) {
    doc.addPage();
    y = 40;
  }
  if (resuelta && res.aprobado_nombre) {
    // Firma registrada en el sistema: nombre y cargo sobre la línea
    doc.setFont("helvetica", "bold");
    doc.text(res.aprobado_nombre, 50, y - 2, { align: "center" });
    doc.setFont("helvetica", "normal");
  }
  doc.line(20, y, 80, y);
  doc.text("Firma y sello Recursos Humanos", 22, y + 5);
  if (resuelta) {
    let yi = y + 9;
    if (res.aprobado_cargo) { doc.text(res.aprobado_cargo, 50, yi, { align: "center" }); yi += 4; }
    if (res.aprobado_at) { doc.setFontSize(8); doc.text(`Firmado en el sistema el ${fechaHoraAR(res.aprobado_at)}`, 50, yi, { align: "center" }); doc.setFontSize(9); }

    const x = w / 2 - 5;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Resolución: ${res.estado === "aprobada" ? "APROBADA" : "RECHAZADA"}`, x, y - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    obs.forEach((l, i) => doc.text(l, x, y - 6 + i * 4));
  }

  if (membreteConfig) {
    aplicarFooterMembrete(doc, membreteConfig);
  }

  doc.save(`solicitud_permiso_${data.empleadoNombre.replace(/\s+/g, "_")}.pdf`);
}
