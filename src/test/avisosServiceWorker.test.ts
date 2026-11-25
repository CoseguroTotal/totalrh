import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { rutaDeAviso } from "@/components/AbrirDesdeAviso";
import { problemaImagen } from "@/hooks/useEncuestas";

type Ventana = { url: string; visibilityState: string; focused: boolean; focus: () => Promise<Ventana>; postMessage: ReturnType<typeof vi.fn>; navigate: ReturnType<typeof vi.fn> };

/** Carga public/sw-avisos.js en un "self" falso y devuelve sus manejadores. */
function cargarServiceWorker(ventanas: Ventana[]) {
  const manejadores: Record<string, (ev: unknown) => void> = {};
  const showNotification = vi.fn(async () => undefined);
  const openWindow = vi.fn(async () => null);
  const self = {
    location: { origin: "https://rrhh.ejemplo.com" },
    addEventListener: (tipo: string, fn: (ev: unknown) => void) => { manejadores[tipo] = fn; },
    clients: { matchAll: async () => ventanas, openWindow },
    registration: { showNotification },
  };
  const codigo = fs.readFileSync(path.resolve(__dirname, "../../public/sw-avisos.js"), "utf8");
  new Function("self", codigo)(self);
  return { manejadores, showNotification, openWindow };
}

async function disparar(fn: (ev: unknown) => void, datos: Record<string, unknown>) {
  let espera: Promise<unknown> = Promise.resolve();
  fn({
    data: datos.json ? { json: () => datos.json } : undefined,
    notification: datos.notification,
    waitUntil: (p: Promise<unknown>) => { espera = p; },
  });
  await espera;
}

const ventana = (visible: boolean, enFoco = visible): Ventana => {
  const v: Ventana = {
    url: "https://rrhh.ejemplo.com/muro", visibilityState: visible ? "visible" : "hidden", focused: enFoco,
    focus: async () => v, postMessage: vi.fn(), navigate: vi.fn(),
  };
  return v;
};

describe("service worker de avisos", () => {
  const aviso = { titulo: "Nuevo comentario en tu publicación", cuerpo: "Cari comentó", url: "/muro", etiqueta: "notif-1" };

  it("muestra el aviso con sonido cuando la app está cerrada", async () => {
    const sw = cargarServiceWorker([]);
    await disparar(sw.manejadores.push, { json: aviso });
    expect(sw.showNotification).toHaveBeenCalledTimes(1);
    expect(sw.showNotification.mock.calls[0][1]).toMatchObject({ body: "Cari comentó", silent: false, renotify: true, data: { url: "/muro" } });
  });

  it("muestra el aviso también con la app a la vista (sin sonido), para que iPhone no dé de baja la suscripción", async () => {
    const sw = cargarServiceWorker([ventana(true)]);
    await disparar(sw.manejadores.push, { json: aviso });
    expect(sw.showNotification).toHaveBeenCalledTimes(1);
    expect(sw.showNotification.mock.calls[0][1]).toMatchObject({ silent: true, renotify: false });
  });

  it("suena si la ventana figura visible pero no tiene el foco (app en segundo plano en iPhone)", async () => {
    const sw = cargarServiceWorker([ventana(true, false)]);
    await disparar(sw.manejadores.push, { json: aviso });
    expect(sw.showNotification.mock.calls[0][1]).toMatchObject({ silent: false });
  });

  it("al tocar el aviso con la app abierta la trae al frente y le pide la pantalla, sin recargarla", async () => {
    const v = ventana(false);
    const sw = cargarServiceWorker([v]);
    const close = vi.fn();
    await disparar(sw.manejadores.notificationclick, { notification: { close, data: { url: "/encuestas/abc?x=1" } } });
    expect(close).toHaveBeenCalled();
    expect(v.postMessage).toHaveBeenCalledWith({ tipo: "totalrh:abrir", ruta: "/encuestas/abc?x=1" });
    expect(v.navigate).not.toHaveBeenCalled();
    expect(sw.openWindow).not.toHaveBeenCalled();
  });

  it("al tocar el aviso con la app cerrada la abre en la pantalla del aviso", async () => {
    const sw = cargarServiceWorker([]);
    await disparar(sw.manejadores.notificationclick, { notification: { close: vi.fn(), data: { url: "/mensajes/c1" } } });
    expect(sw.openWindow).toHaveBeenCalledWith("https://rrhh.ejemplo.com/mensajes/c1");
  });
});

describe("abrir la pantalla pedida por el aviso", () => {
  it("acepta sólo rutas propias de la app", () => {
    expect(rutaDeAviso({ tipo: "totalrh:abrir", ruta: "/muro" })).toBe("/muro");
    expect(rutaDeAviso({ tipo: "totalrh:abrir", ruta: "/mensajes/c1?x=1" })).toBe("/mensajes/c1?x=1");
    expect(rutaDeAviso({ tipo: "totalrh:abrir", ruta: "//otro-sitio.com" })).toBeNull();
    expect(rutaDeAviso({ tipo: "totalrh:abrir", ruta: "https://otro-sitio.com" })).toBeNull();
    expect(rutaDeAviso({ tipo: "otro", ruta: "/muro" })).toBeNull();
    expect(rutaDeAviso("hola")).toBeNull();
  });
});

describe("imagen de una encuesta", () => {
  it("acepta fotos de hasta 5 MB y rechaza SVG, otros archivos y fotos grandes", () => {
    expect(problemaImagen({ type: "image/jpeg", size: 2 * 1024 * 1024 })).toBeNull();
    expect(problemaImagen({ type: "image/png", size: 5 * 1024 * 1024 })).toBeNull();
    expect(problemaImagen({ type: "image/svg+xml", size: 1000 })).not.toBeNull();
    expect(problemaImagen({ type: "application/pdf", size: 1000 })).not.toBeNull();
    expect(problemaImagen({ type: "image/jpeg", size: 6 * 1024 * 1024 })).toMatch(/5 MB/);
  });
});
