import { useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  Cake, Award, ImagePlus, Loader2, MessageCircle, MoreHorizontal, Pin, PinOff,
  Megaphone, Send, Trash2, EyeOff, Eye, Pencil, X, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { useIniciarDirecta } from "@/hooks/useChat";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  REACCIONES, type PerfilMuro, type Publicacion, type TipoReaccion, type TipoPublicacion,
  useActualizarPublicacion, useComentar, useCrearPublicacion, useEliminarComentario,
  useEliminarPublicacion, useReaccionar,
} from "@/hooks/useMuro";

const MAX_IMAGEN_MB = 5;

export function nombreCompleto(p?: Pick<PerfilMuro, "nombre" | "apellido"> | null) {
  if (!p) return "Usuario";
  return [p.nombre, p.apellido].filter(Boolean).join(" ") || "Usuario";
}

export function UserAvatar({ perfil, size = "md" }: { perfil?: Partial<PerfilMuro> | null; size?: "sm" | "md" | "lg" }) {
  const iniciales = `${perfil?.nombre?.[0] ?? ""}${perfil?.apellido?.[0] ?? ""}`.toUpperCase() || "?";
  const dims = size === "sm" ? "h-8 w-8 text-[11px]" : size === "lg" ? "h-12 w-12 text-sm" : "h-10 w-10 text-xs";
  return perfil?.avatar_url ? (
    <img src={perfil.avatar_url} alt="" className={cn(dims, "rounded-full object-cover shrink-0 bg-muted")} />
  ) : (
    <div className={cn(dims, "rounded-full bg-primary/15 text-primary font-semibold flex items-center justify-center shrink-0")}>
      {iniciales}
    </div>
  );
}

function tiempo(fecha: string) {
  return formatDistanceToNow(new Date(fecha), { addSuffix: true, locale: es });
}

/* ───────────────────────── Crear publicación ───────────────────────── */

export function Composer({
  perfil, esModerador, inicial,
}: {
  perfil?: PerfilMuro | null;
  esModerador: boolean;
  inicial?: { contenido: string; tipo: TipoPublicacion; mencion_user_id: string | null; key: number } | null;
}) {
  const [texto, setTexto] = useState("");
  const [imagen, setImagen] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [comunicado, setComunicado] = useState(false);
  const [enfocado, setEnfocado] = useState(false);
  const [extra, setExtra] = useState<{ tipo: TipoPublicacion; mencion_user_id: string | null } | null>(null);
  const [ultimaClave, setUltimaClave] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const crear = useCrearPublicacion();

  // Prefill desde "Saludar" en cumpleaños/aniversarios
  if (inicial && inicial.key !== ultimaClave) {
    setUltimaClave(inicial.key);
    setTexto(inicial.contenido);
    setExtra({ tipo: inicial.tipo, mencion_user_id: inicial.mencion_user_id });
  }

  const elegirImagen = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Elegí un archivo de imagen");
    if (f.size > MAX_IMAGEN_MB * 1024 * 1024) return toast.error(`La imagen supera ${MAX_IMAGEN_MB} MB`);
    setImagen(f);
    setPreview(URL.createObjectURL(f));
  };

  const limpiar = () => {
    setTexto("");
    setImagen(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setComunicado(false);
    setExtra(null);
  };

  const publicar = () => {
    if (!texto.trim() && !imagen) return;
    crear.mutate(
      {
        contenido: texto,
        imagen,
        tipo: comunicado ? "comunicado" : extra?.tipo ?? "post",
        mencion_user_id: extra?.mencion_user_id ?? null,
      },
      {
        onSuccess: () => { limpiar(); toast.success("¡Publicado!"); },
        onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo publicar"),
      }
    );
  };

  const hayContenido = !!texto.trim() || !!imagen;
  const expandido = enfocado || hayContenido || !!extra;

  return (
    <div className="rounded-2xl border bg-card px-4 pt-4 pb-2 shadow-sm">
      <div className="flex gap-3">
        <UserAvatar perfil={perfil} />
        <Textarea
          id="muro-composer"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onFocus={() => setEnfocado(true)}
          onBlur={() => setEnfocado(false)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) publicar(); }}
          placeholder={`¿Qué estás pensando${perfil?.nombre ? `, ${perfil.nombre}` : ""}?`}
          rows={expandido ? 3 : 1}
          className={cn(
            "resize-none border-0 bg-muted text-[15px] transition-all focus-visible:ring-1",
            expandido ? "min-h-[88px] rounded-2xl" : "min-h-[44px] rounded-full px-4 py-3 hover:bg-muted/80 cursor-pointer"
          )}
          maxLength={5000}
        />
      </div>

      {extra && extra.tipo !== "post" && (
        <div className="mt-3 ml-[52px] inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs">
          {extra.tipo === "cumpleanios" ? <Cake className="h-3.5 w-3.5" /> : <Award className="h-3.5 w-3.5" />}
          {extra.tipo === "cumpleanios" ? "Saludo de cumpleaños" : "Saludo de aniversario"}
          <button type="button" aria-label="Quitar etiqueta" onClick={() => setExtra(null)}><X className="h-3 w-3" /></button>
        </div>
      )}

      {preview && (
        <div className="relative mt-3 ml-[52px]">
          <img src={preview} alt="Vista previa" className="max-h-64 rounded-xl border object-cover" />
          <button
            type="button"
            onClick={() => { setImagen(null); if (preview) URL.revokeObjectURL(preview); setPreview(null); }}
            className="absolute top-2 left-2 rounded-full bg-black/60 p-1 text-white"
            aria-label="Quitar imagen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="mt-3 flex items-center gap-1 border-t pt-2">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { elegirImagen(e.target.files?.[0]); e.target.value = ""; }} />
        <Button type="button" variant="ghost" onClick={() => fileRef.current?.click()} className="h-10 flex-1 sm:flex-none rounded-lg text-muted-foreground font-medium">
          <ImagePlus className="h-5 w-5 mr-2 text-success" />Foto
        </Button>
        {esModerador && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setComunicado((v) => !v)}
            aria-pressed={comunicado}
            className={cn("h-10 flex-1 sm:flex-none rounded-lg font-medium", comunicado ? "bg-warning/15 text-warning hover:bg-warning/20 hover:text-warning" : "text-muted-foreground")}
          >
            <Megaphone className="h-5 w-5 mr-2 text-warning" />{comunicado ? "Comunicado ✓" : "Comunicado"}
          </Button>
        )}
        <Button onClick={publicar} disabled={crear.isPending || !hayContenido} className="ml-auto h-10 min-w-[110px] rounded-lg font-semibold">
          {crear.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publicar"}
        </Button>
      </div>
    </div>
  );
}

/* ───────────────────────── Publicación ───────────────────────── */

const ETIQUETA_TIPO: Partial<Record<TipoPublicacion, { label: string; icon: typeof Cake; className: string }>> = {
  comunicado: { label: "Comunicado oficial", icon: Megaphone, className: "bg-warning/15 text-warning" },
  cumpleanios: { label: "Cumpleaños", icon: Cake, className: "bg-pink-500/10 text-pink-600 dark:text-pink-400" },
  aniversario: { label: "Aniversario", icon: Award, className: "bg-primary/10 text-primary" },
  bienvenida: { label: "Bienvenida", icon: Sparkles, className: "bg-success/15 text-success" },
};

export function PostCard({
  pub, perfiles, userId, esModerador,
}: {
  pub: Publicacion;
  perfiles: Map<string, PerfilMuro>;
  userId: string | null | undefined;
  esModerador: boolean;
}) {
  const autor = perfiles.get(pub.autor_id);
  const mencion = pub.mencion_user_id ? perfiles.get(pub.mencion_user_id) : null;
  const esMia = pub.autor_id === userId;
  const [verComentarios, setVerComentarios] = useState(pub.comentarios.length > 0 && pub.comentarios.length <= 2);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [editando, setEditando] = useState(false);
  const [textoEdit, setTextoEdit] = useState(pub.contenido);
  const comentarRef = useRef<HTMLTextAreaElement>(null);

  const actualizar = useActualizarPublicacion();
  const eliminar = useEliminarPublicacion();
  const reaccionar = useReaccionar(userId);
  const navigate = useNavigate();
  const iniciarChat = useIniciarDirecta();
  const abrirChat = (otro: string) => iniciarChat.mutate(otro, {
    onSuccess: (id) => navigate(`/mensajes/${id}`),
    onError: () => toast.error("No se pudo abrir el chat"),
  });

  const miReaccion = pub.reacciones.find((r) => r.user_id === userId)?.tipo;
  const conteo = REACCIONES.map((r) => ({ ...r, n: pub.reacciones.filter((x) => x.tipo === r.tipo).length })).filter((r) => r.n > 0);
  const etiqueta = ETIQUETA_TIPO[pub.tipo];

  const reaccion = (tipo: TipoReaccion) => reaccionar.mutate({ publicacion_id: pub.id, tipo, actual: miReaccion });

  return (
    <article className={cn("rounded-2xl border bg-card shadow-sm", pub.fijada && "border-primary/40", pub.oculta && "opacity-60")}>
      <header className="flex items-start gap-3 p-4 pb-2">
        <UserAvatar perfil={autor} />
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-tight">
            <span className="font-semibold">{nombreCompleto(autor)}</span>
            {mencion && (
              <>
                <span className="text-muted-foreground"> {pub.tipo === "cumpleanios" ? "saludó a" : "le escribió a"} </span>
                <span className="font-semibold">{nombreCompleto(mencion)}</span>
              </>
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {[autor?.puesto, autor?.empresa].filter(Boolean).join(" · ")}
            {(autor?.puesto || autor?.empresa) && " · "}
            <time dateTime={pub.created_at} title={new Date(pub.created_at).toLocaleString("es-AR")}>{tiempo(pub.created_at)}</time>
            {pub.editada && " · editado"}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1.5 empty:hidden">
            {pub.fijada && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium">
                <Pin className="h-3 w-3" />Fijada
              </span>
            )}
            {etiqueta && (
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", etiqueta.className)}>
                <etiqueta.icon className="h-3 w-3" />{etiqueta.label}
              </span>
            )}
            {pub.oculta && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[11px] font-medium">
                <EyeOff className="h-3 w-3" />Oculta para el resto
              </span>
            )}
          </div>
        </div>

        {(esMia || esModerador) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" aria-label="Opciones de la publicación">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {esMia && (
                <DropdownMenuItem onClick={() => { setTextoEdit(pub.contenido); setEditando(true); }}>
                  <Pencil className="h-4 w-4 mr-2" />Editar
                </DropdownMenuItem>
              )}
              {esModerador && (
                <>
                  <DropdownMenuItem onClick={() => actualizar.mutate({ id: pub.id, fijada: !pub.fijada })}>
                    {pub.fijada ? <><PinOff className="h-4 w-4 mr-2" />Desfijar</> : <><Pin className="h-4 w-4 mr-2" />Fijar arriba</>}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => actualizar.mutate({ id: pub.id, oculta: !pub.oculta })}>
                    {pub.oculta ? <><Eye className="h-4 w-4 mr-2" />Mostrar</> : <><EyeOff className="h-4 w-4 mr-2" />Ocultar</>}
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setConfirmarBorrado(true)}>
                <Trash2 className="h-4 w-4 mr-2" />Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      {pub.contenido && <p className="px-4 pb-3 text-[15px] whitespace-pre-wrap break-words">{pub.contenido}</p>}
      {pub.imagen_url && (
        <a href={pub.imagen_url} target="_blank" rel="noreferrer" className="block bg-muted">
          <img src={pub.imagen_url} alt="" loading="lazy" className="w-full max-h-[520px] object-contain" />
        </a>
      )}

      {(conteo.length > 0 || pub.comentarios.length > 0) && (
        <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            {conteo.length > 0 && (
              <>
                <span className="flex -space-x-1">{conteo.slice(0, 3).map((r) => <span key={r.tipo}>{r.emoji}</span>)}</span>
                <span className="ml-1">{pub.reacciones.length}</span>
              </>
            )}
          </span>
          {pub.comentarios.length > 0 && (
            <button type="button" className="hover:underline" onClick={() => setVerComentarios((v) => !v)}>
              {pub.comentarios.length} {pub.comentarios.length === 1 ? "comentario" : "comentarios"}
            </button>
          )}
        </div>
      )}

      <div className={cn("mx-4 grid border-t py-1", esMia ? "grid-cols-2" : "grid-cols-3")}>
        <BotonReaccion miReaccion={miReaccion} onReaccionar={reaccion} />
        <Button
          variant="ghost"
          className="h-10 rounded-lg font-medium text-muted-foreground"
          onClick={() => { setVerComentarios(true); setTimeout(() => comentarRef.current?.focus(), 50); }}
        >
          <MessageCircle className="h-5 w-5 mr-2" />Comentar
        </Button>
        {!esMia && (
          <Button variant="ghost" className="h-10 rounded-lg font-medium text-muted-foreground" onClick={() => abrirChat(pub.autor_id)} disabled={iniciarChat.isPending}>
            <Send className="h-5 w-5 mr-2" />Mensaje
          </Button>
        )}
      </div>

      {verComentarios && (
        <Comentarios pub={pub} perfiles={perfiles} userId={userId} esModerador={esModerador} inputRef={comentarRef} />
      )}

      <AlertDialog open={confirmarBorrado} onOpenChange={setConfirmarBorrado}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar la publicación?</AlertDialogTitle>
            <AlertDialogDescription>Se borran también sus comentarios y reacciones. No se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => eliminar.mutate(pub.id, { onSuccess: () => toast.success("Publicación eliminada") })}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editando} onOpenChange={setEditando}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar publicación</DialogTitle></DialogHeader>
          <Textarea value={textoEdit} onChange={(e) => setTextoEdit(e.target.value)} className="min-h-[140px]" maxLength={5000} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(false)}>Cancelar</Button>
            <Button
              disabled={actualizar.isPending || (!textoEdit.trim() && !pub.imagen_url)}
              onClick={() => actualizar.mutate({ id: pub.id, contenido: textoEdit.trim() }, { onSuccess: () => setEditando(false) })}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}

function Comentarios({
  pub, perfiles, userId, esModerador, inputRef,
}: {
  pub: Publicacion;
  perfiles: Map<string, PerfilMuro>;
  userId: string | null | undefined;
  esModerador: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement>;
}) {
  const [texto, setTexto] = useState("");
  const comentar = useComentar();
  const eliminar = useEliminarComentario();
  const yo = userId ? perfiles.get(userId) : null;

  const enviar = () => {
    if (!texto.trim()) return;
    comentar.mutate(
      { publicacion_id: pub.id, contenido: texto },
      { onSuccess: () => setTexto(""), onError: () => toast.error("No se pudo comentar") }
    );
  };

  return (
    <div className="border-t px-4 py-3 space-y-3">
      {pub.comentarios.map((c) => {
        const autor = perfiles.get(c.autor_id);
        const puedeBorrar = c.autor_id === userId || esModerador;
        return (
          <div key={c.id} className="flex gap-2 group">
            <UserAvatar perfil={autor} size="sm" />
            <div className="min-w-0">
              <div className="rounded-2xl bg-muted px-3 py-2">
                <p className="text-xs font-semibold">{nombreCompleto(autor)}</p>
                <p className="text-sm whitespace-pre-wrap break-words">{c.contenido}</p>
              </div>
              <div className="flex gap-3 px-3 mt-0.5 text-[11px] text-muted-foreground">
                <span>{tiempo(c.created_at)}</span>
                {puedeBorrar && (
                  <button type="button" className="hover:text-destructive" onClick={() => eliminar.mutate(c.id)}>Eliminar</button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {!pub.oculta && (
        <div className="flex gap-2 items-end">
          <UserAvatar perfil={yo} size="sm" />
          <div className="flex-1 flex items-end gap-1 rounded-2xl bg-muted px-3 py-1">
            <Textarea
              ref={inputRef}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
              placeholder="Escribí un comentario…"
              rows={1}
              maxLength={2000}
              className="min-h-[36px] resize-none border-0 bg-transparent px-0 py-2 shadow-none focus-visible:ring-0 text-sm"
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0 text-primary"
              disabled={!texto.trim() || comentar.isPending}
              onClick={enviar}
              aria-label="Enviar comentario"
            >
              {comentar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Cumpleaños y aniversarios ───────────────────────── */

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export interface Celebracion {
  empleado_id: string;
  user_id: string | null;
  nombre: string;
  apellido: string;
  avatar_url: string | null;
  puesto: string;
  tipo: string;
  dia: number;
  mes: number;
  dias_faltan: number;
  anios: number | null;
}

export function CelebracionesCard({
  celebraciones, isLoading, onSaludar, userId,
}: {
  celebraciones: Celebracion[];
  isLoading: boolean;
  onSaludar: (c: Celebracion) => void;
  userId: string | null | undefined;
}) {
  const hoy = celebraciones.filter((c) => c.dias_faltan === 0);
  const proximas = celebraciones.filter((c) => c.dias_faltan > 0).slice(0, 6);

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
        <Cake className="h-4 w-4 text-pink-500" />Celebraciones
      </h3>
      {isLoading ? (
        <div className="py-4 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
      ) : celebraciones.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay cumpleaños ni aniversarios esta semana.</p>
      ) : (
        <div className="space-y-4">
          {hoy.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Hoy</p>
              {hoy.map((c) => (
                <div key={c.empleado_id + c.tipo} className="flex items-center gap-3 rounded-lg bg-pink-500/5 p-2">
                  <UserAvatar perfil={c} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{c.nombre} {c.apellido}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.tipo === "cumpleanios" ? "🎂 Cumple años hoy" : `🏅 Cumple ${c.anios} ${c.anios === 1 ? "año" : "años"} en la empresa`}
                    </p>
                  </div>
                  {c.user_id !== userId && (
                    <Button size="sm" variant="secondary" onClick={() => onSaludar(c)}>Saludar</Button>
                  )}
                </div>
              ))}
            </div>
          )}
          {proximas.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Próximos días</p>
              {proximas.map((c) => (
                <div key={c.empleado_id + c.tipo} className="flex items-center gap-3">
                  <UserAvatar perfil={c} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{c.nombre} {c.apellido}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.tipo === "cumpleanios" ? "Cumpleaños" : `Aniversario · ${c.anios} ${c.anios === 1 ? "año" : "años"}`}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground tabular-nums">{c.dia} {MESES[c.mes - 1]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Botón "Me gusta" con selector de reacciones ───────────────────────── */

/**
 * Clic = "Me gusta" (o quitar la reacción). Pasar el mouse (escritorio) o mantener
 * apretado (celular) despliega las demás reacciones, como en las redes sociales.
 */
function BotonReaccion({
  miReaccion, onReaccionar,
}: {
  miReaccion?: TipoReaccion;
  onReaccionar: (tipo: TipoReaccion) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const porToque = useRef(false);
  const actual = REACCIONES.find((r) => r.tipo === miReaccion);

  const abrirEn = (ms: number) => { clearTimeout(timer.current); timer.current = setTimeout(() => setAbierto(true), ms); };
  const cerrarEn = (ms: number) => { clearTimeout(timer.current); timer.current = setTimeout(() => setAbierto(false), ms); };

  return (
    <div
      className="relative"
      onMouseEnter={() => abrirEn(450)}
      onMouseLeave={() => cerrarEn(300)}
    >
      {abierto && (
        <div
          className="absolute bottom-full left-0 z-20 mb-1 flex gap-1 rounded-full border bg-card p-1.5 shadow-lg animate-in fade-in zoom-in-95"
          role="menu"
          aria-label="Elegir reacción"
        >
          {REACCIONES.map((r) => (
            <button
              key={r.tipo}
              type="button"
              role="menuitem"
              title={r.label}
              aria-label={r.label}
              onClick={() => { onReaccionar(r.tipo); setAbierto(false); }}
              className={cn("h-10 w-10 rounded-full text-2xl transition-transform hover:scale-125 hover:-translate-y-1", miReaccion === r.tipo && "bg-primary/10")}
            >
              {r.emoji}
            </button>
          ))}
        </div>
      )}
      <Button
        variant="ghost"
        className={cn("h-10 w-full rounded-lg font-medium select-none", miReaccion ? "text-primary font-semibold" : "text-muted-foreground")}
        onTouchStart={() => { porToque.current = false; timer.current = setTimeout(() => { porToque.current = true; setAbierto(true); }, 450); }}
        onTouchEnd={() => clearTimeout(timer.current)}
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => {
          if (porToque.current) { porToque.current = false; return; } // fue un toque largo: sólo abre el selector
          setAbierto(false);
          onReaccionar(miReaccion ?? "me_gusta");
        }}
        aria-haspopup="menu"
      >
        <span className="mr-1.5 text-lg leading-none">{actual?.emoji ?? "👍"}</span>
        {actual?.label ?? "Me gusta"}
      </Button>
    </div>
  );
}
