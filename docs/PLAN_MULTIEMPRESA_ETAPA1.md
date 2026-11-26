# Plan técnico · Etapa 1: base multiempresa

**Proyecto:** TotalRH Demo (Lovable `dfcc6581…`, Supabase `dzplslzugrlwlrfjetjw`)
**Fecha:** 26/11/2026
**Objetivo:** que una sola instalación atienda a muchas empresas clientes, cada una aislada de las demás, sin cambiar lo que hoy ve un usuario de la Demo.

## 1. Alcance

**Entra en la etapa 1:**
- Organizaciones (cada cliente) y membresías (qué usuario pertenece a qué organización y con qué rol).
- Una columna `organizacion_id` en todas las tablas de negocio.
- Reglas de acceso, funciones, archivos y funciones del servidor (edge functions) filtradas por organización.
- Un selector de organización para quien pertenece a más de una.
- Pruebas automáticas de aislamiento entre dos organizaciones.

**Queda para después:**
- **Etapa 2:** registro de empresas sin intervención, prueba gratis e importación desde Excel. Cada interesado que pide la demo pasa a tener su propia organización con datos de ejemplo, en vez de compartir "Grupo Demo".
- **Etapa 3:** cobro con Mercado Pago, tramos por cantidad de empleados y panel de superadmin.
- **Etapa 4:** pasar a Coseguro y Rupont, o dejarlos como instalación dedicada.

**Terminado significa:**
1. La Demo funciona igual que hoy para "Grupo Demo".
2. Una segunda organización, "Organización de Prueba B", creada con datos y usuarios propios, funciona completa en todos los módulos.
3. Las pruebas de aislamiento dan cero filas cruzadas en las 50 tablas, las funciones, los archivos y las notificaciones.

### Continuidad: la Demo no se corta en ningún momento

Estos circuitos tienen que seguir funcionando **durante y después** de cada tanda:
- el acceso a la demo con el código por email: `demo-request-code` → `demo-verify-code` → cuentas por rol en "Grupo Demo";
- el código maestro;
- el alta de empleados con el código de la empresa;
- el fichaje facial, con GPS y con QR;
- la limpieza diaria de cuentas demo.

Hoy estas edge functions crean registros con la clave de servicio **sin decir de qué organización son**:
- `demo-accounts.ts` → `user_roles` y `empleados`;
- `registro-empleado` → `solicitudes_alta`, `empleados` y `user_roles`;
- `validate-attendance-token` → `fichadas`, `rostros_empleados` y `qr_sesiones`.

Para que no se corten:

1. **Valor por defecto de transición.** Desde la tanda 1 hasta la 6, el valor por defecto de `organizacion_id` es `coalesce(org_actual(), '<id de Grupo Demo>')`. Todo lo que crea el servidor sin indicar organización cae en "Grupo Demo", exactamente como hoy.
2. **En la tanda 6** se actualizan esas edge functions para que indiquen la organización. Recién ahí se quita el respaldo y queda `org_actual()` solo, que obliga a indicarla.
3. **Recorrido de humo después de cada tanda**, antes de seguir con la próxima:
   - pedir la demo con un email de prueba y entrar con el código;
   - entrar con el código maestro;
   - registrar un empleado con el código de la empresa;
   - fichar por QR y con GPS;
   - publicar en el muro y mandar un mensaje.

   Si algo falla, se aplica el SQL de vuelta atrás de esa tanda.

Coseguro y Rupont no se tocan: son proyectos y bases separados.

## 2. Qué encontré en la Demo

| Pieza | Cantidad | Estado actual |
|---|---|---|
| Tablas en `public` | 58 | Todas con RLS activado, pero **ninguna tiene noción de empresa cliente**. |
| Reglas de acceso (políticas) | ~200 | Casi todas pasan por 6 funciones auxiliares: `has_role`, `is_manager`, `is_manager_or_contador`, `muro_es_moderador`, `my_empleado_id` y `es_miembro_grupo`/`es_admin_grupo`. |
| Funciones en la base | 59 | 45 son `security definer`, es decir, saltean RLS. Varias recorren **todos** los usuarios. |
| Buckets de archivos | 7 | Las rutas van por usuario, empleado o conversación, no por empresa. `muro` deja leer cualquier imagen a cualquier usuario con sesión. |
| Edge functions | 10 | Usan la clave de servicio, así que saltean RLS. Por ejemplo, `validate-attendance-token` compara el rostro contra **todos** los empleados. |
| Configuración del grupo | 1 fila | `configuracion_grupo` se lee con `.limit(1)` / `.single()`. |
| Roles | globales | `user_roles (user_id, role)`: quien es admin, es admin de toda la base. |

**Funciones que hoy filtrarían datos entre empresas** (las más urgentes de corregir):
- **Avisos a todos los usuarios:** `encuesta_publicar`, `evento_crear`, `muro_notificar_publicacion` (comunicados) y `solicitudes_destinatarios_gestion` mandan notificaciones a todos los usuarios con rol, sin importar la empresa.
- **Listas de personas:** `chat_directorio`, `get_users_with_roles`, `muro_perfiles` y `muro_celebraciones` listan personas de toda la base.
- **Asistencia:** `terminal_ultimas_fichadas`, y en la edge function el reconocimiento facial (`face-fichar`) y la búsqueda por código de asistencia.
- **Alta de empleados:** `registro-empleado` lee un único `registro_codigo`, y el login con DNI busca el DNI en toda la base.

## 3. Modelo

### 3.1 Tablas nuevas

```sql
create table public.organizaciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9](-?[a-z0-9])*$'),   -- futuro subdominio
  estado text not null default 'activa' check (estado in ('activa','prueba','suspendida','baja')),
  plan text not null default 'demo',
  created_at timestamptz not null default now()
);

-- Organización elegida por cada usuario (sólo importa si pertenece a más de una)
create table public.usuario_organizacion_activa (
  user_id uuid primary key references auth.users on delete cascade,
  organizacion_id uuid not null references public.organizaciones on delete cascade,
  updated_at timestamptz not null default now()
);
```

**Membresías:** reutilizo `user_roles` y le agrego `organizacion_id`. La unicidad pasa de `(user_id, role)` a `(organizacion_id, user_id)`, con **un rol por organización**, que es lo que el frontend ya supone (`useUserRole` usa `maybeSingle`). Así no hay que tocar las ~20 pantallas que leen el rol.

### 3.2 La función central: `org_actual()`

```sql
create or replace function public.org_actual() returns uuid
language sql stable security definer set search_path = public as $$
  select coalesce(
    -- la elegida, si todavía es miembro
    (select a.organizacion_id from usuario_organizacion_activa a
      where a.user_id = auth.uid()
        and exists (select 1 from user_roles r where r.user_id = a.user_id and r.organizacion_id = a.organizacion_id)),
    -- si no eligió: su única (o la primera) membresía
    (select r.organizacion_id from user_roles r where r.user_id = auth.uid() order by r.organizacion_id limit 1)
  )
$$;
revoke execute on function public.org_actual() from public, anon;
grant execute on function public.org_actual() to authenticated;
```

Se suma `cambiar_organizacion(_id uuid)`, que valida la membresía antes de guardar la elección.

Las funciones auxiliares pasan a mirar **el rol en la organización actual**, sin cambiar su nombre ni su firma. Así las ~200 políticas siguen sirviendo:

```sql
create or replace function public.has_role(_user_id uuid, _role app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles
                  where user_id = _user_id and role = _role and organizacion_id = public.org_actual())
$$;
-- my_empleado_id(): el empleado del usuario EN la organización actual
```

### 3.3 Aislamiento en tres capas (por cada una de las 50 tablas)

**1. Columna con valor por defecto.** El frontend no necesita mandarla, así que los ~30 `insert` de la app quedan iguales:

```sql
alter table public.fichadas
  add column organizacion_id uuid not null default public.org_actual() references public.organizaciones;
```

Una edge function con clave de servicio no tiene `auth.uid()`, así que `org_actual()` da `null`.

- **Hasta la tanda 6:** el valor por defecto lleva el respaldo `coalesce(org_actual(), '<id de Grupo Demo>')`, así la demo sigue funcionando (ver "Continuidad").
- **Desde la tanda 6:** queda sólo `org_actual()`. Una inserción del servidor que no indique la organización **falla**, y eso es a propósito: obliga a cada edge function a indicarla explícitamente.

**2. Trigger guardián.** Un usuario no puede escribir ni mover filas a otra organización. Es una sola función genérica que se aplica a todas las tablas:

```sql
create or replace function public.forzar_organizacion() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    if tg_op = 'INSERT' then new.organizacion_id := public.org_actual();
    else new.organizacion_id := old.organizacion_id; end if;
  end if;
  return new;
end $$;
```

**3. Política restrictiva.** Postgres combina las políticas `restrictive` con AND con las existentes. Con una por tabla, **no hace falta reescribir las ~200 políticas actuales**:

```sql
create policy "Aislamiento por organización" on public.fichadas
  as restrictive for all to authenticated
  using (organizacion_id = (select public.org_actual()))
  with check (organizacion_id = (select public.org_actual()));
```

**Coherencia padre-hijo:** las claves foráneas no pasan por RLS. Sin esto, alguien de la empresa A podría cargar una fichada apuntando a un empleado de la empresa B. Lo resuelven las claves foráneas compuestas:

```sql
alter table public.empleados add constraint empleados_org_id_key unique (organizacion_id, id);
alter table public.fichadas add constraint fichadas_empleado_org_fk
  foreign key (organizacion_id, empleado_id) references public.empleados (organizacion_id, id);
```

Lo mismo vale para todos los hijos de `empleados`, `empresas`, `sucursales`, `muro_publicaciones`, `encuestas`, `eventos`, `grupos`, `chat_conversaciones`, `liquidaciones`, `vacantes`, `turnos` y `conceptos_liquidacion`.

### 3.4 Inventario de tablas

| Grupo | Tablas | Tratamiento |
|---|---|---|
| Personas y legajo (12) | empresas, sucursales, empleados, empleados_cambios, datos_medicos, documentos_legajo, estudios_empleado, grupo_familiar, eventos_legajo, sanciones, memorandums, solicitudes_alta | Las 3 capas. Claves foráneas compuestas hacia `empleados`, `empresas` y `sucursales`. |
| Asistencia (10) | turnos, asignaciones_turno, fichadas, novedades_asistencia, feriados, qr_sesiones, tokens_asistencia, tokens_consumidos, rostros_empleados, restricciones_horario | Las 3 capas. `feriados` pasa a ser por organización, con los nacionales precargados al crearla. |
| Liquidación (3) | conceptos_liquidacion, liquidaciones, liquidacion_lineas | Las 3 capas. Los conceptos se copian de una plantilla al crear la organización. |
| Vacaciones y permisos (3) | vacaciones_config, solicitudes_vacaciones, solicitudes_permiso | Las 3 capas. |
| Reclutamiento (2) | vacantes, candidatos | Las 3 capas. |
| Comunicación (17) | muro_publicaciones, muro_comentarios, muro_reacciones, muro_lecturas, grupos, grupo_miembros, chat_conversaciones, chat_participantes, chat_mensajes, encuestas, encuesta_preguntas, encuesta_participaciones, encuesta_respuestas, eventos, evento_asistencias, tareas, notificaciones | Las 3 capas. Las tablas hijas (reacciones, lecturas, participantes y similares) también llevan la columna: es redundante, pero una sola regla uniforme es más segura que excepciones. |
| Configuración (2) | configuracion_grupo, user_roles | `configuracion_grupo`: una fila por organización (`organizacion_id` como clave única). `user_roles`: pasa a ser la tabla de membresías. |
| Soporte (1) | soporte_mensajes | Lleva la columna para saber de qué empresa escribe cada uno. El rol soporte sigue viendo todo. |
| Sistema (8) | demo_bloqueos, demo_codigo_maestro, demo_codigos, demo_cuentas, demo_intentos, demo_leads, push_config, push_suscripciones | **Sin organización.** Son del servicio, no del cliente. Las suscripciones push son por usuario. |

### 3.5 Restricciones únicas que pasan a ser por organización

| Hoy | Pasa a ser |
|---|---|
| `empleados (legajo)` | `(organizacion_id, legajo)` |
| `empleados (codigo_asistencia)` | `(organizacion_id, codigo_asistencia)` |
| `empleados (user_id)` | `(organizacion_id, user_id)`: la misma persona puede ser empleada en dos clientes |
| `conceptos_liquidacion (codigo)` | `(organizacion_id, codigo)` |
| `feriados (fecha, nombre)` | `(organizacion_id, fecha, nombre)` |
| `restricciones_horario (role)` | `(organizacion_id, role)` |
| `solicitudes_alta (dni) where pendiente` | `(organizacion_id, dni) where pendiente` |
| `user_roles (user_id, role)` | `(organizacion_id, user_id)` |
| `memorandums.numero` (secuencia global) | Numeración por organización, con una tabla `organizacion_contadores` y un trigger, para que cada cliente empiece en #1 |
| `configuracion_grupo.registro_codigo` | Único **en toda la base**, porque es lo que identifica a la empresa cuando un empleado se registra |

## 4. Funciones que hay que reescribir

**Regla general:** toda función `security definer` filtra por `org_actual()`. Las que se disparan con un trigger copian `NEW.organizacion_id` en lo que insertan.

| Prioridad | Funciones | Cambio |
|---|---|---|
| **Crítica** (filtran datos) | encuesta_publicar, evento_crear, muro_notificar_publicacion, solicitudes_destinatarios_gestion, solicitudes_alta_avisar, chat_directorio, get_users_with_roles, muro_perfiles, muro_celebraciones, terminal_ultimas_fichadas, encuesta_resultados, muro_lecturas_detalle | Destinatarios y listados sólo de la organización actual. |
| Alta | chat_crear_grupo, chat_iniciar_directa | Sólo se puede invitar a miembros de la propia organización. |
| Alta | configurar_registro, actualizar_mis_datos, guardar_liquidacion, grupo_agregar_masivo | Operan sobre la organización actual. |
| Media (triggers que insertan) | tareas_notificar, muro_notificar_comentario, memorandums_notificar, solicitudes_permiso_avisar, solicitudes_vacaciones_avisar, empleados_registrar_cambios, grupos_al_crear, chat_al_enviar | Propagar `organizacion_id` a lo que insertan. |
| Sin cambio | get_server_time, update_updated_at_column, guards de columnas, push_disparar, soporte_*, is_superadmin | Revisar y dejar constancia. |

## 5. Archivos (storage)

- **Rutas:** todas empiezan con la organización: `{organizacion_id}/…`. Lo que hoy se controla en la primera carpeta (usuario, empleado, conversación o memorándum) pasa a la segunda.
- **Políticas:** cada política suma `(storage.foldername(name))[1] = org_actual()::text`. En `muro` se corrige que hoy cualquier usuario con sesión pueda leer cualquier imagen.
- **Datos existentes:** un script único con la clave de servicio mueve los objetos actuales a `{org_demo}/…` y actualiza las rutas guardadas en las tablas: `imagen_url`, `storage_path`, `adjunto_path`, `foto_path`, `logo_url` y los adjuntos de permisos.
- **Frontend:** las ~19 llamadas a `storage.from(...)` pasan por un helper `rutaOrg(...)`, para que nadie vuelva a armar una ruta sin la organización.

## 6. Edge functions

**Regla:** la organización **siempre** se deduce de la membresía de quien llama, nunca de lo que manda el navegador.

| Función | Cambio |
|---|---|
| validate-attendance-token | La terminal opera sólo con empleados, rostros, QR y sucursales de **su** organización. El reconocimiento facial filtra los rostros por organización antes de comparar. |
| registro-empleado | **Alta:** el código de empresa identifica la organización y el empleado queda en ella. **Login con DNI:** si el DNI existe en más de una organización, se pide el email. |
| create-user | El admin crea usuarios sólo en su organización; se verifica que sea admin **de esa** organización. |
| send-email | Remitente y datos de la organización de quien envía. |
| avisos-push | Sin cambio de fondo: envía a un usuario. Sólo verificar que la notificación pertenezca a una organización del destinatario. |
| demo-request-code, demo-verify-code, demo-cleanup, demo-admin, demo-master-code | En la etapa 1 siguen creando cuentas en "Grupo Demo", ahora como membresías. En la etapa 2 cada interesado tendrá su propia organización. |

## 7. Frontend

| Pieza | Cambio |
|---|---|
| `OrganizacionProvider` + `useOrganizacion()` (nuevos) | Organización actual, lista de mis organizaciones y `cambiar(id)`. Al cambiar se vacía el caché de React Query, igual que hoy al cambiar de usuario. |
| Selector en `UserMenu` | Sólo aparece si el usuario pertenece a más de una organización. |
| `useUserRole`, `useConfigGrupo` | **Sin cambios**: las reglas de acceso ya devuelven sólo la fila de la organización actual. |
| Marca | Nombre y logo salen de `configuracion_grupo` de la organización. Ya existen `nombre_grupo` y `logo_url`. |
| Storage | Usar el helper `rutaOrg()`. |
| `types.ts` | Lo regenera Lovable. `organizacion_id` queda opcional en los `Insert` porque tiene valor por defecto. |
| Pantallas | No cambian los ~30 `insert` ni los `select`. |

## 8. Migración de los datos de la Demo

1. Crear la organización "Grupo Demo" con un id fijo y pasar a ella todas las filas y todos los usuarios actuales.
2. Agregar las columnas como opcionales y completarlas, y recién después volverlas obligatorias. Así nunca queda una fila sin organización.
3. Crear "Organización de Prueba B" con 3 usuarios (admin, rrhh, empleado) y datos mínimos en cada módulo, sólo para las pruebas.

## 9. Pruebas de aislamiento

1. **Revisión del catálogo**, una consulta que debe devolver 0 filas. Lista cualquier tabla de `public` (salvo las 8 de sistema) a la que le falte:
   - la columna `organizacion_id` obligatoria;
   - la política restrictiva;
   - el trigger guardián.

   También lista cualquier función `security definer` sin `search_path` fijo. Se corre después de cada migración, así una tabla nueva sin aislamiento no pasa inadvertida.
2. **Usuario A contra datos de B, tabla por tabla:**
   - `select` devuelve 0 filas;
   - `update` y `delete` afectan 0 filas;
   - `insert` con el id de B termina guardado en A (por el trigger);
   - `insert` apuntando a un empleado de B falla (por la clave foránea compuesta).

   Ojo: un `select` bloqueado no da error, devuelve vacío. Por eso se cuentan filas.
3. **Funciones:**
   - el directorio del chat, los perfiles del muro, las celebraciones, los resultados de encuestas y la lista de usuarios nunca devuelven gente de B;
   - publicar un comunicado, una encuesta o un evento en A no genera notificaciones para nadie de B.
4. **Archivos:** A no puede leer ni subir archivos en la carpeta de B en ninguno de los 7 buckets.
5. **Edge functions:**
   - la terminal de A no reconoce el rostro de un empleado de B;
   - un QR de A no sirve en B;
   - un código de registro de A da de alta en A.
6. **En el navegador:** recorrer la Demo como hoy y luego como B, todos los módulos.
7. **Advisors de seguridad de Supabase:** sin hallazgos nuevos.

## 10. Orden de trabajo (tandas)

Cada tanda es una migración nueva, más sus pruebas. Se aplica en la Demo con Lovable con la indicación de no tocar `src/` ni las edge functions.

| # | Tanda | Riesgo |
|---|---|---|
| 0 | **Preparación:** exportar los datos, escribir el recorrido de humo y dejar de replicar la Demo a Coseguro y Rupont (ver punto 11). "Pedí tu demo" **sigue abierto**: cada tanda se aplica en horario de poco uso y se verifica enseguida. | Bajo |
| 1 | `organizaciones`, `usuario_organizacion_activa`, `user_roles.organizacion_id`, `org_actual()`, `cambiar_organizacion()`, auxiliares por organización y "Grupo Demo" con todo adentro. | Medio: si falla, nadie tiene rol. Va con plan de vuelta atrás. |
| 2 | `organizacion_id` en las 50 tablas: completar datos, obligatoria, valor por defecto, trigger, índices, únicas por organización y claves foráneas compuestas. | Medio |
| 3 | Políticas restrictivas en las 50 tablas y revisión del catálogo. | Alto: una política mal escrita deja una pantalla vacía. Se prueba pantalla por pantalla. |
| 4 | Reescribir las funciones del punto 4, empezando por las críticas. | Alto |
| 5 | Storage: rutas, script de mudanza de archivos, políticas y helper en el frontend. | Medio |
| 6 | Edge functions del punto 6 y, recién después, quitar el respaldo "Grupo Demo" del valor por defecto. | Alto: asistencia y alta de empleados |
| 7 | Frontend: `OrganizacionProvider`, selector y numeración de memorándums por organización. | Bajo |
| 8 | "Organización de Prueba B", la batería completa de pruebas y la revisión en el navegador. | — |

## 11. Decisiones (con mi recomendación)

1. **¿Un usuario puede estar en más de una organización?** Sí: contadores externos que atienden varios clientes, y vos como soporte. Ya está contemplado en el diseño.
2. **¿Los feriados son de cada organización?** Sí, con los nacionales precargados al crearla. Cada empresa puede sumar los propios, por ejemplo el día del empleado de comercio.
3. **¿Qué pasa con Coseguro y Rupont?** Desde la tanda 1 la Demo y los clientes dejan de compartir el esquema de la base. Mi recomendación es **no replicar más los cambios de la Demo a los clientes**, salvo arreglos de seguridad hechos a mano, hasta la etapa 4. Si se sigue uniendo la Demo en los clientes, las migraciones multiempresa entrarían en sus bases.
4. **¿Se puede volver atrás?** Las tandas 1 a 3 se pueden revertir: se quitan las políticas restrictivas y las funciones vuelven a su versión anterior. Las columnas pueden quedar sin efecto. Antes de cada tanda queda escrito el SQL para deshacerla.
