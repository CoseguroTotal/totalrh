# Plan: Botón de Fichar prominente en el portal del empleado

## Resumen
Actualizar el portal de Autogestión para que la acción de fichar sea la primera y más visible al ingresar. Se colocará una tarjeta de fichado destacada al inicio de la página, antes de las pestañas secundarias (datos, permisos, vacaciones, etc.), con acceso directo a QR y código de 6 dígitos.

## Cambios propuestos

### 1. Hero de fichado al inicio de Autogestión
- Agregar una tarjeta prominente justo debajo del título "Portal de Autogestión".
- Mostrar dos botones principales:
  - **Escanear QR** (botón primario grande, con ícono de cámara) para activar la cámara inmediatamente.
  - **Código de 6 dígitos** (botón secundario) para mostrar el token TOTP como alternativa.
- Incluir el último resultado de fichada (entrada/salida + hora) si hay una reciente, para dar feedback inmediato.
- Si el fichado está desactivado desde Configuración, mostrar un mensaje informativo en lugar de los botones.

### 2. Mantener la pestaña "Fichar"
- Conservar el tab actual "Fichar" como vista completa/detalle con la misma funcionalidad, por si el usuario prefiere el flujo anterior.

### 3. Mobile-first y accesibilidad
- Diseño responsive: la tarjeta ocupará el ancho completo en móvil y se adaptará en desktop.
- Botones grandes (mínimo 48 px de alto) para facilitar el toque en PWA.
- No se modificarán roles, permisos, ni la lógica de validación del token/QR.

## Archivos a editar

| Archivo | Cambio |
| --- | --- |
| `src/pages/Autogestion.tsx` | Agregar componente `HeroFichar` al inicio del render; reutilizar `FicharTab` y estado de escaneo/resultado. |

## Criterios de aceptación
- Al entrar a `/autogestion`, el empleado ve inmediatamente la opción de fichar sin necesidad de abrir una pestaña.
- El botón "Escanear QR" abre la cámara y valida el código de la misma forma que la pestaña actual.
- El botón alternativo muestra el código de 6 dígitos con su contador de expiración.
- El build compila sin errores y la vista se adapta a pantallas de celular.
