import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GrupoListado {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: "abierto" | "privado";
  color: string;
  miembros: number;
  soy_miembro: boolean;
  soy_admin: boolean;
  ultima_actividad: string | null;
}

export interface Miembro { user_id: string; rol: "admin" | "miembro" }

export const COLORES_GRUPO = ["#26A69A", "#0EA5E9", "#8B5CF6", "#F97316", "#EC4899", "#10B981", "#EAB308", "#6366F1", "#EF4444", "#64748B"];

const KEY = ["grupos"];

export function useGrupos() {
  return useQuery({
    queryKey: KEY,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("grupos_listado");
      if (error) throw error;
      return (data ?? []) as GrupoListado[];
    },
  });
}

/** Nombre y color de cada grupo visible, para etiquetar publicaciones en el muro general. */
export function useMapaGrupos() {
  const { data = [] } = useGrupos();
  return new Map(data.map((g) => [g.id, g]));
}

export function useMiembros(grupoId: string | undefined) {
  return useQuery({
    queryKey: [...KEY, grupoId, "miembros"],
    enabled: !!grupoId,
    queryFn: async () => {
      const { data, error } = await supabase.from("grupo_miembros").select("user_id, rol").eq("grupo_id", grupoId!);
      if (error) throw error;
      return (data ?? []) as Miembro[];
    },
  });
}

export function useGuardarGrupo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (g: { id?: string; nombre: string; descripcion: string; tipo: "abierto" | "privado"; color: string }) => {
      const datos = { nombre: g.nombre.trim(), descripcion: g.descripcion.trim(), tipo: g.tipo, color: g.color };
      if (g.id) {
        const { error } = await supabase.from("grupos").update(datos).eq("id", g.id);
        if (error) throw error;
        return g.id;
      }
      const { data, error } = await supabase.from("grupos").insert(datos).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useEliminarGrupo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("grupos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUnirseGrupo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ grupoId, unirse }: { grupoId: string; unirse: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesión vencida");
      const { error } = unirse
        ? await supabase.from("grupo_miembros").insert({ grupo_id: grupoId, user_id: user.id })
        : await supabase.from("grupo_miembros").delete().eq("grupo_id", grupoId).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["muro", "feed"] });
    },
  });
}

export function useGestionMiembros(grupoId: string) {
  const qc = useQueryClient();
  const refrescar = () => qc.invalidateQueries({ queryKey: KEY });
  const agregar = useMutation({
    mutationFn: async (userIds: string[]) => {
      const { error } = await supabase.from("grupo_miembros")
        .upsert(userIds.map((user_id) => ({ grupo_id: grupoId, user_id })), { onConflict: "grupo_id,user_id", ignoreDuplicates: true });
      if (error) throw error;
    },
    onSuccess: refrescar,
  });
  const quitar = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("grupo_miembros").delete().eq("grupo_id", grupoId).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: refrescar,
  });
  const cambiarRol = useMutation({
    mutationFn: async ({ userId, rol }: { userId: string; rol: "admin" | "miembro" }) => {
      const { error } = await supabase.from("grupo_miembros").update({ rol }).eq("grupo_id", grupoId).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: refrescar,
  });
  const masivo = useMutation({
    mutationFn: async ({ empresaId, sucursalId }: { empresaId: string | null; sucursalId: string | null }) => {
      const { data, error } = await supabase.rpc("grupo_agregar_masivo", { _grupo_id: grupoId, _empresa_id: empresaId, _sucursal_id: sucursalId });
      if (error) throw error;
      return data as number;
    },
    onSuccess: refrescar,
  });
  return { agregar, quitar, cambiarRol, masivo };
}
