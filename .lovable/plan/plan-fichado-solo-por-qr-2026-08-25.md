# Plan: Fichado solo por QR

Se elimina el método de fichado por código de 6 dígitos. El QR dinámico queda como único método.

## Cambios

### Portal del Empleado (Autogestión)
- Quitar el botón "Código de 6 dígitos" del bloque destacado de fichado (Hero).
- Quitar el bloque "Token de Asistencia" y el componente que genera/muestra el código.
- La pestaña "Fichar" queda solo con el escáner de QR.

### Terminal de Asistencia (sucursales)
- Quitar el teclado/campo de ingreso manual del código de 6 dígitos.
- La pantalla muestra únicamente el QR que se renueva automáticamente.

### Configuración
- Quitar el interruptor "Fichado por código de 6 dígitos".
- Queda solo el interruptor de fichado por QR y la duración del QR.

## Detalles técnicos
- `src/pages/Autogestion.tsx`: eliminar `TokenAsistenciaTab`, estados `mostrarToken` y ramas `tokenActivo` en Hero y en la pestaña.
- `src/pages/RegistroAsistencia.tsx`: eliminar la UI y el submit del código (`action: "validate"`).
- `src/pages/Configuracion.tsx`: eliminar el toggle `fichado_token_activo`.
- La Edge Function `validate-attendance-token` mantiene las acciones `qr-issue` / `qr-fichar`; las acciones de token quedan sin uso desde la UI (no se borran para no romper datos existentes).
- No se modifica la base de datos.
