import { describe, expect, it } from "vitest";
import { errorHorario, fraseHorario, horaCorta, textoHorario } from "@/lib/horarioPermiso";

describe("horario de permisos de salida", () => {
  it("muestra hora de salida y de regreso", () => {
    expect(textoHorario({ hora_salida: "10:00", hora_reintegro: "12:30" })).toBe("Sale 10:00 hs · Vuelve 12:30 hs");
    expect(textoHorario({ hora_salida: "10:00:00" })).toBe("Sale 10:00 hs");
    expect(textoHorario({ hora_reintegro: "12:30" })).toBe("Vuelve 12:30 hs");
    expect(textoHorario({})).toBe("");
    expect(horaCorta(" 08:15:00 ")).toBe("08:15");
  });

  it("arma la frase del PDF", () => {
    expect(fraseHorario({ hora_salida: "10:00", hora_reintegro: "12:30" })).toBe(", saliendo a horas 10:00 y reintegrándose a horas 12:30");
    expect(fraseHorario({ hora_salida: "10:00" })).toBe(", saliendo a horas 10:00");
    expect(fraseHorario({ hora_reintegro: "12:30" })).toBe(", reintegrándose a horas 12:30");
    expect(fraseHorario({ hora_salida: null, hora_reintegro: "" })).toBe("");
  });

  it("en un mismo día el regreso tiene que ser después de la salida", () => {
    expect(errorHorario("2026-11-18", "2026-11-18", { hora_salida: "12:00", hora_reintegro: "10:00" })).toMatch(/posterior/);
    expect(errorHorario("2026-11-18", "2026-11-18", { hora_salida: "12:00", hora_reintegro: "12:00" })).toMatch(/posterior/);
    expect(errorHorario("2026-11-18", "2026-11-18", { hora_salida: "10:00", hora_reintegro: "12:00" })).toBeNull();
    // Licencia de varios días: puede volver más temprano que la hora en que salió
    expect(errorHorario("2026-11-18", "2026-11-20", { hora_salida: "15:00", hora_reintegro: "08:00" })).toBeNull();
    expect(errorHorario("2026-11-18", "2026-11-18", { hora_salida: "10:00" })).toBeNull();
  });
});
