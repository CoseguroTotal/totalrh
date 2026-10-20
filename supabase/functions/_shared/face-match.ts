// Reglas puras del reconocimiento facial (testeadas desde src/test/faceMatch.test.ts).
// Se usan en la edge function validate-attendance-token y en el cliente.

export const DESCRIPTOR_LEN = 128;
/** Distancia euclídea máxima para aceptar que dos rostros son la misma persona. */
export const UMBRAL_COINCIDENCIA = 0.45;
/** Diferencia mínima entre el mejor y el segundo mejor empleado para evitar confusiones. */
export const MARGEN_AMBIGUEDAD = 0.06;
/** Por debajo de esta distancia, un rostro nuevo se considera ya registrado por otra persona. */
export const UMBRAL_DUPLICADO = 0.38;

/** Muestras que se toman al registrar el rostro; quedan fijas. */
export const MUESTRAS_REGISTRO = 5;
/** Tope de muestras por persona: las del registro más las aprendidas en la terminal. */
export const MUESTRAS_MAX = 12;
/** Sólo se aprende de reconocimientos muy seguros, para no contaminar la plantilla. */
export const UMBRAL_APRENDER = 0.4;
/** Una muestra casi idéntica a otra ya guardada no aporta nada. */
const DISTANCIA_REDUNDANTE = 0.12;

export type Descriptor = number[];

export function esDescriptorValido(d: unknown): d is Descriptor {
  return Array.isArray(d) && d.length === DESCRIPTOR_LEN && d.every((x) => typeof x === "number" && Number.isFinite(x));
}

export function distancia(a: Descriptor, b: Descriptor) {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return Math.sqrt(s);
}

/** Menor distancia entre un descriptor y las muestras registradas de una persona. */
export function distanciaMinima(d: Descriptor, muestras: Descriptor[]) {
  let min = Infinity;
  for (const m of muestras) min = Math.min(min, distancia(d, m));
  return min;
}

export interface Candidato<T> {
  id: T;
  muestras: Descriptor[];
}

export type ResultadoMatch<T> =
  | { ok: true; id: T; distancia: number }
  | { ok: false; motivo: "sin_registros" | "no_reconocido" | "ambiguo"; distancia?: number };

export function mejorCoincidencia<T>(d: Descriptor, candidatos: Candidato<T>[]): ResultadoMatch<T> {
  if (candidatos.length === 0) return { ok: false, motivo: "sin_registros" };
  const ranking = candidatos
    .map((c) => ({ id: c.id, dist: distanciaMinima(d, c.muestras) }))
    .sort((a, b) => a.dist - b.dist);
  const [mejor, segundo] = ranking;
  if (mejor.dist > UMBRAL_COINCIDENCIA) return { ok: false, motivo: "no_reconocido", distancia: mejor.dist };
  if (segundo && segundo.dist - mejor.dist < MARGEN_AMBIGUEDAD) {
    return { ok: false, motivo: "ambiguo", distancia: mejor.dist };
  }
  return { ok: true, id: mejor.id, distancia: mejor.dist };
}

/** Las muestras de un registro deben ser de la misma persona entre sí. */
export function muestrasConsistentes(muestras: Descriptor[]) {
  for (let i = 0; i < muestras.length; i++) {
    for (let j = i + 1; j < muestras.length; j++) {
      if (distancia(muestras[i], muestras[j]) > UMBRAL_COINCIDENCIA) return false;
    }
  }
  return true;
}

/**
 * Suma a la plantilla un rostro reconocido con seguridad en la terminal, así el sistema se
 * adapta a esa cámara y a esa luz (el registro suele hacerse con otro equipo). Las muestras
 * del registro no se tocan; las aprendidas rotan y se descarta la más vieja.
 * Devuelve null si no hay que guardar nada.
 */
export function aprenderMuestra(muestras: Descriptor[], nueva: Descriptor, distanciaMatch: number): Descriptor[] | null {
  if (!esDescriptorValido(nueva) || distanciaMatch > UMBRAL_APRENDER) return null;
  if (distanciaMinima(nueva, muestras) < DISTANCIA_REDUNDANTE) return null;
  const fijas = muestras.slice(0, MUESTRAS_REGISTRO);
  const aprendidas = [...muestras.slice(MUESTRAS_REGISTRO), nueva].slice(-(MUESTRAS_MAX - fijas.length));
  return [...fijas, ...aprendidas];
}

/** Fecha calendario en Argentina (YYYY-MM-DD); evita que después de las 21 h se fiche en el día siguiente. */
export function fechaArgentina(ahora: Date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora);
}
