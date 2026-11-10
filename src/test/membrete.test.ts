import { describe, it, expect } from "vitest";
import { medidaLogo } from "@/components/MembretePDF";

describe("logo del membrete", () => {
  it("entra entero en el cuadro sin deformarse", () => {
    expect(medidaLogo(600, 300, 30)).toEqual({ ancho: 30, alto: 15 });
    expect(medidaLogo(200, 400, 30)).toEqual({ ancho: 15, alto: 30 });
    expect(medidaLogo(500, 500, 30)).toEqual({ ancho: 30, alto: 30 });
  });
  it("si no se conoce la medida usa el cuadro", () => {
    expect(medidaLogo(0, 0, 30)).toEqual({ ancho: 30, alto: 30 });
  });
});
