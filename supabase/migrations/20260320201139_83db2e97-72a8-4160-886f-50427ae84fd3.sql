
-- New columns on empleados
ALTER TABLE public.empleados
  ADD COLUMN IF NOT EXISTS domicilio_calle text,
  ADD COLUMN IF NOT EXISTS domicilio_numero text,
  ADD COLUMN IF NOT EXISTS domicilio_piso text,
  ADD COLUMN IF NOT EXISTS domicilio_localidad text,
  ADD COLUMN IF NOT EXISTS domicilio_provincia text,
  ADD COLUMN IF NOT EXISTS domicilio_cp text,
  ADD COLUMN IF NOT EXISTS nacionalidad text,
  ADD COLUMN IF NOT EXISTS fecha_nacimiento date,
  ADD COLUMN IF NOT EXISTS sexo text,
  ADD COLUMN IF NOT EXISTS estado_civil text;

-- Parentesco enum
DO $$ BEGIN
  CREATE TYPE public.parentesco_familiar AS ENUM ('conyuge','hijo','padre','otro');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Grupo familiar table
CREATE TABLE IF NOT EXISTS public.grupo_familiar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  apellido text NOT NULL,
  parentesco parentesco_familiar NOT NULL,
  dni text,
  fecha_nacimiento date,
  discapacidad boolean NOT NULL DEFAULT false,
  a_cargo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.grupo_familiar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_grupo_familiar" ON public.grupo_familiar FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_grupo_familiar" ON public.grupo_familiar FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_grupo_familiar" ON public.grupo_familiar FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_grupo_familiar" ON public.grupo_familiar FOR DELETE TO authenticated USING (true);

-- Datos medicos table
CREATE TABLE IF NOT EXISTS public.datos_medicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE UNIQUE,
  grupo_sanguineo text,
  obra_social text,
  plan_obra_social text,
  nro_afiliado text,
  art text,
  nro_art text,
  alergias text,
  observaciones text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.datos_medicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_datos_medicos" ON public.datos_medicos FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_datos_medicos" ON public.datos_medicos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_datos_medicos" ON public.datos_medicos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_datos_medicos" ON public.datos_medicos FOR DELETE TO authenticated USING (true);

-- Add trigger for updated_at on datos_medicos
CREATE TRIGGER update_datos_medicos_updated_at
  BEFORE UPDATE ON public.datos_medicos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add categoria column to documentos_legajo
ALTER TABLE public.documentos_legajo
  ADD COLUMN IF NOT EXISTS categoria text DEFAULT 'otro';

-- Add missing policies on empresas
CREATE POLICY "auth_insert_empresas" ON public.empresas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_empresas" ON public.empresas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_empresas" ON public.empresas FOR DELETE TO authenticated USING (true);

-- Add missing policies on sucursales
CREATE POLICY "auth_insert_sucursales" ON public.sucursales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_sucursales" ON public.sucursales FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_sucursales" ON public.sucursales FOR DELETE TO authenticated USING (true);

-- Add update policy on documentos_legajo
CREATE POLICY "auth_update_documentos" ON public.documentos_legajo FOR UPDATE TO authenticated USING (true);
