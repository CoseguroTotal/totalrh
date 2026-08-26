# Verificación operativa + usuarios demo por rol

## Situación actual (verificada)

La base de datos del proyecto está **vacía**: 0 empresas, 0 empleados, 0 registros en `user_roles`. Las 29 tablas y las funciones de base existen, y hay 3 funciones de backend desplegadas (`create-user`, `send-email`, `validate-attendance-token`). Es decir: el sistema está estructuralmente completo, pero no hay datos ni usuarios con los que probarlo.

`create-user` exige que quien llama ya sea **admin**, por lo que el primer administrador debe crearse desde el backend, no desde la pantalla de Usuarios.

## Qué se hará

### 1. Datos base mínimos
- 1 grupo (`configuracion_grupo`) con nombre, CUIT y remitente de email ya verificado.
- 1 empresa demo + 2 sucursales.
- Turnos estándar y conceptos de liquidación del CCT 130/75 (básicos, antigüedad, presentismo, jubilación, obra social, sindicato).
- Escala de vacaciones (`vacaciones_config`) según LCT.
- Restricciones de horario de ejemplo, desactivadas por defecto.

### 2. Usuarios demo, uno por rol
Se crean 7 cuentas con email confirmado y contraseña temporal común:

| Rol | Email | Para qué sirve |
|---|---|---|
| admin | admin@demo... | Acceso total, configuración, usuarios |
| rrhh | rrhh@demo... | Legajos, memorándums, vacaciones |
| gerente | gerente@demo... | Aprobaciones y reportes |
| contador | contador@demo... | Liquidación y exportaciones |
| usuario | usuario@demo... | Consulta general |
| empleado | empleado@demo... | Portal de autogestión + fichado QR |
| registro_asistencia | terminal@demo... | Pantalla terminal de fichado QR |

El usuario `empleado` queda vinculado a un legajo real (con `codigo_asistencia`), y se cargan 3 empleados demo adicionales para poblar listados.

### 3. Recorrido de verificación funcional
Con esos usuarios se comprueba, rol por rol, que cada módulo responde y que las políticas de acceso hacen lo esperado:
- Login y redirección por rol (el terminal debe ir directo a la pantalla de fichado).
- Legajos: alta, documentos, datos médicos, grupo familiar.
- Memorándums: individual y masivo, PDF y envío de email.
- Vacaciones y permisos: solicitud desde autogestión y aprobación desde gestión.
- Asistencia: QR rotativo en terminal, escaneo desde el portal del empleado, historial de fichadas.
- Liquidación: generación de recibo y visualización desde autogestión.
- Reclutamiento, reportes y dashboard.
- Portal móvil del empleado y PWA.

Al final se entrega un informe con el estado de cada módulo (OK / con observación) y la corrección de lo que aparezca roto.

## Notas técnicas
- Datos base por migración SQL; usuarios auth creados vía backend con la service role (no se pueden insertar por SQL directo).
- Contraseña temporal única para todas las cuentas demo, con recomendación de cambiarla antes de producción.
- Las cuentas quedan claramente identificables como demo para poder borrarlas de una sola pasada.
