// Mensajes de error que se devuelven al navegador.
// El detalle interno (SQL, stack, textos del proveedor) va sólo a console.error,
// que queda en los logs de la función.

const POR_DEFECTO = "No se pudo completar la operación. Probá de nuevo en un rato.";

function textoDe(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message ?? "");
  return typeof e === "string" ? e : "";
}

/** Traduce los errores conocidos a un mensaje claro; el resto, a uno genérico. */
export function errorPublico(e: unknown, porDefecto = POR_DEFECTO): string {
  const msg = textoDe(e);
  if (/already (been )?registered|already exists|email_exists/i.test(msg)) return "Ya existe un usuario con ese email";
  if (/duplicate key|unique constraint/i.test(msg)) return "Ese dato ya está cargado";
  if (/invalid email|unable to validate email/i.test(msg)) return "El email no es válido";
  if (/password/i.test(msg) && /short|weak|at least|characters/i.test(msg)) {
    return "La contraseña no cumple los requisitos (mínimo 8 caracteres)";
  }
  return porDefecto;
}
