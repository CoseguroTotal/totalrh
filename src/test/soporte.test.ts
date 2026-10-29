import { describe, it, expect } from "vitest";
import { SOPORTE_EMAIL, esCuentaSoporte } from "@/hooks/useSoporte";
import { destinatariosPermitidos } from "../../supabase/functions/_shared/soporte";
import { escaparHtml } from "@/lib/sendNotificationEmail";

describe("soporte: cuenta del administrador maestro", () => {
  it("reconoce la cuenta sin importar mayúsculas ni espacios", () => {
    expect(SOPORTE_EMAIL).toBe("mcponce.torres@gmail.com");
    expect(esCuentaSoporte(" MCPonce.Torres@gmail.com ")).toBe(true);
    expect(esCuentaSoporte("administracion@rupont.com")).toBe(false);
    expect(esCuentaSoporte(null)).toBe(false);
  });
});

describe("seguridad: quién puede mandar emails", () => {
  const r = (...x: string[]) => new Set(x);
  it("gestión puede escribirle a cualquiera, con tope de destinatarios", () => {
    expect(destinatariosPermitidos(r("rrhh"), ["ana@mail.com"]).ok).toBe(true);
    expect(destinatariosPermitidos(r("admin"), Array.from({ length: 51 }, (_, i) => `p${i}@mail.com`)).ok).toBe(false);
  });
  it("el resto del personal sólo le escribe al soporte", () => {
    expect(destinatariosPermitidos(r("empleado"), [SOPORTE_EMAIL]).ok).toBe(true);
    expect(destinatariosPermitidos(r("empleado"), ["otro@mail.com"]).ok).toBe(false);
    expect(destinatariosPermitidos(r(), [SOPORTE_EMAIL, "otro@mail.com"]).ok).toBe(false);
    expect(destinatariosPermitidos(r("empleado"), []).ok).toBe(false);
  });
});

describe("seguridad: escapar datos en los emails", () => {
  it("no deja pasar HTML de nombres o textos cargados por la gente", () => {
    expect(escaparHtml(`<a href="x">Ana</a> & 'Co'`)).toBe("&lt;a href=&quot;x&quot;&gt;Ana&lt;/a&gt; &amp; &#39;Co&#39;");
    expect(escaparHtml(null)).toBe("");
  });
});
