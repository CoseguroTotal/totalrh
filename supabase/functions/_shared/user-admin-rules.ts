// Quién puede gestionar usuarios y qué puede hacer cada uno. Puro: se prueba desde src/test.

export type RolGestor = "admin" | "rrhh";

/** Devuelve el rol con el que gestiona usuarios, o null si no puede. Admin tiene prioridad. */
export function rolGestor(roles: string[]): RolGestor | null {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("rrhh")) return "rrhh";
  return null;
}

/** RRHH no puede otorgar el rol de administrador. */
export function puedeAsignarRol(gestor: RolGestor, rol: string): boolean {
  return gestor === "admin" || rol !== "admin";
}

/** RRHH no puede modificar ni eliminar a un usuario que es administrador. */
export function puedeTocarUsuario(gestor: RolGestor, rolesDelUsuario: string[]): boolean {
  return gestor === "admin" || !rolesDelUsuario.includes("admin");
}
