# Plan: Fichado por QR dinámico (pantalla de la empresa + lector en la app del empleado)

Sí, es viable y es más seguro que el token actual. Hoy el empleado genera un código de 6 dígitos y lo tipea en la PC de la sucursal: eso permite que alguien fiche por otro simplemente pasándole el número por WhatsApp. Invirtiendo el flujo (el QR lo muestra la pantalla de la sucursal y lo escanea el celular del empleado), el empleado debe estar físicamente frente a la pantalla.

## Cómo funciona el nuevo flujo

```text
Pantalla sucursal (rol Registro de Asistencia)
   └─ muestra QR con un código de un solo uso, se renueva cada 10 s
Celular del empleado (Autogestión → Fichar)
   └─ abre la cámara, escanea el QR
   └─ el sistema valida el código y registra entrada/salida
Pantalla sucursal
   └─ muestra "Entrada registrada — Pérez, Juan  09:03"
```

## Seguridad anti-fraude

- El código del QR vive 10 segundos (más 5 s de gracia por demoras de red). Una foto del QR reenviada ya no sirve.
- Cada código es de un solo uso: al fichar queda consumido y no se puede reutilizar.
- El QR no identifica al empleado: la identidad sale de la sesión autenticada del celular, así que no se puede fichar por otro sin su usuario y contraseña.
- El QR está atado a la terminal/sucursal que lo emitió, por lo que la fichada queda registrada con esa terminal.
- Se conserva el token de 6 dígitos como método alternativo (celular sin cámara o QR ilegible), configurable.

## Cambios en la base de datos

- Nueva tabla `qr_sesiones`: código único, terminal (usuario que lo emitió), fecha de emisión, fecha de expiración, estado consumido, empleado que lo consumió.
- Nueva columna `terminal_user_id` en `fichadas` para auditar desde qué terminal se fichó.
- Reglas de acceso: solo la terminal autenticada puede crear códigos; nadie puede leer la tabla directamente desde el cliente (la validación pasa por la función de servidor).

## Cambios en la aplicación

### 1. Pantalla de la sucursal (`src/pages/RegistroAsistencia.tsx`)
- Nueva pestaña/modo "QR" (predeterminado) y "Código" (el input actual como alternativa).
- Muestra el QR en grande con un anillo de progreso de 10 segundos y se auto-renueva.
- Panel de últimas fichadas: cuando alguien escanea, aparece el nombre, hora y tipo (entrada/salida) en tiempo real.
- La hora oficial se toma del servidor, igual que el resto del sistema.

### 2. App del empleado (`src/pages/Autogestion.tsx`)
- La pestaña "Token" pasa a llamarse "Fichar", con dos opciones: **Escanear QR** (botón grande que abre la cámara) y **Mostrar código** (el token actual, colapsado).
- Al escanear: feedback inmediato de éxito ("Entrada registrada 09:03") o error claro (QR vencido, ya usado, sin conexión).
- Manejo de permisos de cámara con instrucciones si el usuario los bloqueó.

### 3. Función de servidor (`validate-attendance-token`)
- Nueva acción `qr-issue`: la terminal pide un código nuevo; devuelve el código y su vencimiento.
- Nueva acción `qr-fichar`: recibe el código escaneado + la sesión del empleado; valida vigencia y unicidad, resuelve si es entrada o salida y registra la fichada.
- Se mantienen las acciones actuales de token para el método alternativo.

### 4. Configuración
- Nueva opción en Configuración → Asistencia: activar/desactivar el fichado por QR y el fichado por token, y ajustar la duración del QR (10 s por defecto).

## Detalle técnico

- Generación del QR en el cliente con `qrcode` (canvas), contenido = código opaco emitido por el servidor.
- Lectura en el celular con `@zxing/browser` (`BrowserMultiFormatReader`) sobre `getUserMedia`; requiere HTTPS, que ya se cumple en el dominio publicado.
- La renovación del QR usa un intervalo de 10 s con `setInterval` y cancela el pedido anterior; se pausa cuando la pestaña queda en segundo plano.
- Las actualizaciones del panel de fichadas de la terminal se hacen por realtime sobre `fichadas` (filtrado por `terminal_user_id`), con fallback a refetch cada 5 s.

## Archivos

| Archivo | Cambio |
|---------|--------|
| Migración SQL | Tabla `qr_sesiones`, columna `terminal_user_id` en `fichadas`, políticas |
| `supabase/functions/validate-attendance-token/index.ts` | Acciones `qr-issue` y `qr-fichar` |
| `src/pages/RegistroAsistencia.tsx` | Modo QR con renovación cada 10 s y panel de fichadas |
| `src/pages/Autogestion.tsx` | Pestaña "Fichar" con lector de QR |
| `src/components/QrScanner.tsx` | Nuevo componente lector de cámara |
| `src/pages/Configuracion.tsx` | Opciones de métodos de fichada y duración del QR |
