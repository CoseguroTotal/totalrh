# TotalRH — Gestión de personal

Sistema de recursos humanos para un grupo empresario con varias empresas y sucursales. Funciona como red social interna (muro, chat, grupos), autogestión del empleado y back-office de RR.HH. (legajos, asistencia, liquidación).

- **App publicada**: https://totalrh.lovable.app
- **Editor Lovable**: https://lovable.dev/projects/dfcc6581-ede3-4496-be7c-bf8701500cfe
- **Especificación funcional original**: [docs/ESPECIFICACION.md](docs/ESPECIFICACION.md)

## Módulos

| Área | Pantallas | Qué hace |
| --- | --- | --- |
| Comunidad | Muro (inicio), Grupos, Mensajes, Encuestas, Eventos, Tareas, Apps | Publicaciones con imágenes, reacciones, comentarios, cumpleaños y lecturas; grupos por área; chat con imágenes, audio y documentos; encuestas; calendario de eventos y feriados; tareas propias y asignadas |
| Autogestión | Autogestion | Datos personales, recibos, vacaciones, permisos con adjuntos (PDF o foto) y fichada desde el celular |
| Legajos | Legajos, LegajoDetail, Empresas | Ficha del empleado, documentación con vencimientos, memorándums firmados por quien los emite, empresas y sucursales con geocerca |
| Asistencia | Asistencia, RegistroAsistencia | Terminal con QR y reconocimiento facial, fichada por geocerca, turnos, tardanzas, novedades y horas extra (art. 201 LCT) |
| Vacaciones | Vacaciones | Configuración por antigüedad, solicitudes y calendario con superposiciones |
| Liquidación | Liquidacion | Conceptos, liquidación mensual y liquidación final (LCT) |
| Gestión | Dashboard, Reportes, Reclutamiento, Configuracion | Indicadores, reportes, pipeline de candidatos y parámetros del grupo |

## Tecnología

- React 18 + TypeScript + Vite, Tailwind y shadcn/ui, React Query.
- PWA instalable (`vite-plugin-pwa`, manifiesto en `public/manifest.json`) con accesos directos.
- Backend en Lovable Cloud (Supabase): Postgres con RLS, Storage privado con URLs firmadas y Edge Functions en `supabase/functions`.

## Estructura

```
src/
  pages/          una pantalla por ruta
  components/     componentes por módulo (muro/, chat/, asistencia/, vacaciones/, ui/ = shadcn)
  hooks/          acceso a datos con React Query (useMuro, useChat, useAsistencia, ...)
  lib/            lógica pura y testeada (asistencia, horasExtra, liquidacionEngine, liquidacionFinal, vacacionesCalendario, ...)
  integrations/   cliente y tipos de Supabase (types.ts lo regenera Lovable)
  test/           tests de Vitest
supabase/
  migrations/     migraciones SQL (en orden por fecha)
  functions/      Edge Functions; _shared/ tiene reglas puras compartidas con los tests
docs/             documentación funcional
```

## Desarrollo local

Requiere Node.js 20 o superior.

```sh
npm install
npm run dev        # servidor de desarrollo
npm test           # tests (Vitest)
npm run lint       # ESLint
npm run build      # build de producción
```

Antes de subir cambios conviene correr `npx tsc -p tsconfig.app.json --noEmit`, `npm test` y `npm run build`.

## Fechas y horas

Las columnas `date` llegan como `"YYYY-MM-DD"`. `new Date("YYYY-MM-DD")` las interpreta en UTC y en Argentina se ven un día antes, por eso:

- Para mostrar o calcular con una fecha sin hora, usar `formatoFecha` / `fechaLocal` (`src/lib/vacacionesCalendario.ts`).
- Para "hoy", usar `hoyArgentina()` y para sumar días `sumarDias()` (`src/lib/asistencia.ts`); no usar `new Date().toISOString().slice(0, 10)`.
- Para fin de mes, `ultimoDiaDelMes("YYYY-MM")`.
- Las horas se muestran en formato 24 h (`hourCycle: "h23"`).

## Base de datos y despliegue

- Cada cambio de esquema va en un archivo nuevo de `supabase/migrations/` (nunca editar uno ya aplicado).
- Lovable sincroniza `main` en ambos sentidos: después de subir una migración, se le pide al agente de Lovable que la aplique y regenere `src/integrations/supabase/types.ts`. Las Edge Functions también las despliega Lovable.
- En SQL para Lovable, usar `chr(10)` en lugar de `E'\n'`.
- Las tablas nuevas necesitan RLS. Los helpers disponibles son `has_role`, `is_manager`, `is_manager_or_contador`, `muro_es_moderador`, `my_empleado_id`, `es_miembro_grupo` y `es_admin_grupo`.
