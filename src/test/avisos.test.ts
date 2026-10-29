import { describe, it, expect, beforeEach } from "vitest";
import { NOTAS, resumenMensaje, setSonidosActivos, sonidosActivos } from "@/lib/avisos";

describe("avisos: sonidos", () => {
  beforeEach(() => localStorage.clear());

  it("los sonidos vienen activados y se pueden apagar por dispositivo", () => {
    expect(sonidosActivos()).toBe(true);
    setSonidosActivos(false);
    expect(sonidosActivos()).toBe(false);
    setSonidosActivos(true);
    expect(sonidosActivos()).toBe(true);
  });

  it("cada sonido es corto (menos de medio segundo)", () => {
    for (const notas of Object.values(NOTAS)) {
      const fin = Math.max(...notas.map((n) => n.t + n.d));
      expect(fin).toBeLessThan(0.5);
    }
  });
});

describe("avisos: texto de un mensaje de chat", () => {
  it("muestra el texto o el tipo de adjunto", () => {
    expect(resumenMensaje({ contenido: "Hola, ¿mañana entrás temprano?" })).toBe("Hola, ¿mañana entrás temprano?");
    expect(resumenMensaje({ contenido: "", adjunto_tipo: "audio" })).toBe("🎤 Mensaje de voz");
    expect(resumenMensaje({ contenido: "  ", adjunto_tipo: "imagen" })).toBe("📷 Foto");
    expect(resumenMensaje({ contenido: "x", eliminado: true })).toBe("Mensaje eliminado");
  });

  it("acorta los textos largos", () => {
    const r = resumenMensaje({ contenido: "a".repeat(300) });
    expect(r.length).toBe(118);
    expect(r.endsWith("…")).toBe(true);
  });
});
