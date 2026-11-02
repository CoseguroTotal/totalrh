import { describe, it, expect } from "vitest";

describe("contraseña provisoria", () => {
  it("cumple las reglas y no se repite", async () => {
    const { sugerirClave } = await import("@/components/BlanquearClave");
    const { problemaPassword } = await import("../../supabase/functions/_shared/registro-rules");
    const a = sugerirClave(), b = sugerirClave();
    expect(a).toMatch(/^[A-Z][a-z]{7}-\d{4}$/);
    expect(problemaPassword(a)).toBeNull();
    expect(a).not.toBe(b);
  });
});
