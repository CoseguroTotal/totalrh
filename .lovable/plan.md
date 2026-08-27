# Diagnóstico y arreglo del envío del código de demo

## Qué muestran los datos actuales

- Los últimos dos pedidos de código (14:41 a mcpxi@hotmail.com y 14:43 a info@cosegurototal.com) sí generaron el código en la base.
- En los registros de la función **no hay error de Resend** en esos dos envíos (los 403 son de las 14:36, antes del cambio de dominio). Es decir: Resend aceptó el pedido y devolvió éxito, pero el mail no llegó a la bandeja.
- El remitente configurado es `no-reply@totalrh.com.ar`.

Con Resend aceptando y el mail sin llegar, las causas posibles son: el dominio `totalrh.com.ar` figura verificado pero le faltan DKIM/SPF completos (Resend acepta y luego el destinatario descarta), el mail cayó en spam, o el envío quedó frenado del lado de Resend (bounce/suppression). Hoy no podemos saber cuál es porque el sistema descarta la respuesta de Resend.

## Paso 1 — Hacer visible qué pasa con cada envío

- Guardar y registrar el `id` que devuelve Resend en cada envío (código de demo, memorándums, notificaciones), no solo los errores.
- Consultar directamente en Resend el estado de los dos envíos recientes y el estado real del dominio `totalrh.com.ar` (verificación DKIM/SPF/DMARC y si hay rebotes o supresiones sobre esas casillas).
- Con eso queda determinado si el problema es DNS, filtro antispam o supresión.

## Paso 2 — Corregir según el resultado

- **Si faltan registros DNS**: te paso los valores exactos a cargar en el registrador de `totalrh.com.ar` y reintentamos.
- **Si es filtro antispam**: agregar `reply-to` a una casilla real, texto plano alternativo además del HTML, y asunto sin formato promocional, que mejoran mucho la entrega inicial de un dominio nuevo.
- **Si hay supresión/rebote en Resend**: quitar esa dirección de la lista de supresión.

## Paso 3 — Que el usuario final no quede a ciegas

- Mostrar en la pantalla de solicitud un aviso claro de "revisá spam / puede demorar 1 minuto" y un botón de reenviar con cuenta regresiva.
- Registrar en la tabla de solicitudes de demo si el email fue aceptado por el proveedor, para que desde Configuración → Solicitudes de demo se vea qué pasó con cada pedido.

## Paso 4 — Incluir en el email los usuarios demo por rol

El email del código pasa a traer, además del código de 6 dígitos, la tabla de accesos de prueba para que el interesado pueda recorrer el sistema con cada perfil:

| Rol | Usuario | Contraseña |
| --- | --- | --- |
| Administrador | admin@demo... | TotalRH2026! |
| RRHH | rrhh@demo... | TotalRH2026! |
| Gerente | gerente@demo... | TotalRH2026! |
| Contador | contador@demo... | TotalRH2026! |
| Empleado | empleado@demo... | TotalRH2026! |
| Terminal de fichado | asistencia@demo... | TotalRH2026! |

- Cada fila lleva una línea corta explicando qué puede ver ese rol.
- Se toma la lista real de usuarios demo ya creados en el sistema (no se inventan direcciones) y se deja como constante en la función, fácil de actualizar.
- Se aclara que son credenciales compartidas de demostración y que los datos son ficticios.

## Detalles técnicos


- `supabase/functions/demo-request-code/index.ts`: capturar `resendRes.json()` y loguear `id`; añadir `reply_to` y versión `text`; guardar el id en `demo_codigos` o en `demo_leads`.
- Mismo tratamiento en `supabase/functions/send-email/index.ts`.
- Consulta de estado vía API de Resend (`/domains` y `/emails/{id}`) con la key ya configurada.
- Redeploy de ambas funciones y prueba real de punta a punta a una casilla que indiques.

## Necesito un dato

Para el `reply-to` y para probar: ¿a qué casilla real querés que lleguen las respuestas (por ejemplo `info@cosegurototal.com`)?
