import { useUserRole } from "@/hooks/useUserRole";

/**
 * Hook to determine if the current user can edit a given module.
 * Contador: full access to liquidacion, read-only for legajos/vacaciones/asistencia.
 * Empleado: no edit access.
 * Admin/gerente/rrhh/usuario: full access.
 */
export function useCanEdit(modulo: "legajos" | "vacaciones" | "asistencia" | "liquidacion" | "memorandums" | "reclutamiento" | "empresas") {
  const { data: role, isLoading } = useUserRole();

  if (isLoading) return { canEdit: false, isLoading: true, role };

  if (role === "empleado") return { canEdit: false, isLoading: false, role };

  if (role === "contador") {
    const readOnly = ["legajos", "vacaciones", "asistencia"];
    return { canEdit: !readOnly.includes(modulo), isLoading: false, role };
  }

  return { canEdit: true, isLoading: false, role };
}

/** Check if current user can issue sanctions (admin, gerente, rrhh) */
export function useCanSancion() {
  const { data: role, isLoading } = useUserRole();
  const allowed = ["admin", "gerente", "rrhh"];
  return { canSancion: role ? allowed.includes(role) : false, isLoading, role };
}
