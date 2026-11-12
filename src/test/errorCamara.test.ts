import { describe, expect, it } from "vitest";
import { errorDeCamara, errorDeModelos, navegadorInterno } from "@/lib/errorCamara";

const CHROME_ANDROID = "Mozilla/5.0 (Linux; Android 13; SM-A135M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const SAFARI_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const WHATSAPP_ANDROID = "Mozilla/5.0 (Linux; Android 12; moto g22; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 WhatsApp/2.24.1";
const INSTAGRAM_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 300.0.0.0";
const FACEBOOK_ANDROID = "Mozilla/5.0 (Linux; Android 11; SM-A105M Build/RP1A; wv) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/440.0.0]";
const WEBVIEW_ANDROID = "Mozilla/5.0 (Linux; Android 10; K; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/118.0 Mobile Safari/537.36";

const dom = (name: string) => Object.assign(new Error(name), { name });

describe("navegador interno", () => {
  it("reconoce WhatsApp, Instagram, Facebook y WebView de Android", () => {
    expect(navegadorInterno(WHATSAPP_ANDROID)).toBe("WhatsApp");
    expect(navegadorInterno(INSTAGRAM_IPHONE)).toBe("Instagram");
    expect(navegadorInterno(FACEBOOK_ANDROID)).toBe("Facebook");
    expect(navegadorInterno(WEBVIEW_ANDROID)).toBe("otra app");
  });

  it("no confunde Chrome ni Safari normales", () => {
    expect(navegadorInterno(CHROME_ANDROID)).toBeNull();
    expect(navegadorInterno(SAFARI_IPHONE)).toBeNull();
  });
});

describe("errores de cámara", () => {
  it("permiso bloqueado: explica cómo habilitarlo en cada sistema", () => {
    const android = errorDeCamara(dom("NotAllowedError"), CHROME_ANDROID);
    expect(android.codigo).toBe("CAM-PERMISO");
    expect(android.ayuda).toContain("candado");
    expect(errorDeCamara(dom("NotAllowedError"), SAFARI_IPHONE).ayuda).toContain("Safari");
  });

  it("desde WhatsApp pide abrirlo en el navegador", () => {
    const e = errorDeCamara(dom("NotAllowedError"), WHATSAPP_ANDROID);
    expect(e.codigo).toBe("CAM-APP");
    expect(e.ayuda).toContain("WhatsApp");
    expect(e.ayuda).toContain("Chrome");
    expect(errorDeCamara(dom("SinSoporte"), INSTAGRAM_IPHONE).ayuda).toContain("Safari");
  });

  it("cámara ocupada o sin cámara", () => {
    expect(errorDeCamara(dom("NotReadableError"), CHROME_ANDROID).codigo).toBe("CAM-OCUPADA");
    expect(errorDeCamara(dom("NotFoundError"), CHROME_ANDROID).codigo).toBe("CAM-SIN-CAMARA");
  });

  it("navegador sin soporte fuera de otra app", () => {
    const e = errorDeCamara(dom("SinSoporte"), SAFARI_IPHONE);
    expect(e.codigo).toBe("CAM-SOPORTE");
    expect(e.ayuda).toContain("iOS 14.3");
  });

  it("un error desconocido igual lleva código y nunca muestra el texto en inglés del navegador", () => {
    const e = errorDeCamara(dom("WeirdError"), CHROME_ANDROID);
    expect(e.codigo).toBe("CAM-WEIRD");
    expect(e.mensaje).toBe("No se pudo iniciar la cámara.");
    expect(errorDeCamara("algo", CHROME_ANDROID).codigo).toBe("CAM-DESCONOCIDO");
  });

  it("reconocimiento facial: distingue conexión de celular incompatible", () => {
    expect(errorDeModelos(new Error("Failed to fetch")).codigo).toBe("CAM-DESCARGA");
    expect(errorDeModelos(new Error("timeout")).codigo).toBe("CAM-DESCARGA");
    expect(errorDeModelos(new Error("WebGL is not supported on this device")).codigo).toBe("CAM-MOTOR");
  });
});
