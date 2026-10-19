import { useState } from "react";
import { Clock, FileText, Image as ImageIcon, Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export interface AdjuntoPermiso {
  path: string;
  nombre: string;
  tipo: string;
  tamano: number;
}

export const MAX_ADJUNTOS = 5;
export const MAX_MB_ADJUNTO = 10;
/** Sólo PDF o fotos (en el celular permite sacar la foto con la cámara) */
export const TIPOS_ACEPTADOS = "application/pdf,image/*";

/** Valida los archivos elegidos: cantidad, tamaño y tipo. Devuelve el error o null. */
export function validarAdjuntos(actuales: number, archivos: { size: number; type: string; name: string }[]) {
  if (actuales + archivos.length > MAX_ADJUNTOS) return `Podés adjuntar hasta ${MAX_ADJUNTOS} archivos`;
  const grande = archivos.find((f) => f.size > MAX_MB_ADJUNTO * 1024 * 1024);
  if (grande) return `"${grande.name}" supera ${MAX_MB_ADJUNTO} MB`;
  const raro = archivos.find((f) => !(f.type === "application/pdf" || f.type.startsWith("image/") || /\.pdf$/i.test(f.name)));
  if (raro) return `"${raro.name}" no es PDF ni foto`;
  return null;
}

/** Sube los archivos a la carpeta privada del empleado y devuelve sus datos. */
export async function subirAdjuntosPermiso(empleadoId: string, archivos: File[]): Promise<AdjuntoPermiso[]> {
  const subidos: AdjuntoPermiso[] = [];
  for (const f of archivos) {
    const ext = f.name.includes(".") ? f.name.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "") : "bin";
    const path = `${empleadoId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("permisos").upload(path, f, { contentType: f.type || "application/octet-stream" });
    if (error) throw new Error(`No se pudo subir "${f.name}"`);
    subidos.push({ path, nombre: f.name, tipo: f.type, tamano: f.size });
  }
  return subidos;
}

const tamano = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

/** Selector de archivos para el formulario de permiso. */
export function SelectorAdjuntos({ archivos, onChange }: { archivos: File[]; onChange: (f: File[]) => void }) {
  return (
    <div className="space-y-2">
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed px-3 py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary">
        <Paperclip className="h-4 w-4" />Adjuntar certificado o comprobante (PDF o foto)
        <input
          type="file"
          multiple
          accept={TIPOS_ACEPTADOS}
          className="hidden"
          onChange={(e) => {
            const nuevos = Array.from(e.target.files ?? []);
            e.target.value = "";
            const error = validarAdjuntos(archivos.length, nuevos);
            if (error) { toast.error(error); return; }
            onChange([...archivos, ...nuevos]);
          }}
        />
      </label>
      {archivos.length > 0 && (
        <ul className="space-y-1.5">
          {archivos.map((f, i) => (
            <li key={i} className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
              {f.type.startsWith("image/") ? <ImageIcon className="h-4 w-4 shrink-0 text-primary" /> : <FileText className="h-4 w-4 shrink-0 text-primary" />}
              <span className="flex-1 truncate">{f.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{tamano(f.size)}</span>
              <button type="button" onClick={() => onChange(archivos.filter((_, j) => j !== i))} aria-label={`Quitar ${f.name}`} className="text-muted-foreground hover:text-destructive">
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-muted-foreground">Hasta {MAX_ADJUNTOS} archivos de {MAX_MB_ADJUNTO} MB. Sólo los ven vos y RRHH.</p>
    </div>
  );
}

/** Lista de documentos de una solicitud, con descarga mediante URL firmada. */
export function ListaAdjuntosPermiso({ adjuntos }: { adjuntos: unknown }) {
  const lista = Array.isArray(adjuntos) ? (adjuntos as AdjuntoPermiso[]) : [];
  const [abriendo, setAbriendo] = useState<string | null>(null);
  if (lista.length === 0) return null;

  const abrir = async (a: AdjuntoPermiso) => {
    // La pestaña se abre antes de pedir la URL para que el navegador no la bloquee
    const ventana = window.open("", "_blank");
    setAbriendo(a.path);
    const { data, error } = await supabase.storage.from("permisos").createSignedUrl(a.path, 300);
    setAbriendo(null);
    if (error || !data) { ventana?.close(); toast.error("No se pudo abrir el documento"); return; }
    if (ventana) ventana.location.href = data.signedUrl; else window.location.href = data.signedUrl;
  };

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {lista.map((a) => (
        <Button key={a.path} type="button" variant="outline" size="sm" className="h-7 max-w-full gap-1.5 px-2 text-xs" onClick={() => abrir(a)} disabled={abriendo === a.path}>
          {abriendo === a.path ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : a.tipo?.startsWith("image/") ? <ImageIcon className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
          <span className="truncate">{a.nombre}</span>
        </Button>
      ))}
    </div>
  );
}

/**
 * Plazo para presentar el original en papel: 24 hs hábiles.
 * De lunes a viernes vence a la misma hora del día hábil siguiente (viernes → lunes).
 * Si se presenta sábado o domingo, vence el lunes a las 23:59. No contempla feriados.
 */
export function plazoPresentacion(desde: Date) {
  const d = new Date(desde);
  const dia = d.getDay();
  if (dia === 6 || dia === 0) {
    d.setDate(d.getDate() + (dia === 6 ? 2 : 1));
    d.setHours(23, 59, 0, 0);
    return d;
  }
  d.setDate(d.getDate() + (dia === 5 ? 3 : 1));
  return d;
}

export function textoPlazo(desde: Date) {
  const p = plazoPresentacion(desde);
  const dia = p.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "numeric" });
  const hora = p.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return `${dia} a las ${hora}`;
}

export const LEYENDA_ORIGINAL = "El documento original debe presentarse físicamente en Recursos Humanos dentro de las 24 hs hábiles.";

/** Aviso en solicitudes pendientes con documentos adjuntos. */
export function AvisoPresentacion({ creadaAt }: { creadaAt: string }) {
  return (
    <p className="mt-1.5 flex items-start gap-1.5 rounded-md bg-warning/10 px-2 py-1 text-[11px] text-warning">
      <Clock className="mt-0.5 h-3 w-3 shrink-0" />
      <span>Presentá el original en RRHH antes del {textoPlazo(new Date(creadaAt))}.</span>
    </p>
  );
}
