# Enviar los emails desde no-reply@totalrh.com.ar (Resend)

Hoy el sistema envía desde `notificaciones@notificaciones.cosegurototal.com.ar` y todos los envíos fallan con un error 403 de Resend: la API key guardada no está autorizada para ese dominio. Vamos a cambiar el remitente a `no-reply@totalrh.com.ar` y a dejar el envío operativo.

## Lo que hay que hacer de tu lado (en Resend)

Esto no lo puedo hacer yo, requiere tu cuenta:

1. En Resend → Domains → Add domain, agregar `totalrh.com.ar`.
2. Copiar los registros que muestra Resend (SPF, DKIM y, si lo pide, DMARC) y cargarlos en el DNS de `totalrh.com.ar`, en el mismo panel donde configuraste el dominio del sitio.
3. Esperar a que Resend marque el dominio como **Verified** (suele tardar entre minutos y algunas horas).
4. En Resend → API Keys, crear una key con permiso de envío para **todos los dominios** (o específicamente para `totalrh.com.ar`). La key actual está restringida y por eso da 403.

Cuando la tengas, te abro el formulario seguro para cargarla.

## Lo que hago yo en el sistema

- Cambiar el remitente configurado del grupo a `no-reply@totalrh.com.ar`, de modo que memorándums, notificaciones y el código de acceso a la demo salgan desde ahí.
- Actualizar el nombre visible del remitente para que en la bandeja se lea "TotalRH" y no una dirección suelta.
- Dejar `no-reply@totalrh.com.ar` como valor por defecto en el código, en lugar del `onboarding@resend.dev` que hoy queda como respaldo.
- Agregar una dirección de respuesta (`reply-to`) hacia una casilla real, para que si alguien responde el email no se pierda. Necesito que me digas cuál usar (por ejemplo `info@cosegurototal.com`); si no, lo dejo sin reply-to.
- Verificar el envío real: pedir un código de demo a tu email y confirmar en los logs que Resend lo aceptó, además de revisar que el email llegue con el remitente correcto.

## Detalles técnicos

- El remitente vive en la columna `email_remitente` de `configuracion_grupo`; lo leen `send-email` y `demo-request-code`, así que un solo cambio cubre todos los envíos.
- Los valores de respaldo `onboarding@resend.dev` en ambas funciones se reemplazan por el nuevo remitente y se redespliegan las funciones.
- La validación final se hace llamando a la función de envío y leyendo sus logs; hoy devuelve `403 not authorized`, y el objetivo es ver un `id` de Resend en la respuesta.

## Orden

El cambio de remitente lo puedo aplicar ya mismo, pero los emails recién van a salir cuando el dominio esté verificado en Resend y la nueva API key esté cargada. Si preferís, aplico el cambio ahora y hacemos la prueba de envío en cuanto tengas ambas cosas listas.
