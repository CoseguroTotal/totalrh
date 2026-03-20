
# Plan: Conectar Lovable Cloud y desarrollar Módulo de Legajo Digital

## Resumen

Habilitaremos Lovable Cloud (Supabase integrado) para tener base de datos, autenticación y almacenamiento. Luego migraremos el módulo de Legajo Digital de datos mock a datos reales en la base de datos.

---

## Paso 1 — Habilitar Lovable Cloud

Activar Lovable Cloud para obtener base de datos PostgreSQL, autenticación y storage integrados.

## Paso 2 — Crear esquema de base de datos

Tablas a crear mediante migraciones:

```text
empresas
├── id (uuid, PK)
├── nombre
├── cuit
└── created_at

sucursales
├── id (uuid, PK)
├── empresa_id (FK → empresas)
├── nombre
└── direccion

empleados
├── id (uuid, PK)
├── legajo (unique)
├── nombre, apellido
├── dni, cuil
├── puesto, categoria
├── empresa_id (FK → empresas)
├── sucursal_id (FK → sucursales)
├── fecha_ingreso
├── cct
├── estado (enum: activo/licencia/baja)
├── email, telefono
├── avatar_url
└── created_at, updated_at

eventos_legajo
├── id (uuid, PK)
├── empleado_id (FK → empleados)
├── fecha
├── tipo (enum: ingreso/promocion/sancion/licencia/cambio)
├── titulo
├── descripcion
└── created_at

documentos_legajo
├── id (uuid, PK)
├── empleado_id (FK → empleados)
├── nombre_archivo
├── storage_path
├── tamaño
├── fecha_vencimiento (nullable, para alertas)
├── tipo_documento
└── created_at
```

Se habilitará RLS en todas las tablas con políticas para usuarios autenticados.

## Paso 3 — Configurar autenticación

- Crear página de Login con email/password
- Proteger rutas con componente `ProtectedRoute`
- Redirigir usuarios no autenticados al login

## Paso 4 — Configurar Storage

- Crear bucket `documentos-legajo` para archivos de empleados
- Políticas de acceso para usuarios autenticados

## Paso 5 — Migrar el frontend a datos reales

- Reemplazar `mockEmployees.ts` por queries a Supabase usando `@tanstack/react-query`
- Crear hooks: `useEmpleados`, `useEmpleado`, `useEventosLegajo`, `useDocumentosLegajo`
- Actualizar `Legajos.tsx` y `LegajoDetail.tsx` para usar datos reales
- Implementar carga de documentos con Supabase Storage
- Agregar funcionalidad de búsqueda y filtros contra la base de datos

## Paso 6 — Seed de datos iniciales

Insertar los 7 empleados mock y sus eventos como datos iniciales para que el sistema no arranque vacío.

---

## Detalle técnico

- **Stack**: Supabase (via Lovable Cloud) + React Query para fetching
- **Auth**: Supabase Auth con email/password, sin perfiles adicionales
- **Storage**: Bucket con políticas RLS para documentos
- **Tipos**: Se generarán automáticamente desde el esquema de Supabase
- **Patrón de datos**: Hooks custom con `useQuery`/`useMutation` de TanStack Query
