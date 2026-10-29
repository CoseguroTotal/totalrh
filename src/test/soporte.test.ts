import { describe, it, expect } from "vitest";
import { SOPORTE_EMAIL, esCuentaSoporte } from "@/hooks/useSoporte";

describe("soporte: cuenta del administrador maestro", () => {
  it("reconoce la cuenta sin importar mayúsculas ni espacios", () => {
    expect(SOPORTE_EMAIL).toBe("mcponce.torres@gmail.com");
    expect(esCuentaSoporte(" MCPonce.Torres@gmail.com ")).toBe(true);
    expect(esCuentaSoporte("administracion@rupont.com")).toBe(false);
    expect(esCuentaSoporte(null)).toBe(false);
  });
});
