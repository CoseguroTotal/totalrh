import logoTotalRH from "@/assets/logo_total_rh.png";
import { CLIENTE } from "./cliente";

export type { MarcaCliente } from "./tipos";
export { CLIENTE, logoTotalRH };

/** Nombre que se muestra como título de la app: "Rupont · TotalRH" en un cliente, "TotalRH" en el Demo. */
export const NOMBRE_APP = CLIENTE ? `${CLIENTE.nombre} · TotalRH` : "TotalRH";
