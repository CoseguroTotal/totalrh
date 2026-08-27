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

## 2. Acceso a la demo por código

- Botón "Acceder a la demo" abre un diálogo que pide un código.
- El código es **uno solo, compartido**, guardado en el backend (no en el código fuente del sitio) y verificado por una función de backend.
- Si es correcto, se guarda un permiso de acceso en el navegador (válido 24 h) y el visitante pasa a la pantalla de login normal. No se muestran credenciales en pantalla: se comparten aparte.
- Si es incorrecto: mensaje de error y límite de intentos por minuto.
- Sin ese permiso, `/login` redirige a la landing. Las rutas internas siguen protegidas por sesión como hoy.

## 3. Navegación

- `/` = landing, siempre, incluso con sesión iniciada. Si hay sesión, el hero muestra además "Volver al sistema".
- El sistema pasa a `/app` (dashboard), `/app/legajos`, etc. Se mantienen redirecciones desde las rutas viejas para no romper enlaces ni la PWA.
- `/login`, `/autogestion` y `/registro-asistencia` mantienen su comportamiento actual.

## Detalles técnicos

- Nueva página `src/pages/Landing.tsx` + secciones en `src/components/landing/`.
- Capturas existentes de `/mnt/documents/_shots` copiadas a `src/assets/landing/` e importadas como assets (optimizadas a ancho web).
- Código de demo: secreto `DEMO_ACCESS_CODE` + edge function `verify-demo-code` (pública, con rate limit simple por IP) que devuelve solo válido/inválido. El cliente guarda un flag con expiración en `localStorage`; es una barrera comercial, no de seguridad — la seguridad real sigue siendo el login y las políticas de la base.
- Guard `DemoGate` en la ruta `/login`.
- `index.html`: título y meta descripción orientados a la landing comercial.
- No se toca la lógica de negocio existente (liquidación, asistencia, memorándums).

Antes de empezar necesito el código de acceso que querés usar (o genero uno y te lo paso).
