

# Plan: Emails automáticos, permisos por rol, y sistema de sanciones

## 4 funcionalidades principales

### 1. Emails automáticos al aprobar/rechazar permisos y vacaciones (con toggle en Configuración)

**Migración SQL:**
- Agregar columna `notificaciones_email_activas boolean DEFAULT false` a `configuracion_grupo`

**Lógica:**
- En `LegajoDetail.tsx` (aprobación de permisos) y `Vacaciones.tsx` (aprobación de vacaciones), después de cambiar el estado, si la config tiene `notificaciones_email_activas = true` y el empleado tiene email, invocar la Edge Function `send-email` existente con un HTML formateado informando la aprobación/rechazo.
- Crear hook `useConfigGrupo()` reutilizable (o reusar el existente) para leer la config.

**Configuración:**
- En `Configuracion.tsx`, agregar un Switch "Enviar notificaciones por email al aprobar/rechazar permisos y vacaciones" que actualiza `notificaciones_email_activas`.

### 2. Rol Contador: solo liquidación completa + visualización de legajos/vacaciones/asistencia

**Cambios en `AppSidebar.tsx`:**
- Crear array `contadorModules` con acceso a: Dashboard, Legajos (read-only), Liquidación, Asistencia (read-only), Vacaciones (read-only).
- Mostrar módulos según `role === "contador"`.

**Cambios en componentes de edición:**
- En `LegajoDetail.tsx`: ocultar botones de editar/eliminar/agregar cuando `role === "contador"`.
- En `Vacaciones.tsx`: ocultar botones aprobar/rechazar para contadores.
- En `Asistencia.tsx`: ocultar botones de edición para contadores.
- Crear hook `useCanEdit(modulo)` que centraliza la lógica de permisos de escritura.

### 3. Sistema de Sanciones (admin, gerente, rrhh pueden emitir)

**Migración SQL:**
```sql
CREATE TABLE sanciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id uuid NOT NULL,
  tipo text NOT NULL, -- 'apercibimiento', 'suspension', 'amonestacion'
  motivo text NOT NULL,
  descripcion text,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  emitido_por uuid,
  descargo_texto text,
  descargo_documento_url text,
  descargo_fecha timestamptz,
  descargo_cerrado boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE sanciones ENABLE ROW LEVEL SECURITY;
-- Políticas RLS para authenticated
```

**Nuevo componente `SancionFormDialog.tsx`:**
- Dialog para emitir sanción: tipo (apercibimiento/suspensión/amonestación), motivo, descripción, fecha.
- Solo visible para roles admin, gerente, rrhh.

**Integración en `LegajoDetail.tsx`:**
- Nueva tab "Sanciones" o sección dentro del historial.
- Botón "Emitir Sanción" visible solo para admin/gerente/rrhh.
- Al emitir, se registra automáticamente como evento de tipo "sancion" en `eventos_legajo`.
- Lista de sanciones con estado de descargo.

### 4. Visualización y descargo del empleado (Autogestión)

**En `Autogestion.tsx`:**
- Nueva tab "Sanciones" que lista las sanciones del empleado.
- Cada sanción muestra: tipo, motivo, fecha, estado del descargo.
- Si `descargo_cerrado = false` y no hay descargo previo: botón "Presentar Descargo" con textarea + upload de documento (una sola vez).
- Una vez enviado el descargo, `descargo_cerrado = true` y queda fijo, sin posibilidad de edición.

## Archivos nuevos/modificados

| Archivo | Cambio |
|---------|--------|
| Migración SQL | `notificaciones_email_activas` + tabla `sanciones` |
| `src/pages/Configuracion.tsx` | Switch para activar/desactivar emails |
| `src/pages/LegajoDetail.tsx` | Email al aprobar permisos + tab sanciones + restricción contador |
| `src/pages/Vacaciones.tsx` | Email al aprobar vacaciones + restricción contador |
| `src/pages/Asistencia.tsx` | Restricción edición para contador |
| `src/components/AppSidebar.tsx` | Módulos según rol contador |
| `src/components/SancionFormDialog.tsx` | Nuevo dialog para emitir sanciones |
| `src/hooks/useSanciones.ts` | Nuevo hook CRUD sanciones |
| `src/hooks/useCanEdit.ts` | Nuevo hook permisos de escritura por rol |
| `src/pages/Autogestion.tsx` | Tab sanciones con descargo |

