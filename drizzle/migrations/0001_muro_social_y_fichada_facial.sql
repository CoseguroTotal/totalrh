-- Muro social y fichada por reconocimiento facial (commit 69d84fb).

CREATE OR REPLACE FUNCTION public.muro_es_moderador()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role)
      OR public.has_role(auth.uid(), 'rrhh'::app_role)
      OR public.has_role(auth.uid(), 'gerente'::app_role)
$$;

REVOKE EXECUTE ON FUNCTION public.muro_es_moderador() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.muro_es_moderador() TO authenticated;

CREATE TABLE public.muro_publicaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  autor_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  contenido text NOT NULL DEFAULT '' CHECK (char_length(contenido) <= 5000),
  imagen_url text,
  tipo text NOT NULL DEFAULT 'post'
    CHECK (tipo IN ('post', 'comunicado', 'cumpleanios', 'aniversario', 'bienvenida')),
  mencion_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  fijada boolean NOT NULL DEFAULT false,
  oculta boolean NOT NULL DEFAULT false,
  editada boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(contenido) > 0 OR imagen_url IS NOT NULL)
);

CREATE INDEX idx_muro_publicaciones_feed ON public.muro_publicaciones (fijada DESC, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.muro_publicaciones TO authenticated;
ALTER TABLE public.muro_publicaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Muro: ver publicaciones visibles"
ON public.muro_publicaciones FOR SELECT TO authenticated
USING (NOT oculta OR autor_id = auth.uid() OR public.muro_es_moderador());

CREATE POLICY "Muro: publicar como uno mismo"
ON public.muro_publicaciones FOR INSERT TO authenticated
WITH CHECK (autor_id = auth.uid());

CREATE POLICY "Muro: editar propias o moderar"
ON public.muro_publicaciones FOR UPDATE TO authenticated
USING (autor_id = auth.uid() OR public.muro_es_moderador())
WITH CHECK (autor_id = auth.uid() OR public.muro_es_moderador());

CREATE POLICY "Muro: borrar propias o moderar"
ON public.muro_publicaciones FOR DELETE TO authenticated
USING (autor_id = auth.uid() OR public.muro_es_moderador());

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
      IF NEW.tipo = 'comunicado' THEN NEW.tipo := 'post'; END IF;
    ELSE
      NEW.fijada := OLD.fijada;
      NEW.oculta := OLD.oculta;
      NEW.tipo := OLD.tipo;
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

CREATE TRIGGER muro_publicaciones_guard
BEFORE INSERT OR UPDATE ON public.muro_publicaciones
FOR EACH ROW EXECUTE FUNCTION public.muro_publicaciones_guard();

CREATE TABLE public.muro_comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publicacion_id uuid NOT NULL REFERENCES public.muro_publicaciones(id) ON DELETE CASCADE,
  autor_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  contenido text NOT NULL CHECK (char_length(contenido) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_muro_comentarios_pub ON public.muro_comentarios (publicacion_id, created_at);

GRANT SELECT, INSERT, DELETE ON public.muro_comentarios TO authenticated;
ALTER TABLE public.muro_comentarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Muro: ver comentarios de publicaciones visibles"
ON public.muro_comentarios FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.muro_publicaciones p WHERE p.id = publicacion_id));

CREATE POLICY "Muro: comentar como uno mismo"
ON public.muro_comentarios FOR INSERT TO authenticated
WITH CHECK (
  autor_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.muro_publicaciones p WHERE p.id = publicacion_id AND NOT p.oculta)
);

CREATE POLICY "Muro: borrar comentarios propios o moderar"
ON public.muro_comentarios FOR DELETE TO authenticated
USING (autor_id = auth.uid() OR public.muro_es_moderador());

CREATE TABLE public.muro_reacciones (
  publicacion_id uuid NOT NULL REFERENCES public.muro_publicaciones(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('me_gusta', 'me_encanta', 'aplauso', 'celebro', 'me_divierte')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (publicacion_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.muro_reacciones TO authenticated;
ALTER TABLE public.muro_reacciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Muro: ver reacciones"
ON public.muro_reacciones FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.muro_publicaciones p WHERE p.id = publicacion_id));

CREATE POLICY "Muro: reaccionar como uno mismo"
ON public.muro_reacciones FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Muro: cambiar reacción propia"
ON public.muro_reacciones FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Muro: quitar reacción propia"
ON public.muro_reacciones FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.muro_perfiles(_user_ids uuid[])
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
  LEFT JOIN public.empleados e ON e.user_id = u.id
  LEFT JOIN public.empresas em ON em.id = e.empresa_id
  WHERE u.id = ANY(_user_ids)
    AND auth.uid() IS NOT NULL
$$;

REVOKE EXECUTE ON FUNCTION public.muro_perfiles(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.muro_perfiles(uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.muro_celebraciones(_dias integer DEFAULT 7)
RETURNS TABLE (
  empleado_id uuid, user_id uuid, nombre text, apellido text, avatar_url text,
  puesto text, tipo text, dia integer, mes integer, dias_faltan integer, anios integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH hoy AS (
    SELECT (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date AS d
  ),
  fechas AS (
    SELECT e.id, e.user_id, e.nombre, e.apellido, e.avatar_url, e.puesto,
           'cumpleanios'::text AS tipo, e.fecha_nacimiento AS fecha
    FROM public.empleados e
    WHERE e.estado <> 'Baja' AND e.fecha_nacimiento IS NOT NULL
    UNION ALL
    SELECT e.id, e.user_id, e.nombre, e.apellido, e.avatar_url, e.puesto,
           'aniversario'::text, e.fecha_ingreso
    FROM public.empleados e
    WHERE e.estado <> 'Baja' AND e.fecha_ingreso IS NOT NULL
  ),
  proximas AS (
    SELECT f.*,
           (SELECT MIN(c) FROM (
              SELECT (make_date(y, EXTRACT(MONTH FROM f.fecha)::int, 1)
                      + (LEAST(EXTRACT(DAY FROM f.fecha)::int,
                               EXTRACT(DAY FROM (make_date(y, EXTRACT(MONTH FROM f.fecha)::int, 1)
                                                 + interval '1 month - 1 day'))::int) - 1)) AS c
              FROM (VALUES (EXTRACT(YEAR FROM h.d)::int), (EXTRACT(YEAR FROM h.d)::int + 1)) AS ys(y)
            ) cs WHERE c >= h.d) AS proxima,
           h.d AS hoy
    FROM fechas f CROSS JOIN hoy h
  )
  SELECT id, user_id, nombre, apellido, avatar_url, puesto, tipo,
         EXTRACT(DAY FROM fecha)::int, EXTRACT(MONTH FROM fecha)::int,
         (proxima - hoy)::int,
         CASE WHEN tipo = 'aniversario' THEN (EXTRACT(YEAR FROM proxima) - EXTRACT(YEAR FROM fecha))::int END
  FROM proximas
  WHERE auth.uid() IS NOT NULL
    AND (proxima - hoy) BETWEEN 0 AND GREATEST(0, LEAST(_dias, 60))
    AND NOT (tipo = 'aniversario' AND EXTRACT(YEAR FROM proxima) - EXTRACT(YEAR FROM fecha) < 1)
  ORDER BY (proxima - hoy), apellido, nombre
$$;

REVOKE EXECUTE ON FUNCTION public.muro_celebraciones(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.muro_celebraciones(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.muro_notificar_comentario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _autor_pub uuid;
BEGIN
  SELECT autor_id INTO _autor_pub FROM public.muro_publicaciones WHERE id = NEW.publicacion_id;
  IF _autor_pub IS NOT NULL AND _autor_pub <> NEW.autor_id THEN
    INSERT INTO public.notificaciones (user_id, titulo, mensaje, link)
    VALUES (_autor_pub, 'Nuevo comentario en tu publicación', left(NEW.contenido, 140), '/muro');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER muro_notificar_comentario
AFTER INSERT ON public.muro_comentarios
FOR EACH ROW EXECUTE FUNCTION public.muro_notificar_comentario();

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
    SELECT DISTINCT ur.user_id, 'Nuevo comunicado oficial', left(NEW.contenido, 140), '/muro'
    FROM public.user_roles ur
    WHERE ur.user_id <> NEW.autor_id AND ur.role <> 'registro_asistencia'::app_role;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER muro_notificar_publicacion
AFTER INSERT ON public.muro_publicaciones
FOR EACH ROW EXECUTE FUNCTION public.muro_notificar_publicacion();

ALTER PUBLICATION supabase_realtime ADD TABLE public.muro_publicaciones;
ALTER PUBLICATION supabase_realtime ADD TABLE public.muro_comentarios;
ALTER PUBLICATION supabase_realtime ADD TABLE public.muro_reacciones;

-- bucket 'muro' creado con la herramienta de storage (no se permite INSERT en storage.buckets)

CREATE POLICY "Muro: subir imágenes a carpeta propia"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'muro' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Muro: borrar imágenes propias"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'muro' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.muro_es_moderador()));

CREATE TABLE public.rostros_empleados (
  empleado_id uuid PRIMARY KEY REFERENCES public.empleados(id) ON DELETE CASCADE,
  descriptores jsonb NOT NULL,
  consentimiento_at timestamptz NOT NULL,
  consentimiento_texto text NOT NULL,
  registrado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.rostros_empleados TO service_role;
GRANT SELECT (empleado_id, consentimiento_at, created_at, updated_at), DELETE ON public.rostros_empleados TO authenticated;
ALTER TABLE public.rostros_empleados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rostros: gestores ven quién está registrado"
ON public.rostros_empleados FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'rrhh'::app_role)
  OR empleado_id = public.my_empleado_id()
);

CREATE POLICY "Rostros: borrar propio o gestores"
ON public.rostros_empleados FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'rrhh'::app_role)
  OR empleado_id = public.my_empleado_id()
);

CREATE TRIGGER update_rostros_empleados_updated_at
BEFORE UPDATE ON public.rostros_empleados
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.configuracion_grupo
  ADD COLUMN IF NOT EXISTS fichado_facial_activo boolean NOT NULL DEFAULT true;