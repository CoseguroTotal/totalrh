import { describe, it, expect } from "vitest";
import {
  DESCRIPTOR_LEN, UMBRAL_COINCIDENCIA, distancia, esDescriptorValido, fechaArgentina,
  mejorCoincidencia, muestrasConsistentes, aprenderMuestra, MUESTRAS_REGISTRO, MUESTRAS_MAX, UMBRAL_APRENDER,
} from "../../supabase/functions/_shared/face-match";
import { PruebaDeVida, type Deteccion } from "@/lib/faceRecognition";

/** Descriptor sintético: un "rostro" base desplazado `ruido` en cada componente. */
function rostro(semilla: number, ruido = 0): number[] {
  return Array.from({ length: DESCRIPTOR_LEN }, (_, i) => Math.sin(semilla * 7.3 + i) * 0.15 + ruido);
}

describe("reconocimiento facial: comparación", () => {
  it("valida la forma del descriptor", () => {
    expect(esDescriptorValido(rostro(1))).toBe(true);
    expect(esDescriptorValido(rostro(1).slice(1))).toBe(false);
    expect(esDescriptorValido([...rostro(1).slice(1), NaN])).toBe(false);
    expect(esDescriptorValido("hola")).toBe(false);
  });

  it("reconoce a la persona registrada con variaciones leves", () => {
    const candidatos = [
      { id: "ana", muestras: [rostro(1), rostro(1, 0.005)] },
      { id: "beto", muestras: [rostro(2)] },
    ];
    const r = mejorCoincidencia(rostro(1, 0.01), candidatos);
    expect(r).toMatchObject({ ok: true, id: "ana" });
  });

  it("rechaza un rostro desconocido", () => {
    const r = mejorCoincidencia(rostro(9), [{ id: "ana", muestras: [rostro(1)] }]);
    expect(r).toMatchObject({ ok: false, motivo: "no_reconocido" });
  });

  it("no ficha cuando dos empleados se parecen demasiado", () => {
    const base = rostro(1);
    const gemelo = base.map((x) => x + 0.001);
    const r = mejorCoincidencia(base, [
      { id: "ana", muestras: [base] },
      { id: "gemela", muestras: [gemelo] },
    ]);
    expect(r).toMatchObject({ ok: false, motivo: "ambiguo" });
  });

  it("sin registros devuelve sin_registros", () => {
    expect(mejorCoincidencia(rostro(1), [])).toMatchObject({ ok: false, motivo: "sin_registros" });
  });

  it("las muestras de registro deben ser de la misma persona", () => {
    expect(muestrasConsistentes([rostro(1), rostro(1, 0.01)])).toBe(true);
    expect(distancia(rostro(1), rostro(5))).toBeGreaterThan(UMBRAL_COINCIDENCIA);
    expect(muestrasConsistentes([rostro(1), rostro(5)])).toBe(false);
  });
});

describe("fecha de la fichada", () => {
  it("usa el día de Argentina aunque en UTC ya sea mañana", () => {
    // 22:30 del 16/10 en Buenos Aires = 01:30 del 17/10 UTC
    expect(fechaArgentina(new Date("2026-10-17T01:30:00Z"))).toBe("2026-10-16");
    expect(fechaArgentina(new Date("2026-10-17T03:30:00Z"))).toBe("2026-10-17");
  });
});

describe("prueba de vida", () => {
  const det = (ear: number, yaw = 0.5): Deteccion => ({
    descriptor: [], ear, yaw, tamano: 0.3, box: { x: 0, y: 0, width: 0, height: 0 },
  });

  it("se completa con dos parpadeos", () => {
    const p = new PruebaDeVida("parpadear");
    expect(p.actualizar(det(0.3))).toBe(false);
    p.actualizar(det(0.15));
    expect(p.actualizar(det(0.3))).toBe(false); // 1 parpadeo
    p.actualizar(det(0.15));
    expect(p.actualizar(det(0.3))).toBe(true);
  });

  it("una foto fija (ojos siempre abiertos) no la supera", () => {
    const p = new PruebaDeVida("parpadear");
    for (let i = 0; i < 50; i++) expect(p.actualizar(det(0.3))).toBe(false);
  });

  it("cuenta parpadeos relativos a ojos más chicos (EAR base bajo)", () => {
    const p = new PruebaDeVida("parpadear");
    p.actualizar(det(0.22));
    p.actualizar(det(0.15));
    expect(p.actualizar(det(0.22))).toBe(false);
    p.actualizar(det(0.15));
    expect(p.actualizar(det(0.22))).toBe(true);
  });

  it("un leve temblor de ojos no cuenta como parpadeo", () => {
    const p = new PruebaDeVida("parpadear");
    for (let i = 0; i < 40; i++) expect(p.actualizar(det(i % 2 ? 0.33 : 0.3))).toBe(false);
  });

  it("tras girar acepta volver casi al centro (desvío 0.1)", () => {
    const p = new PruebaDeVida("girar");
    p.actualizar(det(0.3, 0.75));
    expect(p.actualizar(det(0.3, 0.6))).toBe(true);
  });

  it("girar requiere ir a un costado y volver al centro", () => {
    const p = new PruebaDeVida("girar");
    expect(p.actualizar(det(0.3, 0.5))).toBe(false);
    expect(p.actualizar(det(0.3, 0.75))).toBe(false);
    expect(p.actualizar(det(0.3, 0.52))).toBe(true);
  });
});

describe("reconocimiento facial: aprendizaje en la terminal", () => {
  const registro = Array.from({ length: MUESTRAS_REGISTRO }, (_, i) => rostro(1, i * 0.002));

  it("suma una muestra nueva de un reconocimiento seguro", () => {
    const nueva = rostro(1, 0.03);
    expect(aprenderMuestra(registro, nueva, 0.3)).toEqual([...registro, nueva]);
  });

  it("no aprende de reconocimientos dudosos ni de muestras repetidas", () => {
    expect(aprenderMuestra(registro, rostro(1, 0.03), UMBRAL_APRENDER + 0.01)).toBeNull();
    expect(aprenderMuestra(registro, rostro(1, 0.001), 0.1)).toBeNull();
    expect(aprenderMuestra(registro, rostro(1).slice(1), 0.1)).toBeNull();
  });

  it("conserva las muestras del registro y rota las aprendidas", () => {
    let muestras = registro;
    for (let i = 1; i <= 20; i++) muestras = aprenderMuestra(muestras, rostro(1, 0.02 * i), 0.3) ?? muestras;
    expect(muestras).toHaveLength(MUESTRAS_MAX);
    expect(muestras.slice(0, MUESTRAS_REGISTRO)).toEqual(registro);
    expect(muestras[MUESTRAS_MAX - 1]).toEqual(rostro(1, 0.4));
  });
});
