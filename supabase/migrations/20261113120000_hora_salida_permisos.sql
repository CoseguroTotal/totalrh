-- ═══════════════════════════════════════════════════════════════════
-- Permisos de salida: además de la hora de regreso se guarda la hora de salida,
-- y el aviso a RRHH y al empleado muestra el horario completo.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.solicitudes_permiso
  ADD COLUMN IF NOT EXISTS hora_salida text;

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
  _sale text := nullif(left(btrim(coalesce(NEW.hora_salida, '')), 5), '');
  _vuelve text := nullif(left(btrim(coalesce(NEW.hora_reintegro, '')), 5), '');
BEGIN
  SELECT e.user_id, e.apellido || ', ' || e.nombre INTO _user, _nombre
  FROM public.empleados e WHERE e.id = NEW.empleado_id;

  _motivo := NEW.motivo || CASE WHEN coalesce(NEW.motivo_detalle, '') <> '' THEN ': ' || NEW.motivo_detalle ELSE '' END;
  _fechas := CASE WHEN NEW.fecha_hasta IS NULL OR NEW.fecha_hasta = NEW.fecha_desde
                  THEN 'el ' || to_char(NEW.fecha_desde, 'DD/MM/YYYY')
                  ELSE 'del ' || to_char(NEW.fecha_desde, 'DD/MM/YYYY') || ' al ' || to_char(NEW.fecha_hasta, 'DD/MM/YYYY') END
          || CASE WHEN _sale IS NOT NULL AND _vuelve IS NOT NULL THEN ', de ' || _sale || ' a ' || _vuelve || ' hs'
                  WHEN _sale IS NOT NULL THEN ', saliendo a las ' || _sale || ' hs'
                  WHEN _vuelve IS NOT NULL THEN ', regresando a las ' || _vuelve || ' hs'
                  ELSE '' END;

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
