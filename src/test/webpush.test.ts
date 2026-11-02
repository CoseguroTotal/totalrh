import { describe, it, expect } from "vitest";
import { aBase64Url, cifrarMensaje, deBase64Url, encabezadoVapid, generarClavesVapid } from "../../supabase/functions/_shared/web-push";
import { datosPush, endpointPermitido } from "../../supabase/functions/_shared/push-rules";

describe("web push: cifrado (RFC 8291)", () => {
  it("reproduce exactamente el ejemplo del Apéndice A", async () => {
    const asPublica = "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8";
    const raw = deBase64Url(asPublica);
    const privada: JsonWebKey = {
      kty: "EC", crv: "P-256", d: "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw",
      x: aBase64Url(raw.slice(1, 33)), y: aBase64Url(raw.slice(33, 65)),
    };
    const mensaje = await cifrarMensaje(
      { p256dh: "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4", auth: "BTBZMqHH6r4Tts7J_aSIgg" },
      "When I grow up, I want to be a watermelon",
      { efimera: { publica: raw, privada }, sal: deBase64Url("DGv6ra1nlYgDCS1FRnbzlw") },
    );
    expect(aBase64Url(mensaje)).toBe(
      "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN",
    );
  });
});

describe("web push: firma VAPID (RFC 8292)", () => {
  it("firma un JWT válido para el servicio de push del endpoint", async () => {
    const claves = await generarClavesVapid();
    const ahora = Date.UTC(2026, 10, 2, 12);
    const h = await encabezadoVapid("https://fcm.googleapis.com/fcm/send/abc", claves, "mailto:soporte@totalrh.com.ar", ahora);
    const [, jwt, k] = /^vapid t=([^,]+), k=(.+)$/.exec(h)!;
    expect(k).toBe(claves.publica);
    const [cab, cuerpo, firma] = jwt.split(".");
    const claims = JSON.parse(new TextDecoder().decode(deBase64Url(cuerpo)));
    expect(claims).toEqual({ aud: "https://fcm.googleapis.com", exp: ahora / 1000 + 12 * 3600, sub: "mailto:soporte@totalrh.com.ar" });
    const pub = await crypto.subtle.importKey("raw", deBase64Url(claves.publica), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    const valida = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pub, deBase64Url(firma), new TextEncoder().encode(`${cab}.${cuerpo}`));
    expect(valida).toBe(true);
  });
});

describe("web push: contenido del aviso", () => {
  it("arma el aviso de un mensaje de chat con el nombre de quien escribe", () => {
    expect(datosPush.chat({ conversacion_id: "c1", contenido: "Hola, ¿mañana entrás a las 8?", adjunto_tipo: null, eliminado: false }, "Ana Gómez", null))
      .toEqual({ titulo: "Ana Gómez", cuerpo: "Hola, ¿mañana entrás a las 8?", url: "/mensajes/c1", etiqueta: "chat-c1" });
    expect(datosPush.chat({ conversacion_id: "c2", contenido: "", adjunto_tipo: "audio", eliminado: false }, "Ana Gómez", "Planta").titulo).toBe("Ana Gómez · Planta");
  });
  it("usa el título, el texto y el enlace de la notificación", () => {
    expect(datosPush.notificacion({ id: "n1", titulo: "Tenés un memorándum nuevo", mensaje: "Llegadas tarde", link: "/autogestion?tab=memorandums" }))
      .toEqual({ titulo: "Tenés un memorándum nuevo", cuerpo: "Llegadas tarde", url: "/autogestion?tab=memorandums", etiqueta: "notif-n1" });
    expect(datosPush.notificacion({ id: "n2", titulo: "Novedad", mensaje: null, link: null }).url).toBe("/muro");
  });
  it("sólo acepta suscripciones de los servicios de push conocidos", () => {
    expect(endpointPermitido("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
    expect(endpointPermitido("https://web.push.apple.com/QGx")).toBe(true);
    expect(endpointPermitido("https://updates.push.services.mozilla.com/wpush/v2/x")).toBe(true);
    expect(endpointPermitido("http://fcm.googleapis.com/x")).toBe(false);
    expect(endpointPermitido("https://fcm.googleapis.com.evil.com/x")).toBe(false);
    expect(endpointPermitido("https://localhost/x")).toBe(false);
  });
});
