

# Plan: Verificación sueldo, exportación vacaciones, notificaciones, y permisos gerente/RRHH

## Resumen

5 bloques: (1) verificar auto-carga de sueldo básico en simulador, (2) exportar calendario vacaciones a PDF/Excel, (3) notificaciones automáticas al aprobar/rechazar vacaciones, (4) rol gerente accede a todo excepto Configuración, (5) rol RRHH accede a todo excepto Configuración.

---

## 1. Verificación sueldo básico

El campo `sueldo_basico` ya existe en `EmpleadoFormDialog.tsx` (línea 49) y `SimuladorRecibo.tsx` ya tiene `handleEmpleadoChange` que auto-carga el sueldo. Solo se necesita verificar visualmente que funciona. No hay cambios de código necesarios aquí — el flujo ya está implementado.

---

## 2. Exportación calendario vacaciones a PDF/Excel

### En `Vacaciones.tsx` — CalendarioTab
- Agregar botón "Exportar PDF" que genera un PDF con reportlab-style usando jsPDF:
  - Membrete de empresa (reutilizar `MembretePDF.ts`)
  - Tabla con columnas: Empleado, Desde, Hasta, Días, Estado
  - Filtrado por mes seleccionado
- Agregar botón "Exportar Excel" usando `xlsx` (SheetJS):
  - Mismo contenido en formato .xlsx

### Archivos editados
- `src/pages/Vacaciones.tsx` — agregar botones de exportación y lógica

---

## 3. Notificaciones automáticas al aprobar/rechazar vacaciones

### Lógica
- En `useUpdateSolicitudVacaciones` (hook `useVacaciones.ts`): después de actualizar el estado, buscar el `empleado_id` de la solicitud, luego buscar si ese empleado tiene un `user_id` vinculado (vía email match en auth o tabla de vinculación)
- Alternativa más simple: insertar una notificación en la tabla `notificaciones` dirigida al usuario que creó la solicitud

### Implementación
- En `Vacaciones.tsx` — `SolicitudesTab`, al aprobar/rechazar:
  1. Obtener el empleado de la solicitud
  2. Buscar el `user_id` del empleado (matching por email en `user_roles` o directamente si hay vínculo)
  3. Insertar en `notificaciones`: título "Solicitud de vacaciones [aprobada/rechazada]", mensaje con fechas, link a `/autogestion`

- Como no hay vínculo directo empleado→user_id, la notificación se insertará buscando el user por email del empleado. Si no hay match, no se envía notificación.

### Archivos editados
- `src/pages/Vacaciones.tsx` — agregar inserción de notificación en `handleEstado`
- `src/hooks/useVacaciones.ts` — opcionalmente mover la lógica de notificación aquí

---

## 4 y 5. Roles gerente y RRHH — acceso a todo excepto Configuración

### Lógica actual
- `EmployeeGuard` redirige solo a empleados con rol `empleado`
- `AppSidebar` muestra Configuración solo para admin
- `App.tsx` tiene `/configuracion` dentro del `EmployeeGuard` (accesible para todos los no-empleados)

### Cambios necesarios
- En `App.tsx`: envolver `/configuracion` con `AdminRoute` para que solo admin acceda
- En `AppSidebar.tsx`: ya está correcto (Configuración solo visible para admin)
- `EmployeeGuard` ya funciona correctamente: redirige solo a empleados, gerente y RRHH pasan como no-empleados y acceden a todos los módulos

### Archivos editados
- `src/App.tsx` — envolver ruta `/configuracion` con `AdminRoute`

---

## Archivos a editar

| Archivo | Cambio |
|---------|--------|
| `src/App.tsx` | Proteger `/configuracion` con `AdminRoute` |
| `src/pages/Vacaciones.tsx` | Exportación PDF/Excel + notificaciones en aprobación |
| `src/hooks/useVacaciones.ts` | Posible refactor de notificación |

