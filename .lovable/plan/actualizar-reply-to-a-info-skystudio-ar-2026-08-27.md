# Actualizar reply-to a info@skystudio.ar

## Objetivo

Cambiar la dirección de respuesta (`reply_to`) de todos los envíos de email del sistema de `info@cosegurototal.com` a `info@skystudio.ar`.

## Cambios

1. **`supabase/functions/demo-request-code/index.ts`**
   - Reemplazar la constante `REPLY_TO` por `"info@skystudio.ar"`.
   - Esto afecta el email con el código de demo al solicitante y el aviso al superadmin.

2. **`supabase/functions/send-email/index.ts`**
   - Reemplazar el valor hardcodeado de `reply_to` por `"info@skystudio.ar"`.
   - Esto afecta memorándums, notificaciones masivas y cualquier otro envío genérico.

3. **Redesplegar ambas Edge Functions** para que tomen los valores nuevos.

## Validación

- Llamar a `demo-request-code` desde la landing y verificar en los logs que el cuerpo enviado a Resend contiene `reply_to: "info@skystudio.ar"`.
- Enviar un memorándum de prueba y confirmar el mismo valor de `reply_to`.

## Alcance

Solo se actualiza la dirección de respuesta; no se modifica el remitente (`no-reply@totalrh.com.ar`) ni la configuración de Resend.
