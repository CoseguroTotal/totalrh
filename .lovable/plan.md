

# Plan: Envío masivo de memorándums + fix del dominio remitente

## Dos cambios principales

### 1. Configurar el dominio verificado como remitente

El `email_remitente` en `configuracion_grupo` todavía dice `onboarding@resend.dev`. Hay que actualizarlo a una dirección del dominio verificado (ej: `notificaciones@notificaciones.cosegurototal.com.ar`).

- En `Configuracion.tsx`, agregar nota informativa indicando que el email debe pertenecer al dominio verificado en Resend.

### 2. Envío masivo de memorándums

Agregar un botón "Envío Masivo" en la página de Memorándums que abre un dialog con tres modos de selección de destinatarios:

**Nuevo componente `EnvioMasivoMemoDialog.tsx`:**
- Selector de modo: "Todos", "Por empresa", "Selección manual"
- **Todos**: envía a todos los empleados activos con email
- **Por empresa**: selector de empresa, filtra empleados activos de esa empresa con email
- **Selección manual**: lista de checkboxes con todos los empleados activos con email
- Vista previa de cantidad de destinatarios seleccionados
- Selector de memorándum existente (o los campos para redactar uno nuevo inline)
- Botón "Enviar a X destinatarios" con confirmación
- Progreso visual del envío (barra o contador)
- Envía secuencialmente al Edge Function `send-email` (un email por empleado), personalizando el nombre del destinatario en el HTML

**Modificación del Edge Function `send-email`:**
- Ya soporta `to` como array, no necesita cambios.

**Cambios en `Memorandums.tsx`:**
- Botón "Envío Masivo" junto al botón "Nuevo"
- Estado para abrir el dialog de envío masivo
- Pasar la lista de memos, empleados, empresas y config al dialog

## Archivos nuevos/modificados

| Archivo | Cambio |
|---------|--------|
| `src/components/EnvioMasivoMemoDialog.tsx` | Nuevo dialog para envío masivo |
| `src/pages/Memorandums.tsx` | Botón envío masivo + integración del dialog |

## Notas técnicas

- Cada email se envía individualmente (no en batch) para personalizar el destinatario en el HTML
- Se usa `Promise.allSettled` o envío secuencial con delay para no saturar la API de Resend
- Solo se incluyen empleados activos que tengan email cargado
- Se muestra resumen al final: X enviados, X fallidos

