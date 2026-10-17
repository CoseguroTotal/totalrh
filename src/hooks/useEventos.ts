import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TipoEvento = "evento" | "capacitacion" | "reunion" | "feriado" | "celebracion";
export type Respuesta = "voy" | "quizas" | "no_voy";

export interface Evento {
  id: string;
  titulo: string;
  descripcion: string;
  tipo: TipoEvento;
  inicio: string;
  fin: string | null;
  todo_el_dia: boolean;
  lugar: string | null;
  enlace: string | null;
  pide_asistencia: boolean;
  creado_por: string;
  publicacion_id: string | null;
  asistencias: { user_id: string; respuesta: Respuesta }[];
}

export const TIPOS_EVENTO: Record<TipoEvento, { label: string; color: string; punto: string }> = {
  evento: { label: "Evento", color: "bg-sky-500/15 text-sky-700 dark:text-sky-300", punto: "bg-sky-500" },
  capacitacion: { label: "Capacitación", color: "bg-violet-500/15 text-violet-700 dark:text-violet-300", punto: "bg-violet-500" },
  reunion: { label: "Reunión", color: "bg-amber-500/15 text-amber-700 dark:text-amber-300", punto: "bg-amber-500" },
  feriado: { label: "Feriado", color: "bg-red-500/15 text-red-700 dark:text-red-300", punto: "bg-red-500" },
  celebracion: { label: "Celebración", color: "bg-pink-500/15 text-pink-700 dark:text-pink-300", punto: "bg-pink-500" },
};

/* ─────────────── Reglas puras (testeadas) ─────────────── */

const claveDia = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** Eventos de cada día del mes (los de varios días aparecen en todos sus días). */
export function eventosPorDia(eventos: Pick<Evento, "id" | "inicio" | "fin">[], anio: number, mes0: number) {
  const mapa = new Map<number, string[]>();
  const iniMes = new Date(anio, mes0, 1);
  const finMes = new Date(anio, mes0 + 1, 0, 23, 59, 59);
  for (const e of eventos) {
    const ini = new Date(e.inicio);
    const fin = e.fin ? new Date(e.fin) : ini;
    if (fin < iniMes || ini > finMes) continue;
    const d = new Date(Math.max(ini.getTime(), iniMes.getTime()));
    d.setHours(0, 0, 0, 0);
    const tope = new Date(Math.min(fin.getTime(), finMes.getTime()));
    while (d <= tope) {
      if (d.getMonth() === mes0) {
        const dia = d.getDate();
        if (!mapa.has(dia)) mapa.set(dia, []);
        mapa.get(dia)!.push(e.id);
      }
      d.setDate(d.getDate() + 1);
    }
  }
  return mapa;
}

export function conteoAsistencia(asistencias: { respuesta: Respuesta }[]) {
  return {
    voy: asistencias.filter((a) => a.respuesta === "voy").length,
    quizas: asistencias.filter((a) => a.respuesta === "quizas").length,
    no_voy: asistencias.filter((a) => a.respuesta === "no_voy").length,
  };
}

export function esMismoDia(a: Date, b: Date) { return claveDia(a) === claveDia(b); }

export function horario(e: Pick<Evento, "inicio" | "fin" | "todo_el_dia">) {
  const ini = new Date(e.inicio);
  const fin = e.fin ? new Date(e.fin) : null;
  const fecha = (d: Date) => d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
  const hora = (d: Date) => d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  if (e.todo_el_dia) return fin && !esMismoDia(ini, fin) ? `${fecha(ini)} al ${fecha(fin)}` : `${fecha(ini)} · Todo el día`;
  if (!fin) return `${fecha(ini)} · ${hora(ini)} h`;
  return esMismoDia(ini, fin) ? `${fecha(ini)} · ${hora(ini)} a ${hora(fin)} h` : `${fecha(ini)} ${hora(ini)} h al ${fecha(fin)} ${hora(fin)} h`;
}

/* ─────────────── Consultas y acciones ─────────────── */

export function useEventos(desde: Date, hasta: Date) {
  return useQuery({
    queryKey: ["eventos", desde.toISOString(), hasta.toISOString()],
    queryFn: async () => {
      // Trae lo que empieza antes del fin del rango y termina (o empieza) después del inicio
      const { data, error } = await supabase
        .from("eventos")
        .select("*, asistencias:evento_asistencias(user_id, respuesta)")
        .lte("inicio", hasta.toISOString())
        .or(`fin.gte.${desde.toISOString()},and(fin.is.null,inicio.gte.${desde.toISOString()})`)
        .order("inicio");
      if (error) throw error;
      return (data ?? []) as unknown as Evento[];
    },
  });
}

export function useProximosEventos(limite = 4) {
  return useQuery({
    queryKey: ["eventos", "proximos", limite],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const ahora = new Date().toISOString();
      const { data, error } = await supabase
        .from("eventos")
        .select("*, asistencias:evento_asistencias(user_id, respuesta)")
        .or(`fin.gte.${ahora},and(fin.is.null,inicio.gte.${ahora})`)
        .order("inicio")
        .limit(limite);
      if (error) throw error;
      return (data ?? []) as unknown as Evento[];
    },
  });
}

export function useEventoDePublicacion(publicacionId: string | undefined) {
  return useQuery({
    queryKey: ["eventos", "por-publicacion", publicacionId],
    enabled: !!publicacionId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.from("eventos").select("id, titulo, inicio, fin, todo_el_dia, lugar, tipo").eq("publicacion_id", publicacionId!).maybeSingle();
      return data;
    },
  });
}

export function useCrearEvento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (e: {
      titulo: string; descripcion: string; tipo: TipoEvento; inicio: string; fin: string | null; todo_el_dia: boolean;
      lugar: string; enlace: string; pide_asistencia: boolean; anunciar: boolean;
    }) => {
      const { data, error } = await supabase.rpc("evento_crear", {
        _titulo: e.titulo, _descripcion: e.descripcion, _tipo: e.tipo, _inicio: e.inicio, _fin: e.fin,
        _todo_el_dia: e.todo_el_dia, _lugar: e.lugar, _enlace: e.enlace, _pide_asistencia: e.pide_asistencia, _anunciar: e.anunciar,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["eventos"] });
      qc.invalidateQueries({ queryKey: ["muro"] });
    },
  });
}

export function useEliminarEvento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("eventos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["eventos"] }),
  });
}

export function useResponderEvento(userId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ eventoId, respuesta, actual }: { eventoId: string; respuesta: Respuesta; actual?: Respuesta }) => {
      if (actual === respuesta) {
        const { error } = await supabase.from("evento_asistencias").delete().eq("evento_id", eventoId).eq("user_id", userId!);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("evento_asistencias")
          .upsert({ evento_id: eventoId, user_id: userId!, respuesta, updated_at: new Date().toISOString() }, { onConflict: "evento_id,user_id" });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["eventos"] }),
  });
}
