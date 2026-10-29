import { describe, it, expect } from "vitest";
import { textoMarcaDeAgua } from "@/components/ZonaProtegida";

describe("marca de agua", () => {
  it("identifica a quien mira la pantalla, con fecha y hora", () => {
    const t = textoMarcaDeAgua({ nombre: "Tuyon, Aldana", documento: "DNI 38340436" }, new Date("2026-10-29T15:04:00-03:00"));
    expect(t).toContain("Tuyon, Aldana");
    expect(t).toContain("DNI 38340436");
    expect(t).toMatch(/29\/10\/2026/);
  });
  it("sin legajo usa el email y no deja separadores vacíos", () => {
    expect(textoMarcaDeAgua({ nombre: "admin@empresa.com", documento: "" }, new Date("2026-10-29T15:04:00-03:00"))).not.toContain("·  ·");
  });
});
