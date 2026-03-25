

# Plan: Sueldo en legajo, vinculación con asistencia, y gestión de vacaciones

## Resumen

Tres bloques: (1) agregar campo de sueldo básico al empleado para usarlo en liquidación y legajo, (2) vincular empleado con asistencia mostrando resumen en el legajo, (3) módulo completo de vacaciones con calendario por empresa y solicitud desde autogestión.

---

## 1. Sueldo básico en el legajo del empleado

### Migración
- Agregar columna `sueldo_basico` (numeric, nullable, default null) a tabla `empleados`

### UI
- En `EmpleadoFormDialog.tsx`: agregar campo "Sueldo básico" en la sección laboral (input numérico)
- En `LegajoDetail.tsx`: mostrar el sueldo en la ficha del empleado (sección datos laborales)
- En `SimuladorRecibo.tsx`: al seleccionar empleado, auto-cargar su `sueldo_basico` si tiene valor
- En liquidación masiva: usar `sueldo_basico` del empleado en vez de pedir uno global

### Hook
- Actualizar tipo `EmpleadoConEmpresa` en `useEmpleados.ts` para incluir `sueldo_basico`

---

## 2. Vinculación legajo con asistencia

### UI en LegajoDetail
- Nuevo tab "Asistencia" en el detalle del legajo
- Muestra: fichadas del mes actual del empleado (query a `fichadas` filtrado por `empleado_id`)
- Resumen: días presentes, ausencias, tardanzas, horas extra (calculado comparando fichadas vs `asignaciones_turno`)
- Tabla con últimas fichadas (fecha, entrada, salida, estado, observaciones)

### Hook
- Función `useFichadasEmpleado(empleadoId, mes)` en `useAsistencia.ts` para obtener fichadas filtradas por empleado y período

---

## 3. Gestión de vacaciones

### Migración
- Nueva tabla `vacaciones_config`: id, empresa_id (FK), anios_antiguedad_min (int), anios_antiguedad_max (int), dias_correspondientes (int), created_at — para configurar los días de vacaciones según antigüedad por empresa
- Nueva tabla `solicitudes_vacaciones`: id, empleado_id (FK), fecha_desde (date), fecha_hasta (date), dias_solicitados (int), dias_correspondientes (int), periodo_anual (text, ej "2026"), estado (enum: pendiente/aprobada/rechazada/cancelada), aprobado_por (uuid nullable), observaciones (text nullable), created_at
- RLS CRUD para authenticated en ambas tablas

### Configuración de vacaciones por empresa
- En la página de Empresas o en una sección dedicada: CRUD de rangos de antigüedad → días correspondientes
- Ejemplo: 0-5 años = 14 días, 5-10 = 21, 10-20 = 28, 20+ = 35 (estándar LCT Argentina)

### Calendario de vacaciones
- Nueva página `/vacaciones` o tab en Asistencia
- Calendario mensual/anual que muestra las vacaciones aprobadas de todos los empleados de la empresa seleccionada
- Vista de lista con filtros por empresa, estado, período
- Indicadores de solapamiento (alerta si muchos empleados de la misma área coinciden)

### Solicitud desde Autogestión
- Nuevo tab "Vacaciones" en `/autogestion`
- Muestra: días correspondientes (calculados por antigüedad del empleado), días usados, saldo disponible
- Formulario para solicitar vacaciones: fecha desde, fecha hasta (auto-calcula días hábiles), período anual
- Validación: no puede exceder saldo disponible
- Historial de solicitudes con estado

### Aprobación desde admin
- En LegajoDetail: nuevo sub-tab o sección en "Permisos" para ver solicitudes de vacaciones
- Botones aprobar/rechazar con notificación al empleado
- En la página de vacaciones: vista centralizada de todas las solicitudes pendientes

---

## Detalle técnico

### Migración (1 sola)
- `ALTER TABLE empleados ADD COLUMN sueldo_basico numeric;`
- `CREATE TABLE vacaciones_config (...)`
- `CREATE TABLE solicitudes_vacaciones (...)`
- Seed de rangos LCT por defecto (insertados via migration como datos iniciales universales)

### Archivos nuevos
- `src/pages/Vacaciones.tsx` — calendario y gestión centralizada
- `src/hooks/useVacaciones.ts` — queries para config, solicitudes, cálculo de días

### Archivos editados
- `src/hooks/useEmpleados.ts` — agregar `sueldo_basico` al tipo
- `src/components/EmpleadoFormDialog.tsx` — campo sueldo
- `src/pages/LegajoDetail.tsx` — mostrar sueldo + tab asistencia + sección vacaciones
- `src/components/SimuladorRecibo.tsx` — auto-cargar sueldo del empleado
- `src/pages/Liquidacion.tsx` — usar sueldo del empleado en masiva
- `src/pages/Autogestion.tsx` — nuevo tab Vacaciones con solicitud y saldo
- `src/hooks/useAsistencia.ts` — hook fichadasEmpleado
- `src/components/AppSidebar.tsx` — link a Vacaciones
- `src/App.tsx` — ruta `/vacaciones`

