import { useEffect } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const REACCIONES = [
  { tipo: "me_gusta", emoji: "👍", label: "Me gusta" },
  { tipo: "me_encanta", emoji: "❤️", label: "Me encanta" },
  { tipo: "aplauso", emoji: "👏", label: "Aplauso" },
  { tipo: "celebro", emoji: "🎉", label: "Celebro" },
  { tipo: "me_divierte", emoji: "😂", label: "Me divierte" },
] as const;

export type TipoReaccion = (typeof REACCIONES)[number]["tipo"];
export type TipoPublicacion = "post" | "comunicado" | "cumpleanios" | "aniversario" | "bienvenida" | "encuesta";

export interface PerfilMuro {
  user_id: string;
  nombre: string;
  apellido: string;
  avatar_url: string | null;
  puesto: string | null;
  empresa: string | null;
}

export interface Comentario {
  id: string;
  publicacion_id: string;
  autor_id: string;
  contenido: string;
  created_at: string;
}

export interface Publicacion {
  id: string;
  autor_id: string;
  contenido: string;
  imagen_url: string | null;
  tipo: TipoPublicacion;
  mencion_user_id: string | null;
  fijada: boolean;
  oculta: boolean;
  editada: boolean;
  requiere_confirmacion: boolean;
  created_at: string;
  comentarios: Comentario[];
  reacciones: { user_id: string; tipo: TipoReaccion }[];
}

const PAGE_SIZE = 10;
const FEED_KEY = ["muro", "feed"];

export function useSessionUserId() {
  return useQuery({
    queryKey: ["session-user-id"],
    staleTime: Infinity,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id ?? null;
    },
  });
}

export function useEsModerador() {
  return useQuery({
    queryKey: ["muro", "es-moderador"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("muro_es_moderador");
      if (error) throw error;
      return !!data;
    },
  });
}

export function useFeed() {
  const qc = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: FEED_KEY,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const from = pageParam * PAGE_SIZE;
      const { data, error } = await supabase
        .from("muro_publicaciones")
        .select("*, comentarios:muro_comentarios(*), reacciones:muro_reacciones(user_id, tipo)")
        .order("fijada", { ascending: false })
        .order("created_at", { ascending: false })
        .order("created_at", { referencedTable: "muro_comentarios", ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      return (data ?? []) as unknown as Publicacion[];
    },
    getNextPageParam: (last, pages) => (last.length === PAGE_SIZE ? pages.length : undefined),
  });

  // Tiempo real: cualquier cambio en el muro refresca el feed.
  useEffect(() => {
    const refresh = () => qc.invalidateQueries({ queryKey: FEED_KEY });
    const channel = supabase
      .channel("muro-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "muro_publicaciones" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "muro_comentarios" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "muro_reacciones" }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  return query;
}

/** Nombre, foto y puesto de los autores visibles en el feed. */
export function usePerfiles(userIds: string[]) {
  const ids = [...new Set(userIds.filter(Boolean))].sort();
  return useQuery({
    queryKey: ["muro", "perfiles", ids],
    enabled: ids.length > 0,
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("muro_perfiles", { _user_ids: ids });
      if (error) throw error;
      return new Map((data ?? []).map((p) => [p.user_id, p as PerfilMuro]));
    },
  });
}

export function useCelebraciones(dias = 7) {
  return useQuery({
    queryKey: ["muro", "celebraciones", dias],
    staleTime: 30 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("muro_celebraciones", { _dias: dias });
      if (error) throw error;
      return data ?? [];
    },
  });
}

async function subirImagen(file: File) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesión vencida");
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("muro").upload(path, file, { contentType: file.type });
  if (error) throw error;
  return supabase.storage.from("muro").getPublicUrl(path).data.publicUrl;
}

export function useCrearPublicacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      contenido: string;
      imagen?: File | null;
      tipo?: TipoPublicacion;
      mencion_user_id?: string | null;
      requiere_confirmacion?: boolean;
    }) => {
      const imagen_url = input.imagen ? await subirImagen(input.imagen) : null;
      const { error } = await supabase.from("muro_publicaciones").insert({
        contenido: input.contenido.trim(),
        imagen_url,
        tipo: input.tipo ?? "post",
        mencion_user_id: input.mencion_user_id ?? null,
        requiere_confirmacion: !!input.requiere_confirmacion,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FEED_KEY }),
  });
}

export function useActualizarPublicacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...cambios }: { id: string; contenido?: string; fijada?: boolean; oculta?: boolean }) => {
      const { error } = await supabase.from("muro_publicaciones").update(cambios).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FEED_KEY }),
  });
}

export function useEliminarPublicacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("muro_publicaciones").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FEED_KEY }),
  });
}

export function useComentar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ publicacion_id, contenido }: { publicacion_id: string; contenido: string }) => {
      const { error } = await supabase.from("muro_comentarios").insert({ publicacion_id, contenido: contenido.trim() });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FEED_KEY }),
  });
}

export function useEliminarComentario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("muro_comentarios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FEED_KEY }),
  });
}

/** Reaccionar: misma reacción la quita, otra la reemplaza. Actualiza la UI al instante. */
export function useReaccionar(userId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ publicacion_id, tipo, actual }: { publicacion_id: string; tipo: TipoReaccion; actual?: TipoReaccion }) => {
      if (actual === tipo) {
        const { error } = await supabase.from("muro_reacciones").delete().eq("publicacion_id", publicacion_id).eq("user_id", userId!);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("muro_reacciones")
          .upsert({ publicacion_id, user_id: userId!, tipo }, { onConflict: "publicacion_id,user_id" });
        if (error) throw error;
      }
    },
    onMutate: async ({ publicacion_id, tipo, actual }) => {
      await qc.cancelQueries({ queryKey: FEED_KEY });
      const prev = qc.getQueryData(FEED_KEY);
      qc.setQueryData(FEED_KEY, (old: { pages: Publicacion[][]; pageParams: unknown[] } | undefined) => {
        if (!old || !userId) return old;
        return {
          ...old,
          pages: old.pages.map((page) =>
            page.map((p) => {
              if (p.id !== publicacion_id) return p;
              const resto = p.reacciones.filter((r) => r.user_id !== userId);
              return { ...p, reacciones: actual === tipo ? resto : [...resto, { user_id: userId, tipo }] };
            })
          ),
        };
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(FEED_KEY, ctx.prev); },
    onSettled: () => qc.invalidateQueries({ queryKey: FEED_KEY }),
  });
}

/* ─────────────── Lecturas: "Visto por N" y confirmación ─────────────── */

export interface ResumenLectura { vistos: number; confirmados: number; yo_confirmado_at: string | null }

export function useLecturas(ids: string[]) {
  const clave = [...ids].sort();
  return useQuery({
    queryKey: ["muro", "lecturas", clave],
    enabled: clave.length > 0,
    placeholderData: (prev) => prev,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("muro_lecturas_resumen", { _ids: clave });
      if (error) throw error;
      return new Map((data ?? []).map((r) => [r.publicacion_id, r as ResumenLectura]));
    },
  });
}

// Las vistas se juntan y se mandan en lote (una llamada cada 2 s como máximo)
const vistasPendientes = new Set<string>();
const yaRegistradas = new Set<string>();
let timerVistas: ReturnType<typeof setTimeout> | undefined;

export function registrarVista(id: string) {
  if (yaRegistradas.has(id)) return;
  yaRegistradas.add(id);
  vistasPendientes.add(id);
  if (timerVistas) return;
  timerVistas = setTimeout(async () => {
    const ids = [...vistasPendientes];
    vistasPendientes.clear();
    timerVistas = undefined;
    const { error } = await supabase.rpc("muro_registrar_vistas", { _ids: ids });
    if (error) ids.forEach((i) => yaRegistradas.delete(i)); // se reintenta la próxima vez que se vea
  }, 2000);
}

export function useConfirmarLectura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (publicacionId: string) => {
      const { error } = await supabase.rpc("muro_confirmar_lectura", { _publicacion_id: publicacionId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["muro", "lecturas"] }),
  });
}

export function useDetalleLecturas(publicacionId: string | undefined, habilitado: boolean) {
  return useQuery({
    queryKey: ["muro", "lecturas-detalle", publicacionId],
    enabled: !!publicacionId && habilitado,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("muro_lecturas_detalle", { _publicacion_id: publicacionId! });
      if (error) throw error;
      return data ?? [];
    },
  });
}
