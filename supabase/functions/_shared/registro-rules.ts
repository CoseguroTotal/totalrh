// Reglas puras del alta de empleados desde el portal (testeadas desde src/test/registro.test.ts).
// Las usan la edge function registro-empleado y el formulario público.

export const soloDigitos = (s: string) => (s ?? "").replace(/\D/g, "");

/** El código se comparte por WhatsApp: se acepta en minúsculas y con espacios o guiones. */
export const normalizarCodigo = (s: string) => (s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export function dniValido(dni: string) {
  const d = soloDigitos(dni);
  return d.length >= 7 && d.length <= 8;
}

/** CUIL/CUIT con dígito verificador (módulo 11). */
export function cuilValido(cuil: string) {
  const c = soloDigitos(cuil);
  if (c.length !== 11) return false;
  if (!["20", "23", "24", "27", "30", "33", "34"].includes(c.slice(0, 2))) return false;
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((acc, p, i) => acc + p * Number(c[i]), 0);
  const resto = 11 - (suma % 11);
  const verificador = resto === 11 ? 0 : resto === 10 ? 9 : resto;
  return verificador === Number(c[10]);
}

/** El DNI tiene que ser el que está dentro del CUIL (con o sin el cero adelante). */
export function cuilCoincideConDni(cuil: string, dni: string) {
  const c = soloDigitos(cuil);
  const d = soloDigitos(dni).padStart(8, "0");
  return c.length === 11 && c.slice(2, 10) === d;
}

export const formatoCuil = (cuil: string) => {
  const c = soloDigitos(cuil);
  return c.length === 11 ? `${c.slice(0, 2)}-${c.slice(2, 10)}-${c.slice(10)}` : cuil;
};

export const emailValido = (email: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((email ?? "").trim());

export const PASSWORD_MINIMO = 8;

export function problemaPassword(password: string) {
  if ((password ?? "").length < PASSWORD_MINIMO) return `La contraseña tiene que tener al menos ${PASSWORD_MINIMO} caracteres`;
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "La contraseña tiene que tener letras y números";
  return null;
}

export interface DatosRegistro {
  dni: string;
  cuil: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento?: string | null;
  telefono: string;
  email: string;
  empresa_id: string;
  sucursal_id: string;
  password: string;
  consentimiento: boolean;
}

/** Devuelve los errores por campo; vacío si se puede enviar. */
export function validarRegistro(d: Partial<DatosRegistro>, hoy = new Date()) {
  const errores: Partial<Record<keyof DatosRegistro, string>> = {};
  if (!d.nombre || d.nombre.trim().length < 2) errores.nombre = "Completá tu nombre";
  if (!d.apellido || d.apellido.trim().length < 2) errores.apellido = "Completá tu apellido";
  if (!dniValido(d.dni ?? "")) errores.dni = "El DNI tiene que tener 7 u 8 números";
  if (!cuilValido(d.cuil ?? "")) errores.cuil = "El CUIL no es válido. Revisá los 11 números";
  else if (dniValido(d.dni ?? "") && !cuilCoincideConDni(d.cuil ?? "", d.dni ?? "")) errores.cuil = "El CUIL no corresponde a ese DNI";
  if (d.fecha_nacimiento) {
    const f = new Date(`${d.fecha_nacimiento}T12:00:00`);
    const edad = (hoy.getTime() - f.getTime()) / (365.25 * 86400000);
    if (Number.isNaN(edad) || edad < 16 || edad > 100) errores.fecha_nacimiento = "Revisá la fecha de nacimiento";
  }
  if (soloDigitos(d.telefono ?? "").length < 8) errores.telefono = "Ingresá tu celular con código de área";
  if (!emailValido(d.email ?? "")) errores.email = "Ingresá un email válido";
  if (!d.empresa_id) errores.empresa_id = "Elegí la empresa";
  if (!d.sucursal_id) errores.sucursal_id = "Elegí la sucursal";
  const pw = problemaPassword(d.password ?? "");
  if (pw) errores.password = pw;
  if (!d.consentimiento) errores.consentimiento = "Tenés que aceptar el uso de tus datos";
  return errores;
}

/** Sirve para saber si el usuario escribió un DNI o un email en el login. */
export const pareceDni = (s: string) => /^[\d.\s]+$/.test((s ?? "").trim()) && dniValido(s);

/** Roles que se pueden dar al aprobar un alta del portal. */
export const ROLES_ALTA = ["empleado", "rrhh", "gerente", "usuario", "contador"] as const;
export type RolAlta = (typeof ROLES_ALTA)[number];

/** RRHH aprueba como empleado; los roles de gestión los asigna sólo un administrador. */
export function puedeAsignarRolAlta(rolesQuienAprueba: Set<string>, rol: string) {
  if (!(ROLES_ALTA as readonly string[]).includes(rol)) return false;
  if (rol === "empleado") return rolesQuienAprueba.has("admin") || rolesQuienAprueba.has("rrhh");
  return rolesQuienAprueba.has("admin");
}

/**
 * Con la protección de contraseñas filtradas activa, el servidor rechaza las muy comunes
 * o las que aparecieron en filtraciones públicas.
 */
export const MENSAJE_PASSWORD_DEBIL =
  "Esa contraseña es muy común o apareció en filtraciones. Elegí otra más difícil (combiná palabras, números y símbolos).";

export function esPasswordDebil(e: { code?: string; message?: string } | null | undefined) {
  if (!e) return false;
  return e.code === "weak_password" || /weak|easy to guess|pwned|leaked|compromised/i.test(e.message ?? "");
}

/** Mensaje en castellano para los errores de contraseña del servidor. */
export function mensajeErrorPassword(e: { code?: string; message?: string } | null | undefined) {
  if (!e) return null;
  if (esPasswordDebil(e)) return MENSAJE_PASSWORD_DEBIL;
  if (/same.*password|different from the old/i.test(e.message ?? "")) return "La contraseña nueva tiene que ser distinta de la actual.";
  if (/at least|should be|characters/i.test(e.message ?? "")) return `La contraseña tiene que tener al menos ${PASSWORD_MINIMO} caracteres, con letras y números.`;
  return e.message ?? "No se pudo guardar la contraseña";
}
