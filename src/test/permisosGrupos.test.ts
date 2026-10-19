import { describe, it, expect } from "vitest";
import { MAX_ADJUNTOS, validarAdjuntos } from "@/components/AdjuntosPermiso";
import { inicialesGrupo } from "@/pages/Grupos";

const f = (name: string, type: string, mb = 1) => ({ name, type, size: mb * 1024 * 1024 });

describe("adjuntos de permisos", () => {
  it("acepta PDF, imágenes y Word", () => {
    expect(validarAdjuntos(0, [f("cert.pdf", "application/pdf"), f("foto.jpg", "image/jpeg"), f("nota.docx", "")])).toBeNull();
  });

  it("rechaza archivos muy grandes", () => {
    expect(validarAdjuntos(0, [f("video.pdf", "application/pdf", 11)])).toMatch(/supera/);
  });

  it("rechaza tipos no permitidos", () => {
    expect(validarAdjuntos(0, [f("planilla.exe", "application/x-msdownload")])).toMatch(/no es PDF/);
  });

  it("limita la cantidad total", () => {
    expect(validarAdjuntos(MAX_ADJUNTOS - 1, [f("a.pdf", "application/pdf"), f("b.pdf", "application/pdf")])).toMatch(/hasta/);
  });
});

describe("grupos", () => {
  it("arma las iniciales del grupo", () => {
    expect(inicialesGrupo("Logística")).toBe("L");
    expect(inicialesGrupo("Recursos  Humanos Salta")).toBe("RH");
  });
});
