# Demo: credenciales únicas, verificación reforzada y código para muestras en vivo

## 1. Credenciales únicas por persona y rol
- Al verificar el código, el sistema crea para esa persona 6 usuarios propios (Administrador, RRHH, Gerente, Contador, Empleado, Terminal de fichado), cada uno con una contraseña aleatoria distinta.
- Formato de usuario: `rol.xxxx@demototalrh.com` (xxxx = identificador corto de la solicitud).
- El usuario "Empleado" queda vinculado a una ficha de empleado de demo propia, para que pueda fichar y ver su portal.
- Se envía un email con la tabla: perfil, qué puede hacer, usuario y contraseña de cada uno.
- Los accesos vencen según la configuración (por defecto 3 días); una tarea diaria los elimina al vencer.
- Si la misma persona vuelve a pedir acceso, se renuevan sus contraseñas y el vencimiento en vez de crear usuarios nuevos.
- Los usuarios compartidos actuales (`admin@demototalrh.com`, etc.) dejan de enviarse por email. Siguen existiendo solo para uso interno.

## 2. Verificación del código más segura
En Configuración → Solicitudes de demo (solo superadmin) se agrega una sección **Seguridad de la demo** con estos valores editables:
- Vencimiento del código (por defecto 15 minutos)
- Intentos fallidos permitidos por código (por defecto 5)
- Límite de solicitudes por dirección de conexión (IP) por hora (por defecto 5)
- Intentos fallidos por IP antes del bloqueo (por defecto 10 en 1 hora), y duración del bloqueo (por defecto 60 minutos)
- Duración de los accesos de demo (por defecto 3 días)

Comportamiento:
- Cada solicitud y cada intento (correcto o fallido) queda registrado con email, IP, fecha y resultado.
- Si una IP o un email supera los límites, se bloquean tanto "Reenviar código" como la verificación, mostrando cuánto falta para reintentar.
- Nueva pestaña **Auditoría** con el historial de intentos, filtro por resultado y la opción de desbloquear una IP o email manualmente.

Nota: la plataforma no tiene un limitador estándar; este control se hace a medida con el registro de intentos. Es efectivo para la demo, aunque no reemplaza una protección a nivel de red.

## 3. Código para muestras en vivo
- Un código maestro reutilizable (8 caracteres) que entra directo a la demo sin pedir email, pensado para presentaciones.
- Se genera al implementar y te lo muestro en el chat. Vigencia por defecto 30 días.
- Desde el panel de superadmin podés ver su vencimiento, regenerarlo o desactivarlo. Su uso también queda en la auditoría.
- En la pantalla de acceso se agrega el enlace "Tengo un código de presentación".

## Detalles técnicos
- Migración: columnas de configuración en `configuracion_grupo` (`demo_codigo_minutos`, `demo_max_intentos_codigo`, `demo_max_solicitudes_ip_hora`, `demo_max_fallos_ip_hora`, `demo_bloqueo_minutos`, `demo_acceso_dias`); tablas `demo_intentos` (ip, email, tipo, resultado), `demo_bloqueos` (clave ip/email, hasta), `demo_cuentas` (lead_id, user_id, rol, empleado_id, expira_at) y `demo_codigo_maestro` (hash, expira_at, activo). Todas sin acceso público; lectura solo para superadmin vía `is_superadmin()`; escritura por las funciones del backend.
- `demo-request-code`: lee configuración, chequea bloqueos y límites por IP/email, registra intento, deja de incluir credenciales compartidas.
- `demo-verify-code`: valida, registra fallos, aplica bloqueos; al acertar crea o renueva las 6 cuentas (auth admin API + `user_roles` + empleado demo) y envía el email de credenciales.
- Nueva función `demo-master-code` (validar código maestro) y `demo-admin` (regenerar/desactivar código, desbloquear, guardar configuración; requiere superadmin).
- Tarea programada diaria `demo-cleanup` que borra cuentas y empleados demo vencidos.
- Tests para las reglas: vencimiento del código, bloqueo tras N fallos por IP, y vencimiento de cuentas.
