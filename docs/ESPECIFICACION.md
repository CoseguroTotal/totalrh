# TotalRH — Especificación funcional original

Desarrollaremos un aplicativo para manejar y gestionar el area de recursos humanos del personal de un grupo empresario con varias empresas:  contara con: 1. Módulo de Legajo Digital Centralizado

Es el corazón del sistema. No es solo una base de datos, es el repositorio legal del empleado.

Funcionalidades Clave:

Gestión de Documentación: Carga de DNI, constancia de CUIL, títulos y certificados con alertas de vencimiento (ideal para carnets de conducir en logística o libretas sanitarias).

Histórico de Eventos: Registro de promociones, cambios de puesto, sanciones y licencias en una línea de tiempo auditable.

Firma Digital/Electrónica: Integración con validación por OTP (One Time Password) o tokens para que el empleado firme contratos y notificaciones con validez legal (Ley 25.506).

Interfaz de Usuario (UI):

Vista de Perfil 360: Una pantalla limpia tipo "LinkedIn interno" donde el gestor de RR.HH. ve la foto, datos de contacto, CCT aplicado y estado actual (Activo/Licencia/Baja).

Explorador de Archivos: Interfaz similar a Google Drive para organizar carpetas por empleado con previsualización rápida de PDFs sin descargar.

2. Motor de Liquidación de Haberes (Payroll Engine)

El módulo más complejo. Debe ser un motor de reglas, no un código estático, para adaptarse a las paritarias constantes de Argentina.

Funcionalidades Clave:

Configurador de Conceptos: Creación de conceptos remunerativos, no remunerativos y descuentos mediante fórmulas lógicas. Ejemplo de lógica interna:

$$\text{Sueldo Neto} = (\text{Básico} + \text{Adicionales CCT}) - (\text{Jubilación} + \text{Ley 19.032} + \text{Obra Social} + \text{Cuota Sindical})$$

Gestión de Ganancias (4ta Categoría): Cálculo automático de retenciones, considerando deducciones generales y cargas de familia informadas vía SIRADIG.

Exportaciones Legales: Generación automática del archivo para el Libro de Sueldos Digital (AFIP), F.931, y archivos de exportación para todos los bancos (ICBC, Galicia, Macro, etc.).

Interfaz de Usuario (UI):

Panel de Control de Novedades: Una grilla interactiva (tipo Excel vitaminado) donde se cargan masivamente horas extras, premios o descuentos del mes.

Simulador de Recibo: Una ventana dividida donde a la izquierda editas novedades y a la derecha ves el recibo de sueldo actualizándose en tiempo real.

3. Portal de Autogestión del Empleado (App Móvil/Web)

Diseñado para eliminar el "papeleo" y las consultas repetitivas a la oficina de RR.HH.

Funcionalidades Clave:

Visualización de Recibos: Acceso histórico a todos los recibos. El sistema notifica: "Tu recibo de marzo está listo para firmar".

Gestión de Licencias: El empleado solicita vacaciones viendo su saldo disponible. El sistema valida automáticamente si se solapa con otros miembros del equipo.

Comunicación Interna: Muro de anuncios, beneficios corporativos y acceso a la credencial digital de la prepaga o ART.

Interfaz de Usuario (UI):

Mobile First: Diseño basado en tarjetas (cards) grandes, fácil de usar para personal de planta o campo que no usa PC.

Dashboard de Saldo: Un gráfico circular simple que muestra "Días de vacaciones: 14 totales, 5 usados, 9 disponibles".

4. Control de Tiempo, Asistencia y Ausentismo

Crucial para grupos con plantas industriales o múltiples sucursales.

Funcionalidades Clave:

Fichada Multimodal: Integración con relojes biométricos, reconocimiento facial o fichada por App con geocerca (geofencing) para asegurar que el empleado está en el lugar de trabajo.

Gestión de Turnos Rotativos: Calendario dinámico para asignar turnos mañana/tarde/noche y guardias.

Cierre de Novedades: El sistema detecta automáticamente llegadas tarde y ausencias, y consulta al supervisor si deben descontarse o justificarse antes de pasar a liquidación.

Interfaz de Usuario (UI):

Monitor de Asistencia en Tiempo Real: Mapa de calor o lista que muestra quién está "In" y quién "Out" en cada sucursal del grupo.

Calendario de Equipo: Vista mensual para gerentes donde ven las licencias programadas de todo su equipo para evitar falta de personal.

5. Módulo de Reclutamiento (ATS) y Onboarding

Para gestionar el crecimiento del grupo empresario de forma organizada.

Funcionalidades Clave:

Multi-posting: Publicar una vacante simultáneamente en el portal interno, LinkedIn y portales de empleo.

Pipeline de Candidatos: Tablero tipo Kanban (como Trello) para mover candidatos desde "Postulado" hasta "Entrevista" y "Contratado".

Kit de Bienvenida Digital: Una vez contratado, el sistema envía automáticamente al nuevo empleado los videos de inducción, códigos de ética y solicitud de datos para el alta.

Interfaz de Usuario (UI):

Kanban de Selección: Tarjetas de candidatos con etiquetas de "Match" según habilidades requeridas.

Scorecard de Entrevista: Formulario rápido para que el entrevistador califique al candidato desde el celular inmediatamente después de la charla.

6. Business Intelligence y Reportes Gerenciales

La herramienta para la toma de decisiones del Directorio (C-Level).

Funcionalidades Clave:

Indicadores de Gestión (KPIs): Tasa de rotación mensual, costo laboral por unidad de negocio y ausentismo por departamento.

Análisis de Brecha Salarial: Reportes que comparan salarios internos vs. mercado o entre géneros y categorías.

Interfaz de Usuario (UI):

Dashboard Ejecutivo: Gráficos interactivos (barras, tortas, líneas de tendencia) con filtros por empresa del grupo, sucursal o CCT.
