
-- 1. Expand app_role enum with new roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'contador';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gerente';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'rrhh';

-- 2. Add advanced columns to conceptos_liquidacion
ALTER TABLE public.conceptos_liquidacion
  ADD COLUMN IF NOT EXISTS grupo text DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS base_calculo text DEFAULT 'basico',
  ADD COLUMN IF NOT EXISTS concepto_base_id uuid REFERENCES public.conceptos_liquidacion(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unidad text DEFAULT 'porcentaje',
  ADD COLUMN IF NOT EXISTS cantidad_default numeric DEFAULT 1,
  ADD COLUMN IF NOT EXISTS orden integer DEFAULT 0;

-- 3. Add base column to liquidacion_lineas
ALTER TABLE public.liquidacion_lineas
  ADD COLUMN IF NOT EXISTS base numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS es_haber boolean DEFAULT true;
