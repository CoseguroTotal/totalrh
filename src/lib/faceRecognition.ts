// Reconocimiento facial en el navegador con @vladmandic/face-api.
// La librería y los modelos (~7 MB, en /public/models/face-api) se cargan sólo
// cuando se abre la cámara, así no pesan en el resto de la app.

type FaceApi = typeof import("@vladmandic/face-api");

let cargando: Promise<FaceApi> | null = null;

export function cargarFaceApi(): Promise<FaceApi> {
  if (!cargando) {
    cargando = (async () => {
      const faceapi = await import("@vladmandic/face-api");
      // `ready` existe en runtime pero falta en los tipos publicados de la librería
      await (faceapi.tf as unknown as { ready: () => Promise<void> }).ready();
      const url = `${import.meta.env.BASE_URL}models/face-api`;
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(url),
        faceapi.nets.faceLandmark68Net.loadFromUri(url),
        faceapi.nets.faceRecognitionNet.loadFromUri(url),
      ]);
      return faceapi;
    })().catch((e) => {
      cargando = null;
      throw e;
    });
  }
  return cargando;
}

export interface Deteccion {
  descriptor: number[];
  /** Relación de aspecto promedio de los ojos: baja con los ojos cerrados. */
  ear: number;
  /** Posición horizontal de la nariz entre ambos lados de la mandíbula: ~0.5 mirando de frente. */
  yaw: number;
  /** Ancho de la cara respecto del video (0–1): sirve para pedir que se acerque. */
  tamano: number;
  box: { x: number; y: number; width: number; height: number };
}

type Punto = { x: number; y: number };
const dist = (a: Punto, b: Punto) => Math.hypot(a.x - b.x, a.y - b.y);

function eyeAspectRatio(ojo: Punto[]) {
  // 6 puntos por ojo (modelo de 68 landmarks)
  return (dist(ojo[1], ojo[5]) + dist(ojo[2], ojo[4])) / (2 * dist(ojo[0], ojo[3]));
}

// El detector rápido falla según el tamaño de la cara en el cuadro (muy cerca o muy lejos de la
// cámara), y de forma distinta en cada resolución: si una no encuentra la cara, se prueba la otra.
const RESOLUCIONES_LIVIANA = [224, 320];
const RESOLUCIONES_COMPLETA = [320, 224];
const opciones = (faceapi: FaceApi, inputSize: number) => new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold: 0.5 });

/** Detección liviana (sin descriptor) para la prueba de vida: más fotos por segundo. */
export async function detectarPuntos(video: HTMLVideoElement): Promise<Deteccion | null> {
  const faceapi = await cargarFaceApi();
  for (const inputSize of RESOLUCIONES_LIVIANA) {
    const r = await faceapi.detectSingleFace(video, opciones(faceapi, inputSize)).withFaceLandmarks();
    if (r) return medir(r.landmarks, r.detection.box, video, []);
  }
  return null;
}

type Landmarks = import("@vladmandic/face-api").FaceLandmarks68;

function medir(lm: Landmarks, box: Deteccion["box"], video: HTMLVideoElement, descriptor: number[]): Deteccion {
  const jaw = lm.getJawOutline();
  const nariz = lm.getNose()[3];
  const izq = jaw[0];
  const der = jaw[jaw.length - 1];
  const ancho = der.x - izq.x || 1;
  return {
    descriptor,
    ear: (eyeAspectRatio(lm.getLeftEye()) + eyeAspectRatio(lm.getRightEye())) / 2,
    yaw: (nariz.x - izq.x) / ancho,
    tamano: box.width / (video.videoWidth || 1),
    box: { x: box.x, y: box.y, width: box.width, height: box.height },
  };
}

export async function detectarRostro(video: HTMLVideoElement): Promise<Deteccion | null> {
  const faceapi = await cargarFaceApi();
  for (const inputSize of RESOLUCIONES_COMPLETA) {
    const r = await faceapi.detectSingleFace(video, opciones(faceapi, inputSize)).withFaceLandmarks().withFaceDescriptor();
    if (r) return medir(r.landmarks, r.detection.box, video, Array.from(r.descriptor));
  }
  return null;
}

/* ─────────────── Prueba de vida ─────────────── */

/** El único gesto: girar la cabeza (una foto no puede hacerlo). El parpadeo se quitó porque fallaba demasiado. */
export const TEXTO_DESAFIO = "Girá la cabeza hacia un costado y volvé al centro";

/** Las detecciones livianas (prueba de vida) no traen descriptor: no sirven para identificar. */
export const tieneDescriptor = (d: Deteccion) => d.descriptor.length > 0;

/** Si la cara salta de lugar entre dos fotos, probablemente se cruzó otra persona. */
export function mismaPosicion(a: Deteccion["box"], b: Deteccion["box"]) {
  const dx = a.x + a.width / 2 - (b.x + b.width / 2);
  const dy = a.y + a.height / 2 - (b.y + b.height / 2);
  return Math.hypot(dx, dy) < Math.max(a.width, b.width) * 0.6 && Math.abs(a.width - b.width) < Math.max(a.width, b.width) * 0.4;
}

/** Por debajo, los ojos están cerrados. Bajo a propósito: con ojos chicos o anteojos el EAR abierto ronda 0.2. */
const EAR_MINIMO_ABIERTO = 0.15;
const YAW_GIRO = 0.17; // desvío respecto del centro (0.5)
const YAW_FRENTE = 0.08;
const YAW_RETORNO = 0.12;

/**
 * Prueba de vida: se alimenta con cada detección y devuelve true cuando la persona
 * giró la cabeza hacia un costado y volvió al centro.
 */
export class PruebaDeVida {
  private giro = false;

  get progreso() {
    return this.giro ? 0.5 : 0;
  }

  actualizar(d: Deteccion): boolean {
    const desvio = Math.abs(d.yaw - 0.5);
    if (!this.giro && desvio > YAW_GIRO) this.giro = true;
    return this.giro && desvio < YAW_RETORNO;
  }
}

export function mirandoDeFrente(d: Deteccion) {
  return Math.abs(d.yaw - 0.5) < YAW_FRENTE && d.ear > EAR_MINIMO_ABIERTO;
}
