

# Plan: Historial de fichadas en Autogestión + verificación rol registro_asistencia

## Estado actual del rol `registro_asistencia`

Revisado el código, el rol ya está correctamente implementado:
- Está en el enum `app_role` de la base de datos
- Está en el array `ROLES` de Configuración (línea 22) — se puede crear desde "Crear Usuario"
- `AppSidebar.tsx` muestra solo "Registro" para ese rol
- `EmployeeGuard.tsx` redirige a `/registro-asistencia`
- La página `RegistroAsistencia.tsx` es minimalista: solo input de token + botón fichar
- La ruta está en `App.tsx` fuera del `AppLayout` (sin sidebar)

No se requieren cambios para el rol. Todo funciona correctamente.

## Cambios a implementar

### 1. Agregar pestaña "Fichadas" en Autogestión

**Archivo**: `src/pages/Autogestion.tsx`

- Agregar import de `useFichadasEmpleado` desde `@/hooks/useAsistencia`
- Agregar import del icono `Clock` (ya está en lucide-react)
- Nueva pestaña "Fichadas" en el `TabsList` con icono `Clock`
- Nuevo `TabsContent` con componente `FichadasTab` que muestre:
  - Selector de mes (input type="month")
  - Tabla con columnas: Fecha, Entrada, Salida, Estado
  - Formato de hora legible en zona horaria local
  - Mensaje cuando no hay fichadas

### 2. Componente `FichadasTab`

Dentro de `Autogestion.tsx`, nuevo componente interno:
- Recibe `empleadoId` como prop
- Usa `useFichadasEmpleado(empleadoId, mes)` para obtener los datos
- Estado local `mes` inicializado al mes actual (formato YYYY-MM)
- Muestra tabla con las fichadas ordenadas por fecha descendente
- Cada fila muestra: fecha formateada, hora entrada, hora salida (o "—"), estado con badge de color

---

## Detalle técnico

- El hook `useFichadasEmpleado` ya existe en `src/hooks/useAsistencia.ts` y acepta `empleadoId` y `mes` opcional
- No se necesitan cambios en la base de datos ni nuevas migraciones
- No se necesitan cambios en el edge function ni en la configuración

