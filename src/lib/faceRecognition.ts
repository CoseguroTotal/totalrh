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

/** Detección liviana (sin descriptor) para la prueba de vida: más fotos por segundo. */
export async function detectarPuntos(video: HTMLVideoElement): Promise<Deteccion | null> {
  const faceapi = await cargarFaceApi();
  const r = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
    .withFaceLandmarks();
  if (!r) return null;
  return medir(r.landmarks, r.detection.box, video, []);
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
  const r = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (!r) return null;

  return medir(r.landmarks, r.detection.box, video, Array.from(r.descriptor));
}

/* ─────────────── Prueba de vida ─────────────── */

export type Desafio = "parpadear" | "girar";

export const TEXTO_DESAFIO: Record<Desafio, string> = {
  parpadear: "Parpadeá dos veces",
  girar: "Girá la cabeza hacia un costado y volvé al centro",
};

export function desafioAleatorio(): Desafio {
  return Math.random() < 0.5 ? "parpadear" : "girar";
}

const EAR_CERRADO = 0.2;
/** Parpadeo relativo a la apertura normal de cada persona (luz, anteojos, forma de ojos). */
const CIERRE_RELATIVO = 0.75;
const APERTURA_RELATIVA = 0.9;
const YAW_GIRO = 0.17; // desvío respecto del centro (0.5)
const YAW_FRENTE = 0.08;
const YAW_RETORNO = 0.12;

/**
 * Máquina de estados de la prueba de vida. Se alimenta con cada detección y
 * devuelve true cuando la persona completó el desafío.
 */
export class PruebaDeVida {
  private parpadeos = 0;
  private ojosCerrados = false;
  private giro = false;
  private base = 0;

  constructor(public readonly desafio: Desafio) {}

  get progreso() {
    if (this.desafio === "parpadear") return Math.min(this.parpadeos / 2, 1);
    return this.giro ? 0.5 : 0;
  }

  actualizar(d: Deteccion): boolean {
    if (this.desafio === "parpadear") {
      if (!this.ojosCerrados && d.ear >= this.base * 0.85) {
        this.base = this.base ? this.base * 0.8 + d.ear * 0.2 : d.ear;
      }
      if (!this.base) return false;
      if (!this.ojosCerrados && d.ear < this.base * CIERRE_RELATIVO) this.ojosCerrados = true;
      else if (this.ojosCerrados && d.ear > this.base * APERTURA_RELATIVA) {
        this.ojosCerrados = false;
        this.parpadeos++;
      }
      return this.parpadeos >= 2;
    }
    const desvio = Math.abs(d.yaw - 0.5);
    if (!this.giro && desvio > YAW_GIRO) this.giro = true;
    return this.giro && desvio < YAW_RETORNO;
  }
}

export function mirandoDeFrente(d: Deteccion) {
  return Math.abs(d.yaw - 0.5) < YAW_FRENTE && d.ear > EAR_CERRADO;
}
