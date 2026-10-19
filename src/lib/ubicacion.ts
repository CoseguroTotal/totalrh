// Ubicación del celular para fichar dentro de la geocerca de la sucursal.

export interface UbicacionActual { latitud: number; longitud: number; precision: number }

/** Pide la ubicación precisa del dispositivo. Rechaza con un mensaje claro para el usuario. */
export function obtenerUbicacion(timeoutMs = 15000): Promise<UbicacionActual> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Este dispositivo no permite obtener la ubicación."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitud: pos.coords.latitude, longitud: pos.coords.longitude, precision: pos.coords.accuracy }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) reject(new Error("Permití el acceso a la ubicación en el navegador para poder fichar."));
        else if (err.code === err.TIMEOUT) reject(new Error("No pudimos obtener la ubicación a tiempo. Activá el GPS y probá de nuevo."));
        else reject(new Error("No pudimos obtener la ubicación. Activá el GPS y probá de nuevo."));
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    );
  });
}

/** Igual que obtenerUbicacion pero sin fallar: devuelve null si no se pudo (ubicación opcional). */
export async function ubicacionSiEsPosible(timeoutMs = 8000) {
  try { return await obtenerUbicacion(timeoutMs); } catch { return null; }
}

export const enlaceMapa = (lat: number, lng: number) => `https://www.google.com/maps?q=${lat},${lng}`;
