

# Plan: Generar PDF instructivo del sistema TotalRH por área

## Contenido del documento

El PDF contendrá un instructivo completo organizado por rol/área con las siguientes secciones:

1. **Portada**: Logo TotalRH, título "Manual de Usuario", fecha
2. **Índice**
3. **Introducción general**: Qué es TotalRH, cómo acceder, roles disponibles
4. **Sección Administrador**: Dashboard, Legajos, Empresas, Liquidación, Memorándums, Asistencia, Vacaciones, Reclutamiento, Reportes BI, Configuración (usuarios, notificaciones, horarios)
5. **Sección RRHH / Gerente**: Mismos módulos sin Configuración
6. **Sección Contador**: Dashboard (solo lectura), Legajos (solo lectura), Liquidación (edición completa), Asistencia y Vacaciones (solo lectura)
7. **Sección Empleado**: Portal de Autogestión (datos personales, documentos, permisos, vacaciones, memorándums, sanciones, fichadas, recibos, cambio de contraseña, instalación PWA)
8. **Sección Registro de Asistencia**: Terminal de fichada con código de 6 dígitos
9. **Preguntas frecuentes**

## Implementación

- Generar con ReportLab (Python) usando estilos profesionales
- Colores de marca basados en el sistema (azul primario)
- Guardar en `/mnt/documents/Manual_TotalRH.pdf`
- QA visual obligatorio

## Archivos
- Script temporal en `/tmp/gen_manual.py`
- Salida: `/mnt/documents/Manual_TotalRH.pdf`

