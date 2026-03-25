
-- Enum for nivel de estudio
CREATE TYPE public.nivel_estudio AS ENUM ('primario', 'secundario', 'terciario', 'universitario', 'posgrado');
CREATE TYPE public.estado_estudio AS ENUM ('completo', 'en_curso', 'incompleto');
CREATE TYPE public.estado_solicitud AS ENUM ('pendiente', 'aprobada', 'rechazada');

-- Tabla estudios_empleado
CREATE TABLE public.estudios_empleado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id uuid REFERENCES public.empleados(id) ON DELETE CASCADE NOT NULL,
  titulo text NOT NULL,
  institucion text,
  nivel nivel_estudio NOT NULL,
  estado estado_estudio NOT NULL DEFAULT 'en_curso',
  fecha_inicio date,
  fecha_fin date,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.estudios_empleado ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_estudios" ON public.estudios_empleado FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_estudios" ON public.estudios_empleado FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_estudios" ON public.estudios_empleado FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_estudios" ON public.estudios_empleado FOR DELETE TO authenticated USING (true);

-- Tabla solicitudes_permiso
CREATE TABLE public.solicitudes_permiso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id uuid REFERENCES public.empleados(id) ON DELETE CASCADE NOT NULL,
  fecha_solicitud timestamptz NOT NULL DEFAULT now(),
  motivo text NOT NULL,
  motivo_detalle text,
  fecha_desde date NOT NULL,
  fecha_hasta date NOT NULL,
  hora_reintegro text,
  sujeto_descuento boolean NOT NULL DEFAULT false,
  estado estado_solicitud NOT NULL DEFAULT 'pendiente',
  aprobado_por uuid,
  observaciones text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.solicitudes_permiso ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_solicitudes" ON public.solicitudes_permiso FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_solicitudes" ON public.solicitudes_permiso FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_solicitudes" ON public.solicitudes_permiso FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_solicitudes" ON public.solicitudes_permiso FOR DELETE TO authenticated USING (true);

-- Ampliar empresas
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS razon_social text,
  ADD COLUMN IF NOT EXISTS domicilio_fiscal text,
  ADD COLUMN IF NOT EXISTS localidad text,
  ADD COLUMN IF NOT EXISTS provincia text,
  ADD COLUMN IF NOT EXISTS cp text,
  ADD COLUMN IF NOT EXISTS telefono text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS actividad_principal text,
  ADD COLUMN IF NOT EXISTS fecha_inicio_actividades date,
  ADD COLUMN IF NOT EXISTS convenio_colectivo text;
