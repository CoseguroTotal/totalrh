# Plan: Refuerzo de seguridad de datos sin perder funcionalidad

## Objetivo
Cerrar los hallazgos de exposición de datos personales, médicos, salariales, documentales y de asistencia, manteniendo los accesos necesarios por rol:
- Admin, RRHH y Gerencia: gestión operativa completa.
- Contador: gestión completa de liquidación y solo lectura de legajos, vacaciones y asistencia.
- Empleado: solo su propio legajo, documentos, recibos, solicitudes, sanciones y fichadas.
- Registro de asistencia: solo terminal de fichado QR y registros mínimos de esa terminal.

## Hallazgos confirmados
- El escaneo detectó 17 hallazgos: 11 errores y 6 advertencias.
- Hay políticas `SELECT ... USING true` en tablas sensibles como `empleados`, `datos_medicos`, `documentos_legajo`, `liquidaciones`, `liquidacion_lineas`, `grupo_familiar`, `candidatos`, `sanciones`, `solicitudes_permiso`, `solicitudes_vacaciones`, `fichadas`, `eventos_legajo`, `estudios_empleado`, `novedades_asistencia` y `tokens_consumidos`.
- El bucket privado de documentos de legajo tiene políticas de acceso demasiado amplias para usuarios autenticados.
- La función `my_empleado_id()` vincula usuario y legajo por email, lo que es funcional pero menos seguro que un vínculo explícito por ID de usuario.
- El linter del backend reporta funciones `SECURITY DEFINER` ejecutables por `anon`/usuarios autenticados y protección contra contraseñas filtradas desactivada.

## Cambios propuestos

### 1. Vinculación segura usuario-legajo
- Agregar a `empleados` una columna `user_id uuid` única y nullable, sin clave foránea directa al esquema de autenticación.
- Poblar `user_id` para legajos existentes comparando emails actuales una sola vez en la migración.
- Reescribir `my_empleado_id()` para usar `empleados.user_id = auth.uid()` y dejar el email solo como dato de contacto.
- Ajustar el alta manual de usuarios para guardar el vínculo `user_id` en el legajo cuando corresponda.

### 2. Políticas RLS por rol y propietario
Reemplazar las políticas de lectura amplia por reglas específicas:
- `empleados`: managers, RRHH, contador o el propio empleado.
- `datos_medicos`, `grupo_familiar`, `documentos_legajo`, `estudios_empleado`, `eventos_legajo`, `sanciones`: managers/RRHH o el propio empleado asociado.
- `liquidaciones` y `liquidacion_lineas`: managers, RRHH, contador o el empleado dueño del recibo.
- `solicitudes_permiso` y `solicitudes_vacaciones`: managers/RRHH o el empleado solicitante.
- `fichadas` y `novedades_asistencia`: managers/RRHH/contador o el empleado propio; la terminal de asistencia conserva solo lo necesario para insertar/visualizar registros de su terminal.
- `candidatos` y `vacantes`: solo roles de gestión interna.
- `tokens_consumidos`: solo managers/RRHH y terminal de asistencia cuando sea imprescindible.

### 3. Storage de documentos
- Reemplazar las políticas del bucket `documentos-legajo` para validar propiedad por el prefijo de carpeta del empleado y por el vínculo con `documentos_legajo`.
- Mantener subida/descarga para RRHH/Gerencia/Admin y descarga propia para empleados.
- Evitar que un empleado liste o descargue documentos de otro legajo.

### 4. Funciones sensibles
- Revocar ejecución pública de funciones `SECURITY DEFINER` que no deben exponerse directamente.
- Mantener ejecutables solo las funciones helper que son necesarias para RLS o para flujos autenticados.
- Revisar especialmente `get_users_with_roles`, `has_role`, `is_manager`, `is_manager_or_contador`, `my_empleado_id` y `get_server_time`.

### 5. Código de frontend y funciones
- Ajustar los hooks que hoy dependen del email para usar el nuevo vínculo seguro cuando corresponda.
- Actualizar la función de asistencia QR para identificar al empleado por `user_id` en lugar de email.
- Conservar la experiencia actual: portal empleado, QR, memorándums, sanciones, recibos, vacaciones, permisos y vistas de contador.

### 6. Validación final
- Ejecutar linter y escaneo de seguridad nuevamente.
- Probar accesos por rol: empleado, contador, admin/RRHH/gerencia y terminal de asistencia.
- Revisar que no se rompan documentos, recibos, vacaciones, sanciones ni fichado QR.

## Detalles técnicos
- Los cambios de base se harán con migración aprobada.
- Las políticas usarán `auth.uid()`, `my_empleado_id()`, `is_manager()`, `is_manager_or_contador()` y `has_role()`.
- No se agregará auto-registro; se mantiene la creación manual estricta.
- La protección contra contraseñas filtradas se habilitará desde la configuración de autenticación del backend si la herramienta lo permite.
