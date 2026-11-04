import { describe, it, expect } from "vitest";
import { puestoVisible } from "@/lib/puesto";
describe("puestoVisible", () => {
  it("oculta 'A completar'", () => expect(puestoVisible("A completar")).toBeNull());
  it("muestra un puesto real", () => expect(puestoVisible("Cajero")).toBe("Cajero"));
});
