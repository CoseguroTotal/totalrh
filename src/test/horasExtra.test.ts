import { describe, it, expect } from "vitest";
import { clasificarExtras, importeExtras, resumirExtras, TOPE_DIARIO_MIN } from "@/lib/horasExtra";

const h = { hora_entrada: "08:00", hora_salida: "16:00" };
// Instantes en hora argentina (UTC-3)
const ar = (fecha: string, hora: string) => new Date(`${fecha}T${hora}:00-03:00`).toISOString();

describe("horas extra (art. 201 LCT)", () => {
  it("día común: lo posterior a la salida va al 50 %", () => {
    expect(clasificarExtras("2026-10-19", ar("2026-10-19", "08:00"), ar("2026-10-19", "18:00"), h, false)).toEqual({ al50: 120, al100: 0 });
  });

  it("sin extra si sale a horario o antes", () => {
    expect(clasificarExtras("2026-10-19", ar("2026-10-19", "08:00"), ar("2026-10-19", "15:30"), h, false)).toEqual({ al50: 0, al100: 0 });
  });

  it("respeta los minutos de cortesía", () => {
    expect(clasificarExtras("2026-10-19", ar("2026-10-19", "08:00"), ar("2026-10-19", "16:10"), h, false, 15)).toEqual({ al50: 0, al100: 0 });
    expect(clasificarExtras("2026-10-19", ar("2026-10-19", "08:00"), ar("2026-10-19", "16:20"), h, false, 15)).toEqual({ al50: 20, al100: 0 });
  });

  it("sábado: antes de las 13 h al 50 %, después al 100 %", () => {
    const sab = { hora_entrada: "08:00", hora_salida: "12:00" };
    expect(clasificarExtras("2026-10-24", ar("2026-10-24", "08:00"), ar("2026-10-24", "15:00"), sab, false)).toEqual({ al50: 60, al100: 120 });
  });

  it("domingo o feriado: todo lo trabajado al 100 %", () => {
    expect(clasificarExtras("2026-10-25", ar("2026-10-25", "09:00"), ar("2026-10-25", "13:00"), null, false)).toEqual({ al50: 0, al100: 240 });
    expect(clasificarExtras("2026-10-12", ar("2026-10-12", "08:00"), ar("2026-10-12", "16:00"), h, true)).toEqual({ al50: 0, al100: 480 });
  });

  it("día sin horario asignado (franco) entre semana: todo al 50 %", () => {
    expect(clasificarExtras("2026-10-21", ar("2026-10-21", "09:00"), ar("2026-10-21", "12:00"), null, false)).toEqual({ al50: 180, al100: 0 });
  });

  it("turno noche: la extra se mide desde la salida del día siguiente", () => {
    const noche = { hora_entrada: "22:00", hora_salida: "06:00" };
    expect(clasificarExtras("2026-10-19", ar("2026-10-19", "22:00"), ar("2026-10-20", "07:00"), noche, false)).toEqual({ al50: 60, al100: 0 });
  });
});

describe("topes y valores (Decreto 484/2000)", () => {
  it("marca días que superan 3 h y el mes que supera 30 h", () => {
    const r = resumirExtras([
      { fecha: "2026-10-19", extras: { al50: TOPE_DIARIO_MIN + 30, al100: 0 } },
      ...Array.from({ length: 10 }, (_, i) => ({ fecha: `2026-10-2${i}`, extras: { al50: 170, al100: 0 } })),
    ]);
    expect(r.diasSobreTopeDiario).toEqual(["2026-10-19"]);
    expect(r.superaMensual).toBe(true);
  });

  it("calcula el importe con el divisor del convenio", () => {
    const r = importeExtras(1_000_000, 200, { al50: 120, al100: 60 });
    expect(r.valorHora).toBe(5000);
    expect(r.i50).toBe(15_000);
    expect(r.i100).toBe(10_000);
  });
});
