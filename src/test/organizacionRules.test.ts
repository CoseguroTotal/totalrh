import { describe, it, expect } from "vitest";
import {
  ORG_DEMO, alcanceBorrado, candidatosDni, elegirCuentaDni, orgPorCodigo,
} from "../../supabase/functions/_shared/organizacion-rules";

const A = "aaaaaaaa-0000-4000-8000-000000000001";
const B = "bbbbbbbb-0000-4000-8000-000000000002";

describe("el código de la empresa elige la organización", () => {
  const configs = [
    { organizacion_id: A, registro_codigo: "ABCD-1234", registro_abierto: true },
    { organizacion_id: B, registro_codigo: "ZZZZ9999", registro_abierto: false },
    { organizacion_id: ORG_DEMO, registro_codigo: null, registro_abierto: true },
  ];

  it("encuentra la organización sin importar mayúsculas, espacios ni guiones", () => {
    expect(orgPorCodigo(configs, " abcd 1234 ")).toEqual({ ok: true, org: A });
    expect(orgPorCodigo(configs, "ABCD1234")).toEqual({ ok: true, org: A });
  });

  it("un código de otra organización con el registro cerrado no da de alta", () => {
    expect(orgPorCodigo(configs, "zzzz-9999")).toEqual({ ok: false, motivo: "cerrado" });
  });

  it("un código inexistente o vacío es incorrecto (nunca cae en una organización por defecto)", () => {
    expect(orgPorCodigo(configs, "NOEXISTE")).toEqual({ ok: false, motivo: "incorrecto" });
    expect(orgPorCodigo(configs, "")).toEqual({ ok: false, motivo: "incorrecto" });
    expect(orgPorCodigo(configs, "---")).toEqual({ ok: false, motivo: "incorrecto" });
  });
});

describe("ingreso con DNI en más de una organización", () => {
  it("junta las cuentas posibles sin repetir, legajos primero", () => {
    expect(candidatosDni([{ user_id: "u1" }, { user_id: "u1" }, { user_id: null }], [{ user_id: "u2" }])).toEqual(["u1", "u2"]);
    expect(candidatosDni([{ user_id: "a" }, { user_id: "b" }, { user_id: "c" }, { user_id: "d" }], [])).toHaveLength(3);
    expect(candidatosDni([], [])).toEqual([]);
  });

  it("entra la única cuenta cuya contraseña coincide", () => {
    expect(elegirCuentaDni(["fallo", "ok"])).toEqual({ tipo: "ok", indice: 1 });
    expect(elegirCuentaDni(["ok"])).toEqual({ tipo: "ok", indice: 0 });
  });

  it("si coinciden dos, no adivina: pide el email", () => {
    expect(elegirCuentaDni(["ok", "ok"])).toEqual({ tipo: "ambiguo" });
  });

  it("avisa que el alta está en revisión o que los datos son incorrectos", () => {
    expect(elegirCuentaDni(["fallo", "suspendida"])).toEqual({ tipo: "pendiente" });
    expect(elegirCuentaDni(["fallo", "fallo"])).toEqual({ tipo: "incorrecto" });
    expect(elegirCuentaDni([])).toEqual({ tipo: "incorrecto" });
  });
});

describe("eliminar un usuario desde una organización", () => {
  it("si también está en otra, sólo le quita la membresía", () => {
    expect(alcanceBorrado([B], A)).toBe("membresia");
    expect(alcanceBorrado([A, B], A)).toBe("membresia");
  });

  it("si no le queda otra organización, se borra la cuenta", () => {
    expect(alcanceBorrado([], A)).toBe("cuenta");
    expect(alcanceBorrado([A], A)).toBe("cuenta");
  });
});
