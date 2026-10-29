import { describe, it, expect } from "vitest";
import { esErrorDeSesion } from "@/lib/sesion";

describe("sesión vencida", () => {
  it("reconoce cuando el servidor ya no acepta la sesión", () => {
    expect(esErrorDeSesion({ status: 403, message: "Session from session_id claim in JWT does not exist" })).toBe(true);
    expect(esErrorDeSesion({ status: 401, message: "invalid JWT" })).toBe(true);
    expect(esErrorDeSesion({ message: "Auth session missing!" })).toBe(true);
    expect(esErrorDeSesion({ code: "refresh_token_not_found", message: "Invalid Refresh Token: Refresh Token Not Found" })).toBe(true);
  });

  it("no confunde un corte de conexión con una sesión vencida", () => {
    expect(esErrorDeSesion({ status: 0, message: "Failed to fetch" })).toBe(false);
    expect(esErrorDeSesion(null)).toBe(false);
  });
});
