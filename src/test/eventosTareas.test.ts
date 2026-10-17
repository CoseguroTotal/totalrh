import { describe, it, expect } from "vitest";
import { conteoAsistencia, eventosPorDia } from "@/hooks/useEventos";
import { estadoVencimiento, hoyIso, ordenarTareas } from "@/hooks/useTareas";

const local = (y: number, m: number, d: number, h = 0) => new Date(y, m, d, h).toISOString();

describe("calendario de eventos", () => {
  it("ubica un evento de un día en su fecha", () => {
    const m = eventosPorDia([{ id: "a", inicio: local(2026, 9, 20, 18), fin: null }], 2026, 9);
    expect([...m.keys()]).toEqual([20]);
  });

  it("un evento de varios días aparece en todos, cortado al mes", () => {
    const m = eventosPorDia([{ id: "a", inicio: local(2026, 9, 30, 9), fin: local(2026, 10, 2, 18) }], 2026, 9);
    expect([...m.keys()].sort((x, y) => x - y)).toEqual([30, 31]);
  });

  it("ignora eventos de otros meses", () => {
    expect(eventosPorDia([{ id: "a", inicio: local(2026, 11, 5), fin: null }], 2026, 9).size).toBe(0);
  });

  it("cuenta las respuestas de asistencia", () => {
    expect(conteoAsistencia([{ respuesta: "voy" }, { respuesta: "voy" }, { respuesta: "quizas" }])).toEqual({ voy: 2, quizas: 1, no_voy: 0 });
  });
});

describe("tareas", () => {
  const ahora = new Date(2026, 9, 17, 10);

  it("detecta vencidas, del día y próximas", () => {
    expect(hoyIso(ahora)).toBe("2026-10-17");
    expect(estadoVencimiento({ vence: "2026-10-16", estado: "pendiente" }, ahora)).toBe("vencida");
    expect(estadoVencimiento({ vence: "2026-10-17", estado: "en_curso" }, ahora)).toBe("hoy");
    expect(estadoVencimiento({ vence: "2026-10-20", estado: "pendiente" }, ahora)).toBe("proxima");
    expect(estadoVencimiento({ vence: "2026-10-01", estado: "hecha" }, ahora)).toBeNull();
    expect(estadoVencimiento({ vence: null, estado: "pendiente" }, ahora)).toBeNull();
  });

  it("ordena por vencimiento, prioridad y deja las hechas al final", () => {
    const t = (id: string, vence: string | null, prioridad: "alta" | "media" | "baja", estado: "pendiente" | "hecha" = "pendiente") =>
      ({ id, vence, prioridad, estado, created_at: "2026-10-01" });
    const orden = ordenarTareas([t("sin", null, "alta"), t("hecha", "2026-10-01", "alta", "hecha"), t("baja", "2026-10-18", "baja"), t("alta", "2026-10-18", "alta"), t("vieja", "2026-10-10", "media")]);
    expect(orden.map((x) => x.id)).toEqual(["vieja", "alta", "baja", "sin", "hecha"]);
  });
});
