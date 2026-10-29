import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// Una app web no puede bloquear las capturas de pantalla (sólo una app nativa de Android puede).
// Esto las desalienta: cada captura lleva el nombre y el DNI de quien la sacó, no se puede
// seleccionar ni copiar el texto, y al imprimir no sale el contenido.

type Firma = { nombre: string; documento: string };

let cache: Promise<Firma> | null = null;

/** Nombre y DNI de quien mira la pantalla (o su email si no tiene legajo). */
function obtenerFirma(): Promise<Firma> {
  cache ??= (async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return { nombre: "", documento: "" };
    const { data: emp } = await supabase.from("empleados").select("nombre, apellido, dni").eq("user_id", user.id).maybeSingle();
    return emp
      ? { nombre: `${emp.apellido}, ${emp.nombre}`, documento: `DNI ${emp.dni}` }
      : { nombre: user.email ?? "", documento: "" };
  })().catch(() => ({ nombre: "", documento: "" }));
  return cache;
}

// La firma cambia si cambia la sesión
supabase.auth.onAuthStateChange(() => { cache = null; });

export function textoMarcaDeAgua(f: Firma, ahora = new Date()) {
  const cuando = ahora.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return [f.nombre, f.documento, cuando].filter(Boolean).join(" · ");
}

/** Marca de agua repetida en diagonal con los datos de quien mira; no interfiere con los toques. */
function MarcaDeAgua({ texto }: { texto: string }) {
  const fondo = useMemo(() => {
    const limpio = (t: string) => t.replace(/[&<>"]/g, "");
    // Nombre arriba; DNI y fecha abajo (así entra entero en cada repetición)
    const [nombre, ...resto] = texto.split(" · ");
    const linea2 = resto.join(" · ");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="190"><g transform="rotate(-24 150 95)" font-family="Arial, sans-serif" font-weight="700" fill="rgb(100,116,139)" fill-opacity="0.2" text-anchor="middle"><text x="150" y="88" font-size="14">${limpio(nombre)}</text><text x="150" y="108" font-size="11">${limpio(linea2)}</text></g></svg>`;
    return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
  }, [texto]);
  if (!texto) return null;
  return <div aria-hidden className="pointer-events-none absolute inset-0 z-20 select-none" style={{ backgroundImage: fondo, backgroundRepeat: "repeat" }} />;
}

/** Envuelve pantallas con datos sensibles (recibos, legajos, memorándums, liquidaciones). */
export default function ZonaProtegida({ children, className }: { children: React.ReactNode; className?: string }) {
  const [texto, setTexto] = useState("");

  useEffect(() => {
    let vivo = true;
    const actualizar = () => obtenerFirma().then((f) => { if (vivo) setTexto(textoMarcaDeAgua(f)); });
    actualizar();
    // La hora de la marca se actualiza cada minuto
    const t = setInterval(actualizar, 60_000);
    return () => { vivo = false; clearInterval(t); };
  }, []);

  return (
    <div className={cn("zona-protegida relative", className)} onContextMenu={(e) => e.preventDefault()} onCopy={(e) => e.preventDefault()}>
      {children}
      <MarcaDeAgua texto={texto} />
    </div>
  );
}
