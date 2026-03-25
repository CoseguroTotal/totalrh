

# Plan: Integrar Resend para envío de emails desde el sistema

## Resumen

Configurar Resend como servicio de envío de emails para enviar recibos de sueldo, memorándums y notificaciones por email a los empleados directamente desde la aplicación.

## Requisitos previos

- **API Key de Resend**: Se necesita una clave API de Resend (se solicitará al usuario mediante el gestor de secretos).
- **Dominio verificado en Resend**: El usuario debe tener un dominio verificado en su cuenta de Resend para enviar emails (o usar el dominio de prueba para testing).

## Cambios

### 1. Guardar secreto RESEND_API_KEY
- Usar la herramienta `add_secret` para solicitar al usuario su API Key de Resend.

### 2. Crear Edge Function `send-email` 
Archivo: `supabase/functions/send-email/index.ts`
- Recibe: `to`, `subject`, `html`, `from` (opcional, default configurable)
- Usa la API REST de Resend (`https://api.resend.com/emails`) con la API key almacenada
- Incluye headers CORS para invocación desde el frontend
- Valida inputs y maneja errores

### 3. Crear componente `EnviarEmailDialog`
Archivo: `src/components/EnviarEmailDialog.tsx`
- Dialog reutilizable con campos: destinatario (email), asunto, vista previa del contenido
- Botón de envío que invoca la Edge Function
- Feedback de éxito/error con toast

### 4. Integrar envío en Recibos de Sueldo
Archivo: `src/pages/Liquidacion.tsx` (tab "Guardadas")
- Agregar botón "Enviar por email" en cada fila de liquidación
- Al hacer click, abre el dialog con el email del empleado precargado y genera el PDF del recibo como HTML simplificado para el cuerpo del email (o adjunta link)
- Usa el email del empleado desde la tabla `empleados`

### 5. Integrar envío en Memorándums
Archivo: `src/pages/Memorandums.tsx`
- Agregar botón "Enviar por email" en memorándums con estado "enviado" o superior
- Precarga el email del empleado destinatario
- Envía el contenido del memorándum como cuerpo del email

### 6. Integrar envío de Notificaciones por email
Archivo: `src/hooks/useNotificaciones.ts` o nuevo hook
- Función opcional para enviar notificación también por email cuando se crea una notificación interna (permisos aprobados/rechazados, vacaciones, etc.)
- Requiere que el empleado tenga email cargado

### 7. Configuración del remitente
Archivo: `src/pages/Configuracion.tsx`
- Agregar campo para configurar el email "from" (ej: `rrhh@tudominio.com`)
- Guardar en `configuracion_grupo` (requiere migración para agregar columna `email_remitente`)

## Migración de base de datos

Agregar columna `email_remitente` a `configuracion_grupo`:
```sql
ALTER TABLE configuracion_grupo ADD COLUMN email_remitente text DEFAULT 'onboarding@resend.dev';
```

## Archivos nuevos/modificados

| Archivo | Cambio |
|---------|--------|
| `supabase/functions/send-email/index.ts` | Nueva Edge Function para envío vía Resend |
| `src/components/EnviarEmailDialog.tsx` | Nuevo dialog reutilizable de envío |
| `src/pages/Liquidacion.tsx` | Botón enviar recibo por email |
| `src/pages/Memorandums.tsx` | Botón enviar memorándum por email |
| `src/pages/Configuracion.tsx` | Campo email remitente |
| Migración SQL | Columna `email_remitente` en `configuracion_grupo` |

## Notas técnicas

- Se usa la API REST de Resend directamente (no SDK) desde la Edge Function para compatibilidad con Deno
- Los emails se envían en formato HTML con el contenido del documento
- No se adjuntan PDFs (limitación de la infraestructura); en su lugar se incluye el contenido formateado en el cuerpo del email
- El dominio de prueba de Resend (`onboarding@resend.dev`) permite testear sin dominio propio verificado

