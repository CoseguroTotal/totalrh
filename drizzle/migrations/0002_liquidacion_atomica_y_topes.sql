-- ═══════════════════════════════════════════════════════════════════
-- Liquidación: guardado atómico, sin duplicados por período y tope de aportes.
-- ═══════════════════════════════════════════════════════════════════

-- Tope de base imponible para descuentos (p. ej. jubilación, obra social).
ALTER TABLE public.conceptos_liquidacion
  ADD COLUMN IF NOT EXISTS tope_base numeric CHECK (tope_base IS NULL OR tope_base > 0);

-- Una sola liquidación por empleado y período.
CREATE UNIQUE INDEX IF NOT EXISTS liquidaciones_empleado_periodo_key
  ON public.liquidaciones (empleado_id, periodo);

-- Guarda cabecera y líneas en una sola transacción: o se guarda todo, o nada.
-- Si ya existe un borrador del período lo reemplaza; si está confirmada, la rechaza.
-- SECURITY INVOKER: se aplican las mismas políticas RLS que al insertar a mano.
CREATE OR REPLACE FUNCTION public.guardar_liquidacion(
  _empleado_id uuid,
  _periodo text,
  _sueldo_basico numeric,
  _total_remunerativo numeric,
  _total_no_remunerativo numeric,
  _total_deducciones numeric,
  _neto numeric,
  _lineas jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _existente record;
  _id uuid;
BEGIN
  IF NOT public.is_manager_or_contador() THEN
    RAISE EXCEPTION 'No tenés permiso para liquidar' USING ERRCODE = '42501';
  END IF;

  SELECT id, estado INTO _existente
  FROM public.liquidaciones
  WHERE empleado_id = _empleado_id AND periodo = _periodo
  FOR UPDATE;

  IF FOUND THEN
    IF _existente.estado = 'confirmada' THEN
      RAISE EXCEPTION 'La liquidación de % ya está confirmada', _periodo USING ERRCODE = '23505';
    END IF;
    DELETE FROM public.liquidacion_lineas WHERE liquidacion_id = _existente.id;
    DELETE FROM public.liquidaciones WHERE id = _existente.id;
  END IF;

  INSERT INTO public.liquidaciones (
    empleado_id, periodo, sueldo_basico, total_remunerativo, total_no_remunerativo,
    total_deducciones, neto, estado
  ) VALUES (
    _empleado_id, _periodo, _sueldo_basico, _total_remunerativo, _total_no_remunerativo,
    _total_deducciones, _neto, 'borrador'
  )
  RETURNING id INTO _id;

  INSERT INTO public.liquidacion_lineas (liquidacion_id, concepto_id, descripcion, cantidad, monto, tipo, base, es_haber)
  SELECT _id,
         NULLIF(l->>'concepto_id', '')::uuid,
         l->>'descripcion',
         COALESCE((l->>'cantidad')::numeric, 1),
         (l->>'monto')::numeric,
         (l->>'tipo')::tipo_concepto,
         (l->>'base')::numeric,
         COALESCE((l->>'es_haber')::boolean, true)
  FROM jsonb_array_elements(COALESCE(_lineas, '[]'::jsonb)) AS l;

  RETURN _id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guardar_liquidacion(uuid, text, numeric, numeric, numeric, numeric, numeric, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.guardar_liquidacion(uuid, text, numeric, numeric, numeric, numeric, numeric, jsonb) TO authenticated;
