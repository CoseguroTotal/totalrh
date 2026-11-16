import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";

// La app usa xlsx para exportar reportes y para importar fichadas (Asistencia).
// Estas son exactamente las funciones que llama, con la versión 0.20.x.
describe("planillas Excel", () => {
  it("usa la versión sin las vulnerabilidades de 0.18", () => {
    const [mayor, menor] = XLSX.version.split(".").map(Number);
    expect(mayor > 0 || menor >= 20).toBe(true);
  });

  it("exporta y vuelve a leer una planilla como en Reportes y Asistencia", () => {
    // La segunda fila no tiene entrada: es una celda en blanco
    const filas: Record<string, string>[] = [
      { Legajo: "001", Nombre: "Pérez, Ana", Fecha: "18/11/2026", Entrada: "08:00" },
      { Legajo: "002", Nombre: "Gómez, Luis", Fecha: "18/11/2026" },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filas), "Fichadas");
    const binario: ArrayBuffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });

    const leido = XLSX.read(binario);
    const hoja = leido.Sheets[leido.SheetNames[0]];
    expect(XLSX.utils.sheet_to_json(hoja)).toEqual([
      { Legajo: "001", Nombre: "Pérez, Ana", Fecha: "18/11/2026", Entrada: "08:00" },
      { Legajo: "002", Nombre: "Gómez, Luis", Fecha: "18/11/2026" },
    ]);
    // Con defval las celdas vacías vienen como "" (importación del biométrico)
    expect(XLSX.utils.sheet_to_json<Record<string, string>>(hoja, { defval: "" })[1].Entrada).toBe("");
  });
});
