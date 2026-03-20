

# Plan: Formulario de alta, edición de empleados y limpieza de datos

## Resumen

Tres cambios: (1) formulario Dialog para crear empleados desde Legajos, (2) modo edición inline en LegajoDetail, (3) eliminar datos seed de la base de datos.

---

## 1. Crear componente `EmpleadoFormDialog`

Nuevo componente `src/components/EmpleadoFormDialog.tsx`:
- Dialog modal con formulario usando react-hook-form + zod validation
- Campos: nombre, apellido, legajo, DNI, CUIL, puesto, categoría, CCT, fecha_ingreso, estado, email, teléfono
- Selects dinámicos para empresa y sucursal (sucursales filtradas por empresa seleccionada)
- Hook `useSucursales(empresaId)` en `useEmpleados.ts` para cargar sucursales filtradas
- On submit: insert en tabla `empleados` via Supabase, invalidar query `["empleados"]`, cerrar dialog
- Reutilizable tanto para crear como para editar (recibe `empleado` opcional como prop)

## 2. Agregar botón "Nuevo Empleado" en `Legajos.tsx`

- Botón con icono `Plus` junto a los filtros
- Abre `EmpleadoFormDialog` en modo creación

## 3. Agregar edición en `LegajoDetail.tsx`

- Botón "Editar" (icono `Pencil`) en el header del perfil
- Abre `EmpleadoFormDialog` en modo edición, pre-populado con datos del empleado
- On submit: `update` en tabla `empleados` por id, invalidar queries `["empleado", id]` y `["empleados"]`

## 4. Hook `useSucursales` 

Agregar en `useEmpleados.ts`:
```typescript
export function useSucursales(empresaId?: string) {
  // query sucursales filtradas por empresa_id
}
```

## 5. Limpiar datos de prueba

Eliminar todos los registros seed de las tablas usando el insert tool (DELETE):
- `eventos_legajo` (primero, por FK)
- `documentos_legajo` (por FK)
- `empleados`
- `sucursales`
- `empresas`

Las tablas quedan vacías, listas para carga real.

---

## Detalle técnico

- **Validación**: zod schema con campos requeridos (nombre, apellido, legajo, DNI, CUIL, puesto, empresa, sucursal, fecha_ingreso)
- **UI**: Dialog de shadcn/ui, campos con Label + Input/Select, grid de 2 columnas en desktop
- **Mutations**: useMutation de TanStack Query para insert/update con toast de feedback
- **No requiere migración**: el schema actual ya soporta insert y update en `empleados`

