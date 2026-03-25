
-- Add empleado role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'empleado';

-- Create estado_vacante enum
CREATE TYPE public.estado_vacante AS ENUM ('abierta', 'cerrada', 'pausada');

-- Create estado_candidato enum
CREATE TYPE public.estado_candidato AS ENUM ('postulado', 'entrevista', 'evaluacion', 'oferta', 'contratado', 'descartado');

-- Create vacantes table
CREATE TABLE public.vacantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  titulo text NOT NULL,
  descripcion text DEFAULT '',
  requisitos text DEFAULT '',
  estado public.estado_vacante NOT NULL DEFAULT 'abierta',
  fecha_publicacion date DEFAULT CURRENT_DATE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vacantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_vacantes" ON public.vacantes FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_vacantes" ON public.vacantes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_vacantes" ON public.vacantes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_vacantes" ON public.vacantes FOR DELETE TO authenticated USING (true);

-- Create candidatos table
CREATE TABLE public.candidatos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vacante_id uuid REFERENCES public.vacantes(id) ON DELETE CASCADE NOT NULL,
  nombre text NOT NULL,
  email text,
  telefono text,
  cv_url text,
  estado public.estado_candidato NOT NULL DEFAULT 'postulado',
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.candidatos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_candidatos" ON public.candidatos FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_candidatos" ON public.candidatos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_candidatos" ON public.candidatos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_candidatos" ON public.candidatos FOR DELETE TO authenticated USING (true);
