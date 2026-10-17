import { describe, it, expect } from "vitest";
import { erroresDeEncuesta, estaAbierta, faltantes, porcentaje, type Pregunta } from "@/hooks/useEncuestas";

const p = (id: string, tipo: Pregunta["tipo"], obligatoria = true, opciones: string[] = []): Pregunta =>
  ({ id, orden: 0, texto: `Pregunta ${id}`, tipo, opciones, obligatoria });

describe("encuestas", () => {
  const ahora = new Date("2026-10-17T12:00:00Z");

  it("está abierta si está publicada y no venció", () => {
    expect(estaAbierta({ estado: "publicada", cierra_at: null }, ahora)).toBe(true);
    expect(estaAbierta({ estado: "publicada", cierra_at: "2026-10-18T00:00:00Z" }, ahora)).toBe(true);
    expect(estaAbierta({ estado: "publicada", cierra_at: "2026-10-16T00:00:00Z" }, ahora)).toBe(false);
    expect(estaAbierta({ estado: "borrador", cierra_at: null }, ahora)).toBe(false);
    expect(estaAbierta({ estado: "cerrada", cierra_at: null }, ahora)).toBe(false);
  });

  it("detecta obligatorias sin responder según el tipo", () => {
    const ps = [p("a", "unica", true, ["Sí", "No"]), p("b", "escala"), p("c", "texto"), p("d", "texto", false)];
    expect(faltantes(ps, {}).map((x) => x.id)).toEqual(["a", "b", "c"]);
    expect(faltantes(ps, { a: [0], b: 4, c: "  " }).map((x) => x.id)).toEqual(["c"]);
    expect(faltantes(ps, { a: [1], b: 1, c: "Bien" })).toEqual([]);
  });

  it("valida la encuesta antes de publicar", () => {
    expect(erroresDeEncuesta("", [])).toEqual(["Poné un título", "Agregá al menos una pregunta"]);
    expect(erroresDeEncuesta("Clima", [p("a", "unica", true, ["Sólo una", " "])])).toEqual(["La pregunta 1 necesita al menos dos opciones"]);
    expect(erroresDeEncuesta("Clima", [p("a", "escala")])).toEqual([]);
  });

  it("calcula porcentajes sin dividir por cero", () => {
    expect(porcentaje(1, 3)).toBe(33);
    expect(porcentaje(0, 0)).toBe(0);
  });
});
