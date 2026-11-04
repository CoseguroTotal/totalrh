import { describe, expect, it } from "vitest";
import { puedeAsignarRol, puedeTocarUsuario, rolGestor } from "../../supabase/functions/_shared/user-admin-rules";

describe("gestión de usuarios", () => {
  it("RRHH y admin pueden gestionar usuarios; el resto no", () => {
    expect(rolGestor(["rrhh"])).toBe("rrhh");
    expect(rolGestor(["admin"])).toBe("admin");
    expect(rolGestor(["empleado"])).toBeNull();
    expect(rolGestor(["gerente"])).toBeNull();
  });
  it("RRHH no puede asignar el rol administrador", () => {
    expect(puedeAsignarRol("rrhh", "admin")).toBe(false);
    expect(puedeAsignarRol("rrhh", "empleado")).toBe(true);
    expect(puedeAsignarRol("admin", "admin")).toBe(true);
  });
  it("RRHH no puede modificar ni eliminar administradores", () => {
    expect(puedeTocarUsuario("rrhh", ["admin"])).toBe(false);
    expect(puedeTocarUsuario("rrhh", ["empleado"])).toBe(true);
    expect(puedeTocarUsuario("admin", ["admin"])).toBe(true);
  });
});
