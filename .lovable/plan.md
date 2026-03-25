

# Auditoría de producción — TotalRH

## Inconsistencias detectadas

### 1. Seguridad — RLS demasiado permisivas
**Crítico.** La mayoría de las tablas tienen políticas RLS que permiten `true` para INSERT/UPDATE/DELETE a cualquier usuario autenticado. Esto significa que un empleado autenticado podría:
- Eliminar liquidaciones de otros empleados
- Crear fichadas falsas
- Modificar sanciones, memorándums, conceptos de liquidación
- Borrar documentos de legajo de cualquier empleado

**Tablas afectadas**: `empleados`, `fichadas`, `liquidaciones`, `liquidacion_lineas`, `memorandums`, `sanciones`, `conceptos_liquidacion`, `documentos_legajo`, `eventos_legajo`, `novedades_asistencia`, `turnos`, `vacantes`, `candidatos`, `solicitudes_permiso`, `solicitudes_vacaciones`, `vacaciones_config`, `sucursales`, `empresas`, `estudios_empleado`, `grupo_familiar`, `datos_medicos`, `asignaciones_turno`.

**Solución**: Restringir INSERT/UPDATE/DELETE a roles admin/rrhh/gerente usando `has_role()`, y permitir a empleados solo SELECT (o INSERT limitado a sus propios registros en solicitudes/permisos).

### 2. Usuarios tab muestra solo `user_id` UUID
En `Configuracion.tsx` línea 335, se muestra `r.user_id` (un UUID críptico). No se muestra el email del usuario, porque `user_roles` no almacena email y no se puede consultar `auth.users` desde el cliente.

**Solución**: Crear una vista o función `security definer` que devuelva `user_id + email` para que el admin pueda identificar a los usuarios.

### 3. PWA — Iconos genéricos
El manifest referencia `/logo_total_rh.png` para ambos tamaños (192x192 y 512x512), pero ya existen archivos dedicados `pwa-192x192.png` y `pwa-512x512.png` en `/public`. Los iconos del manifest deberían apuntar a estos.

### 4. Login — Restricción horaria usa hora del cliente
En `Login.tsx`, la hora se calcula con `new Date()` del navegador del usuario, que puede ser manipulada cambiando la zona horaria o el reloj del dispositivo. Debería usarse la hora del servidor.

### 5. Eliminación de empleado — cascade manual frágil
En `Legajos.tsx`, la eliminación ejecuta deletes en cascada manual (eventos, documentos, grupo familiar, datos médicos, liquidaciones). Si se agregan nuevas tablas relacionadas, se olvida actualizar. Las FK ya tienen `ON DELETE CASCADE` en las migraciones, por lo que el cascade manual es redundante e incompleto (no borra fichadas, sanciones, solicitudes, tokens, novedades, etc.).

### 6. `Configuracion.tsx` — Double AdminRoute wrapping
La ruta en `App.tsx` ya envuelve con `<AdminRoute>`, y el componente `Configuracion` internamente vuelve a envolver con `<AdminRoute>`. Es redundante.

### 7. Sin manejo de sesión expirada
No hay interceptor global que detecte un 401 de la API y redirija al login. Si la sesión expira, las queries fallan silenciosamente.

### 8. Falta validación de datos en formularios
Los formularios de empleados, empresas, liquidaciones no validan CUIL/CUIT (formato XX-XXXXXXXX-X), ni DNI, ni email. No hay feedback de campo obligatorio más allá del `required` nativo del browser.

---

## Funcionalidades faltantes recomendadas

| Prioridad | Funcionalidad | Descripción |
|-----------|--------------|-------------|
| **Alta** | **Auditoría / Log de acciones** | Registrar quién hizo qué y cuándo (crear/editar/eliminar empleados, aprobar permisos, generar liquidaciones). Esencial para compliance laboral argentino. |
| **Alta** | **Recibos de sueldo en Autogestión** | El empleado debería poder ver y descargar sus recibos desde el portal. Hoy solo tiene fichadas, permisos y vacaciones. |
| **Alta** | **Cambio de contraseña** | No hay forma de que un usuario cambie su contraseña. Falta un botón en el sidebar o en autogestión. |
| **Alta** | **Perfil de usuario visible** | No se muestra el nombre/email del usuario logueado en el sidebar ni en ningún lugar. |
| **Media** | **Exportación masiva de recibos** | Generar y descargar todos los recibos de un período en un ZIP o PDF consolidado. |
| **Media** | **Calendario de ausencias** | Vista calendario mensual/anual que muestre vacaciones, licencias y permisos aprobados de toda la dotación. |
| **Media** | **Alertas de vencimiento de documentos** | Notificación automática (email + in-app) cuando un documento del legajo está por vencer (carnet de salud, ART, etc.). |
| **Media** | **Gestión de licencias especiales** | Licencias por maternidad, paternidad, mudanza, examen, fallecimiento, matrimonio — con cálculo automático de días según LCT. |
| **Media** | **Horas extra y cálculo automático** | Calcular horas extras (al 50% y 100%) comparando fichadas reales vs turno asignado e incorporarlas a la liquidación. |
| **Baja** | **Organigrama visual** | Representación gráfica de la estructura jerárquica por empresa/sucursal. |
| **Baja** | **Portal de reclutamiento público** | Página pública (sin login) donde candidatos externos puedan postularse a vacantes abiertas. |
| **Baja** | **Firma digital de memorándums** | Permitir al empleado firmar digitalmente un memorándum desde su celular en autogestión. |

---

## Plan de corrección (priorizado)

### Paso 1 — Reforzar RLS (seguridad crítica)
Crear una migración que reemplace todas las políticas `true` de INSERT/UPDATE/DELETE por políticas basadas en `has_role()`:
- **SELECT**: `true` para autenticados (mantener)
- **INSERT/UPDATE/DELETE**: Solo `has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'rrhh') OR has_role(auth.uid(), 'gerente')`
- **Excepciones**: `solicitudes_permiso` y `solicitudes_vacaciones` permiten INSERT al propio empleado; `sanciones` permite UPDATE de descargo al propio empleado

### Paso 2 — Mostrar email de usuarios en Configuración
Crear una función `security definer` que haga JOIN entre `user_roles` y `auth.users` devolviendo `user_id, email, role`. Usar esa función en la tab de Usuarios.

### Paso 3 — Validar hora en servidor (Login)
Mover la validación de restricción horaria a una edge function o usar `now()` de la base de datos en lugar de `new Date()` del cliente.

### Paso 4 — Corregir PWA manifest icons
Apuntar a `pwa-192x192.png` y `pwa-512x512.png`.

### Paso 5 — Limpiar cascade manual + AdminRoute duplicado
Eliminar el delete manual en `Legajos.tsx` (las FK ya tienen CASCADE). Remover el `<AdminRoute>` duplicado en `Configuracion.tsx`.

### Paso 6 — Agregar recibos en Autogestión + cambio de contraseña
Nueva pestaña "Recibos" en Autogestión que consulte liquidaciones del empleado. Botón "Cambiar contraseña" en el sidebar/footer.

### Paso 7 — Mostrar usuario logueado en sidebar
Mostrar email y rol del usuario actual en el footer del sidebar.

---

## Detalle técnico

### Archivos a modificar
| Archivo | Cambio |
|---------|--------|
| Nueva migración SQL | ~50 políticas RLS restrictivas |
| Nueva migración SQL | Función `get_users_with_roles()` security definer |
| `src/pages/Configuracion.tsx` | Usar nueva función, remover AdminRoute interno |
| `src/pages/Login.tsx` | Validar hora vía query a DB (`SELECT now()`) |
| `vite.config.ts` | Corregir iconos PWA |
| `public/manifest.json` | Corregir iconos PWA |
| `src/pages/Legajos.tsx` | Simplificar delete (solo borrar empleado, cascade hace el resto) |
| `src/pages/Autogestion.tsx` | Agregar pestaña Recibos |
| `src/components/AppSidebar.tsx` | Mostrar email/rol del usuario, botón cambiar contraseña |

