

# Plan: Auto-email en memorándums, vacaciones en días corridos, y footer del sistema

## 3 cambios

### 1. Email automático del empleado en envío individual de memorándum

**Problema:** La query de memorándums no trae el `email` del empleado destinatario, por eso `emailDialog.memo.destinatario?.email` es siempre undefined.

**Cambios:**
- `src/hooks/useMemorandums.ts`: agregar `email` al select de la relación destinatario: `destinatario:empleados(id, nombre, apellido, email)`
- `src/pages/Memorandums.tsx`: el `defaultTo` ya usa `emailDialog.memo.destinatario?.email`, con el campo en la query funcionará automáticamente.

### 2. Vacaciones en días corridos (no hábiles)

**Cambio en `src/hooks/useVacaciones.ts`:**
- Modificar `calcDiasHabiles` para contar todos los días (corridos), no solo hábiles. Renombrar a `calcDiasCorridos`. Simplificar a: diferencia en días entre fecha_desde y fecha_hasta + 1.

**Cambio en `src/pages/Vacaciones.tsx`:**
- Actualizar la referencia de `calcDiasHabiles` a `calcDiasCorridos` (o simplemente cambiar la implementación interna sin renombrar).

### 3. Footer/marca de agua del sistema

**Cambio en `src/components/AppLayout.tsx`:**
- Agregar un footer fijo en la parte inferior de la página con logo y texto: "TotalRH - Gestión de Personal. Sky Studio 2026 todos los derechos reservados."
- Incluir el logo (`/logo_total_rh.png`) al lado del texto.
- Estilo sutil (texto pequeño, color muted) como marca de agua informativa.

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `src/hooks/useMemorandums.ts` | Agregar `email` al select de destinatario |
| `src/hooks/useVacaciones.ts` | Cambiar cálculo de días hábiles a días corridos |
| `src/components/AppLayout.tsx` | Agregar footer con logo y marca del sistema |

