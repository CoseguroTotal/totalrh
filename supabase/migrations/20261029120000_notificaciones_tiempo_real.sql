-- ═══════════════════════════════════════════════════════════════════
-- Notificaciones: tiempo real en todas las instalaciones y avisos de memorándums.
-- ═══════════════════════════════════════════════════════════════════

-- Sin estas tablas en la publicación de tiempo real, la campanita, el chat y el muro
-- sólo se actualizan al recargar. Algunas instalaciones no las tenían (o les faltaba
-- notificaciones); se agregan sólo las que falten.
DO $$
DECLARE
  _t text;
BEGIN
  FOREACH _t IN ARRAY ARRAY['notificaciones', 'muro_publicaciones', 'muro_comentarios', 'muro_reacciones', 'chat_mensajes', 'chat_participantes', 'tareas'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = _t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', _t);
    END IF;
  END LOOP;
END;
$$;

-- Memorándums: el empleado recibe el aviso cuando se lo envían, y quien lo emitió
-- cuando el empleado confirma la recepción o lo firma.
CREATE OR REPLACE FUNCTION public.memorandums_notificar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _destinatario uuid;
  _empleado text;
BEGIN
  SELECT e.user_id, e.apellido || ', ' || e.nombre INTO _destinatario, _empleado
  FROM public.empleados e WHERE e.id = NEW.destinatario_empleado_id;

  IF NEW.estado = 'enviado' AND _destinatario IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.estado IS DISTINCT FROM 'enviado') THEN
    INSERT INTO public.notificaciones (user_id, titulo, mensaje, link)
    VALUES (_destinatario, 'Tenés un memorándum nuevo',
            NEW.titulo || ' · Abrilo para confirmar que lo recibiste y firmarlo.',
            '/autogestion?tab=memorandums');
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.estado = 'recibido' AND OLD.estado IS DISTINCT FROM 'recibido' AND NEW.created_by IS NOT NULL THEN
    INSERT INTO public.notificaciones (user_id, titulo, mensaje, link)
    VALUES (NEW.created_by, 'Memorándum recibido', coalesce(_empleado, 'El empleado') || ' confirmó que recibió: ' || NEW.titulo, '/memorandums');
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.estado = 'firmado' AND OLD.estado IS DISTINCT FROM 'firmado' AND NEW.created_by IS NOT NULL THEN
    INSERT INTO public.notificaciones (user_id, titulo, mensaje, link)
    VALUES (NEW.created_by, 'Memorándum firmado', coalesce(_empleado, 'El empleado') || ' firmó: ' || NEW.titulo, '/memorandums');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS memorandums_notificar ON public.memorandums;
CREATE TRIGGER memorandums_notificar
AFTER INSERT OR UPDATE OF estado ON public.memorandums
FOR EACH ROW EXECUTE FUNCTION public.memorandums_notificar();
