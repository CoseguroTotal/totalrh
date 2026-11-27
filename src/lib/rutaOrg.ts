import { supabase } from "@/integrations/supabase/client";

/**
 * Rutas de storage por organización (multiempresa, tanda 5).
 *
 * Todo archivo nuevo va a `{organizacion_id}/...`: las políticas de storage sólo dejan leer y subir
 * archivos de la organización actual. Las rutas viejas, sin prefijo, cuentan como de "Grupo Demo".
 * Nunca armes una ruta de subida a mano: usá `rutaOrg(...)`.
 */

let cache: { userId: string; org: Promise<string> } | null = null;

/** Organización en la que trabaja el usuario (la misma que usan las políticas: org_vigente()). */
export async function orgActual(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user.id;
  if (!userId) throw new Error("Sesión vencida");
  if (cache?.userId !== userId) {
    const org = (async () => {
      const { data, error } = await supabase.rpc("org_vigente");
      if (error || !data) throw new Error("No se pudo determinar la organización");
      return data;
    })();
    cache = { userId, org };
    org.catch(() => { if (cache?.org === org) cache = null; });
  }
  return cache.org;
}

/** Olvida la organización guardada (llamar al cambiar de organización). */
export function olvidarOrgActual() {
  cache = null;
}

/** Une las partes de una ruta de storage con la organización actual adelante. */
export function unirRutaOrg(org: string, ...partes: string[]) {
  return [org, ...partes].map((p) => p.replace(/^\/+|\/+$/g, "")).filter(Boolean).join("/");
}

/** Ruta de storage con la organización actual adelante: `rutaOrg("abc", "foto.png")` → `{org}/abc/foto.png`. */
export async function rutaOrg(...partes: string[]): Promise<string> {
  return unirRutaOrg(await orgActual(), ...partes);
}
