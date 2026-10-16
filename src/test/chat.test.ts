import { describe, it, expect } from "vitest";
import { LIMITE_MB, formatoTamano, tipoDeArchivo } from "@/hooks/useChat";

const archivo = (nombre: string, type: string) => new File(["x"], nombre, { type });

describe("chat: adjuntos", () => {
  it("clasifica imágenes, audios y documentos", () => {
    expect(tipoDeArchivo(archivo("foto.jpg", "image/jpeg"))).toBe("imagen");
    expect(tipoDeArchivo(archivo("nota.webm", "audio/webm"))).toBe("audio");
    expect(tipoDeArchivo(archivo("recibo.pdf", "application/pdf"))).toBe("documento");
    expect(tipoDeArchivo(archivo("sin-tipo", ""))).toBe("documento");
  });

  it("muestra tamaños legibles", () => {
    expect(formatoTamano(500)).toBe("1 KB");
    expect(formatoTamano(250 * 1024)).toBe("250 KB");
    expect(formatoTamano(3.4 * 1024 * 1024)).toBe("3.4 MB");
    expect(formatoTamano(null)).toBe("");
  });

  it("el límite más alto entra en el bucket (25 MB)", () => {
    expect(Math.max(...Object.values(LIMITE_MB))).toBeLessThanOrEqual(25);
  });
});
