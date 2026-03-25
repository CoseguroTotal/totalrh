

# Plan: Roles de usuario, configuración admin, memorándums, membrete, carga Excel de asistencia y notificaciones

## Resumen

8 bloques de trabajo que agregan sistema de roles, módulo de configuración, memorándums con firma digital, PDFs membretados, logo de empresa, y carga masiva de horarios en asistencia.

---

## 1. Sistema de roles de usuario

### Migración
- Crear enum `app_role` (admin, usuario)
- Crear tabla `user_roles` (id, user_id FK auth.users, role app_role, unique user_id+role)
- RLS con security definer function `has_role(user_id, role)`
- Insertar rol admin para mcponce.torres@gmail.com

### Lógica
- Hook `useUserRole()` que consulta `user_roles` para el usuario autenticado
- Componente `AdminRoute` que verifica rol admin antes de renderizar

---

## 2. Módulo de Configuración (solo admin)

### Página `/configuracion`
- Visible solo en sidebar para admins
- Tabs: **Usuarios**, **General**
- **Usuarios**: listado de usuarios auth con asignación de rol, crear nuevos usuarios (invitación por email via supabase.auth.admin o signup link)
- **General**: configuraciones del grupo empresario (nombre, logo, datos fiscales para membrete)

### Migración
- Tabla `configuracion_grupo` (id, nombre_grupo, logo_url, domicilio, cuit, telefono, email, updated_at) — registro único

---

## 3. Logo y datos de empresa para informes

### Migración
- Agregar columna `logo_url` a tabla `empresas`

### Storage
- Crear bucket `logos-empresas` (público) para logos

### UI en Empresas
- Agregar campo de upload de logo en `EmpresaFormDialog`
- Mostrar logo en la card de empresa

---

## 4. Memorándums

### Migración
- Nueva tabla `memorandums`: id, numero (serial autoincremental), empresa_id (FK), titulo, contenido (text), destinatario_empleado_id (FK nullable), destinatario_nombre (text), fecha, estado (enum: borrador/enviado/recibido/firmado), firmado_por (uuid nullable), fecha_firma (timestamp nullable), created_by (uuid), created_at
- Secuencia para numeración automática

### UI
- Nueva página `/memorandums` o sección dentro de Empresas
- CRUD de memorándums con editor de contenido
- Generación de PDF membretado (logo empresa o grupo + datos fiscales)
- Botón "Enviar por email" (invoca edge function para envío)
- Registro de recepción y firma digital (el empleado desde autogestión puede marcar como recibido/firmado)
- Archivo numerado con búsqueda y filtros

### Autogestión
- Nueva tab "Memorándums" donde el empleado ve los que le fueron enviados
- Botón "Acusar recibo" y "Firmar digitalmente" (actualiza estado)

---

## 5. PDFs membretados

### Componente `MembretePDF.ts`
- Función reutilizable que agrega header con logo (grupo o empresa), razón social, CUIT, domicilio, teléfono
- Footer con datos legales
- Usado por: recibos de sueldo, memorándums, solicitud de permisos, cualquier documento futuro
- Parámetro para elegir membrete de grupo empresario o empresa específica

---

## 6. Notificaciones al aprobar/rechazar permisos

### Enfoque: notificaciones in-app (sin email externo)
- Nueva tabla `notificaciones`: id, user_id (uuid, del auth user), titulo, mensaje, leida (bool default false), link (text nullable), created_at
- RLS: cada usuario solo ve sus propias notificaciones
- Hook `useNotificaciones()` con query + realtime subscription
- Componente `NotificacionesBell` en el header/layout con badge de no leídas
- Al aprobar/rechazar solicitud de permiso, insertar notificación para el empleado (buscar user por email del empleado)

---

## 7. Carga Excel de horarios en Asistencia

### UI en Asistencia
- Nuevo tab "Planillas" o botón en tab Turnos
- Upload de archivo Excel (.xlsx) con columnas: legajo, lunes_entrada, lunes_salida, martes_entrada... (o formato flexible)
- Parseo client-side con `xlsx` (SheetJS) library
- Preview de datos antes de confirmar
- Al confirmar: insertar/actualizar asignaciones de turno por empleado

### Migración
- Nueva tabla `asignaciones_turno`: id, empleado_id (FK), dia_semana (int 0-6), hora_entrada (time), hora_salida (time), vigente_desde (date), created_at
- Lógica de comparación: al registrar fichada, comparar hora real vs hora asignada para computar tardanzas y horas extra

### Cómputo de tardanzas y horas extra
- Función client-side o DB function que compara fichadas vs asignaciones_turno
- Columnas calculadas en la vista de fichadas: minutos_tarde, horas_extra

---

## 8. Ruta y navegación

- Agregar `/configuracion` y `/memorandums` a App.tsx
- Sidebar: mostrar "Configuración" solo si el usuario es admin
- Sidebar: agregar "Memorándums"

---

## Detalle técnico

- **Migraciones**: 2 migraciones — (1) roles + configuración + logo + memorándums + notificaciones + asignaciones_turno, (2) datos seed del admin
- **Archivos nuevos**: ~8 (página Configuración, página Memorándums, MembretePDF, NotificacionesBell, hooks useUserRole/useNotificaciones/useMemorandums, AdminRoute)
- **Archivos editados**: AppSidebar (roles + nuevos links), AppLayout (bell notificaciones), App.tsx (rutas), Empresas.tsx (logo upload), Asistencia.tsx (tab planillas + cómputo), LegajoDetail.tsx (notificación en aprobación), Autogestion.tsx (tab memorándums), ReciboPDF/SolicitudPermisoPDF (membrete)
- **Dependencias**: `xlsx` (SheetJS) para parseo de Excel
- **No se modifica** client.ts ni types.ts

