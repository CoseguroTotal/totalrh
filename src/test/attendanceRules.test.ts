import { describe, it, expect } from "vitest";
import {
  decidirFichada, distanciaMetros, esUbicacionValida, evaluarGeocerca, puedeOperarTerminal, puedeRegistrarRostro,
} from "../../supabase/functions/_shared/attendance-rules";

const roles = (...r: string[]) => new Set(r);

describe("permisos de fichada", () => {
  it("sólo la terminal o un admin emiten QR y fichan por rostro", () => {
    expect(puedeOperarTerminal(roles("registro_asistencia"))).toBe(true);
    expect(puedeOperarTerminal(roles("admin"))).toBe(true);
    // Un empleado que emitiera su propio QR podría fichar desde su casa
    expect(puedeOperarTerminal(roles("empleado"))).toBe(false);
    expect(puedeOperarTerminal(roles("rrhh"))).toBe(false);
    expect(puedeOperarTerminal(roles())).toBe(false);
  });

  it("el rostro lo registra el propio empleado o RRHH/admin", () => {
    expect(puedeRegistrarRostro("u1", "u1", roles("empleado"))).toBe(true);
    expect(puedeRegistrarRostro("u1", "u2", roles("empleado"))).toBe(false);
    expect(puedeRegistrarRostro("u1", "u2", roles("rrhh"))).toBe(true);
    expect(puedeRegistrarRostro("u1", null, roles("admin"))).toBe(true);
    expect(puedeRegistrarRostro("u1", null, roles("gerente"))).toBe(false);
  });
});

describe("entrada o salida", () => {
  const t = (iso: string) => new Date(iso);

  it("sin fichadas previas es entrada", () => {
    expect(decidirFichada(null, t("2026-10-19T11:00:00Z"))).toEqual({ accion: "entrada" });
  });

  it("con entrada abierta del día es salida", () => {
    const r = decidirFichada({ id: "f1", hora_entrada: "2026-10-19T11:00:00Z", hora_salida: null }, t("2026-10-19T20:00:00Z"));
    expect(r).toEqual({ accion: "salida", fichadaId: "f1" });
  });

  it("turno noche: la salida del día siguiente cierra la entrada de la noche anterior", () => {
    // Entra 22 h y sale 6 h (hora argentina)
    const r = decidirFichada({ id: "f1", hora_entrada: "2026-10-20T01:00:00Z", hora_salida: null }, t("2026-10-20T09:00:00Z"));
    expect(r).toEqual({ accion: "salida", fichadaId: "f1" });
  });

  it("una entrada olvidada de hace más de 16 h no se cierra: se abre una nueva", () => {
    const r = decidirFichada({ id: "f1", hora_entrada: "2026-10-18T11:00:00Z", hora_salida: null }, t("2026-10-19T11:00:00Z"));
    expect(r).toEqual({ accion: "entrada" });
  });

  it("si la última ya tiene salida, es entrada", () => {
    const r = decidirFichada({ id: "f1", hora_entrada: "2026-10-19T11:00:00Z", hora_salida: "2026-10-19T15:00:00Z" }, t("2026-10-19T16:00:00Z"));
    expect(r).toEqual({ accion: "entrada" });
  });

  it("dos marcas en menos de un minuto: la segunda es repetida", () => {
    const r = decidirFichada({ id: "f1", hora_entrada: "2026-10-19T11:00:00Z", hora_salida: null }, t("2026-10-19T11:00:30Z"));
    expect(r).toMatchObject({ accion: "repetida", tipo: "entrada" });
  });
});

describe("geocerca", () => {
  // Plaza 9 de Julio, Salta
  const plaza = { latitud: -24.7891, longitud: -65.4103, radio_metros: 150 };

  it("calcula distancias reales", () => {
    // ~1,11 km por cada 0,01° de latitud
    expect(Math.round(distanciaMetros(-24.78, -65.41, -24.79, -65.41))).toBeGreaterThan(1100);
    expect(Math.round(distanciaMetros(-24.78, -65.41, -24.79, -65.41))).toBeLessThan(1120);
  });

  it("acepta adentro del radio", () => {
    expect(evaluarGeocerca({ latitud: -24.7895, longitud: -65.4100, precision: 20 }, plaza)).toMatchObject({ ok: true });
  });

  it("rechaza afuera del radio e informa la distancia", () => {
    const r = evaluarGeocerca({ latitud: -24.7990, longitud: -65.4103, precision: 10 }, plaza);
    expect(r).toMatchObject({ ok: false, motivo: "fuera", radio: 150 });
    expect(r.ok === false && r.distancia! > 1000).toBe(true);
  });

  it("perdona hasta 50 m de imprecisión del GPS", () => {
    // ~180 m del centro con 40 m de precisión → 180 - 40 = 140 ≤ 150
    expect(evaluarGeocerca({ latitud: -24.79072, longitud: -65.4103, precision: 40 }, plaza)).toMatchObject({ ok: true });
  });

  it("pide reintentar si el GPS es muy impreciso", () => {
    expect(evaluarGeocerca({ latitud: -24.7891, longitud: -65.4103, precision: 500 }, plaza)).toMatchObject({ ok: false, motivo: "imprecisa" });
  });

  it("sin ubicación cargada en la sucursal no se puede fichar por geocerca", () => {
    expect(evaluarGeocerca({ latitud: 0, longitud: 0, precision: 5 }, { latitud: null, longitud: null, radio_metros: null })).toMatchObject({ ok: false, motivo: "sin_geocerca" });
  });

  it("valida los datos de ubicación", () => {
    expect(esUbicacionValida({ latitud: -24.7, longitud: -65.4, precision: 12 })).toBe(true);
    expect(esUbicacionValida({ latitud: 100, longitud: -65.4, precision: 12 })).toBe(false);
    expect(esUbicacionValida({ latitud: "-24", longitud: -65.4, precision: 12 })).toBe(false);
    expect(esUbicacionValida(null)).toBe(false);
  });
});
