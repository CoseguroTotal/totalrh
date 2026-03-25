
-- Add sueldo_basico to empleados
ALTER TABLE public.empleados ADD COLUMN IF NOT EXISTS sueldo_basico numeric;

-- Create estado_vacacion enum
DO $$ BEGIN
  CREATE TYPE public.estado_vacacion AS ENUM ('pendiente', 'aprobada', 'rechazada', 'cancelada');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Vacation config per company (seniority ranges)
CREATE TABLE public.vacaciones_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE NOT NULL,
  anios_antiguedad_min integer NOT NULL DEFAULT 0,
  anios_antiguedad_max integer NOT NULL DEFAULT 999,
  dias_correspondientes integer NOT NULL DEFAULT 14,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vacaciones_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_vac_config" ON public.vacaciones_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_vac_config" ON public.vacaciones_config FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_vac_config" ON public.vacaciones_config FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_vac_config" ON public.vacaciones_config FOR DELETE TO authenticated USING (true);

-- Vacation requests
CREATE TABLE public.solicitudes_vacaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id uuid REFERENCES public.empleados(id) ON DELETE CASCADE NOT NULL,
  fecha_desde date NOT NULL,
  fecha_hasta date NOT NULL,
  dias_solicitados integer NOT NULL DEFAULT 0,
  dias_correspondientes integer NOT NULL DEFAULT 0,
  periodo_anual text NOT NULL DEFAULT to_char(now(), 'YYYY'),
  estado estado_vacacion NOT NULL DEFAULT 'pendiente',
  aprobado_por uuid,
  observaciones text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.solicitudes_vacaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_sol_vac" ON public.solicitudes_vacaciones FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_sol_vac" ON public.solicitudes_vacaciones FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_sol_vac" ON public.solicitudes_vacaciones FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_sol_vac" ON public.solicitudes_vacaciones FOR DELETE TO authenticated USING (true);

-- Seed LCT default vacation ranges (will be used as template)
INSERT INTO public.vacaciones_config (empresa_id, anios_antiguedad_min, anios_antiguedad_max, dias_correspondientes)
SELECT e.id, v.min_a, v.max_a, v.dias
FROM public.empresas e
CROSS JOIN (VALUES (0, 5, 14), (5, 10, 21), (10, 20, 28), (20, 999, 35)) AS v(min_a, max_a, dias)
ON CONFLICT DO NOTHING;
