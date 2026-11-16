import { describe, it, expect } from "vitest";
import { MAX_ADJUNTOS, validarAdjuntos } from "@/components/AdjuntosPermiso";
import { inicialesGrupo } from "@/pages/Grupos";

const f = (name: string, type: string, mb = 1) => ({ name, type, size: mb * 1024 * 1024 });

describe("adjuntos de permisos", () => {
  it("acepta sólo PDF o fotos", () => {
    expect(validarAdjuntos(0, [f("cert.pdf", "application/pdf"), f("foto.jpg", "image/jpeg"), f("captura.png", "image/png")])).toBeNull();
    expect(validarAdjuntos(0, [f("nota.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")])).toMatch(/no es PDF ni foto/);
  });

  it("rechaza archivos muy grandes", () => {
    expect(validarAdjuntos(0, [f("video.pdf", "application/pdf", 11)])).toMatch(/supera/);
  });

  it("rechaza tipos no permitidos", () => {
    expect(validarAdjuntos(0, [f("planilla.exe", "application/x-msdownload")])).toMatch(/no es PDF/);
    // SVG puede llevar scripts: no se acepta aunque sea "image/"
    expect(validarAdjuntos(0, [f("dibujo.svg", "image/svg+xml")])).toMatch(/no es PDF/);
    // PDF que el celular manda sin tipo: se acepta por la extensión
    expect(validarAdjuntos(0, [f("certificado.pdf", "")])).toBeNull();
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
