# Landing comercial + acceso a la demo por código

La raíz del sitio pasa a ser una landing de venta. El sistema queda detrás de un código de acceso.

## 1. Landing page (`/`)

Página pública con el contenido completo de la presentación comercial, en el mismo orden:

1. Hero con logo, propuesta de valor y botón "Acceder a la demo"
2. El problema: RRHH en planillas, fichado manipulable, riesgo legal
3. La solución: TotalRH en una pantalla (captura del dashboard)
4. Módulos clave con captura: Legajo digital, Liquidación CCT 130/75, Asistencia QR, Vacaciones LCT, Memorándums y sanciones, Reclutamiento, Reportes/BI
5. Fichado por QR: cómo elimina el fichado por terceros (diagrama del flujo en 4 pasos)
6. Cumplimiento argentino: LCT, CCT 130/75, CUIL/CUIT, Ley 25.506, exportaciones AFIP
7. Seguridad: roles y permisos, datos protegidos, documentos con acceso temporal
8. Multiempresa: Grupo > Empresas > Sucursales
9. Móvil: portal del empleado / PWA instalable
10. Cierre con contacto y segundo botón de acceso a la demo

Diseño con la identidad de marca (teal #26A69A / cyan #4FC3F7), mobile-first, capturas reales del sistema con marco tipo navegador. SEO: título, meta descripción, H1 único, alt en todas las capturas.

## 2. Acceso a la demo con email + código enviado por mail

Flujo en 2 pasos desde el botón "Acceder a la demo":

1. El visitante deja **nombre, email corporativo, empresa y teléfono (opcional)**.
2. El sistema le envía por email un **código de 6 dígitos** (válido 15 minutos, un solo uso) con diseño de marca TotalRH.
3. Ingresa el código y pasa a la pantalla de login. El acceso queda habilitado 24 h en ese navegador. Las credenciales demo se comparten aparte, no se muestran en pantalla.

Protecciones: máximo de reenvíos por email/IP, código de un solo uso, expiración, y validación tanto del email como del código en el backend.

## 3. Base de contactos (leads) y vista superadmin

- Cada solicitud queda registrada: nombre, email, empresa, teléfono, fecha, si verificó el código, cuántas veces entró y último acceso.
- Nueva sección **"Solicitudes de demo"** dentro de Configuración, visible **solo para el superadmin** (mcponce.torres@gmail.com). Invisible para el resto de los roles, incluidos otros administradores.
- Permite ver la lista, buscar, y **exportar a Excel/CSV** para usarla en futuras campañas comerciales.
- Notificación opcional: aviso por email al superadmin cada vez que alguien pide acceso a la demo.

## 4. Navegación

- `/` = landing, siempre, incluso con sesión iniciada. Si hay sesión, el hero muestra además "Volver al sistema".
- El sistema pasa a `/app` (dashboard), `/app/legajos`, etc. Se mantienen redirecciones desde las rutas viejas para no romper enlaces ni la PWA.
- `/login`, `/autogestion` y `/registro-asistencia` mantienen su comportamiento actual.

## Detalles técnicos

- Nueva página `src/pages/Landing.tsx` + secciones en `src/components/landing/`.
- Capturas existentes de `/mnt/documents/_shots` copiadas a `src/assets/landing/` e importadas como assets (optimizadas a ancho web).
- Tabla `demo_leads` (datos de contacto + estado) y `demo_codigos` (código hasheado, expiración, consumido). RLS: sin acceso público de lectura; escritura solo desde funciones de backend con service role. Lectura habilitada únicamente para el superadmin vía función `is_superadmin()`.
- Dos edge functions públicas: `demo-request-code` (valida datos con Zod, guarda/actualiza el lead, genera el código, lo envía con Resend desde `notificaciones@notificaciones.cosegurototal.com.ar`, rate limit por email/IP) y `demo-verify-code` (valida el código y devuelve un permiso corto que el cliente guarda en `localStorage`).
- Guard `DemoGate` en la ruta `/login`; sin permiso, redirige a la landing.
- El superadmin se identifica por email en una función `SECURITY DEFINER`, no por rol editable desde la UI.
- `index.html`: título y meta descripción orientados a la landing comercial.
- Aviso legal breve en el formulario: los datos se usan para contacto comercial (requisito de datos personales AR).
- No se toca la lógica de negocio existente (liquidación, asistencia, memorándums).

