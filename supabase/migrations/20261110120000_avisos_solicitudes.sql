-- ═══════════════════════════════════════════════════════════════════
-- Avisos de permisos y vacaciones: cuando un empleado pide uno, le llega a RRHH,
-- gerencia y administración (campanita y push); cuando lo resuelven, le llega al empleado.
-- ═══════════════════════════════════════════════════════════════════

-- Quiénes gestionan las solicitudes: sin el soporte de TotalRH ni quien la cargó
CREATE OR REPLACE FUNCTION public.solicitudes_destinatarios_gestion(_excluir uuid[])
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ur.user_id
  FROM public.user_roles ur
  WHERE ur.role IN ('admin', 'rrhh', 'gerente')
    AND ur.user_id IS DISTINCT FROM public.soporte_user_id()
    -- array_remove: un NULL en la lista (empleado sin cuenta) dejaría a todos afuera
    AND NOT (ur.user_id = ANY (array_remove(coalesce(_excluir, '{}'), NULL)))
$$;

REVOKE EXECUTE ON FUNCTION public.solicitudes_destinatarios_gestion(uuid[]) FROM PUBLIC, anon, authenticated;

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
           '/legajos/' || NEW.empleado_id || '?tab=permisos'
    FROM public.solicitudes_destinatarios_gestion(ARRAY[_user, auth.uid()]) d;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.estado IS DISTINCT FROM OLD.estado AND NEW.estado IN ('aprobada', 'rechazada')
     AND _user IS NOT NULL AND _user IS DISTINCT FROM auth.uid() THEN
    INSERT INTO public.notificaciones (user_id, titulo, mensaje, link)
    VALUES (_user,
            CASE WHEN NEW.estado = 'aprobada' THEN 'Tu permiso fue aprobado' ELSE 'Tu permiso fue rechazado' END,
            'Permiso ' || _fechas || ' · ' || _motivo
              || CASE WHEN coalesce(NEW.observaciones, '') <> '' THEN ' · ' || NEW.observaciones ELSE '' END,
            '/autogestion?tab=permisos');
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.solicitudes_permiso_avisar() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS solicitudes_permiso_avisar ON public.solicitudes_permiso;
CREATE TRIGGER solicitudes_permiso_avisar
AFTER INSERT OR UPDATE OF estado ON public.solicitudes_permiso
FOR EACH ROW EXECUTE FUNCTION public.solicitudes_permiso_avisar();

CREATE OR REPLACE FUNCTION public.solicitudes_vacaciones_avisar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid;
  _nombre text;
  _detalle text;
BEGIN
  SELECT e.user_id, e.apellido || ', ' || e.nombre INTO _user, _nombre
  FROM public.empleados e WHERE e.id = NEW.empleado_id;

  _detalle := 'del ' || to_char(NEW.fecha_desde, 'DD/MM/YYYY') || ' al ' || to_char(NEW.fecha_hasta, 'DD/MM/YYYY')
              || coalesce(' (' || NEW.dias_solicitados || ' días)', '');

  IF TG_OP = 'INSERT' AND NEW.estado = 'pendiente' THEN
    INSERT INTO public.notificaciones (user_id, titulo, mensaje, link)
    SELECT d, 'Nueva solicitud de vacaciones',
           coalesce(_nombre, 'Un empleado') || ' pidió vacaciones ' || _detalle,
           '/vacaciones'
    FROM public.solicitudes_destinatarios_gestion(ARRAY[_user, auth.uid()]) d;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.estado IS DISTINCT FROM OLD.estado AND NEW.estado IN ('aprobada', 'rechazada')
     AND _user IS NOT NULL AND _user IS DISTINCT FROM auth.uid() THEN
    INSERT INTO public.notificaciones (user_id, titulo, mensaje, link)
    VALUES (_user,
            CASE WHEN NEW.estado = 'aprobada' THEN 'Tus vacaciones fueron aprobadas' ELSE 'Tus vacaciones fueron rechazadas' END,
            'Vacaciones ' || _detalle
              || CASE WHEN coalesce(NEW.observaciones, '') <> '' THEN ' · ' || NEW.observaciones ELSE '' END,
            '/autogestion?tab=vacaciones');
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.solicitudes_vacaciones_avisar() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS solicitudes_vacaciones_avisar ON public.solicitudes_vacaciones;
CREATE TRIGGER solicitudes_vacaciones_avisar
AFTER INSERT OR UPDATE OF estado ON public.solicitudes_vacaciones
FOR EACH ROW EXECUTE FUNCTION public.solicitudes_vacaciones_avisar();
