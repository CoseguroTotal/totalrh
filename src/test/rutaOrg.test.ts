import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { unirRutaOrg } from "@/lib/rutaOrg";

const ORG = "de000000-0000-4000-8000-000000000001";

function archivos(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "test" ? [] : archivos(p);
    return /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });
}

describe("rutas de storage por organización", () => {
  it("pone la organización adelante y limpia barras", () => {
    expect(unirRutaOrg(ORG, "u1", "foto.png")).toBe(`${ORG}/u1/foto.png`);
    expect(unirRutaOrg(ORG, "/grupo/", "1_logo.png")).toBe(`${ORG}/grupo/1_logo.png`);
    expect(unirRutaOrg(ORG, "emp", "descargos", "a b.pdf")).toBe(`${ORG}/emp/descargos/a b.pdf`);
  });

  it("todo archivo que sube a storage arma la ruta con rutaOrg", () => {
    const src = path.resolve(__dirname, "..");
    const sinOrg = archivos(src)
      .filter((f) => /storage[\s\S]{0,80}\.upload\(/.test(fs.readFileSync(f, "utf8")))
      .filter((f) => !/\brutaOrg\(/.test(fs.readFileSync(f, "utf8")))
      .map((f) => path.relative(src, f));
    expect(sinOrg).toEqual([]);
  });
});
