import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary, esErrorDeVersion } from "@/components/ErrorBoundary";
import { politicaCsp } from "@/lib/politicaCsp";

describe("política de seguridad de contenido", () => {
  const csp = politicaCsp("https://abcdefghijkl.supabase.co");
  const directiva = (nombre: string) => csp.split("; ").find((d) => d.startsWith(nombre + " ")) ?? "";

  it("no permite scripts de otros sitios ni en línea", () => {
    expect(directiva("script-src")).toBe("script-src 'self' 'wasm-unsafe-eval'");
    expect(directiva("script-src")).not.toMatch(/'unsafe-inline'|'unsafe-eval'|\*/);
    expect(directiva("object-src")).toBe("object-src 'none'");
    expect(directiva("base-uri")).toBe("base-uri 'self'");
  });

  it("deja conectar con Supabase (API, realtime y storage)", () => {
    expect(directiva("connect-src")).toContain("https://*.supabase.co");
    expect(directiva("connect-src")).toContain("wss://*.supabase.co");
    expect(directiva("img-src")).toContain("https://*.supabase.co");
    expect(directiva("img-src")).toContain("blob:");
  });

  it("suma el dominio propio de Supabase si lo hay", () => {
    const propio = politicaCsp("https://api.miempresa.com.ar");
    expect(propio).toContain("https://api.miempresa.com.ar");
    expect(propio).toContain("wss://api.miempresa.com.ar");
    expect(politicaCsp("no es una url")).toContain("https://*.supabase.co");
  });
});

describe("pantalla de error", () => {
  function Rompe(): JSX.Element {
    throw new Error("fallo de prueba");
  }

  it("muestra el aviso con Recargar en vez de dejar la pantalla en blanco", () => {
    const consola = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<ErrorBoundary><Rompe /></ErrorBoundary>);
    expect(screen.getByRole("alert")).toHaveTextContent("Algo salió mal");
    expect(screen.getByRole("button", { name: "Recargar" })).toBeInTheDocument();
    // El detalle técnico no se muestra en pantalla
    expect(screen.queryByText(/fallo de prueba/)).toBeNull();
    consola.mockRestore();
  });

  it("si no hay error muestra la app normal", () => {
    render(<ErrorBoundary><p>Hola</p></ErrorBoundary>);
    expect(screen.getByText("Hola")).toBeInTheDocument();
  });

  it("reconoce cuando falta un archivo de una versión vieja", () => {
    expect(esErrorDeVersion(new TypeError("Failed to fetch dynamically imported module: /assets/Legajos-abc.js"))).toBe(true);
    expect(esErrorDeVersion(new Error("Cannot read properties of undefined"))).toBe(false);
  });
});
