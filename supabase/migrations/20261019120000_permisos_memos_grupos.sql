-- ═══════════════════════════════════════════════════════════════════
-- 1) Documentos adjuntos en solicitudes de permiso
-- 2) Emisor (firma de quien emite) en memorándums
-- 3) Grupos por área con su propio muro
-- ═══════════════════════════════════════════════════════════════════

-- ═══════════════════════ 1) Permisos con documentos ═══════════════════════

-- Lista de adjuntos: [{ "path": "...", "nombre": "...", "tipo": "application/pdf", "tamano": 1234 }]
ALTER TABLE public.solicitudes_permiso
  ADD COLUMN IF NOT EXISTS adjuntos jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Bucket privado: carpeta = id del empleado
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('permisos', 'permisos', false, 10485760)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Permisos: subir documentos propios o RRHH"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'permisos' AND ((storage.foldername(name))[1] = public.my_empleado_id()::text OR public.is_manager()));

CREATE POLICY "Permisos: ver documentos propios o RRHH"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'permisos' AND ((storage.foldername(name))[1] = public.my_empleado_id()::text OR public.is_manager()));

CREATE POLICY "Permisos: borrar documentos propios o RRHH"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'permisos' AND ((storage.foldername(name))[1] = public.my_empleado_id()::text OR public.is_manager()));

-- ═══════════════════════ 2) Emisor del memorándum ═══════════════════════

ALTER TABLE public.memorandums
  ADD COLUMN IF NOT EXISTS emitido_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS emisor_nombre text,
  ADD COLUMN IF NOT EXISTS emisor_cargo text,
  ADD COLUMN IF NOT EXISTS emisor_sector text;

-- El destinatario sólo puede registrar la recepción y su firma: no puede cambiar
-- el contenido ni los datos de quien lo emitió.
CREATE OR REPLACE FUNCTION public.memorandums_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.emitido_por := COALESCE(NEW.emitido_por, auth.uid());
    RETURN NEW;
  END IF;
  IF NOT public.is_manager() THEN
    NEW.titulo := OLD.titulo;
    NEW.contenido := OLD.contenido;
    NEW.fecha := OLD.fecha;
    NEW.numero := OLD.numero;
    NEW.empresa_id := OLD.empresa_id;
    NEW.destinatario_empleado_id := OLD.destinatario_empleado_id;
    NEW.destinatario_nombre := OLD.destinatario_nombre;
    NEW.created_by := OLD.created_by;
    NEW.emitido_por := OLD.emitido_por;
    NEW.emisor_nombre := OLD.emisor_nombre;
    NEW.emisor_cargo := OLD.emisor_cargo;
    NEW.emisor_sector := OLD.emisor_sector;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS memorandums_guard ON public.memorandums;
CREATE TRIGGER memorandums_guard
BEFORE INSERT OR UPDATE ON public.memorandums
FOR EACH ROW EXECUTE FUNCTION public.memorandums_guard();

-- ═══════════════════════ 3) Grupos ═══════════════════════

CREATE TABLE public.grupos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL CHECK (char_length(nombre) BETWEEN 2 AND 80),
  descripcion text NOT NULL DEFAULT '' CHECK (char_length(descripcion) <= 1000),
  -- abierto: cualquiera se suma; privado: sólo lo suman sus administradores
  tipo text NOT NULL DEFAULT 'privado' CHECK (tipo IN ('abierto', 'privado')),
  color text NOT NULL DEFAULT '#26A69A' CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  creado_por uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.grupo_miembros (
  grupo_id uuid NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rol text NOT NULL DEFAULT 'miembro' CHECK (rol IN ('admin', 'miembro')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (grupo_id, user_id)
);

CREATE INDEX idx_grupo_miembros_user ON public.grupo_miembros (user_id);

CREATE TRIGGER update_grupos_updated_at
BEFORE UPDATE ON public.grupos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.es_miembro_grupo(_grupo_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.grupo_miembros WHERE grupo_id = _grupo_id AND user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.es_admin_grupo(_grupo_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.muro_es_moderador()
      OR EXISTS (SELECT 1 FROM public.grupo_miembros WHERE grupo_id = _grupo_id AND user_id = auth.uid() AND rol = 'admin')
$$;

REVOKE EXECUTE ON FUNCTION public.es_miembro_grupo(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.es_admin_grupo(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.es_miembro_grupo(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.es_admin_grupo(uuid) TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupo_miembros TO authenticated;
ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupo_miembros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Grupos: ver abiertos o donde participo"
ON public.grupos FOR SELECT TO authenticated
USING (tipo = 'abierto' OR public.es_miembro_grupo(id) OR public.muro_es_moderador());

CREATE POLICY "Grupos: RRHH crea"
ON public.grupos FOR INSERT TO authenticated
WITH CHECK (public.muro_es_moderador() AND creado_por = auth.uid());

CREATE POLICY "Grupos: administradores editan"
ON public.grupos FOR UPDATE TO authenticated
USING (public.es_admin_grupo(id)) WITH CHECK (public.es_admin_grupo(id));

CREATE POLICY "Grupos: administradores borran"
ON public.grupos FOR DELETE TO authenticated
USING (public.es_admin_grupo(id));

CREATE POLICY "Miembros: ver los de grupos visibles"
ON public.grupo_miembros FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.grupos g WHERE g.id = grupo_id));

-- Sumarse a un grupo abierto como miembro, o que un administrador sume gente
CREATE POLICY "Miembros: sumarse o sumar"
ON public.grupo_miembros FOR INSERT TO authenticated
WITH CHECK (
  public.es_admin_grupo(grupo_id)
  OR (user_id = auth.uid() AND rol = 'miembro' AND EXISTS (SELECT 1 FROM public.grupos g WHERE g.id = grupo_id AND g.tipo = 'abierto'))
);

CREATE POLICY "Miembros: administradores cambian roles"
ON public.grupo_miembros FOR UPDATE TO authenticated
USING (public.es_admin_grupo(grupo_id)) WITH CHECK (public.es_admin_grupo(grupo_id));

CREATE POLICY "Miembros: salir o sacar"
ON public.grupo_miembros FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.es_admin_grupo(grupo_id));

-- Quien crea el grupo queda como administrador
CREATE OR REPLACE FUNCTION public.grupos_al_crear()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.grupo_miembros (grupo_id, user_id, rol) VALUES (NEW.id, NEW.creado_por, 'admin')
  ON CONFLICT (grupo_id, user_id) DO UPDATE SET rol = 'admin';
  RETURN NEW;
END;
$$;

CREATE TRIGGER grupos_al_crear
AFTER INSERT ON public.grupos
FOR EACH ROW EXECUTE FUNCTION public.grupos_al_crear();

-- Sumar de una vez a todo el personal (con usuario) de una empresa y/o sucursal
CREATE OR REPLACE FUNCTION public.grupo_agregar_masivo(_grupo_id uuid, _empresa_id uuid, _sucursal_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _n integer;
BEGIN
  IF NOT public.es_admin_grupo(_grupo_id) THEN RAISE EXCEPTION 'Sólo los administradores del grupo pueden sumar personas' USING ERRCODE = '42501'; END IF;
  INSERT INTO public.grupo_miembros (grupo_id, user_id)
  SELECT DISTINCT _grupo_id, e.user_id
  FROM public.empleados e
  WHERE e.user_id IS NOT NULL AND e.estado <> 'Baja'
    AND (_empresa_id IS NULL OR e.empresa_id = _empresa_id)
    AND (_sucursal_id IS NULL OR e.sucursal_id = _sucursal_id)
  ON CONFLICT (grupo_id, user_id) DO NOTHING;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.grupo_agregar_masivo(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grupo_agregar_masivo(uuid, uuid, uuid) TO authenticated;

-- ── Publicaciones de grupo ──
ALTER TABLE public.muro_publicaciones
  ADD COLUMN IF NOT EXISTS grupo_id uuid REFERENCES public.grupos(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_muro_publicaciones_grupo ON public.muro_publicaciones (grupo_id, created_at DESC);

DROP POLICY IF EXISTS "Muro: ver publicaciones visibles" ON public.muro_publicaciones;
CREATE POLICY "Muro: ver publicaciones visibles"
ON public.muro_publicaciones FOR SELECT TO authenticated
USING (
  (NOT oculta OR autor_id = auth.uid() OR public.muro_es_moderador())
  AND (grupo_id IS NULL OR public.es_miembro_grupo(grupo_id) OR public.muro_es_moderador())
);

DROP POLICY IF EXISTS "Muro: publicar como uno mismo" ON public.muro_publicaciones;
CREATE POLICY "Muro: publicar como uno mismo"
ON public.muro_publicaciones FOR INSERT TO authenticated
WITH CHECK (autor_id = auth.uid() AND (grupo_id IS NULL OR public.es_miembro_grupo(grupo_id) OR public.muro_es_moderador()));

-- Comunicados y confirmación de lectura: RRHH en todo el muro; administradores de grupo dentro de su grupo
CREATE OR REPLACE FUNCTION public.muro_publicaciones_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _puede boolean;
BEGIN
  _puede := public.muro_es_moderador() OR (NEW.grupo_id IS NOT NULL AND public.es_admin_grupo(NEW.grupo_id));
  IF NOT _puede THEN
    IF TG_OP = 'INSERT' THEN
      NEW.fijada := false;
      NEW.oculta := false;
      NEW.requiere_confirmacion := false;
      IF NEW.tipo IN ('comunicado', 'encuesta', 'evento') THEN NEW.tipo := 'post'; END IF;
    ELSE
      NEW.fijada := OLD.fijada;
      NEW.oculta := OLD.oculta;
      NEW.tipo := OLD.tipo;
      NEW.requiere_confirmacion := OLD.requiere_confirmacion;
    END IF;
  ELSIF NEW.tipo IN ('encuesta', 'evento') AND NOT public.muro_es_moderador() AND TG_OP = 'INSERT' THEN
    -- Encuestas y eventos los publica sólo RRHH (con sus propias funciones)
    NEW.tipo := 'post';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.autor_id := OLD.autor_id;
    NEW.grupo_id := OLD.grupo_id;
    NEW.created_at := OLD.created_at;
    IF NEW.contenido IS DISTINCT FROM OLD.contenido THEN NEW.editada := true; END IF;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

-- Avisos: en un grupo, los comunicados avisan sólo a sus miembros
CREATE OR REPLACE FUNCTION public.muro_notificar_publicacion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _grupo text;
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
    IF NEW.grupo_id IS NULL THEN
      INSERT INTO public.notificaciones (user_id, titulo, mensaje, link)
      SELECT DISTINCT ur.user_id,
             CASE WHEN NEW.requiere_confirmacion THEN 'Comunicado: confirmá la lectura' ELSE 'Nuevo comunicado oficial' END,
             left(NEW.contenido, 140), '/muro'
      FROM public.user_roles ur
      WHERE ur.user_id <> NEW.autor_id AND ur.role <> 'registro_asistencia'::app_role;
    ELSE
      SELECT nombre INTO _grupo FROM public.grupos WHERE id = NEW.grupo_id;
      INSERT INTO public.notificaciones (user_id, titulo, mensaje, link)
      SELECT gm.user_id,
             CASE WHEN NEW.requiere_confirmacion THEN 'Comunicado en ' || _grupo || ': confirmá la lectura' ELSE 'Comunicado en ' || _grupo END,
             left(NEW.contenido, 140), '/grupos/' || NEW.grupo_id
      FROM public.grupo_miembros gm
      WHERE gm.grupo_id = NEW.grupo_id AND gm.user_id <> NEW.autor_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Lecturas: en publicaciones de grupo, "quién falta" son los miembros del grupo
CREATE OR REPLACE FUNCTION public.muro_lecturas_detalle(_publicacion_id uuid)
RETURNS TABLE (user_id uuid, nombre text, apellido text, avatar_url text, puesto text, visto_at timestamptz, confirmado_at timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _grupo uuid;
BEGIN
  SELECT p.grupo_id INTO _grupo FROM public.muro_publicaciones p WHERE p.id = _publicacion_id;
  IF NOT (public.muro_es_moderador()
          OR EXISTS (SELECT 1 FROM public.muro_publicaciones WHERE id = _publicacion_id AND autor_id = auth.uid())
          OR (_grupo IS NOT NULL AND public.es_admin_grupo(_grupo))) THEN
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
  JOIN (
    SELECT DISTINCT ur.user_id FROM public.user_roles ur
    WHERE ur.role <> 'registro_asistencia'::app_role
      AND (_grupo IS NULL OR EXISTS (SELECT 1 FROM public.grupo_miembros gm WHERE gm.grupo_id = _grupo AND gm.user_id = ur.user_id))
  ) d ON d.user_id = u.id
  LEFT JOIN public.empleados e ON e.user_id = u.id
  LEFT JOIN public.muro_lecturas l ON l.publicacion_id = _publicacion_id AND l.user_id = u.id
  WHERE e.id IS NULL OR e.estado <> 'Baja'
  ORDER BY l.confirmado_at NULLS LAST, l.visto_at NULLS LAST, 3, 2;
END;
$$;

-- Mis grupos y los abiertos, con cantidad de miembros
CREATE OR REPLACE FUNCTION public.grupos_listado()
RETURNS TABLE (id uuid, nombre text, descripcion text, tipo text, color text, miembros integer, soy_miembro boolean, soy_admin boolean, ultima_actividad timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.id, g.nombre, g.descripcion, g.tipo, g.color,
         (SELECT count(*)::int FROM public.grupo_miembros m WHERE m.grupo_id = g.id),
         EXISTS (SELECT 1 FROM public.grupo_miembros m WHERE m.grupo_id = g.id AND m.user_id = auth.uid()),
         public.es_admin_grupo(g.id),
         (SELECT max(p.created_at) FROM public.muro_publicaciones p WHERE p.grupo_id = g.id)
  FROM public.grupos g
  WHERE auth.uid() IS NOT NULL
    AND (g.tipo = 'abierto' OR public.es_miembro_grupo(g.id) OR public.muro_es_moderador())
  ORDER BY 7 DESC, 9 DESC NULLS LAST, 2
$$;

REVOKE EXECUTE ON FUNCTION public.grupo_agregar_masivo(uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.grupos_listado() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grupos_listado() TO authenticated;
