-- Encuestas con imagen: RRHH puede adjuntar una imagen (afiche, foto, gráfico) a la encuesta.
-- Se guarda la ruta dentro del bucket privado "muro" (la misma subida que usan las publicaciones)
-- y al publicar la encuesta la publicación del muro lleva la misma imagen.

ALTER TABLE public.encuestas
  ADD COLUMN IF NOT EXISTS imagen_url text;

ALTER TABLE public.encuestas
  DROP CONSTRAINT IF EXISTS encuestas_imagen_url_check;
ALTER TABLE public.encuestas
  ADD CONSTRAINT encuestas_imagen_url_check
  CHECK (imagen_url IS NULL OR (char_length(imagen_url) <= 300 AND imagen_url !~ '(^/|\.\.|://)'));

CREATE OR REPLACE FUNCTION public.encuesta_publicar(_encuesta_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _e public.encuestas%ROWTYPE;
  _pub uuid;
BEGIN
  IF NOT public.muro_es_moderador() THEN RAISE EXCEPTION 'Sólo RRHH puede publicar encuestas' USING ERRCODE = '42501'; END IF;
  SELECT * INTO _e FROM public.encuestas WHERE id = _encuesta_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Encuesta inexistente'; END IF;
  IF _e.estado <> 'borrador' THEN RAISE EXCEPTION 'La encuesta ya fue publicada'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.encuesta_preguntas WHERE encuesta_id = _encuesta_id) THEN
    RAISE EXCEPTION 'Agregá al menos una pregunta';
  END IF;

  INSERT INTO public.muro_publicaciones (autor_id, contenido, tipo, imagen_url)
  VALUES (auth.uid(), _e.titulo || CASE WHEN _e.descripcion <> '' THEN E'\n' || _e.descripcion ELSE '' END, 'encuesta', _e.imagen_url)
  RETURNING id INTO _pub;

  UPDATE public.encuestas SET estado = 'publicada', publicada_at = now(), publicacion_id = _pub WHERE id = _encuesta_id;

  INSERT INTO public.notificaciones (user_id, titulo, mensaje, link)
  SELECT DISTINCT ur.user_id, 'Nueva encuesta', _e.titulo, '/encuestas/' || _encuesta_id
  FROM public.user_roles ur
  WHERE ur.user_id <> auth.uid() AND ur.role <> 'registro_asistencia'::app_role;

  RETURN _pub;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.encuesta_publicar(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.encuesta_publicar(uuid) TO authenticated;
