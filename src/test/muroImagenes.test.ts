import { describe, it, expect } from "vitest";
import { rutaImagenMuro } from "@/hooks/useMuro";

describe("imágenes del muro", () => {
  it("usa la ruta tal cual en publicaciones nuevas", () => {
    expect(rutaImagenMuro("u1/foto.png")).toBe("u1/foto.png");
  });

  it("recupera la ruta de las URLs públicas que se guardaban antes", () => {
    expect(rutaImagenMuro("https://x.supabase.co/storage/v1/object/public/muro/u1/a%20b.png?t=1")).toBe("u1/a b.png");
  });
});
