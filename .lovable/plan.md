

# Plan: Legajo reforzado, Autogestión, PWA de Asistencia, Formulario de Permisos y Empresas ampliadas

## Resumen

Seis bloques de trabajo:
1. Reforzar legajo: agregar sección de estudios/formación al empleado
2. Módulo de Autogestión para empleados (portal self-service)
3. Asistencia como PWA instalable
4. Formulario de Solicitud de Permisos (basado en el PDF adjunto) con generación PDF y firma
5. Ampliar datos de empresa y gestión de sucursales
6. Notificaciones de solicitudes de permisos

---

## 1. Reforzar Legajo del Trabajador

### Migración
- Nueva tabla `estudios_empleado`: id, empleado_id (FK), titulo, institucion, nivel (enum: primario/secundario/terciario/universitario/posgrado), estado (enum: completo/en_curso/incompleto), fecha_inicio, fecha_fin, created_at
- RLS CRUD para authenticated

### UI en LegajoDetail
- Nuevo tab "Estudios" junto a Familia/Médico
- Tabla listando estudios con botón agregar/editar/eliminar
- Dialog `EstudioFormDialog.tsx`

### Documentos: ya soporta categorías (documento_personal, permiso, médico, contrato, otro). Agregar categoría "certificado" para certificados de estudio, cursos, etc.

---

## 2. Módulo de Autogestión

### Migración
- Nueva tabla `solicitudes_permiso`: id, empleado_id (FK), fecha_solicitud (default now), motivo (text), motivo_detalle (text nullable), fecha_desde (date), fecha_hasta (date), hora_reintegro (text nullable), sujeto_descuento (bool), estado (enum: pendiente/aprobada/rechazada), aprobado_por (uuid nullable), observaciones (text nullable), created_at
- RLS: authenticated puede SELECT/INSERT; UPDATE solo para admin (o todos authenticated por ahora)

### Página `/autogestion`
- Reemplazar PlaceholderModule
- Tabs: **Mis Datos**, **Solicitudes de Permiso**, **Mis Documentos**

#### Tab "Mis Datos"
- Vista read-only de datos personales del empleado logueado (busca por email del auth user)
- Botón para solicitar actualización de datos (crea un evento o notificación)

#### Tab "Solicitudes de Permiso"
- Listado de solicitudes del empleado
- Botón "Nueva Solicitud" abre formulario basado en el PDF adjunto:
  - Motivo (radio/select): Lic. Paternidad, Lic. Estudio, Mudanza, Trámites Personales, Lic. Fallecimiento (+ campo pariente), Lic. Sin goce, Otros (+ campo detalle)
  - Fecha desde, fecha hasta, hora reintegro
  - Sujeto a descuento (sí/no)
- Botón "Descargar PDF" genera el formulario completado para firma
- Estado badge: pendiente/aprobada/rechazada

#### Tab "Mis Documentos"
- Lista documentos del empleado (read-only)

### Lógica de matching
- Al cargar autogestión, buscar en `empleados` el registro cuyo `email` coincida con el email del usuario autenticado
- Si no hay match, mostrar mensaje "Tu email no está asociado a un legajo"

---

## 3. Formulario de Solicitud de Permisos (PDF)

- Componente `SolicitudPermisoPDF.tsx` que genera con jsPDF un PDF replicando el formulario adjunto
- Datos pre-llenados: nombre del empleado, área de trabajo, fechas, motivo
- Espacios para firma del empleado, responsable directo y RRHH
- Descargable desde autogestión y desde el legajo (sección permisos)

---

## 4. Asistencia como PWA

- Instalar `vite-plugin-pwa`
- Configurar en `vite.config.ts` con manifest, iconos y service worker
- Meta tags mobile en `index.html`
- Agregar ruta `/install` con instrucciones de instalación
- `navigateFallbackDenylist: [/^\/~oauth/]`
- La app completa se vuelve instalable (beneficia especialmente al módulo de asistencia para fichada desde el celular)

---

## 5. Ampliar Empresas

### Migración — Nuevas columnas en `empresas`:
- razon_social, domicilio_fiscal, localidad, provincia, cp, telefono, email, actividad_principal, fecha_inicio_actividades, convenio_colectivo (todos text nullable)

### UI
- Ampliar `EmpresaFormDialog` con más campos organizados en secciones
- Mostrar datos completos en la card de empresa
- Sucursales: ya funciona el CRUD, sin cambios

---

## 6. Gestión de permisos desde el admin (LegajoDetail)

- En LegajoDetail, nuevo tab "Permisos" que lista las solicitudes del empleado
- Botones para aprobar/rechazar solicitudes pendientes
- Al aprobar/rechazar se actualiza el estado y se registra quién aprobó

---

## Detalle técnico

- **Migración**: Una sola migración con tablas `estudios_empleado`, `solicitudes_permiso`, columnas nuevas en `empresas`
- **PWA**: vite-plugin-pwa con workbox, manifest.json, iconos 192/512px
- **PDF**: jsPDF (ya instalado) para generar solicitud de permisos
- **Hooks nuevos**: `useEstudios(empleadoId)`, `useSolicitudesPermiso(empleadoId)`, `useMiEmpleado()`
- **Archivos nuevos**: ~6 componentes/páginas, 1 hook file
- **Archivos editados**: vite.config.ts, index.html, LegajoDetail.tsx, Empresas.tsx, App.tsx

