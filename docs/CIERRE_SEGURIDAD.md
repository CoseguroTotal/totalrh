# Cierre de seguridad — TotalRH

**Fecha:** 16/11/2026

**Alcance:**
- Se revisó el código del Demo (`totalrh`), que es el mismo en Coseguro y Rupont.
- Se revisaron las bases de datos de los tres proyectos: Demo, Coseguro Total y Rupont. Las consultas fueron por Lovable, de solo lectura, y las pruebas se hicieron en transacciones que se deshacen.

**Stack:**
- React + Vite (SPA/PWA) publicado en Lovable.
- Supabase: Postgres, Auth, Storage y Edge Functions.
- Cloudflare delante del dominio de Coseguro.

## 1. Resumen y veredicto

**Veredicto: Listo con pendientes.**

Se arregló en el código todo lo de gravedad Alta y Media que se podía arreglar ahí. El hueco del chat (un usuario podía sumarse a conversaciones ajenas) queda cerrado cuando Lovable aplique las migraciones en cada base.

Lo que sigue pendiente depende de paneles externos o de decisiones del responsable (§5):
- headers en Cloudflare;
- contraseñas filtradas;
- límites de Auth;
- 2FA;
- backups;
- política de privacidad.

| Estado | Antes | Después |
|---|---|---|
| ✅ Cumple | 6 | **11** (1, 2, 3, 4, 6, 7, 8, 9, 13, 14, 16) |
| ❌ Falla | 1 | **0** |
| ⚠️ Parcial o sin verificar | 10 | **6** (5, 10, 11, 12, 15, 17) |

## 2. Los 17 controles

| # | Control | Estado | Evidencia | Acción |
|---|---|---|---|---|
| 1 | Ocultar API keys | ✅ | No hay claves secretas en `src/` ni en `dist/`. Las `VITE_*` son solo la URL y la clave publishable de Supabase. Resend y web-push van por Edge Functions. | — |
| 2 | Secretos fuera de Git | ✅ | `.env` está versionado solo con valores públicos (URL, publishable key, project id) porque Lovable lo usa. El historial no tiene `service_role` ni claves privadas. `.gitignore` ahora ignora `.env.*` y deja permitido `.env.example`. | Hecho. |
| 3 | Key pública para la DB | ✅ | El cliente usa la clave publishable (anon). `service_role` solo aparece en Edge Functions (`Deno.env`). | — |
| 4 | Row-Level Security | ✅ | Ninguna tabla de `public` tiene RLS apagado. Las funciones `security definer` tienen `search_path` y `execute` revocado a `anon`, y las RPC validan `auth.uid()`. | — |
| 5 | Cifrar datos sensibles | ⚠️ | HTTPS con redirección y HSTS. DNI, CUIL y descriptores faciales se guardan en claro, protegidos por RLS (lo habitual). Backups sin verificar. | Confirmar backups (§5). |
| 6 | Forzar autenticación | ✅ | Las Edge Functions validan el JWT o tienen control propio: `registro-empleado` por código e IP, `demo-*` por código y `soloEnDemo`. Los roles se validan en la DB (`is_manager`, `has_role`). | — |
| 7 | Restringir acceso a registros | ✅ | Las políticas filtran por dueño, empresa o rol. Los ids son uuid. El storage es privado con URLs firmadas, salvo los logos, que son públicos a propósito. | — |
| 8 | Bloquear manipulación de campos | ✅ | Hay trigger guardián en `chat_participantes`, `memorandums` y `sanciones`, y grant por columna en `chat_participantes`. | Hecho (H1, H2 y la Baja de descargos). |
| 9 | Sesión | ✅ | La sesión de Supabase vive en `localStorage`, que es lo normal en una SPA. No hay sinks XSS. La compensa una CSP sin scripts externos, en línea ni `eval`. | Hecho (H6). |
| 10 | Contraseñas | ⚠️ | Supabase Auth usa bcrypt. El mínimo es 8 en el cliente y en `create-user`. Las contraseñas no aparecen en logs. La protección de contraseñas filtradas y el 2FA de admins están sin verificar. | Panel (§5). |
| 11 | Rate limiting | ⚠️ | `registro-empleado` y `demo-request-code` cuentan intentos por IP. `login-dni` inicia sesión desde la IP de la función, así que el límite de Auth por IP podría frenar fichajes masivos al inicio del turno. Los límites de Auth del panel están sin verificar. | Panel (§5). |
| 12 | Bots | ⚠️ | El registro exige código de empresa y tiene límite por IP. La demo pide un código por email. No hay captcha. Para el riesgo actual alcanza. | Opcional: Turnstile en la demo. |
| 13 | Queries parametrizadas | ✅ | No hay SQL armado con texto del usuario. El SQL dinámico usa `format(%I/%L)`. | — |
| 14 | Validar inputs | ✅ | Hay `check` en la DB y validación en Edge Functions. `send-email` ya no acepta el remitente que manda el navegador. | Hecho (H7). |
| 15 | Sanitizar contenido | ⚠️ | El único `dangerouslySetInnerHTML` es el del chart de shadcn, que usa datos propios. Hay CSP por `<meta>`. Faltan `frame-ancestors`, `X-Frame-Options` y `Permissions-Policy`, que solo se pueden poner como headers. | Cloudflare (§5). |
| 16 | Restringir archivos | ✅ | Todos los buckets tienen límite de tamaño. `memorandums-pdf`, `muro`, `logos-empresas`, `permisos` y `rostros` tienen además lista de tipos, sin SVG. `documentos-legajo` y `chat` aceptan documentos variados: tienen límite pero no lista de tipos. Los nombres los genera la app y las rutas van por dueño. | Hecho (H3). |
| 17 | Devolver datos necesarios | ⚠️ | `send-email`, `avisos-push`, `registro-empleado` y `create-user` devuelven errores genéricos. Quedan 38 `select("*")` y los errores crudos de las `demo-*`, que solo corren en el Demo. | Achicar los `select` de a poco. |

### Extras de cierre

| Extra | Estado | Evidencia |
|---|---|---|
| Dependencias | ⚠️ | `xlsx` pasó a 0.20.3, el tarball oficial de SheetJS guardado en `vendor/`, y se fueron las 2 vulnerabilidades altas. Quedan: `zod` 3 (alta, pero solo valida formularios en el propio navegador), `react-router` 6 (moderada; la app no navega a URLs que escribe el usuario), y `vite` y `vite-plugin-pwa` (solo herramientas de build). Pasar a las versiones nuevas implica cambios mayores; conviene hacerlo en una tanda aparte. |
| Error boundary | ✅ | `src/components/ErrorBoundary.tsx` muestra "Algo salió mal" con los botones Recargar e Ir al inicio. Si la pestaña quedó con una versión vieja, avisa "Hay una versión nueva". |
| Monitoreo de errores | ⚠️ | Solo hay logs de Supabase y Lovable. Sentry necesitaría una cuenta. |
| Documentos legales | ❌ | No hay política de privacidad ni términos. Se tratan datos biométricos (rostros), que son sensibles según la Ley 25.326. Los tiene que redactar el responsable con sus datos (§5). |
| Build y source maps | ✅ | El build pasa y no se publican source maps. |
| Preview para compartir | ✅ | `index.html` tiene `og:*` y `twitter:*` con imagen absoluta. |

## 3. Hallazgos por gravedad

### Bloqueante
Ninguno.

### Alta

**H1 — Unirse a conversaciones ajenas del chat. Arreglado en `20261116120000_chat_participantes_solo_leido.sql`.**
- **Problema:** la política `"Chat: marcar leído lo propio"` (`20261016210000_chat_interno.sql:96`) y el UPDATE sobre todas las columnas permitían cambiar `conversacion_id`.
- **Arreglo:**
  - `REVOKE UPDATE` y `GRANT UPDATE (ultimo_leido_at)`;
  - un trigger que deja `conversacion_id`, `user_id` y `created_at` como estaban.
- **Prueba en el Demo (se deshizo):** el intento de sumarse queda bloqueado con "permission denied". Marcar como leído sigue funcionando (1 fila).

### Media

**H2 — Firma de memorándums manipulable. Arreglado en `20261116120100_memorandums_firma_segura.sql`.**
- El destinatario solo puede pasar de enviado a recibido, y de enviado o recibido a firmado.
- Al firmar se fuerzan `firmado_por = auth.uid()` y `fecha_firma = now()`.
- Un memo firmado no vuelve atrás. RRHH sigue editando todo.
- **Prueba (se deshizo):** el acuse queda como recibido. Al firmar con un usuario ajeno y una fecha del 2000, queda con el usuario propio y la hora actual. Al intentar volver a enviado, sigue firmado.

**H3 — Buckets sin límite ni tipos. Arreglado en `20261116120300_buckets_limites.sql`.**

| Bucket | Límite | Tipos permitidos |
|---|---|---|
| `documentos-legajo` | 20 MB | sin lista |
| `memorandums-pdf` | 10 MB | PDF |
| `muro` | 10 MB | imágenes (jpeg, png, webp, gif, heic) |
| `logos-empresas` | 5 MB | png, jpeg, webp, gif |
| `permisos` | 10 MB | PDF, fotos y `octet-stream` |
| `rostros` | 300 KB | JPEG |

- `permisos` acepta `octet-stream` porque hay celulares que mandan PDFs sin tipo.
- Los límites están por encima de lo que la app ya valida.
- El formulario de permisos ahora también rechaza SVG.

**H4 — `xlsx 0.18.5` vulnerable. Arreglado.**
- `package.json` apunta a `file:vendor/xlsx-0.20.3.tgz`, el paquete oficial de SheetJS, que ya no publica en npm.
- La API es la misma. Lo cubre `src/test/planillas.test.ts`.

**H5 — Sin error boundary ni documentos legales. Parcial.**
- Se agregó el `ErrorBoundary`.
- La política de privacidad queda para el responsable (§5).

**H6 — Faltan headers de seguridad. Parcial.**
- CSP como `<meta>`, solo en el build de producción, armada en `src/lib/politicaCsp.ts` e inyectada en `vite.config.ts`. Bloquea:
  - scripts de otros sitios y `eval`;
  - `object`, `base-uri` y formularios hacia afuera.
- Deja pasar:
  - Supabase (https, wss y storage);
  - `data:` y `blob:`;
  - WebAssembly;
  - los scripts propios de Lovable en `/__l5e/`, que son del mismo origen.
- Se probó en el navegador con el build de producción:
  - la landing y el registro cargan sin errores;
  - Supabase responde;
  - los modelos faciales cargan con WebGL y detectan;
  - un script externo de prueba queda bloqueado.
- Lo que va por header queda en §5.

**H7 — Remitente de `send-email` y errores internos. Arreglado.**
- `send-email` usa siempre el remitente configurado en la empresa.
- `_shared/errores.ts` traduce los errores conocidos (email repetido, dato duplicado, email o contraseña inválidos) y el resto a un mensaje genérico. Se usa en `send-email`, `avisos-push`, `registro-empleado` y `create-user`.
- El detalle va a `console.error`.

**H8 — Posible límite de Auth en `login-dni`.** Sin verificar: hay que revisar los límites en el panel (§5).

### Baja
- **Fecha del descargo** en sanciones: arreglado en `20261116120200_sanciones_fecha_descargo.sql`. La pone el servidor y solo cambia si cambia el descargo.
- **`.env`:** arreglado. `.gitignore` ignora `.env.*`.
- **`configuracion_grupo` (incluye `registro_codigo`):** todos los autenticados la pueden leer. Queda así: el código ya circula entre los empleados, y restringir la columna rompería los `select("*")` de esa tabla.
- **`is_superadmin()`:** tiene un email escrito en la función (`20260827141128_….sql:1`). Funciona; se puede pasar a una tabla más adelante.
- **38 `select("*")` y errores crudos en las `demo-*`:** quedan para una tanda aparte, sin urgencia.

## 4. Lo que arreglé

**Commit `e8c9afe` en el Demo.** Se replica a Coseguro y Rupont con el merge habitual.

| Área | Archivos |
|---|---|
| Migraciones | `20261116120000_chat_participantes_solo_leido.sql`, `20261116120100_memorandums_firma_segura.sql`, `20261116120200_sanciones_fecha_descargo.sql`, `20261116120300_buckets_limites.sql` |
| Edge Functions | `_shared/errores.ts` (nuevo), `send-email`, `avisos-push`, `registro-empleado`, `create-user` |
| Frontend | `ErrorBoundary.tsx` y `politicaCsp.ts` (nuevos), `main.tsx`, `vite.config.ts`, `AdjuntosPermiso.tsx` |
| Dependencias | `package.json`, `package-lock.json`, `vendor/xlsx-0.20.3.tgz`, `.gitignore` |
| Tests | `cierreSeguridad.test.tsx`, `erroresFunciones.test.ts` y `planillas.test.ts` (nuevos), `permisosGrupos.test.ts` |

Resultado: 180 tests OK, typecheck OK y build OK.

## 5. Lo que tenés que hacer vos (paneles)

Los puntos 1 a 4 se hacen en cada uno de los tres proyectos de Supabase (desde Lovable con Cloud, o desde el panel de Supabase).

1. **Contraseñas filtradas:** Authentication → Attack Protection (o Sign In / Providers → Email) → activar *Leaked password protection*.
2. **Límites de Auth:** Authentication → Rate Limits. Revisar *Sign-ins / sign-ups* por IP cada 5 minutos. Como `login-dni` entra desde una sola IP, el límite tiene que alcanzar para un turno completo fichando a la vez (por ejemplo 150 a 300).
3. **2FA de admins:** activar el segundo factor en las cuentas de Lovable, Supabase, GitHub y Cloudflare.
4. **Backups:** Database → Backups. Confirmar que haya copias diarias y probar una restauración en el Demo.
5. **Aviso de Lovable:** leer el "1 critical finding" de Coseguro (proyecto → Security).
6. **Cloudflare** (rrhh.cosegurototal.com.ar): Rules → Transform Rules → Modify Response Header → agregar:
   - `X-Frame-Options: SAMEORIGIN`
   - `Content-Security-Policy: frame-ancestors 'self'`
   - `Permissions-Policy: camera=(self), geolocation=(self), microphone=(), payment=()`
7. **Política de privacidad y términos:** redactarlos con los datos del responsable de cada empresa: qué datos se guardan (incluidos rostros y ubicación del fichaje), para qué, por cuánto tiempo y cómo pedir acceso o borrado. Después se publican en la app.

## 6. Cómo volver a verificar

```bash
npm test
```
```bash
npx tsc -p tsconfig.app.json --noEmit
```
```bash
npm run build
```
```bash
npm audit --omit=dev
```

- **Base de datos:**
  - `UPDATE chat_participantes SET conversacion_id = '<ajena>'` como empleado tiene que dar "permission denied".
  - Firmar un memo con `firmado_por` ajeno tiene que quedar con `auth.uid()` y la hora actual.
- **Storage:** `select id, file_size_limit, allowed_mime_types from storage.buckets;`
- **Headers:**

  ```bash
  curl -sI https://rrhh.cosegurototal.com.ar
  ```

  La CSP está en el `<meta>` de `index.html`. `X-Frame-Options` y `Permissions-Policy` aparecen cuando se configuren en Cloudflare.
- **CSP en el navegador:** abrir la app publicada, fichar con cámara y revisar en la consola que no haya avisos "Content Security Policy".
