# Manual actualizado + Presentación comercial

Dos documentos PDF nuevos, generados con capturas reales del sistema.

## 1. Manual del sistema (v2)

Reestructurado y con el fichado actualizado:

- **Fichado por QR como único método**: se elimina toda mención al código de 6 dígitos (token) en el manual anterior. Se documenta el flujo real: la terminal de sucursal muestra un QR que se renueva cada 10 segundos, el empleado lo escanea desde "Fichar ahora" en su celular, y la terminal muestra las últimas fichadas del día.
- **Restricciones de acceso corregidas**: rol Contador limitado a Dashboard, Legajos, Liquidación, Asistencia, Vacaciones y Reportes; rol Registro de Asistencia limitado exclusivamente a la pantalla de fichado.
- **Más capturas de pantalla**: una o dos imágenes por módulo (Dashboard, Legajos y detalle de legajo, Empresas, Liquidación, Memorándums, Asistencia, Vacaciones, Reclutamiento, Reportes, Configuración, Terminal QR, Portal del Empleado en vista celular).
- **Estructura**: portada con marca, índice, guía rápida por rol, luego un capítulo por módulo (para qué sirve, paso a paso, captura), y cierre con preguntas frecuentes y contacto de soporte.
- Pie de página en todas las hojas: "TotalRH - Gestión de Personal. Sky Studio 2026 todos los derechos reservados."

## 2. Presentación de venta (PDF)

Enfoque mixto: valor de negocio para dirección + demostración de funcionalidades para RRHH.

Contenido previsto:

1. Portada con logo y propuesta de valor
2. El problema: gestión de RRHH en planillas, fichado manipulable, riesgo legal
3. La solución: TotalRH en una pantalla (captura del dashboard)
4. Módulos clave, con captura: Legajo digital, Liquidación CCT 130/75, Asistencia con QR anti-fraude, Vacaciones LCT, Memorándums y sanciones, Reclutamiento, Reportes/BI
5. Fichado por QR: cómo elimina el fichado por terceros (diagrama del flujo)
6. Cumplimiento argentino: LCT, CCT 130/75, CUIL/CUIT, Ley 25.506, exportaciones AFIP
7. Seguridad: roles, permisos por rol, datos protegidos, documentos con acceso temporal
8. Multiempresa: Grupo > Empresas > Sucursales
9. Móvil: portal del empleado / PWA instalable
10. **Acceso a la demo**: URL publicada y tabla con los usuarios demo y la contraseña compartida (admin, rrhh, gerente, contador, usuario, empleado, terminal)
11. Cierre y contacto

## Detalles técnicos

- Capturas tomadas con Playwright contra el preview local (`localhost:8080`), iniciando sesión con los usuarios demo ya creados; vista de escritorio 1440x900 y vista celular 390x844 para el portal del empleado.
- PDFs generados con ReportLab (Platypus), fuente Unicode DejaVu para acentos, paleta de marca teal `#26A69A` / cyan `#4FC3F7`.
- Salida en `/mnt/documents`: `Manual_TotalRH_v2.pdf` y `Presentacion_Comercial_TotalRH.pdf`.
- QA obligatorio: cada página se convierte a imagen y se revisa (texto cortado, solapamientos, capturas ilegibles) antes de entregar.
- No se modifica código de la aplicación.
