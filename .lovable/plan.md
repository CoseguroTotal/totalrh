

# Plan: Ampliar Legajo Digital — Eventos, Empresas, Domicilio, Grupo Familiar y Datos Médicos

## Resumen

Agregar 5 funcionalidades al módulo de Legajo Digital:
1. CRUD de empresas y sucursales desde la UI
2. Formulario para agregar eventos al historial del legajo
3. Campos adicionales en empleados: domicilio completo
4. Nuevas tablas: grupo familiar, datos médicos
5. Categorización de documentos (permisos, documentos presentados, médicos)

---

## 1. Migración de base de datos

### Nuevas columnas en `empleados`:
- `domicilio_calle`, `domicilio_numero`, `domicilio_piso`, `domicilio_localidad`, `domicilio_provincia`, `domicilio_cp` (todos text nullable)
- `nacionalidad`, `fecha_nacimiento`, `sexo`, `estado_civil` (text/date nullable)

### Nueva tabla `grupo_familiar`:
- `id`, `empleado_id` (FK), `nombre`, `apellido`, `parentesco` (enum: conyuge/hijo/padre/otro), `dni`, `fecha_nacimiento`, `discapacidad` (bool), `a_cargo` (bool), `created_at`

### Nueva tabla `datos_medicos`:
- `id`, `empleado_id` (FK), `grupo_sanguineo`, `obra_social`, `plan_obra_social`, `nro_afiliado`, `art`, `nro_art`, `alergias`, `observaciones`, `created_at`, `updated_at`

### RLS: Todas las tablas con políticas CRUD para authenticated.

### Políticas INSERT/UPDATE en `empresas` y `sucursales` (actualmente solo SELECT).

---

## 2. CRUD de Empresas y Sucursales

- Nuevo componente `EmpresaFormDialog.tsx`: Dialog para crear/editar empresa (nombre, CUIT) y sus sucursales inline
- Nueva página `src/pages/Empresas.tsx` con listado de empresas y sus sucursales
- Ruta `/empresas` en App.tsx y enlace en sidebar
- Botones para agregar/editar empresas y sucursales

## 3. Formulario de Eventos en LegajoDetail

- Nuevo componente `EventoFormDialog.tsx`: Dialog con campos fecha, tipo (select del enum), titulo, descripcion
- Botón "Agregar evento" junto al título "Historial de Eventos" en LegajoDetail
- Insert en `eventos_legajo`, invalidar query

## 4. Datos ampliados del empleado

- Ampliar `EmpleadoFormDialog.tsx` con pestañas/secciones:
  - Datos personales (existentes + domicilio + nacionalidad, fecha nacimiento, sexo, estado civil)
  - Los campos nuevos son opcionales
- En `LegajoDetail.tsx`: mostrar sección de domicilio en el grid de detalles

## 5. Grupo Familiar en LegajoDetail

- Nueva sección/card "Grupo Familiar" en LegajoDetail
- Componente `FamiliarFormDialog.tsx` para agregar/editar familiares
- Hook `useGrupoFamiliar(empleadoId)` en useEmpleados.ts
- Tabla inline mostrando familiares con botón agregar

## 6. Datos Médicos en LegajoDetail

- Nueva sección/card "Datos Médicos" en LegajoDetail
- Formulario inline o dialog para editar datos médicos (un registro por empleado)
- Hook `useDatosMedicos(empleadoId)`

## 7. Categorización de documentos

- Agregar columna `categoria` a `documentos_legajo` (enum o text: 'documento_personal', 'permiso', 'medico', 'contrato', 'otro')
- Al subir archivo, permitir seleccionar categoría y fecha de vencimiento
- Filtro por categoría en la sección de documentos

---

## Detalle técnico

- **Migración**: Una sola migración SQL con todas las tablas nuevas, columnas y políticas RLS
- **Hooks**: Agregar `useGrupoFamiliar`, `useDatosMedicos` en useEmpleados.ts
- **EmpleadoConEmpresa type**: Ampliar con campos de domicilio
- **LegajoDetail**: Reorganizar en tabs (Datos, Familia, Médico, Documentos, Historial) para no sobrecargar la vista
- **No se modifica** `client.ts` ni `types.ts` (auto-generados)

