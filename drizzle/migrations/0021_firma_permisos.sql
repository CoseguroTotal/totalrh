-- ═══════════════════════════════════════════════════════════════════
-- Firma de permisos: RRHH aprueba o rechaza desde el panel, deja observaciones
-- y queda registrado quién firmó (nombre y cargo) y cuándo. El empleado lo ve
-- en Autogestión y en el PDF.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.solicitudes_permiso
  ADD COLUMN IF NOT EXISTS aprobado_at timestamptz,
  ADD COLUMN IF NOT EXISTS aprobado_nombre text,
  ADD COLUMN IF NOT EXISTS aprobado_cargo text;

-- Sella la firma del lado del servidor: quién y cuándo no los decide el navegador
CREATE OR REPLACE FUNCTION public.solicitudes_permiso_firma()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _nombre text;
  _cargo text;
BEGIN
  -- El empleado sólo puede pedir: la resolución la firma RRHH, gerencia o administración
  IF TG_OP = 'INSERT' AND auth.uid() IS NOT NULL AND NOT public.is_manager() THEN
    NEW.estado := 'pendiente';
    NEW.aprobado_por := NULL;
    NEW.aprobado_at := NULL;
    NEW.aprobado_nombre := NULL;
    NEW.aprobado_cargo := NULL;
    NEW.observaciones := NULL;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.estado IS DISTINCT FROM OLD.estado THEN
    IF NEW.estado IN ('aprobada', 'rechazada') THEN
      NEW.aprobado_at := now();
      IF auth.uid() IS NOT NULL THEN
        NEW.aprobado_por := auth.uid();
      END IF;
      -- Si no escribieron el nombre, firma con el de su legajo
      IF coalesce(btrim(NEW.aprobado_nombre), '') = '' THEN
        SELECT e.nombre || ' ' || e.apellido, e.puesto INTO _nombre, _cargo
        FROM public.empleados e WHERE e.user_id = NEW.aprobado_por
        ORDER BY e.created_at LIMIT 1;
        NEW.aprobado_nombre := coalesce(_nombre, 'Recursos Humanos');
        NEW.aprobado_cargo := coalesce(nullif(btrim(NEW.aprobado_cargo), ''), _cargo);
      END IF;
    ELSE
      -- Vuelve a pendiente: se borra la firma anterior
      NEW.aprobado_por := NULL;
      NEW.aprobado_at := NULL;
      NEW.aprobado_nombre := NULL;
      NEW.aprobado_cargo := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.solicitudes_permiso_firma() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS solicitudes_permiso_firma ON public.solicitudes_permiso;
CREATE TRIGGER solicitudes_permiso_firma
BEFORE INSERT OR UPDATE ON public.solicitudes_permiso
FOR EACH ROW EXECUTE FUNCTION public.solicitudes_permiso_firma();

-- Avisos: a RRHH el enlace abre la solicitud completa; al empleado le dice quién firmó
CREATE OR REPLACE FUNCTION public.solicitudes_permiso_avisar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid;
  _nombre text;
  _motivo text;
  _fechas text;
BEGIN
  SELECT e.user_id, e.apellido || ', ' || e.nombre INTO _user, _nombre
  FROM public.empleados e WHERE e.id = NEW.empleado_id;

  _motivo := NEW.motivo || CASE WHEN coalesce(NEW.motivo_detalle, '') <> '' THEN ': ' || NEW.motivo_detalle ELSE '' END;
  _fechas := CASE WHEN NEW.fecha_hasta IS NULL OR NEW.fecha_hasta = NEW.fecha_desde
                  THEN 'el ' || to_char(NEW.fecha_desde, 'DD/MM/YYYY')
                  ELSE 'del ' || to_char(NEW.fecha_desde, 'DD/MM/YYYY') || ' al ' || to_char(NEW.fecha_hasta, 'DD/MM/YYYY') END;

  IF TG_OP = 'INSERT' AND NEW.estado = 'pendiente' THEN
    INSERT INTO public.notificaciones (user_id, titulo, mensaje, link)
    SELECT d, 'Nueva solicitud de permiso',
           coalesce(_nombre, 'Un empleado') || ' pidió permiso ' || _fechas || ' · ' || _motivo,
           '/legajos/' || NEW.empleado_id || '?tab=permisos&solicitud=' || NEW.id
    FROM public.solicitudes_destinatarios_gestion(ARRAY[_user, auth.uid()]) d;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.estado IS DISTINCT FROM OLD.estado AND NEW.estado IN ('aprobada', 'rechazada')
     AND _user IS NOT NULL AND _user IS DISTINCT FROM auth.uid() THEN
    INSERT INTO public.notificaciones (user_id, titulo, mensaje, link)
    VALUES (_user,
            CASE WHEN NEW.estado = 'aprobada' THEN 'Tu permiso fue aprobado' ELSE 'Tu permiso fue rechazado' END,
            'Permiso ' || _fechas || ' · ' || _motivo
              || CASE WHEN coalesce(NEW.aprobado_nombre, '') <> '' THEN ' · Firmó: ' || NEW.aprobado_nombre ELSE '' END
              || CASE WHEN coalesce(NEW.observaciones, '') <> '' THEN ' · ' || NEW.observaciones ELSE '' END,
            '/autogestion?tab=permisos');
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.solicitudes_permiso_avisar() FROM PUBLIC, anon, authenticated;