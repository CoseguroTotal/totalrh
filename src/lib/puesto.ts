/** Puesto apto para mostrar a otros usuarios: oculta marcadores de dato pendiente. */
export function puestoVisible(puesto?: string | null): string | null {
  const p = (puesto ?? "").trim();
  if (!p || /^a completar$/i.test(p) || p === "—" || p === "-") return null;
  return p;
}
