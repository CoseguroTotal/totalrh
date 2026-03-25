
-- 1. DELETE policy on empleados
CREATE POLICY "Authenticated users can delete empleados"
ON public.empleados FOR DELETE TO authenticated USING (true);

-- 2. Enum for tipo_concepto
CREATE TYPE public.tipo_concepto AS ENUM ('remunerativo', 'no_remunerativo', 'deduccion');

-- 3. Enum for estado_liquidacion
CREATE TYPE public.estado_liquidacion AS ENUM ('borrador', 'confirmada');

-- 4. conceptos_liquidacion table
CREATE TABLE public.conceptos_liquidacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE NOT NULL,
  nombre text NOT NULL,
  tipo tipo_concepto NOT NULL,
  porcentaje numeric,
  monto_fijo numeric,
  aplica_a text NOT NULL DEFAULT 'todos',
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.conceptos_liquidacion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_conceptos" ON public.conceptos_liquidacion FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_conceptos" ON public.conceptos_liquidacion FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_conceptos" ON public.conceptos_liquidacion FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_conceptos" ON public.conceptos_liquidacion FOR DELETE TO authenticated USING (true);

-- 5. liquidaciones table
CREATE TABLE public.liquidaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  periodo text NOT NULL,
  sueldo_basico numeric NOT NULL DEFAULT 0,
  total_remunerativo numeric NOT NULL DEFAULT 0,
  total_no_remunerativo numeric NOT NULL DEFAULT 0,
  total_deducciones numeric NOT NULL DEFAULT 0,
  neto numeric NOT NULL DEFAULT 0,
  estado estado_liquidacion NOT NULL DEFAULT 'borrador',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.liquidaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_liquidaciones" ON public.liquidaciones FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_liquidaciones" ON public.liquidaciones FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_liquidaciones" ON public.liquidaciones FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_liquidaciones" ON public.liquidaciones FOR DELETE TO authenticated USING (true);

-- 6. liquidacion_lineas table
CREATE TABLE public.liquidacion_lineas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  liquidacion_id uuid NOT NULL REFERENCES public.liquidaciones(id) ON DELETE CASCADE,
  concepto_id uuid REFERENCES public.conceptos_liquidacion(id),
  descripcion text NOT NULL,
  cantidad numeric NOT NULL DEFAULT 1,
  monto numeric NOT NULL DEFAULT 0,
  tipo tipo_concepto NOT NULL
);
ALTER TABLE public.liquidacion_lineas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_lineas" ON public.liquidacion_lineas FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_lineas" ON public.liquidacion_lineas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_lineas" ON public.liquidacion_lineas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_lineas" ON public.liquidacion_lineas FOR DELETE TO authenticated USING (true);
