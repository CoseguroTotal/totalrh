-- ═══════════════════════════════════════════════════════════════════
-- Calendario de eventos (con confirmación de asistencia) y tareas
-- (propias o asignadas por RRHH / gerencia / admin).
-- ═══════════════════════════════════════════════════════════════════

-- Las publicaciones del muro pueden anunciar un evento
ALTER TABLE public.muro_publicaciones DROP CONSTRAINT IF EXISTS muro_publicaciones_tipo_check;
ALTER TABLE public.muro_publicaciones ADD CONSTRAINT muro_publicaciones_tipo_check
  CHECK (tipo IN ('post', 'comunicado', 'cumpleanios', 'aniversario', 'bienvenida', 'encuesta', 'evento'));

-- Sólo RRHH publica anuncios de comunicado, encuesta o evento
CREATE OR REPLACE FUNCTION public.muro_publicaciones_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
BEGIN
  IF NOT public.muro_es_moderador() THEN
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
$;

-- ═══════════════════════ Eventos ═══════════════════════

CREATE TABLE public.eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL CHECK (char_length(titulo) BETWEEN 1 AND 160),
  descripcion text NOT NULL DEFAULT '' CHECK (char_length(descripcion) <= 3000),
  tipo text NOT NULL DEFAULT 'evento' CHECK (tipo IN ('evento', 'capacitacion', 'reunion', 'feriado', 'celebracion')),
  inicio timestamptz NOT NULL,
  fin timestamptz,
  todo_el_dia boolean NOT NULL DEFAULT false,
  lugar text CHECK (lugar IS NULL OR char_length(lugar) <= 200),
  enlace text CHECK (enlace IS NULL OR enlace ~* '^https?://'),
  pide_asistencia boolean NOT NULL DEFAULT true,
  creado_por uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  publicacion_id uuid REFERENCES public.muro_publicaciones(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (fin IS NULL OR fin >= inicio)
);

CREATE INDEX idx_eventos_inicio ON public.eventos (inicio);

CREATE TABLE public.evento_asistencias (
  evento_id uuid NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  respuesta text NOT NULL CHECK (respuesta IN ('voy', 'quizas', 'no_voy')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (evento_id, user_id)
);

CREATE TRIGGER update_eventos_updated_at
BEFORE UPDATE ON public.eventos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.eventos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evento_asistencias TO authenticated;
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evento_asistencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Eventos: todos los ven" ON public.eventos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Eventos: RRHH crea" ON public.eventos FOR INSERT TO authenticated
  WITH CHECK (public.muro_es_moderador() AND creado_por = auth.uid());
CREATE POLICY "Eventos: RRHH edita" ON public.eventos FOR UPDATE TO authenticated
  USING (public.muro_es_moderador()) WITH CHECK (public.muro_es_moderador());
CREATE POLICY "Eventos: RRHH borra" ON public.eventos FOR DELETE TO authenticated
  USING (public.muro_es_moderador());

CREATE POLICY "Asistencias: todos ven quién va" ON public.evento_asistencias FOR SELECT TO authenticated USING (true);
CREATE POLICY "Asistencias: responder por uno mismo" ON public.evento_asistencias FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Asistencias: cambiar la propia" ON public.evento_asistencias FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Asistencias: quitar la propia" ON public.evento_asistencias FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Crear evento y (opcional) anunciarlo en el muro con aviso a todos
CREATE OR REPLACE FUNCTION public.evento_crear(
  _titulo text, _descripcion text, _tipo text, _inicio timestamptz, _fin timestamptz,
  _todo_el_dia boolean, _lugar text, _enlace text, _pide_asistencia boolean, _anunciar boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
  _pub uuid;
  _cuando text;
BEGIN
  IF NOT public.muro_es_moderador() THEN RAISE EXCEPTION 'Sólo RRHH puede publicar eventos' USING ERRCODE = '42501'; END IF;

  INSERT INTO public.eventos (titulo, descripcion, tipo, inicio, fin, todo_el_dia, lugar, enlace, pide_asistencia, creado_por)
  VALUES (trim(_titulo), coalesce(trim(_descripcion), ''), coalesce(_tipo, 'evento'), _inicio, _fin, coalesce(_todo_el_dia, false),
          nullif(trim(_lugar), ''), nullif(trim(_enlace), ''), coalesce(_pide_asistencia, true), auth.uid())
  RETURNING id INTO _id;

  IF coalesce(_anunciar, true) THEN
    _cuando := to_char(_inicio AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM')
      || CASE WHEN coalesce(_todo_el_dia, false) THEN '' ELSE ' · ' || to_char(_inicio AT TIME ZONE 'America/Argentina/Buenos_Aires', 'HH24:MI') || ' h' END;
    INSERT INTO public.muro_publicaciones (autor_id, contenido, tipo)
    VALUES (auth.uid(), trim(_titulo) || chr(10) || _cuando || CASE WHEN nullif(trim(_lugar), '') IS NOT NULL THEN ' · ' || trim(_lugar) ELSE '' END, 'evento')
    RETURNING id INTO _pub;
    UPDATE public.eventos SET publicacion_id = _pub WHERE id = _id;

    INSERT INTO public.notificaciones (user_id, titulo, mensaje, link)
    SELECT DISTINCT ur.user_id, 'Nuevo evento', trim(_titulo) || ' · ' || _cuando, '/eventos?evento=' || _id
    FROM public.user_roles ur
    WHERE ur.user_id <> auth.uid() AND ur.role <> 'registro_asistencia'::app_role;
  END IF;
  RETURN _id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.evento_crear(text, text, text, timestamptz, timestamptz, boolean, text, text, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.evento_crear(text, text, text, timestamptz, timestamptz, boolean, text, text, boolean, boolean) TO authenticated;

-- ═══════════════════════ Tareas ═══════════════════════

CREATE TABLE public.tareas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL CHECK (char_length(titulo) BETWEEN 1 AND 200),
  descripcion text NOT NULL DEFAULT '' CHECK (char_length(descripcion) <= 3000),
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_curso', 'hecha')),
  prioridad text NOT NULL DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta')),
  vence date,
  asignada_a uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  creada_por uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  completada_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tareas_asignada ON public.tareas (asignada_a, estado);
CREATE INDEX idx_tareas_creada ON public.tareas (creada_por);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tareas TO authenticated;
ALTER TABLE public.tareas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tareas: ver las mías o las que asigné"
ON public.tareas FOR SELECT TO authenticated
USING (asignada_a = auth.uid() OR creada_por = auth.uid());

-- Cualquiera crea tareas para sí; RRHH, gerencia y admin pueden asignarlas a otros
CREATE POLICY "Tareas: crear propias o asignar si sos superior"
ON public.tareas FOR INSERT TO authenticated
WITH CHECK (creada_por = auth.uid() AND (asignada_a = auth.uid() OR public.muro_es_moderador()));

CREATE POLICY "Tareas: actualizar las mías o las que asigné"
ON public.tareas FOR UPDATE TO authenticated
USING (asignada_a = auth.uid() OR creada_por = auth.uid())
WITH CHECK (asignada_a = auth.uid() OR creada_por = auth.uid());

CREATE POLICY "Tareas: borrar las que creé"
ON public.tareas FOR DELETE TO authenticated
USING (creada_por = auth.uid());

-- Quien recibe una tarea asignada sólo cambia su estado; el resto lo edita quien la creó
CREATE OR REPLACE FUNCTION public.tareas_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.creada_por := OLD.creada_por;
    NEW.created_at := OLD.created_at;
    IF OLD.creada_por <> auth.uid() THEN
      NEW.titulo := OLD.titulo;
      NEW.descripcion := OLD.descripcion;
      NEW.prioridad := OLD.prioridad;
      NEW.vence := OLD.vence;
      NEW.asignada_a := OLD.asignada_a;
    ELSIF NEW.asignada_a <> OLD.asignada_a AND NEW.asignada_a <> auth.uid() AND NOT public.muro_es_moderador() THEN
      RAISE EXCEPTION 'Sólo un superior puede reasignar tareas' USING ERRCODE = '42501';
    END IF;
    IF NEW.estado = 'hecha' AND OLD.estado <> 'hecha' THEN NEW.completada_at := now(); END IF;
    IF NEW.estado <> 'hecha' THEN NEW.completada_at := NULL; END IF;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tareas_guard
BEFORE UPDATE ON public.tareas
FOR EACH ROW EXECUTE FUNCTION public.tareas_guard();

-- Avisos: nueva tarea asignada y tarea completada
CREATE OR REPLACE FUNCTION public.tareas_notificar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.asignada_a <> NEW.creada_por THEN
    INSERT INTO public.notificaciones (user_id, titulo, mensaje, link)
    VALUES (NEW.asignada_a, 'Te asignaron una tarea', NEW.titulo || CASE WHEN NEW.vence IS NOT NULL THEN ' · vence ' || to_char(NEW.vence, 'DD/MM') ELSE '' END, '/tareas');
  ELSIF TG_OP = 'UPDATE' AND NEW.asignada_a <> OLD.asignada_a AND NEW.asignada_a <> auth.uid() THEN
    INSERT INTO public.notificaciones (user_id, titulo, mensaje, link)
    VALUES (NEW.asignada_a, 'Te asignaron una tarea', NEW.titulo, '/tareas');
  ELSIF TG_OP = 'UPDATE' AND NEW.estado = 'hecha' AND OLD.estado <> 'hecha' AND NEW.creada_por <> auth.uid() THEN
    INSERT INTO public.notificaciones (user_id, titulo, mensaje, link)
    VALUES (NEW.creada_por, 'Tarea completada', NEW.titulo, '/tareas');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tareas_notificar
AFTER INSERT OR UPDATE ON public.tareas
FOR EACH ROW EXECUTE FUNCTION public.tareas_notificar();

ALTER PUBLICATION supabase_realtime ADD TABLE public.tareas;
