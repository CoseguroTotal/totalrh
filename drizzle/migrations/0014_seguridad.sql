-- ═══════════════════════════════════════════════════════════════════
-- Endurecimiento de seguridad (revisión general).
-- ═══════════════════════════════════════════════════════════════════

-- ── Sanciones: el empleado sólo puede cargar su descargo ──
-- La política de UPDATE deja al empleado editar su propia sanción para el descargo,
-- pero no impedía cambiar el tipo, el motivo, la fecha o cerrar el descargo.
CREATE OR REPLACE FUNCTION public.sanciones_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_manager() THEN
    RETURN NEW;
  END IF;
  IF OLD.descargo_cerrado IS TRUE THEN
    RAISE EXCEPTION 'El descargo de esta sanción ya está cerrado' USING ERRCODE = '42501';
  END IF;
  -- Todo lo que no es el descargo queda como estaba
  NEW.id := OLD.id;
  NEW.empleado_id := OLD.empleado_id;
  NEW.tipo := OLD.tipo;
  NEW.motivo := OLD.motivo;
  NEW.descripcion := OLD.descripcion;
  NEW.fecha := OLD.fecha;
  NEW.emitido_por := OLD.emitido_por;
  NEW.descargo_cerrado := OLD.descargo_cerrado;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sanciones_guard ON public.sanciones;
CREATE TRIGGER sanciones_guard
BEFORE UPDATE ON public.sanciones
FOR EACH ROW EXECUTE FUNCTION public.sanciones_guard();

-- ── Soporte: se reconoce por la cuenta, no por el email del token ──
CREATE OR REPLACE FUNCTION public.es_soporte()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$ SELECT auth.uid() IS NOT NULL AND auth.uid() = public.soporte_user_id() $$;

-- ── Ninguna función con permisos elevados se ejecuta sin sesión ──
-- (algunas instalaciones las tenían habilitadas para usuarios anónimos)
DO $$
DECLARE
  _f record;
BEGIN
  FOR _f IN
    SELECT p.oid::regprocedure AS firma
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef AND has_function_privilege('anon', p.oid, 'EXECUTE')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', _f.firma);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', _f.firma);
  END LOOP;
END;
$$;