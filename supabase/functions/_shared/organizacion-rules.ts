// Reglas puras de multiempresa para las edge functions. Se prueban desde src/test/organizacionRules.test.ts.
import { normalizarCodigo } from "./registro-rules.ts";

/** "Grupo Demo": las cuentas de prueba de la demo viven ahí. */
export const ORG_DEMO = "de000000-0000-4000-8000-000000000001";

export interface ConfigRegistro {
  organizacion_id: string;
  registro_codigo: string | null;
  registro_abierto: boolean | null;
}

export type OrgDelCodigo = { ok: true; org: string } | { ok: false; motivo: "incorrecto" | "cerrado" };

/** El código de la empresa identifica la organización en la que se da de alta el empleado. */
export function orgPorCodigo(configs: ConfigRegistro[], codigo: string): OrgDelCodigo {
  const buscado = normalizarCodigo(codigo);
  if (!buscado) return { ok: false, motivo: "incorrecto" };
  const c = configs.find((x) => x.registro_codigo && normalizarCodigo(x.registro_codigo) === buscado);
  if (!c) return { ok: false, motivo: "incorrecto" };
  if (!c.registro_abierto) return { ok: false, motivo: "cerrado" };
  return { ok: true, org: c.organizacion_id };
}

/** Cuentas que pueden corresponder a un DNI (legajos con cuenta primero, después altas pendientes), sin repetir. */
export function candidatosDni(empleados: { user_id: string | null }[], pendientes: { user_id: string | null }[], max = 3): string[] {
  const ids: string[] = [];
  for (const f of [...empleados, ...pendientes]) {
    if (f.user_id && !ids.includes(f.user_id)) ids.push(f.user_id);
  }
  return ids.slice(0, max);
}

export type IntentoDni = "ok" | "suspendida" | "fallo";
export type ResultadoDni =
  | { tipo: "ok"; indice: number }
  | { tipo: "pendiente" }
  | { tipo: "ambiguo" }
  | { tipo: "incorrecto" };

/**
 * Con el mismo DNI en más de una organización, entra la única cuenta cuya contraseña coincide.
 * Si coinciden dos, no se adivina: se pide el email.
 */
export function elegirCuentaDni(intentos: IntentoDni[]): ResultadoDni {
  const ok = intentos.flatMap((r, i) => (r === "ok" ? [i] : []));
  if (ok.length === 1) return { tipo: "ok", indice: ok[0] };
  if (ok.length > 1) return { tipo: "ambiguo" };
  if (intentos.includes("suspendida")) return { tipo: "pendiente" };
  return { tipo: "incorrecto" };
}

/**
 * Al eliminar un usuario desde una organización: si también pertenece a otra, sólo se le quita
 * la membresía; la cuenta se borra únicamente cuando no le queda ninguna otra organización.
 */
export function alcanceBorrado(orgsDelUsuario: string[], org: string): "cuenta" | "membresia" {
  return orgsDelUsuario.some((o) => o !== org) ? "membresia" : "cuenta";
}
