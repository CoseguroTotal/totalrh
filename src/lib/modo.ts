import { esInstalacionDemo } from "../../supabase/functions/_shared/demo-rules";

/**
 * true en la demo comercial (landing + acceso por código). En la instalación de un cliente
 * "/" lleva directo al login. Se decide por el backend al que apunta el .env de cada proyecto.
 */
export const ES_DEMO = esInstalacionDemo(import.meta.env.VITE_SUPABASE_URL);
