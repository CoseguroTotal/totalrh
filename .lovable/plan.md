

# Plan: Rol empleado, conceptos CCT seed, liquidación masiva, logo por empresa, reclutamiento y reportes BI

## Resumen

6 bloques: (1) rol "empleado" con acceso restringido a autogestión, (2) seed de conceptos CCT 130/75, (3) liquidación masiva por empresa, (4) logo por empresa en PDFs, (5) módulo de reclutamiento, (6) módulo de reportes BI.

---

## 1. Rol "empleado" con acceso restringido

### Migración
- `ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'empleado';`

### Lógica de acceso
- Actualizar `ROLES` en `Configuracion.tsx` para incluir "Empleado"
- Crear componente `EmployeeRoute` (o modificar `AppLayout`) que detecta si el rol es `empleado` y solo permite acceso a `/autogestion`
- En `AppSidebar.tsx`: si rol es `empleado`, mostrar solo el link a Autogestión y Cerrar Sesión
- En `App.tsx`: envolver las rutas admin/rrhh con un guard que redirige empleados a `/autogestion`

---

## 2. Conceptos CCT 130/75 pre-cargados (seed)

Usar la herramienta de inserción de datos (no migración) para insertar en `conceptos_liquidacion`:

| Código | Nombre | Tipo | Grupo | Base | % | Orden |
|--------|--------|------|-------|------|---|-------|
| 100 | Sueldo Básico | remunerativo | Haberes | basico | — | 1 |
| 110 | Presentismo | remunerativo | Haberes | basico | 8.33 | 2 |
| 200 | Jubilación | deduccion | Aportes del Trabajador | remunerativo_total | 11 | 10 |
| 210 | Obra Social | deduccion | Aportes del Trabajador | remunerativo_total | 3 | 11 |
| 220 | Ley 19.032 (PAMI) | deduccion | Aportes del Trabajador | remunerativo_total | 3 | 12 |
| 230 | Cuota Sindical | deduccion | Aportes del Trabajador | remunerativo_total | 2 | 13 |

---

## 3. Liquidación masiva por empresa

### UI en `Liquidacion.tsx`
- Nuevo tab "Masiva" o botón en tab Simulador
- Seleccionar empresa + período + sueldo básico (o tomar de cada empleado si existe)
- Botón "Generar para todos los activos"
- Progress bar mientras se procesan
- Al confirmar: insertar una liquidación por cada empleado activo de la empresa, aplicando todos los conceptos activos
- Opción de descarga masiva de PDFs (zip o secuencial)

### Lógica
- Reutilizar el motor de cálculo del SimuladorRecibo como función extractable
- Iterar sobre empleados activos filtrando por empresa_id

---

## 4. Logo por empresa en PDFs

- La columna `logo_url` ya existe en `empresas`
- El upload de logo ya funciona en `Empresas.tsx`
- Integrar `MembretePDF.ts` (ya existente) en `ReciboPDF.tsx`, `SolicitudPermisoPDF.tsx` y `MemorandumPDF.ts`
- Al generar un PDF, buscar la empresa del empleado y pasar sus datos (nombre, CUIT, logo_url, domicilio) al membrete
- Fallback a datos del grupo empresario (`configuracion_grupo`) si la empresa no tiene logo

---

## 5. Módulo de Reclutamiento

### Migración
- Tabla `vacantes`: id, empresa_id (FK), titulo, descripcion, requisitos (text), estado (enum: abierta/cerrada/pausada), fecha_publicacion, created_by, created_at
- Tabla `candidatos`: id, vacante_id (FK), nombre, email, telefono, cv_url (text), estado (enum: postulado/entrevista/evaluacion/oferta/contratado/descartado), notas, created_at
- RLS CRUD para authenticated

### UI — Página `/reclutamiento`
- Tabs: **Vacantes** y **Pipeline**
- **Vacantes**: CRUD de vacantes con estado, empresa asociada
- **Pipeline**: Vista Kanban con columnas por estado del candidato (drag & drop con estados)
- Dialog para agregar candidato a una vacante con datos básicos y upload de CV

---

## 6. Módulo de Reportes BI

### Página `/reportes`
- Reutilizar y ampliar `useDashboardStats`
- Secciones:
  - **Dotación**: headcount por empresa con filtro de fecha
  - **Rotación**: tasa mensual con gráfico de línea (últimos 12 meses, calculado por fecha de baja)
  - **Distribución**: por estado, antigüedad, sexo, CCT
  - **Liquidaciones**: total liquidado por período y empresa
  - **Asistencia**: resumen de tardanzas/ausencias por período
- Botón "Exportar a Excel" usando `xlsx` (SheetJS) para descargar tabla filtrada
- Gráficos con recharts (ya disponible como dependencia de shadcn chart)

---

## Detalle técnico

- **Migración**: 1 migración con enum empleado + tablas vacantes/candidatos
- **Seed**: INSERT via herramienta de inserción para conceptos CCT
- **Archivos nuevos**: `src/pages/Reclutamiento.tsx`, `src/pages/Reportes.tsx`, `src/hooks/useReclutamiento.ts`
- **Archivos editados**: `Configuracion.tsx` (rol empleado), `AppSidebar.tsx` (restricción por rol), `App.tsx` (rutas + guards), `Liquidacion.tsx` (tab masiva), `ReciboPDF.tsx` y `MemorandumPDF.ts` (integrar membrete con logo empresa), `SimuladorRecibo.tsx` (extraer motor de cálculo)
- **Dependencias**: ninguna nueva (xlsx y recharts ya disponibles)

