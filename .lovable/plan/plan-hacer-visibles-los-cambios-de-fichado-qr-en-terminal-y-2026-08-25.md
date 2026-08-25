# Plan: hacer visibles los cambios de fichado QR en terminal y empleado

## Diagnóstico confirmado

- El build actual está correcto (`build OK`).
- `src/pages/RegistroAsistencia.tsx` ya contiene la nueva terminal con pestañas **QR** y **Código**.
- `src/pages/Autogestion.tsx` ya contiene la pestaña **Fichar** con lector QR y código alternativo.
- La captura muestra una pantalla anterior de la terminal, sin pestañas ni QR, por lo que el problema apunta a carga de versión vieja/caché/ruta, no a una falta total del código QR.

## Objetivo

Que los cambios se vean inmediatamente en:

1. La pantalla de terminal de asistencia.
2. El panel de Autogestión del empleado.
3. La app instalada/PWA y la versión publicada, evitando que una versión anterior quede cacheada.

## Cambios propuestos

### 1. Corregir navegación después del login

- Al iniciar sesión, redirigir según rol:
  - `registro_asistencia` → `/registro-asistencia`
  - `empleado` → `/autogestion`
  - roles administrativos → `/`
- Esto evita que el usuario de terminal quede en `/login` o vea una pantalla vieja/intermedia.

### 2. Proteger la ruta de terminal por rol

- Asegurar que `/registro-asistencia` sea usada por el rol `registro_asistencia`.
- Mantener acceso administrativo solo si ya corresponde por las reglas actuales.
- Evitar que empleados o roles no autorizados entren a la terminal.

### 3. Forzar una actualización segura de la PWA instalada

- Revisar la configuración actual de PWA, porque puede estar sirviendo una versión cacheada.
- Aplicar una estrategia segura para que la app instalada tome la nueva versión.
- Evitar registrar service worker en preview/desarrollo para que Lovable muestre siempre la versión más reciente.

### 4. Verificar pantallas reales

- Abrir la preview y confirmar visualmente:
  - `/registro-asistencia` muestra QR + pestaña Código.
  - `/autogestion` muestra pestaña **Fichar** con opción QR.
- Revisar consola/runtime si algo bloquea la carga del QR o del lector de cámara.

## Detalle técnico

- Archivos a revisar/modificar:

| Archivo | Cambio |
|---|---|
| `src/pages/Login.tsx` | Redirección por rol después del login |
| `src/App.tsx` / guards | Confirmar rutas y permisos por rol |
| `vite.config.ts` / entrada PWA | Ajustar comportamiento de service worker/cache si está causando versión vieja |
| `src/pages/RegistroAsistencia.tsx` | Solo ajustes si la ruta muestra contenido incorrecto |
| `src/pages/Autogestion.tsx` | Solo ajustes si la pestaña Fichar no se renderiza para empleados |

## Resultado esperado

- La terminal ya no muestra solo el campo de código como pantalla principal.
- La terminal muestra el QR dinámico como modo predeterminado y conserva el código como alternativa.
- El empleado ve la pestaña **Fichar** en Autogestión.
- La preview y la app publicada/instalada dejan de mostrar versiones anteriores después de actualizar.
