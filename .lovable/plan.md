

# Plan: Roles expandidos, creación de usuarios admin-only, y liquidación avanzada estilo CCT Comercio

## Resumen

Tres bloques: (1) expandir el sistema de roles con Contador/Gerente/RRHH, restringir creación de usuarios solo a admin, (2) rediseñar el módulo de liquidación basado en el modelo de referencia CCT 130/75 con agrupación de conceptos, bases de cálculo y estructura de recibo profesional.

---

## 1. Roles expandidos y gestión de usuarios

### Migración
- Alterar enum `app_role`: agregar valores `contador`, `gerente`, `rrhh` (además de los existentes `admin`, `usuario`)
- No se modifica la tabla `user_roles` ni la función `has_role`

### Restricción de registro
- **Eliminar** el modo signup del `Login.tsx` (quitar botón "Registrate" y lógica de signup)
- Solo queda login. Los usuarios se crean desde Configuración por un admin

### Creación de usuarios desde Configuración
- Crear edge function `create-user` que usa el service role key para invocar `supabase.auth.admin.createUser({ email, password, email_confirm: true })`
- En `Configuracion.tsx` tab Usuarios: agregar formulario "Crear Usuario" con campos email, contraseña, rol
- Al crear: invocar edge function, luego insertar en `user_roles` el rol seleccionado
- Mostrar lista de usuarios con su rol y email (query a `user_roles` + lookup)

### Hook `useUserRole`
- Ampliar para soportar los nuevos roles
- Agregar helper `useHasRole(role)` para verificar permisos granulares
- Sidebar: Configuración visible para admin; otros módulos se pueden restringir por rol si se desea en el futuro

---

## 2. Liquidación avanzada — Modelo CCT Comercio

### Rediseño del modelo de conceptos

Basado en la imagen de referencia, la liquidación se organiza en **grupos de conceptos**:

#### Migración — Nuevas columnas en `conceptos_liquidacion`:
- `grupo` (text): "Sumas remunerativas", "No remunerativo FIJO Diciembre 2025", "Otros conceptos", etc.
- `base_calculo` (text): "basico", "remunerativo_total", "monto_concepto" (para conceptos que calculan sobre otro concepto), "fijo"
- `concepto_base_id` (uuid FK nullable): referencia a otro concepto cuando calcula sobre su monto
- `unidad` (text): "dias", "porcentaje", "unidades" — para mostrar la columna "Unidad" del recibo
- `cantidad_default` (numeric): valor por defecto de la columna "Unidad" (ej: 30 días)
- `orden` (integer): para controlar el orden de aparición en el recibo

#### Nuevas columnas en `liquidacion_lineas`:
- `base` (numeric): monto base sobre el que se calculó
- `cantidad` ya existe
- `es_haber` (boolean): true = columna Haberes, false = columna Descuentos

### Rediseño del Simulador de Recibo

El simulador actual es simple. Rediseñar para reflejar el modelo de referencia:

1. **Selección de empleado** con auto-carga de categoría, CCT, antigüedad
2. **Sueldo básico** auto-calculable o manual
3. **Tabla de liquidación** con columnas: Concepto, Base, Unidad, Haberes, Descuentos
4. **Agrupación** por grupo de conceptos (colapsables como en la imagen)
5. **Motor de cálculo**:
   - Conceptos que calculan sobre el básico (ej: Adicional por asistencia 8.33%)
   - Conceptos que calculan sobre el total remunerativo (ej: Jubilación 11%, Obra Social 3%)
   - Conceptos con monto fijo por unidad (ej: $2.000 x 30 = $60.000)
   - Conceptos que calculan sobre otro concepto específico (ej: Presentismo sobre un NR)
6. **Totales**: Subtotal por grupo, Total Haberes, Total Descuentos, Sueldo Neto
7. **Checkboxes** para opciones: Calcular SAC, Adicional por asistencia, Aporte solidario, Cuota sindical

### Rediseño del PDF de Recibo

Actualizar `ReciboPDF.tsx` para generar un recibo con formato profesional:
- Membrete de empresa (usando `MembretePDF.ts`)
- Tabla con columnas: Concepto | Base | Unidad | Haberes | Descuentos
- Filas agrupadas por sección con subtotales
- Fila final: Totales y Sueldo Neto
- Firmas al pie

### ConceptoFormDialog
- Agregar campos: grupo, base_calculo, concepto_base_id, unidad, cantidad_default, orden
- Selector de base de cálculo con opciones: Básico, Total Remunerativo, Otro concepto, Fijo

---

## 3. Archivos a crear/editar

### Nuevos:
- `supabase/functions/create-user/index.ts` — edge function para crear usuarios
- Migración SQL

### Editados:
- `src/pages/Login.tsx` — quitar signup
- `src/pages/Configuracion.tsx` — formulario de creación de usuarios con rol
- `src/pages/Liquidacion.tsx` — rediseño completo con tabla agrupada
- `src/components/SimuladorRecibo.tsx` — motor de cálculo avanzado con grupos y bases
- `src/components/ConceptoFormDialog.tsx` — nuevos campos
- `src/components/ReciboPDF.tsx` — formato profesional con columnas Base/Unidad/Haberes/Descuentos
- `src/hooks/useLiquidacion.ts` — adaptar queries a nuevos campos
- `src/hooks/useUserRole.ts` — soportar nuevos roles
- `src/components/AppSidebar.tsx` — permisos por rol si aplica

