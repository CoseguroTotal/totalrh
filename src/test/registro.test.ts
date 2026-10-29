import { describe, it, expect } from "vitest";
import {
  MENSAJE_PASSWORD_DEBIL, cuilCoincideConDni, cuilValido, dniValido, emailValido, esPasswordDebil, formatoCuil, mensajeErrorPassword,
  normalizarCodigo, pareceDni, problemaPassword, puedeAsignarRolAlta, validarRegistro,
} from "../../supabase/functions/_shared/registro-rules";

describe("alta de empleados: identidad", () => {
  it("valida el CUIL con su dígito verificador", () => {
    expect(cuilValido("20-12345678-6")).toBe(true);
    expect(cuilValido("27-31548300-5")).toBe(true);
    expect(cuilValido("20-12345678-5")).toBe(false);
    expect(cuilValido("2012345678")).toBe(false);
    expect(cuilValido("99-12345678-6")).toBe(false);
  });

  it("controla que el DNI sea el del CUIL, también con 7 dígitos", () => {
    expect(cuilCoincideConDni("20-12345678-6", "12.345.678")).toBe(true);
    expect(cuilCoincideConDni("20-12345678-6", "12345679")).toBe(false);
    expect(cuilCoincideConDni("20-01234567-1", "1234567")).toBe(true);
  });

  it("normaliza DNI, CUIL y el código de la empresa", () => {
    expect(dniValido("12.345.678")).toBe(true);
    expect(dniValido("123")).toBe(false);
    expect(formatoCuil("20123456786")).toBe("20-12345678-6");
    expect(normalizarCodigo(" ab3k-7mpq ")).toBe("AB3K7MPQ");
  });

  it("distingue DNI de email en el login", () => {
    expect(pareceDni("12.345.678")).toBe(true);
    expect(pareceDni("juan@empresa.com")).toBe(false);
    expect(pareceDni("12")).toBe(false);
  });
});

describe("alta de empleados: formulario", () => {
  const ok = {
    dni: "12345678", cuil: "20-12345678-6", nombre: "Ana", apellido: "Gómez", fecha_nacimiento: "1990-05-10",
    telefono: "387 455-1234", email: "ana@mail.com", empresa_id: "e1", sucursal_id: "s1", password: "clave1234", consentimiento: true,
  };

  it("acepta un registro completo", () => {
    expect(validarRegistro(ok, new Date("2026-10-28"))).toEqual({});
  });

  it("el email es obligatorio (memos y firmas)", () => {
    expect(validarRegistro({ ...ok, email: "" })).toHaveProperty("email");
    expect(emailValido("ana@mail")).toBe(false);
  });

  it("marca CUIL de otra persona, menor de edad y contraseña débil", () => {
    const e = validarRegistro({ ...ok, cuil: "27-31548300-5", fecha_nacimiento: "2015-01-01", password: "abcdefgh" }, new Date("2026-10-28"));
    expect(e.cuil).toMatch(/no corresponde/);
    expect(e.fecha_nacimiento).toBeDefined();
    expect(e.password).toMatch(/letras y números/);
    expect(problemaPassword("ab1")).toMatch(/al menos/);
  });

  it("exige el consentimiento y la sucursal", () => {
    const e = validarRegistro({ ...ok, consentimiento: false, sucursal_id: "" });
    expect(e.consentimiento).toBeDefined();
    expect(e.sucursal_id).toBeDefined();
  });
});

describe("alta de empleados: rol al aprobar", () => {
  const r = (...x: string[]) => new Set(x);
  it("RRHH aprueba como empleado; admin puede dar roles de gestión", () => {
    expect(puedeAsignarRolAlta(r("rrhh"), "empleado")).toBe(true);
    expect(puedeAsignarRolAlta(r("rrhh"), "rrhh")).toBe(false);
    expect(puedeAsignarRolAlta(r("admin"), "rrhh")).toBe(true);
    expect(puedeAsignarRolAlta(r("admin"), "gerente")).toBe(true);
  });
  it("nunca se da admin ni terminal desde un alta", () => {
    expect(puedeAsignarRolAlta(r("admin"), "admin")).toBe(false);
    expect(puedeAsignarRolAlta(r("admin"), "registro_asistencia")).toBe(false);
    expect(puedeAsignarRolAlta(r("gerente"), "empleado")).toBe(false);
  });
});

describe("contraseñas rechazadas por el servidor", () => {
  it("reconoce las contraseñas comunes o filtradas y da un mensaje claro", () => {
    expect(esPasswordDebil({ code: "weak_password", message: "Password is known to be weak and easy to guess" })).toBe(true);
    expect(esPasswordDebil({ message: "Password has been pwned" })).toBe(true);
    expect(esPasswordDebil({ message: "Invalid login credentials" })).toBe(false);
    expect(mensajeErrorPassword({ code: "weak_password" })).toBe(MENSAJE_PASSWORD_DEBIL);
    expect(mensajeErrorPassword({ message: "New password should be different from the old password." })).toMatch(/distinta/);
  });
});
