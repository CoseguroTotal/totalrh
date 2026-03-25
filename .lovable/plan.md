

# Plan: Baja de empleados, reset de contraseña, Dashboard con KPIs reales y Módulo de Liquidación

## 1. Baja (eliminación) de empleados

### Migración
- Agregar política RLS DELETE en `empleados` para authenticated users

### UI
- **Legajos.tsx**: Agregar botón de eliminar (icono Trash2) en cada fila de la tabla, con diálogo de confirmación (AlertDialog)
- **LegajoDetail.tsx**: Agregar botón "Dar de Baja" en el header del perfil, con confirmación. Al eliminar, redirige a `/legajos`
- Cascade: los registros relacionados (eventos, documentos, familiares, datos_medicos) se eliminan vía FK CASCADE o manualmente antes del DELETE

### Lógica
- useMutation con DELETE en tabla `empleados`, invalidar queries, toast de confirmación

---

## 2. Reset de contraseña del usuario admin

- Usar la API de Supabase Admin para resetear la contraseña de `mcponce.torres@gmail.com` via edge function o directamente actualizar el password
- Se ejecutará un update de contraseña usando el service role key mediante una migración o invocación directa

---

## 3. Dashboard con KPIs reales

### Reescribir `Dashboard.tsx` para usar datos de la base de datos:

- **Hook `useDashboardStats`**: queries a Supabase para obtener:
  - Conteo de empleados activos por empresa (GROUP BY empresa_id, estado)
  - Distribución por estado (Activo/Licencia/Baja)
  - Distribución por antigüedad (rangos: <1 año, 1-3, 3-5, 5-10, 10+)
  - Tasa de rotación: contar empleados con estado "Baja" vs total

- **KPI Cards**: Dotación total (activos), empleados en licencia, bajas del período, promedio de antigüedad
- **Gráficos**:
  - Bar chart: dotación por empresa (datos reales)
  - Pie chart: distribución por estado
  - Bar chart: distribución por antigüedad
  - Alertas: documentos próximos a vencer (fecha_vencimiento < hoy + 30 días)

---

## 4. Módulo de Liquidación de Haberes

### Migración — Nuevas tablas:

```text
conceptos_liquidacion
├── id (uuid, PK)
├── codigo (text, unique)
├── nombre (text)
├── tipo (enum: remunerativo, no_remunerativo, deduccion)
├── porcentaje (numeric, nullable) — si es % sobre básico
├── monto_fijo (numeric, nullable) — si es monto fijo
├── aplica_a (text: todos / categoria / convenio)
├── activo (bool, default true)
├── created_at

liquidaciones
├── id (uuid, PK)
├── empleado_id (FK)
├── periodo (text, e.g. "2026-03")
├── sueldo_basico (numeric)
├── total_remunerativo (numeric)
├── total_no_remunerativo (numeric)
├── total_deducciones (numeric)
├── neto (numeric)
├── estado (enum: borrador, confirmada)
├── created_at

liquidacion_lineas
├── id (uuid, PK)
├── liquidacion_id (FK)
├── concepto_id (FK)
├── descripcion (text)
├── cantidad (numeric, default 1)
├── monto (numeric)
├── tipo (remunerativo/no_remunerativo/deduccion)
```

RLS: CRUD para authenticated en las 3 tablas.

### Página `/liquidacion` — Reemplazar PlaceholderModule:

**Sub-secciones con Tabs:**

1. **Configurador de Conceptos**: CRUD table para `conceptos_liquidacion`
   - Tabla listando conceptos con código, nombre, tipo, porcentaje/monto, estado
   - Dialog para crear/editar concepto
   - Toggle para activar/desactivar

2. **Simulador de Recibo**: 
   - Selector de empleado + período
   - Al seleccionar, se calcula en tiempo real:
     - Sueldo básico (input manual o del empleado)
     - Aplica todos los conceptos activos según tipo
     - Remunerativos suman, deducciones restan
     - Muestra preview tipo recibo de sueldo con columnas Haberes/Deducciones
   - Botón "Guardar Liquidación" (inserta en liquidaciones + liquidacion_lineas)

3. **Liquidaciones Guardadas**: 
   - Listado de liquidaciones previas con filtro por período y empleado
   - Click para ver detalle del recibo

### Hooks:
- `useConceptos()`, `useLiquidaciones(periodo)`, `useLiquidacionDetalle(id)`

### Componentes nuevos:
- `src/pages/Liquidacion.tsx` — página principal con tabs
- `src/components/ConceptoFormDialog.tsx` — CRUD de conceptos
- `src/components/SimuladorRecibo.tsx` — simulador en tiempo real

---

## Detalle técnico

- **Migración**: Una sola migración SQL con DELETE policy en empleados, tablas de liquidación y enums
- **Password reset**: Edge function o script con service role para actualizar contraseña del admin
- **Dashboard**: Queries con `.select()` y procesamiento client-side para KPIs
- **Liquidación**: Cálculo client-side con los conceptos activos, persistencia al guardar
- **Archivos nuevos**: ~5 componentes, 1 página, 1 hook file, 1 migración
- **Archivos editados**: Dashboard.tsx (rewrite), LegajoDetail.tsx, Legajos.tsx, App.tsx

