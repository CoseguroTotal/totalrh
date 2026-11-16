import { describe, it, expect } from "vitest";
import { errorPublico } from "../../supabase/functions/_shared/errores";

describe("errores que devuelven las funciones", () => {
  it("no expone el detalle interno", () => {
    const sql = { message: 'relation "public.legajos" does not exist', code: "42P01" };
    expect(errorPublico(sql)).toMatch(/No se pudo completar/);
    expect(errorPublico(new Error("TypeError: cannot read properties of undefined"), "No se pudo enviar el email")).toBe("No se pudo enviar el email");
    expect(errorPublico(new Error("Falta configuración del backend: SUPABASE_SERVICE_ROLE_KEY"))).not.toMatch(/SERVICE_ROLE/);
    expect(errorPublico(undefined)).toMatch(/No se pudo completar/);
  });

  it("traduce los errores conocidos", () => {
    expect(errorPublico(new Error("A user with this email address has already been registered"))).toBe("Ya existe un usuario con ese email");
    expect(errorPublico({ message: 'duplicate key value violates unique constraint "empleados_dni_key"' })).toBe("Ese dato ya está cargado");
    expect(errorPublico(new Error("Unable to validate email address: invalid format"))).toBe("El email no es válido");
    expect(errorPublico(new Error("Password should be at least 8 characters"))).toMatch(/mínimo 8/);
  });
});
