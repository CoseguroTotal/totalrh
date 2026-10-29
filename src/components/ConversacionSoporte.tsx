import { useEffect, useRef, useState } from "react";
import { Loader2, SendHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useEnviarSoporte, useMarcarLeidosSoporte, useMensajesSoporte } from "@/hooks/useSoporte";

const hora = (iso: string) => new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** Conversación de soporte: la usa el usuario (con el soporte) y el soporte (con cada usuario). */
export default function ConversacionSoporte({
  usuarioId, yo, pantalla, vacio, emailUsuario,
}: {
  /** Dueño de la conversación (quien pidió ayuda). */
  usuarioId: string;
  yo: string;
  pantalla?: string;
  vacio?: React.ReactNode;
  emailUsuario?: string | null;
}) {
  const { data: mensajes = [], isLoading } = useMensajesSoporte(usuarioId);
  const enviar = useEnviarSoporte();
  const marcar = useMarcarLeidosSoporte();
  const [texto, setTexto] = useState("");
  const fin = useRef<HTMLDivElement>(null);
  const soyUsuario = yo === usuarioId;

  const sinLeer = mensajes.some((m) => m.autor_id !== yo && !m.leido);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (sinLeer) marcar.mutate({ usuarioId, yo }); }, [sinLeer, usuarioId, yo]);
  useEffect(() => { fin.current?.scrollIntoView({ block: "end" }); }, [mensajes.length]);

  const mandar = () => {
    const t = texto.trim();
    if (!t) return;
    enviar.mutate({ usuarioId, yo, contenido: t, pantalla, emailUsuario }, {
      onSuccess: () => setTexto(""),
      onError: (e) => toast.error(e instanceof Error ? e.message : "No se pudo enviar"),
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 sm:p-4">
        {isLoading ? (
          <Loader2 className="mx-auto mt-8 h-5 w-5 animate-spin text-muted-foreground" />
        ) : mensajes.length === 0 ? (
          vacio
        ) : (
          mensajes.map((m) => {
            const mio = m.autor_id === yo;
            return (
              <div key={m.id} className={cn("flex", mio ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[85%] rounded-2xl px-3.5 py-2 text-sm shadow-sm", mio ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border bg-card")}>
                  {!mio && <p className="mb-0.5 text-xs font-semibold opacity-80">{soyUsuario ? "Soporte TotalRH" : m.usuario_nombre}</p>}
                  <p className="whitespace-pre-wrap break-words">{m.contenido}</p>
                  <p className={cn("mt-1 text-[10px]", mio ? "text-primary-foreground/75" : "text-muted-foreground")}>
                    {hora(m.created_at)}{!soyUsuario && m.autor_id === m.usuario_id && m.pantalla ? ` · desde ${m.pantalla}` : ""}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={fin} />
      </div>
      <div className="flex items-end gap-2 border-t bg-card p-2 sm:p-3">
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); mandar(); } }}
          placeholder={soyUsuario ? "Contanos qué necesitás o qué no funciona…" : "Escribí la respuesta…"}
          className="max-h-40 min-h-[44px] flex-1 resize-none"
          maxLength={4000}
          rows={1}
        />
        <Button size="icon" className="h-11 w-11 shrink-0 rounded-full" onClick={mandar} disabled={!texto.trim() || enviar.isPending} aria-label="Enviar">
          {enviar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
