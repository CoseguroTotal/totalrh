-- ═══════════════════════════════════════════════════════════════════
-- Encuestas (crear, publicar en el muro, responder, ver resultados)
-- y lecturas del muro ("Visto por N" y confirmación de lectura).
-- ═══════════════════════════════════════════════════════════════════

-- ── Muro: publicaciones de encuesta y confirmación de lectura ──
ALTER TABLE public.muro_publicaciones DROP CONSTRAINT IF EXISTS muro_publicaciones_tipo_check;
ALTER TABLE public.muro_publicaciones ADD CONSTRAINT muro_publicaciones_tipo_check
  CHECK (tipo IN ('post', 'comunicado', 'cumpleanios', 'aniversario', 'bienvenida', 'encuesta'));

ALTER TABLE public.muro_publicaciones
  ADD COLUMN IF NOT EXISTS requiere_confirmacion boolean NOT NULL DEFAULT false;

-- Sólo moderadores piden confirmación de lectura o publican encuestas
CREATE OR REPLACE FUNCTION public.muro_publicaciones_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.muro_es_moderador() THEN
    IF TG_OP = 'INSERT' THEN
      NEW.fijada := false;
      NEW.oculta := false;
      NEW.requiere_confirmacion := false;
      IF NEW.tipo IN ('comunicado', 'encuesta') THEN NEW.tipo := 'post'; END IF;
    ELSE
      NEW.fijada := OLD.fijada;
      NEW.oculta := OLD.oculta;
      NEW.tipo := OLD.tipo;
      NEW.requiere_confirmacion := OLD.requiere_confirmacion;
      NEW.autor_id := OLD.autor_id;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.autor_id := OLD.autor_id;
    NEW.created_at := OLD.created_at;
    IF NEW.contenido IS DISTINCT FROM OLD.contenido THEN NEW.editada := true; END IF;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

-- ═══════════════════════ Encuestas ═══════════════════════

CREATE TABLE public.encuestas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL CHECK (char_length(titulo) BETWEEN 1 AND 160),
  descripcion text NOT NULL DEFAULT '' CHECK (char_length(descripcion) <= 2000),
  anonima boolean NOT NULL DEFAULT true,
  -- Cuándo ven los resultados quienes respondieron (RRHH los ve siempre)
  mostrar_resultados text NOT NULL DEFAULT 'al_responder' CHECK (mostrar_resultados IN ('al_responder', 'al_cerrar', 'nunca')),
  estado text NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'publicada', 'cerrada')),
  cierra_at timestamptz,
  creada_por uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  publicada_at timestamptz,
  publicacion_id uuid REFERENCES public.muro_publicaciones(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.encuesta_preguntas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  encuesta_id uuid NOT NULL REFERENCES public.encuestas(id) ON DELETE CASCADE,
  orden integer NOT NULL DEFAULT 0,
  texto text NOT NULL CHECK (char_length(texto) BETWEEN 1 AND 500),
  tipo text NOT NULL CHECK (tipo IN ('unica', 'multiple', 'escala', 'texto')),
  opciones jsonb NOT NULL DEFAULT '[]'::jsonb,
  obligatoria boolean NOT NULL DEFAULT true
);

CREATE INDEX idx_encuesta_preguntas ON public.encuesta_preguntas (encuesta_id, orden);

-- Quién respondió (para no responder dos veces). Separado de las respuestas:
-- en una encuesta anónima no hay forma de unir a la persona con lo que contestó.
CREATE TABLE public.encuesta_participaciones (
  encuesta_id uuid NOT NULL REFERENCES public.encuestas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  respondida_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (encuesta_id, user_id)
);

CREATE TABLE public.encuesta_respuestas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  encuesta_id uuid NOT NULL REFERENCES public.encuestas(id) ON DELETE CASCADE,
  pregunta_id uuid NOT NULL REFERENCES public.encuesta_preguntas(id) ON DELETE CASCADE,
  envio_id uuid NOT NULL,
  respondente uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL si es anónima
  opciones integer[],
  escala integer CHECK (escala IS NULL OR escala BETWEEN 1 AND 5),
  texto text CHECK (texto IS NULL OR char_length(texto) <= 2000)
);

CREATE INDEX idx_encuesta_respuestas ON public.encuesta_respuestas (encuesta_id, pregunta_id);

CREATE TRIGGER update_encuestas_updated_at
BEFORE UPDATE ON public.encuestas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── RLS ──
GRANT SELECT, INSERT, UPDATE, DELETE ON public.encuestas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.encuesta_preguntas TO authenticated;
GRANT SELECT ON public.encuesta_participaciones TO authenticated;
-- encuesta_respuestas: sin acceso directo; se escribe y lee sólo por funciones

ALTER TABLE public.encuestas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encuesta_preguntas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encuesta_participaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encuesta_respuestas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Encuestas: ver publicadas o las que gestiono"
ON public.encuestas FOR SELECT TO authenticated
USING (estado <> 'borrador' OR public.muro_es_moderador());

CREATE POLICY "Encuestas: RRHH crea"
ON public.encuestas FOR INSERT TO authenticated
WITH CHECK (public.muro_es_moderador() AND creada_por = auth.uid());

CREATE POLICY "Encuestas: RRHH edita"
ON public.encuestas FOR UPDATE TO authenticated
USING (public.muro_es_moderador()) WITH CHECK (public.muro_es_moderador());

CREATE POLICY "Encuestas: RRHH borra"
ON public.encuestas FOR DELETE TO authenticated
USING (public.muro_es_moderador());

CREATE POLICY "Preguntas: ver las de encuestas visibles"
ON public.encuesta_preguntas FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.encuestas e WHERE e.id = encuesta_id));

-- Las preguntas sólo se editan mientras la encuesta es borrador
CREATE POLICY "Preguntas: RRHH edita borradores"
ON public.encuesta_preguntas FOR ALL TO authenticated
USING (public.muro_es_moderador() AND EXISTS (SELECT 1 FROM public.encuestas e WHERE e.id = encuesta_id AND e.estado = 'borrador'))
WITH CHECK (public.muro_es_moderador() AND EXISTS (SELECT 1 FROM public.encuestas e WHERE e.id = encuesta_id AND e.estado = 'borrador'));

CREATE POLICY "Participaciones: ver la propia"
ON public.encuesta_participaciones FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- ── Publicar: pasa a publicada, se anuncia en el muro y se avisa a todos ──
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

  INSERT INTO public.muro_publicaciones (autor_id, contenido, tipo)
  VALUES (auth.uid(), _e.titulo || CASE WHEN _e.descripcion <> '' THEN chr(10) || _e.descripcion ELSE '' END, 'encuesta')
  RETURNING id INTO _pub;

  UPDATE public.encuestas SET estado = 'publicada', publicada_at = now(), publicacion_id = _pub WHERE id = _encuesta_id;

  INSERT INTO public.notificaciones (user_id, titulo, mensaje, link)
  SELECT DISTINCT ur.user_id, 'Nueva encuesta', _e.titulo, '/encuestas/' || _encuesta_id
  FROM public.user_roles ur
  WHERE ur.user_id <> auth.uid() AND ur.role <> 'registro_asistencia'::app_role;

  RETURN _pub;
END;
$$;

-- ── Responder: una sola vez, valida tipos y obligatorias ──
CREATE OR REPLACE FUNCTION public.encuesta_responder(_encuesta_id uuid, _respuestas jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _e public.encuestas%ROWTYPE;
  _p record;
  _r jsonb;
  _envio uuid := gen_random_uuid();
  _n_opciones integer;
  _ops integer[];
  _vacia boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado' USING ERRCODE = '42501'; END IF;
  SELECT * INTO _e FROM public.encuestas WHERE id = _encuesta_id;
  IF NOT FOUND OR _e.estado <> 'publicada' THEN RAISE EXCEPTION 'La encuesta no está abierta'; END IF;
  IF _e.cierra_at IS NOT NULL AND _e.cierra_at < now() THEN RAISE EXCEPTION 'La encuesta ya cerró'; END IF;

  BEGIN
    INSERT INTO public.encuesta_participaciones (encuesta_id, user_id) VALUES (_encuesta_id, auth.uid());
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Ya respondiste esta encuesta';
  END;

  FOR _p IN SELECT * FROM public.encuesta_preguntas WHERE encuesta_id = _encuesta_id LOOP
    _r := _respuestas -> (_p.id::text);
    _n_opciones := jsonb_array_length(_p.opciones);

    _vacia := false;
    IF _r IS NULL OR _r = 'null'::jsonb THEN
      _vacia := true;
    ELSIF _p.tipo = 'texto' THEN
      _vacia := btrim(_r #>> '{}') = '';
    ELSIF _p.tipo IN ('unica', 'multiple') THEN
      _vacia := jsonb_typeof(_r) <> 'array' OR jsonb_array_length(_r) = 0;
    ELSE
      _vacia := jsonb_typeof(_r) <> 'number';
    END IF;

    IF _vacia THEN
      IF _p.obligatoria THEN RAISE EXCEPTION 'Falta responder: %', _p.texto; END IF;
      CONTINUE;
    END IF;

    IF _p.tipo IN ('unica', 'multiple') THEN
      SELECT array_agg(DISTINCT x::int) INTO _ops FROM jsonb_array_elements_text(_r) x;
      IF EXISTS (SELECT 1 FROM unnest(_ops) o WHERE o < 0 OR o >= _n_opciones) THEN RAISE EXCEPTION 'Opción inválida en: %', _p.texto; END IF;
      IF _p.tipo = 'unica' AND array_length(_ops, 1) > 1 THEN RAISE EXCEPTION 'Elegí una sola opción en: %', _p.texto; END IF;
      INSERT INTO public.encuesta_respuestas (encuesta_id, pregunta_id, envio_id, respondente, opciones)
      VALUES (_encuesta_id, _p.id, _envio, CASE WHEN _e.anonima THEN NULL ELSE auth.uid() END, _ops);
    ELSIF _p.tipo = 'escala' THEN
      INSERT INTO public.encuesta_respuestas (encuesta_id, pregunta_id, envio_id, respondente, escala)
      VALUES (_encuesta_id, _p.id, _envio, CASE WHEN _e.anonima THEN NULL ELSE auth.uid() END, (_r #>> '{}')::int);
    ELSE
      INSERT INTO public.encuesta_respuestas (encuesta_id, pregunta_id, envio_id, respondente, texto)
      VALUES (_encuesta_id, _p.id, _envio, CASE WHEN _e.anonima THEN NULL ELSE auth.uid() END, left(_r #>> '{}', 2000));
    END IF;
  END LOOP;
END;
$$;

-- ── Resultados agregados (RRHH siempre; el resto según mostrar_resultados) ──
CREATE OR REPLACE FUNCTION public.encuesta_resultados(_encuesta_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _e public.encuestas%ROWTYPE;
  _gestor boolean := public.muro_es_moderador();
  _cerrada boolean;
  _respondio boolean;
BEGIN
  SELECT * INTO _e FROM public.encuestas WHERE id = _encuesta_id;
  IF NOT FOUND OR (_e.estado = 'borrador' AND NOT _gestor) THEN RETURN NULL; END IF;
  _cerrada := _e.estado = 'cerrada' OR (_e.cierra_at IS NOT NULL AND _e.cierra_at < now());
  _respondio := EXISTS (SELECT 1 FROM public.encuesta_participaciones WHERE encuesta_id = _encuesta_id AND user_id = auth.uid());

  IF NOT _gestor AND NOT (
    (_e.mostrar_resultados = 'al_responder' AND (_respondio OR _cerrada)) OR
    (_e.mostrar_resultados = 'al_cerrar' AND _cerrada)
  ) THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'participantes', (SELECT count(*) FROM public.encuesta_participaciones WHERE encuesta_id = _encuesta_id),
    'destinatarios', (SELECT count(DISTINCT user_id) FROM public.user_roles WHERE role <> 'registro_asistencia'::app_role),
    'preguntas', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', p.id,
        'conteos', CASE WHEN p.tipo IN ('unica', 'multiple') THEN (
            SELECT jsonb_agg((SELECT count(*) FROM public.encuesta_respuestas r WHERE r.pregunta_id = p.id AND i = ANY (r.opciones)) ORDER BY i)
            FROM generate_series(0, jsonb_array_length(p.opciones) - 1) i
          ) WHEN p.tipo = 'escala' THEN (
            SELECT jsonb_agg((SELECT count(*) FROM public.encuesta_respuestas r WHERE r.pregunta_id = p.id AND r.escala = v) ORDER BY v)
            FROM generate_series(1, 5) v
          ) END,
        'respuestas', (SELECT count(*) FROM public.encuesta_respuestas r WHERE r.pregunta_id = p.id),
        'promedio', CASE WHEN p.tipo = 'escala' THEN (SELECT round(avg(escala)::numeric, 2) FROM public.encuesta_respuestas r WHERE r.pregunta_id = p.id) END,
        -- Los textos libres sólo los ve RRHH
        'textos', CASE WHEN p.tipo = 'texto' AND _gestor THEN (
            SELECT jsonb_agg(jsonb_build_object('texto', r.texto, 'respondente', r.respondente) ORDER BY r.id)
            FROM public.encuesta_respuestas r WHERE r.pregunta_id = p.id
          ) END
      ) ORDER BY p.orden)
      FROM public.encuesta_preguntas p WHERE p.encuesta_id = _encuesta_id
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.encuesta_publicar(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.encuesta_responder(uuid, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.encuesta_resultados(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.encuesta_publicar(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.encuesta_responder(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.encuesta_resultados(uuid) TO authenticated;

-- ═══════════════════════ Lecturas del muro ═══════════════════════

CREATE TABLE public.muro_lecturas (
  publicacion_id uuid NOT NULL REFERENCES public.muro_publicaciones(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  visto_at timestamptz NOT NULL DEFAULT now(),
  confirmado_at timestamptz,
  PRIMARY KEY (publicacion_id, user_id)
);

GRANT SELECT ON public.muro_lecturas TO authenticated;
ALTER TABLE public.muro_lecturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecturas: ver las propias"
ON public.muro_lecturas FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Registrar que vi publicaciones (en lote, sin duplicar)
CREATE OR REPLACE FUNCTION public.muro_registrar_vistas(_ids uuid[])
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.muro_lecturas (publicacion_id, user_id)
  SELECT p.id, auth.uid()
  FROM public.muro_publicaciones p
  WHERE p.id = ANY (_ids) AND auth.uid() IS NOT NULL AND NOT p.oculta
  ON CONFLICT (publicacion_id, user_id) DO NOTHING
$$;

-- "Leí y entendí" en comunicados que lo piden
CREATE OR REPLACE FUNCTION public.muro_confirmar_lectura(_publicacion_id uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _at timestamptz := now();
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado' USING ERRCODE = '42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.muro_publicaciones WHERE id = _publicacion_id AND requiere_confirmacion AND NOT oculta) THEN
    RAISE EXCEPTION 'Esta publicación no pide confirmación';
  END IF;
  INSERT INTO public.muro_lecturas (publicacion_id, user_id, confirmado_at)
  VALUES (_publicacion_id, auth.uid(), _at)
  ON CONFLICT (publicacion_id, user_id) DO UPDATE SET confirmado_at = COALESCE(public.muro_lecturas.confirmado_at, EXCLUDED.confirmado_at)
  RETURNING confirmado_at INTO _at;
  RETURN _at;
END;
$$;

-- Contadores para el feed (visible para todos: sólo números, no nombres)
CREATE OR REPLACE FUNCTION public.muro_lecturas_resumen(_ids uuid[])
RETURNS TABLE (publicacion_id uuid, vistos integer, confirmados integer, yo_confirmado_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id,
         (SELECT count(*)::int FROM public.muro_lecturas l WHERE l.publicacion_id = p.id),
         (SELECT count(*)::int FROM public.muro_lecturas l WHERE l.publicacion_id = p.id AND l.confirmado_at IS NOT NULL),
         (SELECT l.confirmado_at FROM public.muro_lecturas l WHERE l.publicacion_id = p.id AND l.user_id = auth.uid())
  FROM public.muro_publicaciones p
  WHERE p.id = ANY (_ids) AND auth.uid() IS NOT NULL
$$;

-- Detalle de quién vio / confirmó (y quién falta): autor de la publicación o RRHH
CREATE OR REPLACE FUNCTION public.muro_lecturas_detalle(_publicacion_id uuid)
RETURNS TABLE (user_id uuid, nombre text, apellido text, avatar_url text, puesto text, visto_at timestamptz, confirmado_at timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.muro_es_moderador() OR EXISTS (SELECT 1 FROM public.muro_publicaciones WHERE id = _publicacion_id AND autor_id = auth.uid())) THEN
    RAISE EXCEPTION 'Sin permiso' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT u.id,
         COALESCE(e.nombre, split_part(u.email, '@', 1)),
         COALESCE(e.apellido, ''),
         e.avatar_url,
         e.puesto,
         l.visto_at,
         l.confirmado_at
  FROM auth.users u
  JOIN (SELECT DISTINCT ur.user_id FROM public.user_roles ur WHERE ur.role <> 'registro_asistencia'::app_role) d ON d.user_id = u.id
  LEFT JOIN public.empleados e ON e.user_id = u.id
  LEFT JOIN public.muro_lecturas l ON l.publicacion_id = _publicacion_id AND l.user_id = u.id
  WHERE e.id IS NULL OR e.estado <> 'Baja'
  ORDER BY l.confirmado_at NULLS LAST, l.visto_at NULLS LAST, 3, 2;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.muro_registrar_vistas(uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.muro_confirmar_lectura(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.muro_lecturas_resumen(uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.muro_lecturas_detalle(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.muro_registrar_vistas(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.muro_confirmar_lectura(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.muro_lecturas_resumen(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.muro_lecturas_detalle(uuid) TO authenticated;

-- Avisar a todos cuando un comunicado pide confirmación (además del aviso de comunicado)
CREATE OR REPLACE FUNCTION public.muro_notificar_publicacion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.mencion_user_id IS NOT NULL AND NEW.mencion_user_id <> NEW.autor_id THEN
    INSERT INTO public.notificaciones (user_id, titulo, mensaje, link)
    VALUES (
      NEW.mencion_user_id,
      CASE NEW.tipo
        WHEN 'cumpleanios' THEN '¡Te saludaron por tu cumpleaños!'
        WHEN 'aniversario' THEN '¡Te saludaron por tu aniversario!'
        ELSE 'Te mencionaron en el muro'
      END,
      left(NEW.contenido, 140),
      '/muro'
    );
  END IF;

  IF NEW.tipo = 'comunicado' THEN
    INSERT INTO public.notificaciones (user_id, titulo, mensaje, link)
    SELECT DISTINCT ur.user_id,
           CASE WHEN NEW.requiere_confirmacion THEN 'Comunicado: confirmá la lectura' ELSE 'Nuevo comunicado oficial' END,
           left(NEW.contenido, 140), '/muro'
    FROM public.user_roles ur
    WHERE ur.user_id <> NEW.autor_id AND ur.role <> 'registro_asistencia'::app_role;
  END IF;
  RETURN NEW;
END;
$$;