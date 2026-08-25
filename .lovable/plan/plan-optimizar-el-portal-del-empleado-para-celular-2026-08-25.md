# Plan: Optimizar el portal del empleado para celular

## Objetivo
Que el empleado use el sistema desde el celular con una experiencia tipo app: navegación con barra inferior, encabezado compacto, tarjetas en vez de filas apretadas y botones grandes.

## Cambios

### 1. Navegación inferior (mobile) para rol empleado
- Nueva barra fija al pie con 5 accesos: **Fichar**, **Permisos**, **Vacaciones**, **Docs**, **Perfil**.
- Solo visible en pantallas chicas y solo para el rol empleado; en desktop sigue el sidebar actual.
- Respeta el área segura del iPhone (notch/barra inferior).

### 2. Encabezado compacto en mobile
- Oculta el buscador (ya oculto) y reduce alto del header.
- Muestra logo TotalRH + nombre del empleado y la campana de notificaciones.
- El pie de página con la marca de agua pasa a ser menos invasivo en mobile (queda debajo del contenido, no compite con la barra inferior).

### 3. Reemplazar la tira de 10 pestañas
- En mobile, las secciones se agrupan en la barra inferior; dentro de cada grupo se usan sub-pestañas cortas (ej. Perfil → Datos, Sanciones, Memos, Recibos, Fichadas, Clave).
- En desktop se conservan las pestañas actuales.

### 4. Contenido táctil
- Listas de permisos, vacaciones, memos, sanciones, recibos y fichadas pasan a tarjetas apiladas con estado visible y botón de acción de al menos 44px.
- Formularios (vacaciones, descargo, cambio de clave) en una sola columna en mobile, inputs de alto cómodo y teclado correcto (fecha/número).
- El bloque de fichado por QR queda como acción principal arriba, con botón grande a ancho completo.

### 5. Detalles PWA/mobile
- Padding lateral consistente, sin scroll horizontal.
- Scroll suave y `overscroll` controlado.
- Verificación con capturas a 390x844 (iPhone) y 360x800 (Android).

## Detalles técnicos
| Archivo | Cambio |
|---|---|
| `src/components/AppLayout.tsx` | Header compacto en mobile, padding del `main`, footer adaptado, render de la barra inferior |
| `src/components/EmployeeBottomNav.tsx` (nuevo) | Barra de navegación inferior para rol empleado |
| `src/pages/Autogestion.tsx` | Secciones agrupadas, tarjetas responsivas, formularios de una columna, hero de fichado a ancho completo |
| `src/index.css` | Utilidades de safe-area si hacen falta |

Sin cambios de lógica de negocio, base de datos ni permisos.
