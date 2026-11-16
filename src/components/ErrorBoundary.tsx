import { Component, type ErrorInfo, type ReactNode } from "react";

/** Después de publicar una versión nueva, una pestaña vieja puede pedir archivos que ya no existen. */
export function esErrorDeVersion(e: unknown) {
  const msg = e instanceof Error ? `${e.name} ${e.message}` : String(e ?? "");
  return /ChunkLoadError|Loading chunk|dynamically imported module|Importing a module script failed|error loading dynamically/i.test(msg);
}

interface Estado { error: unknown }

/**
 * Si algo falla al dibujar la pantalla, muestra un aviso con "Recargar"
 * en vez de dejar la app en blanco. El detalle queda sólo en la consola.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, Estado> {
  state: Estado = { error: null };

  static getDerivedStateFromError(error: unknown): Estado {
    return { error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("Error en la pantalla", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    const version = esErrorDeVersion(this.state.error);
    return (
      <div role="alert" className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-sm w-full rounded-xl border bg-card p-6 text-center space-y-3 shadow-sm">
          <p className="text-lg font-semibold">{version ? "Hay una versión nueva" : "Algo salió mal"}</p>
          <p className="text-sm text-muted-foreground">
            {version
              ? "Se actualizó la aplicación. Recargá para seguir con la versión nueva."
              : "No se pudo mostrar esta pantalla. Recargá la página; si vuelve a pasar, avisale a RRHH."}
          </p>
          <div className="flex justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Recargar
            </button>
            <button
              type="button"
              onClick={() => { window.location.href = "/"; }}
              className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted"
            >
              Ir al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }
}
