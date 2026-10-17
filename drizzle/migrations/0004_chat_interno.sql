-- ═══════════════════════════════════════════════════════════════════
-- Chat interno estilo Messenger: conversaciones directas y grupales,
-- mensajes con imágenes, audios y documentos (bucket privado "chat").
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE public.chat_conversaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('directa', 'grupo')),
  nombre text CHECK (nombre IS NULL OR char_length(nombre) BETWEEN 1 AND 80),
  creada_por uuid,
  ultimo_mensaje_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.chat_conversaciones TO authenticated;
GRANT ALL ON public.chat_conversaciones TO service_role;

CREATE TABLE public.chat_participantes (
  conversacion_id uuid NOT NULL REFERENCES public.chat_conversaciones(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  ultimo_leido_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversacion_id, user_id)
);
GRANT SELECT, UPDATE, DELETE ON public.chat_participantes TO authenticated;
GRANT ALL ON public.chat_participantes TO service_role;

CREATE INDEX idx_chat_participantes_user ON public.chat_participantes (user_id);

CREATE TABLE public.chat_mensajes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversacion_id uuid NOT NULL REFERENCES public.chat_conversaciones(id) ON DELETE CASCADE,
  autor_id uuid NOT NULL DEFAULT auth.uid(),
  contenido text NOT NULL DEFAULT '' CHECK (char_length(contenido) <= 4000),
  -- Ruta dentro del bucket privado "chat": <conversacion_id>/<archivo>
  adjunto_path text,
  adjunto_tipo text CHECK (adjunto_tipo IS NULL OR adjunto_tipo IN ('imagen', 'audio', 'documento')),
  adjunto_nombre text,
  adjunto_tamano bigint,
  adjunto_duracion integer,
  eliminado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (eliminado OR char_length(contenido) > 0 OR adjunto_path IS NOT NULL)
);
GRANT SELECT, INSERT, UPDATE ON public.chat_mensajes TO authenticated;
GRANT ALL ON public.chat_mensajes TO service_role;

CREATE INDEX idx_chat_mensajes_conv ON public.chat_mensajes (conversacion_id, created_at DESC);

-- ── Helpers ──
CREATE OR REPLACE FUNCTION public.chat_es_participante(_conversacion_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participantes
    WHERE conversacion_id = _conversacion_id AND user_id = auth.uid()
  )
$$;

-- Versión para rutas de storage (la carpeta es el id de la conversación como texto)
CREATE OR REPLACE FUNCTION public.chat_es_participante_carpeta(_carpeta text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participantes
    WHERE conversacion_id::text = _carpeta AND user_id = auth.uid()
  )
$$;

REVOKE EXECUTE ON FUNCTION public.chat_es_participante(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.chat_es_participante_carpeta(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.chat_es_participante(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.chat_es_participante_carpeta(text) TO authenticated;

-- ── RLS ──
ALTER TABLE public.chat_conversaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_mensajes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat: ver mis conversaciones"
ON public.chat_conversaciones FOR SELECT TO authenticated
USING (public.chat_es_participante(id));

CREATE POLICY "Chat: renombrar grupos donde participo"
ON public.chat_conversaciones FOR UPDATE TO authenticated
USING (tipo = 'grupo' AND public.chat_es_participante(id))
WITH CHECK (tipo = 'grupo' AND public.chat_es_participante(id));

CREATE POLICY "Chat: ver participantes de mis conversaciones"
ON public.chat_participantes FOR SELECT TO authenticated
USING (public.chat_es_participante(conversacion_id));

CREATE POLICY "Chat: marcar leído lo propio"
ON public.chat_participantes FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Chat: salir de un grupo"
ON public.chat_participantes FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.chat_conversaciones c WHERE c.id = conversacion_id AND c.tipo = 'grupo')
);

CREATE POLICY "Chat: leer mensajes de mis conversaciones"
ON public.chat_mensajes FOR SELECT TO authenticated
USING (public.chat_es_participante(conversacion_id));

CREATE POLICY "Chat: escribir en mis conversaciones"
ON public.chat_mensajes FOR INSERT TO authenticated
WITH CHECK (
  autor_id = auth.uid()
  AND public.chat_es_participante(conversacion_id)
  AND (adjunto_path IS NULL OR split_part(adjunto_path, '/', 1) = conversacion_id::text)
);

CREATE POLICY "Chat: eliminar mis mensajes"
ON public.chat_mensajes FOR UPDATE TO authenticated
USING (autor_id = auth.uid()) WITH CHECK (autor_id = auth.uid());

-- Un mensaje sólo puede "eliminarse" (no editarse ni moverse de conversación).
CREATE OR REPLACE FUNCTION public.chat_mensajes_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.eliminado AND NOT OLD.eliminado THEN
    NEW.contenido := '';
    NEW.adjunto_path := NULL;
    NEW.adjunto_tipo := NULL;
    NEW.adjunto_nombre := NULL;
    NEW.adjunto_tamano := NULL;
    NEW.adjunto_duracion := NULL;
  ELSE
    NEW := OLD;
  END IF;
  NEW.id := OLD.id;
  NEW.conversacion_id := OLD.conversacion_id;
  NEW.autor_id := OLD.autor_id;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

CREATE TRIGGER chat_mensajes_guard
BEFORE UPDATE ON public.chat_mensajes
FOR EACH ROW EXECUTE FUNCTION public.chat_mensajes_guard();

-- Al enviar: la conversación sube en la lista y el autor la tiene leída.
CREATE OR REPLACE FUNCTION public.chat_al_enviar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_conversaciones SET ultimo_mensaje_at = NEW.created_at WHERE id = NEW.conversacion_id;
  UPDATE public.chat_participantes SET ultimo_leido_at = NEW.created_at
  WHERE conversacion_id = NEW.conversacion_id AND user_id = NEW.autor_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER chat_al_enviar
AFTER INSERT ON public.chat_mensajes
FOR EACH ROW EXECUTE FUNCTION public.chat_al_enviar();

-- ── Directorio de personas para iniciar un chat ──
CREATE OR REPLACE FUNCTION public.chat_directorio()
RETURNS TABLE (user_id uuid, nombre text, apellido text, avatar_url text, puesto text, empresa text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id,
         COALESCE(e.nombre, split_part(u.email, '@', 1)),
         COALESCE(e.apellido, ''),
         e.avatar_url,
         e.puesto,
         em.nombre
  FROM auth.users u
  JOIN public.user_roles ur ON ur.user_id = u.id AND ur.role <> 'registro_asistencia'::app_role
  LEFT JOIN public.empleados e ON e.user_id = u.id
  LEFT JOIN public.empresas em ON em.id = e.empresa_id
  WHERE auth.uid() IS NOT NULL
    AND u.id <> auth.uid()
    AND (e.id IS NULL OR e.estado <> 'Baja')
  ORDER BY 2, 3
$$;

REVOKE EXECUTE ON FUNCTION public.chat_directorio() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.chat_directorio() TO authenticated;

-- ── Abrir (o reutilizar) la conversación directa con otra persona ──
CREATE OR REPLACE FUNCTION public.chat_iniciar_directa(_otro uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _yo uuid := auth.uid();
  _id uuid;
BEGIN
  IF _yo IS NULL THEN RAISE EXCEPTION 'No autenticado' USING ERRCODE = '42501'; END IF;
  IF _otro IS NULL OR _otro = _yo THEN RAISE EXCEPTION 'Elegí otra persona'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _otro AND role <> 'registro_asistencia'::app_role
  ) THEN
    RAISE EXCEPTION 'Esa persona no está disponible para chatear';
  END IF;

  -- Serializa la creación entre el mismo par para no duplicar conversaciones
  PERFORM pg_advisory_xact_lock(hashtext(LEAST(_yo, _otro)::text || GREATEST(_yo, _otro)::text));

  SELECT c.id INTO _id
  FROM public.chat_conversaciones c
  JOIN public.chat_participantes a ON a.conversacion_id = c.id AND a.user_id = _yo
  JOIN public.chat_participantes b ON b.conversacion_id = c.id AND b.user_id = _otro
  WHERE c.tipo = 'directa'
  LIMIT 1;

  IF _id IS NULL THEN
    INSERT INTO public.chat_conversaciones (tipo, creada_por) VALUES ('directa', _yo) RETURNING id INTO _id;
    INSERT INTO public.chat_participantes (conversacion_id, user_id) VALUES (_id, _yo), (_id, _otro);
  END IF;
  RETURN _id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.chat_iniciar_directa(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.chat_iniciar_directa(uuid) TO authenticated;

-- ── Crear un grupo ──
CREATE OR REPLACE FUNCTION public.chat_crear_grupo(_nombre text, _miembros uuid[])
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _yo uuid := auth.uid();
  _id uuid;
BEGIN
  IF _yo IS NULL THEN RAISE EXCEPTION 'No autenticado' USING ERRCODE = '42501'; END IF;
  IF coalesce(trim(_nombre), '') = '' THEN RAISE EXCEPTION 'Poné un nombre al grupo'; END IF;
  IF coalesce(array_length(_miembros, 1), 0) < 2 THEN RAISE EXCEPTION 'Elegí al menos dos personas'; END IF;
  IF array_length(_miembros, 1) > 100 THEN RAISE EXCEPTION 'Máximo 100 personas por grupo'; END IF;

  INSERT INTO public.chat_conversaciones (tipo, nombre, creada_por) VALUES ('grupo', trim(_nombre), _yo) RETURNING id INTO _id;
  INSERT INTO public.chat_participantes (conversacion_id, user_id)
  SELECT _id, m FROM (
    SELECT DISTINCT unnest(_miembros || _yo) AS m
  ) s
  WHERE EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = s.m AND ur.role <> 'registro_asistencia'::app_role);
  RETURN _id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.chat_crear_grupo(text, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.chat_crear_grupo(text, uuid[]) TO authenticated;

-- ── Bandeja: mis conversaciones con último mensaje y no leídos ──
CREATE OR REPLACE FUNCTION public.chat_mis_conversaciones()
RETURNS TABLE (
  id uuid, tipo text, nombre text, ultimo_mensaje_at timestamptz,
  ultimo_texto text, ultimo_adjunto_tipo text, ultimo_autor_id uuid, ultimo_eliminado boolean,
  no_leidos integer, participantes uuid[]
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.tipo, c.nombre, c.ultimo_mensaje_at,
         um.contenido, um.adjunto_tipo, um.autor_id, um.eliminado,
         (SELECT count(*)::int FROM public.chat_mensajes m
            WHERE m.conversacion_id = c.id AND m.created_at > yo.ultimo_leido_at AND m.autor_id <> auth.uid()),
         (SELECT array_agg(p.user_id) FROM public.chat_participantes p WHERE p.conversacion_id = c.id AND p.user_id <> auth.uid())
  FROM public.chat_participantes yo
  JOIN public.chat_conversaciones c ON c.id = yo.conversacion_id
  LEFT JOIN LATERAL (
    SELECT m.contenido, m.adjunto_tipo, m.autor_id, m.eliminado
    FROM public.chat_mensajes m WHERE m.conversacion_id = c.id
    ORDER BY m.created_at DESC LIMIT 1
  ) um ON true
  WHERE yo.user_id = auth.uid()
    -- Las directas aparecen recién cuando tienen mensajes; los grupos siempre
    AND (c.tipo = 'grupo' OR um.autor_id IS NOT NULL)
  ORDER BY c.ultimo_mensaje_at DESC
$$;

REVOKE EXECUTE ON FUNCTION public.chat_mis_conversaciones() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.chat_mis_conversaciones() TO authenticated;

-- ── Tiempo real ──
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_mensajes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participantes;

-- ── Adjuntos: bucket privado, sólo para participantes de la conversación ──
-- Bucket privado "chat" (26214400 bytes) creado mediante Storage API.

CREATE POLICY "Chat: ver adjuntos de mis conversaciones"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'chat' AND public.chat_es_participante_carpeta((storage.foldername(name))[1]));

CREATE POLICY "Chat: subir adjuntos a mis conversaciones"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat' AND public.chat_es_participante_carpeta((storage.foldername(name))[1]));
