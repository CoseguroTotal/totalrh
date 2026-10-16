import { useEffect, useMemo, useRef, useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale";
import {
  ArrowLeft, Check, Download, FileText, Image as ImageIcon, Loader2, Mic, MoreVertical, Paperclip,
  Search, Send, Trash2, Users, X, LogOut, MessageSquarePlus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { UserAvatar, nombreCompleto } from "@/components/muro/MuroComponents";
import type { PerfilMuro } from "@/hooks/useMuro";
import {
  LIMITE_MB, MAX_AUDIO_SEG, formatoTamano, tipoDeArchivo, useAdjuntoUrl, useCrearGrupo, useDirectorio,
  useEliminarMensaje, useEnviarMensaje, useGrabadora, useIniciarDirecta, useMensajes, useMarcarLeido,
  useSalirDeGrupo, type Conversacion, type Mensaje, type TipoAdjunto,
} from "@/hooks/useChat";

/* ─────────────── Utilidades ─────────────── */

export function tituloConversacion(c: Conversacion, perfiles: Map<string, PerfilMuro>) {
  if (c.tipo === "grupo") return c.nombre || "Grupo";
  return nombreCompleto(perfiles.get(c.participantes[0]));
}

function previewUltimo(c: Conversacion, yo: string | null | undefined) {
  if (!c.ultimo_autor_id) return "Grupo creado";
  const prefijo = c.ultimo_autor_id === yo ? "Vos: " : "";
  if (c.ultimo_eliminado) return `${prefijo}Mensaje eliminado`;
  if (c.ultimo_adjunto_tipo === "imagen") return `${prefijo}📷 Foto${c.ultimo_texto ? ` · ${c.ultimo_texto}` : ""}`;
  if (c.ultimo_adjunto_tipo === "audio") return `${prefijo}🎤 Mensaje de voz`;
  if (c.ultimo_adjunto_tipo === "documento") return `${prefijo}📄 Documento${c.ultimo_texto ? ` · ${c.ultimo_texto}` : ""}`;
  return `${prefijo}${c.ultimo_texto ?? ""}`;
}

function horaCorta(fecha: string) {
  const d = new Date(fecha);
  if (isToday(d)) return format(d, "HH:mm");
  if (isYesterday(d)) return "Ayer";
  return format(d, "dd/MM/yy");
}

function separadorDia(fecha: string) {
  const d = new Date(fecha);
  if (isToday(d)) return "Hoy";
  if (isYesterday(d)) return "Ayer";
  return format(d, "EEEE d 'de' MMMM", { locale: es });
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function AvatarConversacion({ c, perfiles, size = "md" }: { c: Conversacion; perfiles: Map<string, PerfilMuro>; size?: "sm" | "md" | "lg" }) {
  if (c.tipo === "grupo") {
    const dims = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-8 w-8" : "h-10 w-10";
    return (
      <div className={cn(dims, "rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0")}>
        <Users className="h-5 w-5" />
      </div>
    );
  }
  return <UserAvatar perfil={perfiles.get(c.participantes[0])} size={size} />;
}

/* ─────────────── Bandeja ─────────────── */

export function ListaConversaciones({
  conversaciones, perfiles, yo, activa, onElegir, onNuevo, isLoading,
}: {
  conversaciones: Conversacion[];
  perfiles: Map<string, PerfilMuro>;
  yo: string | null | undefined;
  activa?: string;
  onElegir: (id: string) => void;
  onNuevo: () => void;
  isLoading: boolean;
}) {
  const [filtro, setFiltro] = useState("");
  const lista = conversaciones.filter((c) => tituloConversacion(c, perfiles).toLowerCase().includes(filtro.toLowerCase()));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 className="text-xl font-bold">Chats</h2>
        <Button size="icon" variant="secondary" className="rounded-full" onClick={onNuevo} aria-label="Nuevo chat" title="Nuevo chat">
          <MessageSquarePlus className="h-5 w-5" />
        </Button>
      </div>
      <div className="px-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar en Mensajes" className="rounded-full bg-muted border-0 pl-9" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : lista.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">{filtro ? "Sin resultados." : "Todavía no tenés conversaciones."}</p>
            {!filtro && <Button className="mt-3" onClick={onNuevo}><MessageSquarePlus className="h-4 w-4 mr-2" />Empezar un chat</Button>}
          </div>
        ) : (
          lista.map((c) => {
            const sinLeer = c.no_leidos > 0;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onElegir(c.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-muted",
                  activa === c.id && "bg-primary/10 hover:bg-primary/10"
                )}
              >
                <AvatarConversacion c={c} perfiles={perfiles} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate text-[15px]", sinLeer ? "font-bold" : "font-medium")}>{tituloConversacion(c, perfiles)}</p>
                  <p className={cn("truncate text-[13px]", sinLeer ? "font-semibold text-foreground" : "text-muted-foreground")}>
                    {previewUltimo(c, yo)} · {horaCorta(c.ultimo_mensaje_at)}
                  </p>
                </div>
                {sinLeer && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                    {c.no_leidos > 99 ? "99+" : c.no_leidos}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ─────────────── Conversación ─────────────── */

export function VistaConversacion({
  conversacion, perfiles, yo, onVolver,
}: {
  conversacion: Conversacion;
  perfiles: Map<string, PerfilMuro>;
  yo: string | null | undefined;
  onVolver: () => void;
}) {
  const [limite, setLimite] = useState(60);
  const { data: mensajes = [], isLoading, isFetching } = useMensajes(conversacion.id, limite);
  const marcarLeido = useMarcarLeido();
  const salir = useSalirDeGrupo();
  const finRef = useRef<HTMLDivElement>(null);
  const ultimoId = mensajes[mensajes.length - 1]?.id;

  // Al abrir o llegar un mensaje nuevo: bajar al final y marcar como leído
  useEffect(() => {
    finRef.current?.scrollIntoView({ block: "end" });
    if (conversacion.id) marcarLeido(conversacion.id);
  }, [ultimoId, conversacion.id, marcarLeido]);

  const otro = conversacion.tipo === "directa" ? perfiles.get(conversacion.participantes[0]) : null;
  const subtitulo = conversacion.tipo === "grupo"
    ? `${conversacion.participantes.length + 1} participantes`
    : [otro?.puesto, otro?.empresa].filter(Boolean).join(" · ");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b px-3 py-2.5">
        <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={onVolver} aria-label="Volver a los chats">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <AvatarConversacion c={conversacion} perfiles={perfiles} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">{tituloConversacion(conversacion, perfiles)}</p>
          {subtitulo && <p className="truncate text-xs text-muted-foreground">{subtitulo}</p>}
        </div>
        {conversacion.tipo === "grupo" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Opciones del grupo"><MoreVertical className="h-5 w-5" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  if (!confirm("¿Salir del grupo? Dejarás de recibir sus mensajes.")) return;
                  salir.mutate(conversacion.id, { onSuccess: onVolver });
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />Salir del grupo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto bg-muted/30 px-3 py-4 sm:px-6">
        {mensajes.length >= limite && (
          <div className="mb-3 flex justify-center">
            <Button variant="outline" size="sm" disabled={isFetching} onClick={() => setLimite((l) => l + 60)}>
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ver mensajes anteriores"}
            </Button>
          </div>
        )}
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : mensajes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <AvatarConversacion c={conversacion} perfiles={perfiles} size="lg" />
            <p className="mt-3 font-semibold">{tituloConversacion(conversacion, perfiles)}</p>
            <p className="text-sm text-muted-foreground mt-1">Escribí el primer mensaje 👋</p>
          </div>
        ) : (
          <ListaMensajes mensajes={mensajes} perfiles={perfiles} yo={yo} esGrupo={conversacion.tipo === "grupo"} />
        )}
        <div ref={finRef} />
      </div>

      <Compositor conversacionId={conversacion.id} />
    </div>
  );
}

function ListaMensajes({ mensajes, perfiles, yo, esGrupo }: { mensajes: Mensaje[]; perfiles: Map<string, PerfilMuro>; yo: string | null | undefined; esGrupo: boolean }) {
  const eliminar = useEliminarMensaje();
  return (
    <div className="space-y-1">
      {mensajes.map((m, i) => {
        const prev = mensajes[i - 1];
        const next = mensajes[i + 1];
        const mio = m.autor_id === yo;
        const nuevoDia = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
        const primeroDelBloque = nuevoDia || !prev || prev.autor_id !== m.autor_id;
        const ultimoDelBloque = !next || next.autor_id !== m.autor_id || new Date(next.created_at).toDateString() !== new Date(m.created_at).toDateString();
        const autor = perfiles.get(m.autor_id);
        return (
          <div key={m.id}>
            {nuevoDia && (
              <div className="my-4 flex justify-center">
                <span className="rounded-full bg-card px-3 py-1 text-[11px] font-medium capitalize text-muted-foreground shadow-sm">{separadorDia(m.created_at)}</span>
              </div>
            )}
            <div className={cn("group flex items-end gap-2", mio ? "justify-end" : "justify-start", primeroDelBloque && "mt-3")}>
              {!mio && (
                <div className="w-8 shrink-0">{ultimoDelBloque && <UserAvatar perfil={autor} size="sm" />}</div>
              )}
              {mio && !m.eliminado && (
                <button
                  type="button"
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 text-muted-foreground hover:text-destructive transition-opacity"
                  onClick={() => { if (confirm("¿Eliminar este mensaje para todos?")) eliminar.mutate(m.id); }}
                  aria-label="Eliminar mensaje"
                  title="Eliminar para todos"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <div className={cn("max-w-[78%] sm:max-w-[65%]", mio ? "items-end" : "items-start", "flex flex-col")}>
                {esGrupo && !mio && primeroDelBloque && (
                  <span className="mb-0.5 ml-3 text-[11px] font-medium text-muted-foreground">{nombreCompleto(autor)}</span>
                )}
                <Burbuja m={m} mio={mio} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Burbuja({ m, mio }: { m: Mensaje; mio: boolean }) {
  const hora = format(new Date(m.created_at), "HH:mm");
  const base = cn(
    "rounded-2xl text-[15px] shadow-sm",
    mio ? "bg-primary text-primary-foreground rounded-br-md" : "bg-card text-foreground rounded-bl-md"
  );

  if (m.eliminado) {
    return <div className={cn("rounded-2xl border px-3 py-2 text-sm italic text-muted-foreground")}>Mensaje eliminado</div>;
  }

  return (
    <div className={cn(base, "overflow-hidden")}>
      {m.adjunto_tipo === "imagen" && <AdjuntoImagen path={m.adjunto_path!} />}
      {m.adjunto_tipo === "audio" && <AdjuntoAudio path={m.adjunto_path!} mio={mio} duracion={m.adjunto_duracion} />}
      {m.adjunto_tipo === "documento" && <AdjuntoDocumento m={m} mio={mio} />}
      {(m.contenido || !m.adjunto_tipo) && (
        <p className="whitespace-pre-wrap break-words px-3 pt-2">{m.contenido}</p>
      )}
      <p className={cn("px-3 pb-1.5 pt-0.5 text-right text-[10px]", mio ? "text-primary-foreground/70" : "text-muted-foreground")}>{hora}</p>
    </div>
  );
}

function AdjuntoImagen({ path }: { path: string }) {
  const { data: url } = useAdjuntoUrl(path);
  const [abierta, setAbierta] = useState(false);
  if (!url) return <div className="flex h-48 w-64 items-center justify-center bg-muted"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  return (
    <>
      <button type="button" onClick={() => setAbierta(true)} className="block">
        <img src={url} alt="Imagen enviada" className="max-h-72 w-full max-w-xs object-cover" loading="lazy" />
      </button>
      <Dialog open={abierta} onOpenChange={setAbierta}>
        <DialogContent className="max-w-4xl p-2">
          <img src={url} alt="Imagen enviada" className="max-h-[85vh] w-full object-contain" />
          <DialogFooter className="px-2 pb-1">
            <Button asChild variant="outline" size="sm"><a href={url} download target="_blank" rel="noreferrer"><Download className="h-4 w-4 mr-1.5" />Descargar</a></Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AdjuntoAudio({ path, mio, duracion }: { path: string; mio: boolean; duracion: number | null }) {
  const { data: url } = useAdjuntoUrl(path);
  return (
    <div className="px-2 pt-2 min-w-[240px]">
      <div className={cn("flex items-center gap-2 rounded-xl px-2 py-1", mio ? "bg-primary-foreground/15" : "bg-muted")}>
        <Mic className="h-4 w-4 shrink-0" />
        {url ? <audio src={url} controls preload="metadata" className="h-9 w-full min-w-0" /> : <Loader2 className="h-4 w-4 animate-spin" />}
      </div>
      {duracion ? <p className={cn("mt-0.5 px-1 text-[11px]", mio ? "text-primary-foreground/70" : "text-muted-foreground")}>{mmss(duracion)}</p> : null}
    </div>
  );
}

function AdjuntoDocumento({ m, mio }: { m: Mensaje; mio: boolean }) {
  const { data: url } = useAdjuntoUrl(m.adjunto_path);
  const ext = m.adjunto_nombre?.split(".").pop()?.toUpperCase() ?? "ARCHIVO";
  return (
    <a
      href={url ?? undefined}
      target="_blank"
      rel="noreferrer"
      download={m.adjunto_nombre ?? true}
      className={cn("m-2 mb-0 flex items-center gap-3 rounded-xl p-2.5 transition-colors", mio ? "bg-primary-foreground/15 hover:bg-primary-foreground/25" : "bg-muted hover:bg-muted/70")}
    >
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", mio ? "bg-primary-foreground/20" : "bg-primary/10 text-primary")}>
        <FileText className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{m.adjunto_nombre ?? "Documento"}</p>
        <p className={cn("text-[11px]", mio ? "text-primary-foreground/70" : "text-muted-foreground")}>{ext} · {formatoTamano(m.adjunto_tamano)}</p>
      </div>
      {url ? <Download className="h-4 w-4 shrink-0" /> : <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
    </a>
  );
}

/* ─────────────── Escribir ─────────────── */

function Compositor({ conversacionId }: { conversacionId: string }) {
  const [texto, setTexto] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fotoRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const textoRef = useRef<HTMLTextAreaElement>(null);
  const enviar = useEnviarMensaje(conversacionId);
  const grabadora = useGrabadora();

  useEffect(() => { setTexto(""); quitarArchivo(); textoRef.current?.focus(); }, [conversacionId]);

  const quitarArchivo = () => {
    setArchivo(null);
    setPreview((p) => { if (p) URL.revokeObjectURL(p); return null; });
  };

  const elegir = (f: File | undefined) => {
    if (!f) return;
    const tipo = tipoDeArchivo(f);
    if (f.size > LIMITE_MB[tipo] * 1024 * 1024) { toast.error(`El archivo supera ${LIMITE_MB[tipo]} MB`); return; }
    quitarArchivo();
    setArchivo(f);
    if (tipo === "imagen") setPreview(URL.createObjectURL(f));
  };

  const mandar = () => {
    if (enviar.isPending || (!texto.trim() && !archivo)) return;
    enviar.mutate(
      { contenido: texto, archivo },
      {
        onSuccess: () => { setTexto(""); quitarArchivo(); textoRef.current?.focus(); },
        onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo enviar"),
      }
    );
  };

  const empezarAudio = async () => {
    try { await grabadora.iniciar(); } catch (e) {
      toast.error(e instanceof DOMException && e.name === "NotAllowedError" ? "Permití el micrófono en el navegador" : e instanceof Error ? e.message : "No se pudo grabar");
    }
  };

  const enviarAudio = async () => {
    const r = await grabadora.detener();
    if (!r) return;
    const ext = r.blob.type.includes("mp4") ? "m4a" : r.blob.type.includes("ogg") ? "ogg" : "webm";
    enviar.mutate(
      { contenido: "", archivo: r.blob, nombre: `audio.${ext}`, tipo: "audio" as TipoAdjunto, duracion: r.duracion },
      { onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo enviar el audio") }
    );
  };

  if (grabadora.grabando) {
    return (
      <div className="flex items-center gap-3 border-t bg-card px-3 py-3">
        <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={grabadora.cancelar} aria-label="Descartar audio" title="Descartar">
          <Trash2 className="h-5 w-5" />
        </Button>
        <div className="flex flex-1 items-center gap-2 rounded-full bg-destructive/10 px-4 py-2.5 text-destructive">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-destructive" />
          <span className="text-sm font-medium tabular-nums">{mmss(grabadora.segundos)}</span>
          <span className="text-xs opacity-80">Grabando… (máx. {MAX_AUDIO_SEG / 60} min)</span>
        </div>
        <Button size="icon" className="h-11 w-11 shrink-0 rounded-full" onClick={enviarAudio} aria-label="Enviar audio" title="Enviar audio">
          <Send className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  const hayContenido = !!texto.trim() || !!archivo;

  return (
    <div className="border-t bg-card px-3 py-2.5" style={{ paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))" }}>
      {archivo && (
        <div className="mb-2 flex items-center gap-3 rounded-xl border bg-muted/50 p-2">
          {preview ? <img src={preview} alt="" className="h-14 w-14 rounded-lg object-cover" /> : (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 text-primary"><FileText className="h-6 w-6" /></div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{archivo.name}</p>
            <p className="text-xs text-muted-foreground">{formatoTamano(archivo.size)}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={quitarArchivo} aria-label="Quitar adjunto"><X className="h-4 w-4" /></Button>
        </div>
      )}
      <div className="flex items-end gap-1.5">
        <input ref={fotoRef} type="file" accept="image/*" className="hidden" onChange={(e) => { elegir(e.target.files?.[0]); e.target.value = ""; }} />
        <input ref={docRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,application/*" className="hidden" onChange={(e) => { elegir(e.target.files?.[0]); e.target.value = ""; }} />
        <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-full text-primary" onClick={() => fotoRef.current?.click()} aria-label="Enviar foto" title="Foto">
          <ImageIcon className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-full text-primary" onClick={() => docRef.current?.click()} aria-label="Enviar documento" title="Documento">
          <Paperclip className="h-5 w-5" />
        </Button>
        <Textarea
          ref={textoRef}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); mandar(); } }}
          placeholder={archivo ? "Agregá un comentario (opcional)" : "Escribí un mensaje…"}
          rows={1}
          maxLength={4000}
          className="max-h-32 min-h-[40px] flex-1 resize-none rounded-2xl border-0 bg-muted py-2.5 text-[15px] focus-visible:ring-1"
        />
        {hayContenido ? (
          <Button size="icon" className="h-10 w-10 shrink-0 rounded-full" onClick={mandar} disabled={enviar.isPending} aria-label="Enviar" title="Enviar (Enter)">
            {enviar.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        ) : (
          <Button size="icon" variant="ghost" className="h-10 w-10 shrink-0 rounded-full text-primary" onClick={empezarAudio} disabled={enviar.isPending} aria-label="Grabar mensaje de voz" title="Mensaje de voz">
            {enviar.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mic className="h-5 w-5" />}
          </Button>
        )}
      </div>
    </div>
  );
}

/* ─────────────── Nuevo chat / grupo ─────────────── */

export function NuevoChatDialog({
  open, onOpenChange, onCreado,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreado: (conversacionId: string) => void;
}) {
  const { data: personas = [], isLoading } = useDirectorio();
  const iniciar = useIniciarDirecta();
  const crearGrupo = useCrearGrupo();
  const [modo, setModo] = useState<"directo" | "grupo">("directo");
  const [busqueda, setBusqueda] = useState("");
  const [elegidos, setElegidos] = useState<Set<string>>(new Set());
  const [nombreGrupo, setNombreGrupo] = useState("");

  useEffect(() => {
    if (!open) { setBusqueda(""); setElegidos(new Set()); setNombreGrupo(""); setModo("directo"); }
  }, [open]);

  const filtradas = useMemo(() => {
    const q = busqueda.toLowerCase();
    return personas.filter((p) => `${p.nombre} ${p.apellido} ${p.puesto ?? ""} ${p.empresa ?? ""}`.toLowerCase().includes(q));
  }, [personas, busqueda]);

  const abrirDirecto = (userId: string) => {
    iniciar.mutate(userId, {
      onSuccess: (id) => { onOpenChange(false); onCreado(id); },
      onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo abrir el chat"),
    });
  };

  const toggle = (id: string) => setElegidos((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle>Nuevo mensaje</DialogTitle>
        </DialogHeader>
        <div className="px-5 space-y-3">
          <Tabs value={modo} onValueChange={(v) => setModo(v as "directo" | "grupo")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="directo">Una persona</TabsTrigger>
              <TabsTrigger value="grupo"><Users className="h-4 w-4 mr-1.5" />Grupo</TabsTrigger>
            </TabsList>
          </Tabs>
          {modo === "grupo" && (
            <Input value={nombreGrupo} onChange={(e) => setNombreGrupo(e.target.value)} placeholder="Nombre del grupo (ej.: Equipo Logística)" maxLength={80} />
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input autoFocus value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre, puesto o empresa" className="pl-9" />
          </div>
        </div>
        <div className="mt-2 max-h-[50vh] overflow-y-auto px-2 pb-2">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filtradas.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No se encontraron personas.</p>
          ) : filtradas.map((p) => {
            const marcado = elegidos.has(p.user_id);
            return (
              <button
                key={p.user_id}
                type="button"
                disabled={iniciar.isPending}
                onClick={() => (modo === "directo" ? abrirDirecto(p.user_id) : toggle(p.user_id))}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-muted"
              >
                <UserAvatar perfil={p} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{nombreCompleto(p)}</p>
                  <p className="truncate text-xs text-muted-foreground">{[p.puesto, p.empresa].filter(Boolean).join(" · ")}</p>
                </div>
                {modo === "grupo" && (
                  <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border-2", marcado ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40")}>
                    {marcado && <Check className="h-3 w-3" />}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {modo === "grupo" && (
          <DialogFooter className="border-t px-5 py-3">
            <Button
              className="w-full"
              disabled={!nombreGrupo.trim() || elegidos.size < 2 || crearGrupo.isPending}
              onClick={() => crearGrupo.mutate(
                { nombre: nombreGrupo, miembros: [...elegidos] },
                {
                  onSuccess: (id) => { onOpenChange(false); onCreado(id); },
                  onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo crear el grupo"),
                }
              )}
            >
              {crearGrupo.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : `Crear grupo${elegidos.size ? ` (${elegidos.size + 1})` : ""}`}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
