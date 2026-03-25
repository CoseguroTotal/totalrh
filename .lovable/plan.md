

# Plan: Responsividad Autogestión + PWA para empleados

## Problemas de responsividad detectados

1. **TabsList con 8 pestañas**: No cabe en pantalla de celular. Se necesita scroll horizontal o layout scrollable.
2. **Grid "Mis Datos"**: `grid-cols-2 sm:grid-cols-3` funciona pero el card padding es grande para mobile.
3. **Solicitudes de permiso**: El layout `flex items-center gap-3` puede apretar texto en mobile.
4. **Vacaciones**: Grid `grid-cols-3` para los contadores puede quedar apretado en 320px.
5. **Tabla Fichadas**: Ya tiene `overflow-x-auto`, OK.
6. **Token**: El código `text-5xl tracking-[0.4em]` puede desbordar en pantallas chicas.

## Cambios a implementar

### 1. Responsividad del TabsList (Autogestion.tsx)

- Hacer el `TabsList` scrollable horizontalmente con `overflow-x-auto` y `w-full`
- Ocultar iconos en mobile (solo texto) o reducir tamaño
- Asegurar que no se haga wrap desordenado

### 2. Ajustes responsive en cada pestaña

| Sección | Cambio |
|---------|--------|
| Mis Datos | Cambiar grid a `grid-cols-1 sm:grid-cols-2 md:grid-cols-3`, reducir padding en mobile |
| Solicitudes | Stack vertical en mobile: fecha debajo del motivo, badge y botón en fila aparte |
| Vacaciones | Contadores `grid-cols-3` con texto más compacto, formulario `grid-cols-1` en mobile (ya es así) |
| Memorándums | Contenido y botones stack en mobile |
| Sanciones | Descargo form con padding reducido en mobile |
| Fichadas | Tabla compacta con `text-xs` en mobile |
| Token | Código `text-4xl sm:text-5xl`, reducir tracking en mobile |

### 3. PWA - Prompt de instalación para empleados

La PWA ya está configurada en `vite.config.ts` con `vite-plugin-pwa`. Falta:

- **Crear componente `InstallPWAPrompt.tsx`**: Detecta el evento `beforeinstallprompt`, muestra un banner/botón "Instalar App" solo para usuarios con rol `empleado`
- **Integrar en `Autogestion.tsx`**: Mostrar el prompt de instalación en la parte superior de la página
- **Agregar instrucciones iOS**: En Safari no hay `beforeinstallprompt`, mostrar instrucciones manuales ("Compartir → Agregar a inicio")

### 4. Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/Autogestion.tsx` | Ajustes responsive en todos los tabs + integrar InstallPWAPrompt |
| `src/components/InstallPWAPrompt.tsx` | Nuevo componente para detectar y ofrecer instalación PWA |

