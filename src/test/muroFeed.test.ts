import { describe, it, expect } from "vitest";
import { armarInicio, filtroInicio, type Publicacion } from "@/hooks/useMuro";

const pub = (id: string, grupo_id: string | null = null): Publicacion => ({
  id, autor_id: "u", contenido: id, imagen_url: null, tipo: "post", mencion_user_id: null, fijada: false, oculta: false,
  editada: false, grupo_id, requiere_confirmacion: false, created_at: "2026-10-23T12:00:00Z", comentarios: [], reacciones: [],
});

describe("muro de inicio", () => {
  it("muestra lo general y sólo los grupos donde participo", () => {
    expect(filtroInicio([])).toBe("grupo_id.is.null");
    expect(filtroInicio(["g1", "g2"])).toBe("grupo_id.is.null,grupo_id.in.(g1,g2)");
  });

  it("las fijadas generales van arriba y no se repiten en el feed", () => {
    const fijada = { ...pub("f"), fijada: true };
    const lista = armarInicio([fijada], [pub("a"), fijada, pub("b", "g1")]);
    expect(lista.map((p) => p.id)).toEqual(["f", "a", "b"]);
  });
});
