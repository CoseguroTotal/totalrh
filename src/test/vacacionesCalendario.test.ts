import { describe, it, expect } from "vitest";
import {
  coloresPorEmpleado, diaSemanaLunes, fechaLocal, nivelSuperposicion, ocupacionDelMes, personasDistintas,
  resumenDelMes, superposicionesPorSucursal, type SolicitudCal,
} from "@/lib/vacacionesCalendario";

const sol = (id: string, emp: string, desde: string, hasta: string, sucursal = "s1"): SolicitudCal => ({
  id, empleado_id: emp, fecha_desde: desde, fecha_hasta: hasta, estado: "aprobada",
  empleado: { id: emp, nombre: emp, apellido: emp, sucursal_id: sucursal, sucursal: { id: sucursal, nombre: `Sucursal ${sucursal}` } },
});

describe("calendario de vacaciones", () => {
  it("lee las fechas como locales (sin correrse un día)", () => {
    const d = fechaLocal("2026-10-16");
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 16]);
  });

  it("marca los días ocupados, cortando en el borde del mes", () => {
    const occ = ocupacionDelMes([sol("1", "ana", "2026-09-28", "2026-10-03")], 2026, 9);
    expect([...occ.keys()].sort((a, b) => a - b)).toEqual([1, 2, 3]);
  });

  it("ignora solicitudes de otros meses", () => {
    expect(ocupacionDelMes([sol("1", "ana", "2026-11-02", "2026-11-05")], 2026, 9).size).toBe(0);
  });

  it("detecta superposiciones y su nivel", () => {
    const occ = ocupacionDelMes([
      sol("1", "ana", "2026-10-05", "2026-10-09"),
      sol("2", "beto", "2026-10-08", "2026-10-12"),
      sol("3", "caro", "2026-10-09", "2026-10-09", "s2"),
    ], 2026, 9);
    expect(personasDistintas(occ.get(5)!)).toBe(1);
    expect(personasDistintas(occ.get(8)!)).toBe(2);
    expect(nivelSuperposicion(personasDistintas(occ.get(9)!))).toBe(3);
    expect(resumenDelMes(occ)).toEqual({ diasConSuperposicion: 2, maximo: 3, diaMaximo: 9 });
    // El 9 coinciden ana y beto de la misma sucursal; caro es de otra
    expect(superposicionesPorSucursal(occ.get(9)!)).toEqual([{ sucursal: "Sucursal s1", personas: 2 }]);
  });

  it("la misma persona con dos solicitudes cuenta una sola vez", () => {
    const occ = ocupacionDelMes([sol("1", "ana", "2026-10-05", "2026-10-06"), sol("2", "ana", "2026-10-06", "2026-10-07")], 2026, 9);
    expect(personasDistintas(occ.get(6)!)).toBe(1);
  });

  it("asigna un color distinto a cada persona", () => {
    const c = coloresPorEmpleado([sol("1", "beto", "2026-10-01", "2026-10-01"), sol("2", "ana", "2026-10-01", "2026-10-01")]);
    expect(c.get("ana")).not.toBe(c.get("beto"));
  });

  it("la semana empieza el lunes", () => {
    expect(diaSemanaLunes(new Date(2026, 9, 12))).toBe(0); // lunes 12/10/2026
    expect(diaSemanaLunes(new Date(2026, 9, 18))).toBe(6); // domingo
  });
});
