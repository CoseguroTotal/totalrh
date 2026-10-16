import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PerfilMuro } from "@/hooks/useMuro";

export type TipoAdjunto = "imagen" | "audio" | "documento";

export interface Conversacion {
  id: string;
  tipo: "directa" | "grupo";
  nombre: string | null;
  ultimo_mensaje_at: string;
  ultimo_texto: string | null;
  ultimo_adjunto_tipo: TipoAdjunto | null;
  ultimo_autor_id: string | null;
  ultimo_eliminado: boolean | null;
  no_leidos: number;
  participantes: string[];
}

export interface Mensaje {
  id: string;
  conversacion_id: string;
  autor_id: string;
  contenido: string;
  adjunto_path: string | null;
  adjunto_tipo: TipoAdjunto | null;
  adjunto_nombre: string | null;
  adjunto_tamano: number | null;
  adjunto_duracion: number | null;
  eliminado: boolean;
  created_at: string;
}

export const LIMITE_MB: Record<TipoAdjunto, number> = { imagen: 10, audio: 15, documento: 25 };
export const MAX_AUDIO_SEG = 300;

const KEY_LISTA = ["chat", "conversaciones"];
const keyMensajes = (id: string) => ["chat", "mensajes", id];

export function tipoDeArchivo(file: File): TipoAdjunto {
  if (file.type.startsWith("image/")) return "imagen";
  if (file.type.startsWith("audio/")) return "audio";
  return "documento";
}

export function formatoTamano(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Tiempo real del chat: un solo canal para toda la app (bandeja, conversación abierta y contador). */
export function useChatRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("chat-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_mensajes" }, (payload) => {
        const conv = (payload.new as Partial<Mensaje>)?.conversacion_id ?? (payload.old as Partial<Mensaje>)?.conversacion_id;
        if (conv) qc.invalidateQueries({ queryKey: keyMensajes(conv) });
        qc.invalidateQueries({ queryKey: KEY_LISTA });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_participantes" }, () => {
        qc.invalidateQueries({ queryKey: KEY_LISTA });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);
}

export function useConversaciones() {
  return useQuery({
    queryKey: KEY_LISTA,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("chat_mis_conversaciones");
      if (error) throw error;
      return (data ?? []).map((c) => ({ ...c, participantes: c.participantes ?? [] })) as Conversacion[];
    },
  });
}

export function useNoLeidosTotal() {
  const { data } = useConversaciones();
  return (data ?? []).reduce((s, c) => s + (c.no_leidos || 0), 0);
}

export function useMensajes(conversacionId: string | undefined, limite: number) {
  return useQuery({
    queryKey: [...keyMensajes(conversacionId ?? ""), limite],
    enabled: !!conversacionId,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_mensajes")
        .select("*")
        .eq("conversacion_id", conversacionId!)
        .order("created_at", { ascending: false })
        .limit(limite);
      if (error) throw error;
      return ((data ?? []) as Mensaje[]).reverse();
    },
  });
}

export function useDirectorio() {
  return useQuery({
    queryKey: ["chat", "directorio"],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("chat_directorio");
      if (error) throw error;
      return (data ?? []) as PerfilMuro[];
    },
  });
}

export function useIniciarDirecta() {
  return useMutation({
    mutationFn: async (otro: string) => {
      const { data, error } = await supabase.rpc("chat_iniciar_directa", { _otro: otro });
      if (error) throw error;
      return data as string;
    },
  });
}

export function useCrearGrupo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ nombre, miembros }: { nombre: string; miembros: string[] }) => {
      const { data, error } = await supabase.rpc("chat_crear_grupo", { _nombre: nombre, _miembros: miembros });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY_LISTA }),
  });
}

export function useSalirDeGrupo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (conversacionId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("chat_participantes").delete()
        .eq("conversacion_id", conversacionId).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY_LISTA }),
  });
}

export function useEnviarMensaje(conversacionId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { contenido: string; archivo?: File | Blob | null; nombre?: string; tipo?: TipoAdjunto; duracion?: number }) => {
      if (!conversacionId) throw new Error("Elegí una conversación");
      let adjunto: Partial<Mensaje> = {};
      if (input.archivo) {
        const tipo = input.tipo ?? (input.archivo instanceof File ? tipoDeArchivo(input.archivo) : "documento");
        if (input.archivo.size > LIMITE_MB[tipo] * 1024 * 1024) throw new Error(`El archivo supera ${LIMITE_MB[tipo]} MB`);
        const nombre = input.nombre ?? (input.archivo instanceof File ? input.archivo.name : "archivo");
        const ext = nombre.includes(".") ? nombre.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "") : "bin";
        const path = `${conversacionId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("chat").upload(path, input.archivo, {
          contentType: input.archivo.type || "application/octet-stream",
        });
        if (upErr) throw upErr;
        adjunto = {
          adjunto_path: path, adjunto_tipo: tipo, adjunto_nombre: nombre,
          adjunto_tamano: input.archivo.size, adjunto_duracion: input.duracion ?? null,
        };
      }
      const { error } = await supabase.from("chat_mensajes").insert({
        conversacion_id: conversacionId,
        contenido: input.contenido.trim(),
        ...adjunto,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      if (conversacionId) qc.invalidateQueries({ queryKey: keyMensajes(conversacionId) });
      qc.invalidateQueries({ queryKey: KEY_LISTA });
    },
  });
}

export function useEliminarMensaje() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chat_mensajes").update({ eliminado: true }).eq("id", id);
      if (error) throw error;
    },
  });
}

export function useMarcarLeido() {
  const qc = useQueryClient();
  return useCallback(async (conversacionId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("chat_participantes")
      .update({ ultimo_leido_at: new Date().toISOString() })
      .eq("conversacion_id", conversacionId).eq("user_id", user.id);
    qc.setQueryData<Conversacion[]>(KEY_LISTA, (old) => old?.map((c) => (c.id === conversacionId ? { ...c, no_leidos: 0 } : c)));
  }, [qc]);
}

/** URL firmada (1 h) para ver un adjunto del bucket privado. */
export function useAdjuntoUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["chat", "adjunto", path],
    enabled: !!path,
    staleTime: 50 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("chat").createSignedUrl(path!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

/* ─────────────── Grabación de audio ─────────────── */

function mimeAudioSoportado() {
  const opciones = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return opciones.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) ?? "";
}

export function useGrabadora() {
  const [grabando, setGrabando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval>>();
  const inicio = useRef(0);
  const resolver = useRef<((r: { blob: Blob; duracion: number } | null) => void) | null>(null);
  const cancelado = useRef(false);

  const limpiar = () => {
    clearInterval(timer.current);
    recorder.current?.stream.getTracks().forEach((t) => t.stop());
    recorder.current = null;
    setGrabando(false);
    setSegundos(0);
  };

  const iniciar = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      throw new Error("Este navegador no permite grabar audio");
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = mimeAudioSoportado();
    const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    chunks.current = [];
    cancelado.current = false;
    r.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
    r.onstop = () => {
      const duracion = Math.round((Date.now() - inicio.current) / 1000);
      const blob = new Blob(chunks.current, { type: r.mimeType || "audio/webm" });
      limpiar();
      resolver.current?.(cancelado.current || blob.size === 0 ? null : { blob, duracion });
      resolver.current = null;
    };
    recorder.current = r;
    inicio.current = Date.now();
    r.start(250);
    setGrabando(true);
    timer.current = setInterval(() => {
      const s = Math.floor((Date.now() - inicio.current) / 1000);
      setSegundos(s);
      if (s >= MAX_AUDIO_SEG) r.stop();
    }, 250);
  };

  /** Detiene y devuelve el audio grabado. */
  const detener = () =>
    new Promise<{ blob: Blob; duracion: number } | null>((resolve) => {
      resolver.current = resolve;
      if (recorder.current?.state === "recording") recorder.current.stop();
      else resolve(null);
    });

  const cancelar = () => {
    cancelado.current = true;
    if (recorder.current?.state === "recording") recorder.current.stop();
    else limpiar();
  };

  useEffect(() => () => {
    cancelado.current = true;
    if (recorder.current?.state === "recording") recorder.current.stop();
    clearInterval(timer.current);
  }, []);

  return { grabando, segundos, iniciar, detener, cancelar };
}
