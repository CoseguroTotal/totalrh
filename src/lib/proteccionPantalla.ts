// Al salir de la app (selector de apps, otra pestaña) se borronea el contenido para que la
// vista previa que guarda el sistema no muestre datos. En la compu, la tecla Imprimir pantalla
// borronea un instante y avisa que la captura queda identificada.
import { toast } from "sonner";

let activa = false;

export function activarProteccionPantalla() {
  if (activa) return;
  activa = true;
  const html = document.documentElement;
  const ocultar = () => html.classList.add("app-oculta");
  const mostrar = () => html.classList.remove("app-oculta");

  document.addEventListener("visibilitychange", () => (document.visibilityState === "hidden" ? ocultar() : mostrar()));
  window.addEventListener("pagehide", ocultar);
  window.addEventListener("pageshow", mostrar);

  window.addEventListener("keyup", (e) => {
    if (e.key !== "PrintScreen") return;
    ocultar();
    // Algunos navegadores permiten pisar el portapapeles con la tecla: así la captura no queda pegable
    void navigator.clipboard?.writeText("").catch(() => undefined);
    toast.warning("Las capturas de pantalla llevan tu nombre y DNI en la marca de agua.");
    setTimeout(mostrar, 1200);
  });
}
