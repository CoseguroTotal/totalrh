-- Multiempresa · Tanda 4: las funciones SECURITY DEFINER respetan la organización
-- Plan: docs/PLAN_MULTIEMPRESA_ETAPA1.md · Vuelta atrás: docs/multiempresa/vuelta_atras_t4.sql

CREATE SCHEMA IF NOT EXISTS multiempresa_respaldo;
REVOKE ALL ON SCHEMA multiempresa_respaldo FROM PUBLIC;
CREATE TABLE IF NOT EXISTS multiempresa_respaldo.funciones (
  tanda integer NOT NULL,
  firma text NOT NULL,
  definicion text NOT NULL,
  guardada_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tanda, firma)
);
REVOKE ALL ON multiempresa_respaldo.funciones FROM PUBLIC;

INSERT INTO multiempresa_respaldo.funciones (tanda, firma, definicion)
SELECT 4, p.oid::regprocedure::text, pg_get_functiondef(p.oid)
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.prokind = 'f'
   AND p.proname IN (
     'forzar_organizacion', 'chat_directorio', 'get_users_with_roles', 'muro_perfiles', 'muro_celebraciones',
     'terminal_ultimas_fichadas', 'encuesta_resultados', 'encuesta_responder', 'encuesta_publicar',
     'muro_lecturas_detalle', 'muro_lecturas_resumen', 'chat_mis_conversaciones', 'grupos_listado',
     'solicitudes_destinatarios_gestion', 'evento_crear', 'muro_notificar_publicacion', 'solicitudes_alta_avisar',
     'empleados_registrar_cambios', 'memorandums_notificar', 'solicitudes_permiso_avisar',
     'solicitudes_vacaciones_avisar', 'tareas_notificar', 'muro_notificar_comentario', 'soporte_avisar',
     'soporte_completar', 'chat_crear_grupo', 'chat_iniciar_directa', 'grupo_agregar_masivo',
     'muro_confirmar_lectura', 'muro_registrar_vistas', 'configurar_registro', 'memorandums_guard',
     'grupos_al_crear', 'solicitudes_permiso_firma')
ON CONFLICT (tanda, firma) DO NOTHING;

CREATE FUNCTION public.org_de_usuario(_user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT coalesce(
    (SELECT a.organizacion_id
       FROM public.usuario_organizacion_activa a
      WHERE a.user_id = _user_id
        AND EXISTS (SELECT 1 FROM public.user_roles r
                     WHERE r.user_id = a.user_id AND r.organizacion_id = a.organizacion_id)),
    (SELECT r.organizacion_id
       FROM public.user_roles r
       JOIN public.organizaciones o ON o.id = r.organizacion_id
      WHERE r.user_id = _user_id
      ORDER BY o.created_at, o.id
      LIMIT 1)
  )
$$;
REVOKE EXECUTE ON FUNCTION public.org_de_usuario(uuid) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.soporte_org_de(_usuario_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT CASE WHEN public.es_soporte() THEN coalesce(
    (SELECT m.organizacion_id FROM public.soporte_mensajes m
      WHERE m.usuario_id = _usuario_id AND m.autor_id = _usuario_id
      ORDER BY m.created_at DESC LIMIT 1),
    public.org_de_usuario(_usuario_id)
  ) END
$$;
REVOKE EXECUTE ON FUNCTION public.soporte_org_de(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soporte_org_de(uuid) TO authenticated;

CREATE FUNCTION public.solicitudes_destinatarios_gestion(_excluir uuid[], _org uuid)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT DISTINCT ur.user_id
  FROM public.user_roles ur
  WHERE ur.organizacion_id = _org
    AND ur.role IN ('admin', 'rrhh', 'gerente')
    AND ur.user_id IS DISTINCT FROM public.soporte_user_id()
    AND NOT (ur.user_id = ANY (array_remove(coalesce(_excluir, '{}'), NULL)))
$$;
REVOKE EXECUTE ON FUNCTION public.solicitudes_destinatarios_gestion(uuid[], uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.forzar_organizacion()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Sin sesión (edge functions con clave de servicio) se respeta lo que venga o el valor por defecto.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  -- La organización de un registro no cambia nunca.
  IF TG_OP <> 'INSERT' THEN
    NEW.organizacion_id := OLD.organizacion_id;
    RETURN NEW;
  END IF;
  -- Dentro de una función SECURITY DEFINER (corre como su dueño) la función ya eligió la organización.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  -- Soporte contesta dentro de la organización del usuario que consultó.
  -- (IF anidado y to_jsonb: las demás tablas no tienen usuario_id)
  IF TG_TABLE_NAME = 'soporte_mensajes' THEN
    IF public.es_soporte() AND (to_jsonb(NEW) ->> 'usuario_id')::uuid IS DISTINCT FROM auth.uid() THEN
      NEW.organizacion_id := coalesce(public.soporte_org_de((to_jsonb(NEW) ->> 'usuario_id')::uuid), public.org_vigente());
      RETURN NEW;
    END IF;
  END IF;
  NEW.organizacion_id := public.org_vigente();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.chat_directorio()
 RETURNS TABLE(user_id uuid, nombre text, apellido text, avatar_url text, puesto text, empresa text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT u.id,
         COALESCE(e.nombre, split_part(u.email, '@', 1)),
         COALESCE(e.apellido, ''),
         e.avatar_url,
         e.puesto,
         em.nombre
  FROM auth.users u
  JOIN public.user_roles ur ON ur.user_id = u.id AND ur.role <> 'registro_asistencia'::app_role
                           AND ur.organizacion_id = public.org_vigente()
  LEFT JOIN public.empleados e ON e.user_id = u.id AND e.organizacion_id = ur.organizacion_id
  LEFT JOIN public.empresas em ON em.id = e.empresa_id
  WHERE auth.uid() IS NOT NULL
    AND u.id <> auth.uid()
    AND lower(u.email) <> public.soporte_email()
    AND (e.id IS NULL OR e.estado <> 'Baja')
  ORDER BY 2, 3
$function$;

CREATE OR REPLACE FUNCTION public.get_users_with_roles()
 RETURNS TABLE(id uuid, user_id uuid, email text, role text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT ur.id, ur.user_id, u.email::text, ur.role::text
  FROM public.user_roles ur
  JOIN auth.users u ON u.id = ur.user_id
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
    AND ur.organizacion_id = public.org_vigente()
  ORDER BY u.email
$function$;

CREATE OR REPLACE FUNCTION public.muro_perfiles(_user_ids uuid[])
 RETURNS TABLE(user_id uuid, nombre text, apellido text, avatar_url text, puesto text, empresa text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT u.id,
         COALESCE(e.nombre, split_part(u.email, '@', 1)),
         COALESCE(e.apellido, ''),
         e.avatar_url,
         e.puesto,
         em.nombre
  FROM auth.users u
  LEFT JOIN public.empleados e ON e.user_id = u.id AND e.organizacion_id = public.org_vigente()
  LEFT JOIN public.empresas em ON em.id = e.empresa_id
  WHERE u.id = ANY(_user_ids)
    AND auth.uid() IS NOT NULL
    AND (e.id IS NOT NULL
         OR u.id = public.soporte_user_id()
         OR EXISTS (SELECT 1 FROM public.user_roles r
                     WHERE r.user_id = u.id AND r.organizacion_id = public.org_vigente()))
$function$;

CREATE OR REPLACE FUNCTION public.muro_celebraciones(_dias integer DEFAULT 7)
 RETURNS TABLE(empleado_id uuid, user_id uuid, nombre text, apellido text, avatar_url text, puesto text, tipo text, dia integer, mes integer, dias_faltan integer, anios integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH hoy AS (
    SELECT (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date AS d
  ),
  fechas AS (
    SELECT e.id, e.user_id, e.nombre, e.apellido, e.avatar_url, e.puesto,
           'cumpleanios'::text AS tipo, e.fecha_nacimiento AS fecha
    FROM public.empleados e
    WHERE e.estado <> 'Baja' AND e.fecha_nacimiento IS NOT NULL
      AND e.organizacion_id = public.org_vigente()
    UNION ALL
    SELECT e.id, e.user_id, e.nombre, e.apellido, e.avatar_url, e.puesto,
           'aniversario'::text, e.fecha_ingreso
    FROM public.empleados e
    WHERE e.estado <> 'Baja' AND e.fecha_ingreso IS NOT NULL
      AND e.organizacion_id = public.org_vigente()
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
$function$;

CREATE OR REPLACE FUNCTION public.terminal_ultimas_fichadas()
 RETURNS TABLE(nombre text, apellido text, legajo text, tipo text, hora timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT e.nombre, e.apellido, e.legajo,
         CASE WHEN f.hora_salida IS NOT NULL THEN 'salida' ELSE 'entrada' END AS tipo,
         COALESCE(f.hora_salida, f.hora_entrada) AS hora
  FROM public.fichadas f
  JOIN public.empleados e ON e.id = f.empleado_id
  WHERE f.terminal_user_id = auth.uid()
    AND f.organizacion_id = public.org_vigente()
    AND f.fecha = (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
    AND public.has_role(auth.uid(), 'registro_asistencia'::app_role)
  ORDER BY COALESCE(f.hora_salida, f.hora_entrada) DESC
  LIMIT 5
$function$;

CREATE OR REPLACE FUNCTION public.muro_lecturas_detalle(_publicacion_id uuid)
 RETURNS TABLE(user_id uuid, nombre text, apellido text, avatar_url text, puesto text, visto_at timestamp with time zone, confirmado_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _grupo uuid;
  _org uuid;
BEGIN
  SELECT p.grupo_id, p.organizacion_id INTO _grupo, _org
  FROM public.muro_publicaciones p
  WHERE p.id = _publicacion_id AND p.organizacion_id = public.org_vigente();
  IF _org IS NULL OR NOT (public.muro_es_moderador()
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
      AND ur.organizacion_id = _org
      AND (_grupo IS NULL OR EXISTS (SELECT 1 FROM public.grupo_miembros gm WHERE gm.grupo_id = _grupo AND gm.user_id = ur.user_id))
  ) d ON d.user_id = u.id
  LEFT JOIN public.empleados e ON e.user_id = u.id AND e.organizacion_id = _org
  LEFT JOIN public.muro_lecturas l ON l.publicacion_id = _publicacion_id AND l.user_id = u.id
  WHERE e.id IS NULL OR e.estado <> 'Baja'
  ORDER BY l.confirmado_at NULLS LAST, l.visto_at NULLS LAST, 3, 2;
END;
$function$;

CREATE OR REPLACE FUNCTION public.muro_lecturas_resumen(_ids uuid[])
 RETURNS TABLE(publicacion_id uuid, vistos integer, confirmados integer, yo_confirmado_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.id,
         (SELECT count(*)::int FROM public.muro_lecturas l WHERE l.publicacion_id = p.id),
         (SELECT count(*)::int FROM public.muro_lecturas l WHERE l.publicacion_id = p.id AND l.confirmado_at IS NOT NULL),
         (SELECT l.confirmado_at FROM public.muro_lecturas l WHERE l.publicacion_id = p.id AND l.user_id = auth.uid())
  FROM public.muro_publicaciones p
  WHERE p.id = ANY (_ids) AND auth.uid() IS NOT NULL
    AND p.organizacion_id = public.org_vigente()
$function$;

CREATE OR REPLACE FUNCTION public.chat_mis_conversaciones()
 RETURNS TABLE(id uuid, tipo text, nombre text, ultimo_mensaje_at timestamp with time zone, ultimo_texto text, ultimo_adjunto_tipo text, ultimo_autor_id uuid, ultimo_eliminado boolean, no_leidos integer, participantes uuid[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    AND c.organizacion_id = public.org_vigente()
    -- Las directas aparecen recién cuando tienen mensajes; los grupos siempre
    AND (c.tipo = 'grupo' OR um.autor_id IS NOT NULL)
  ORDER BY c.ultimo_mensaje_at DESC
$function$;

CREATE OR REPLACE FUNCTION public.grupos_listado()
 RETURNS TABLE(id uuid, nombre text, descripcion text, tipo text, color text, miembros integer, soy_miembro boolean, soy_admin boolean, ultima_actividad timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT g.id, g.nombre, g.descripcion, g.tipo, g.color,
         (SELECT count(*)::int FROM public.grupo_miembros m WHERE m.grupo_id = g.id),
         EXISTS (SELECT 1 FROM public.grupo_miembros m WHERE m.grupo_id = g.id AND m.user_id = auth.uid()),
         public.es_admin_grupo(g.id),
         (SELECT max(p.created_at) FROM public.muro_publicaciones p WHERE p.grupo_id = g.id)
  FROM public.grupos g
  WHERE auth.uid() IS NOT NULL
    AND g.organizacion_id = public.org_vigente()
    AND (g.tipo = 'abierto' OR public.es_miembro_grupo(g.id) OR public.muro_es_moderador())
  ORDER BY 7 DESC, 9 DESC NULLS LAST, 2
$function$;

CREATE OR REPLACE FUNCTION public.solicitudes_destinatarios_gestion(_excluir uuid[])
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT * FROM public.solicitudes_destinatarios_gestion(_excluir, public.org_vigente())
$function$;

CREATE OR REPLACE FUNCTION public.encuesta_resultados(_encuesta_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _e public.encuestas%ROWTYPE;
  _gestor boolean := public.muro_es_moderador();
  _cerrada boolean;
  _respondio boolean;
BEGIN
  SELECT * INTO _e FROM public.encuestas WHERE id = _encuesta_id AND organizacion_id = public.org_vigente();
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
    'destinatarios', (SELECT count(DISTINCT user_id) FROM public.user_roles
                       WHERE role <> 'registro_asistencia'::app_role AND organizacion_id = _e.organizacion_id),
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
$function$;

CREATE OR REPLACE FUNCTION public.encuesta_responder(_encuesta_id uuid, _respuestas jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  SELECT * INTO _e FROM public.encuestas WHERE id = _encuesta_id AND organizacion_id = public.org_vigente();
  IF NOT FOUND OR _e.estado <> 'publicada' THEN RAISE EXCEPTION 'La encuesta no está abierta'; END IF;
  IF _e.cierra_at IS NOT NULL AND _e.cierra_at < now() THEN RAISE EXCEPTION 'La encuesta ya cerró'; END IF;

  BEGIN
    INSERT INTO public.encuesta_participaciones (encuesta_id, user_id, organizacion_id) VALUES (_encuesta_id, auth.uid(), _e.organizacion_id);
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
      INSERT INTO public.encuesta_respuestas (encuesta_id, pregunta_id, envio_id, respondente, opciones, organizacion_id)
      VALUES (_encuesta_id, _p.id, _envio, CASE WHEN _e.anonima THEN NULL ELSE auth.uid() END, _ops, _e.organizacion_id);
    ELSIF _p.tipo = 'escala' THEN
      INSERT INTO public.encuesta_respuestas (encuesta_id, pregunta_id, envio_id, respondente, escala, organizacion_id)
      VALUES (_encuesta_id, _p.id, _envio, CASE WHEN _e.anonima THEN NULL ELSE auth.uid() END, (_r #>> '{}')::int, _e.organizacion_id);
    ELSE
      INSERT INTO public.encuesta_respuestas (encuesta_id, pregunta_id, envio_id, respondente, texto, organizacion_id)
      VALUES (_encuesta_id, _p.id, _envio, CASE WHEN _e.anonima THEN NULL ELSE auth.uid() END, left(_r #>> '{}', 2000), _e.organizacion_id);
    END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.encuesta_publicar(_encuesta_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _e public.encuestas%ROWTYPE;
  _pub uuid;
BEGIN
  IF NOT public.muro_es_moderador() THEN RAISE EXCEPTION 'Sólo RRHH puede publicar encuestas' USING ERRCODE = '42501'; END IF;
  SELECT * INTO _e FROM public.encuestas WHERE id = _encuesta_id AND organizacion_id = public.org_vigente() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Encuesta inexistente'; END IF;
  IF _e.estado <> 'borrador' THEN RAISE EXCEPTION 'La encuesta ya fue publicada'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.encuesta_preguntas WHERE encuesta_id = _encuesta_id) THEN
    RAISE EXCEPTION 'Agregá al menos una pregunta';
  END IF;

  INSERT INTO public.muro_publicaciones (autor_id, contenido, tipo, imagen_url, organizacion_id)
  VALUES (auth.uid(), _e.titulo || CASE WHEN _e.descripcion <> '' THEN E'\n' || _e.descripcion ELSE '' END, 'encuesta', _e.imagen_url, _e.organizacion_id)
  RETURNING id INTO _pub;

  UPDATE public.encuestas SET estado = 'publicada', publicada_at = now(), publicacion_id = _pub WHERE id = _encuesta_id;

  INSERT INTO public.notificaciones (user_id, titulo, mensaje, link, organizacion_id)
  SELECT DISTINCT ur.user_id, 'Nueva encuesta', _e.titulo, '/encuestas/' || _encuesta_id, _e.organizacion_id
  FROM public.user_roles ur
  WHERE ur.organizacion_id = _e.organizacion_id
    AND ur.user_id <> auth.uid() AND ur.role <> 'registro_asistencia'::app_role;

  RETURN _pub;
END;
$function$;

CREATE OR REPLACE FUNCTION public.evento_crear(_titulo text, _descripcion text, _tipo text, _inicio timestamp with time zone, _fin timestamp with time zone, _todo_el_dia boolean, _lugar text, _enlace text, _pide_asistencia boolean, _anunciar boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _id uuid;
  _pub uuid;
  _cuando text;
  _org uuid := public.org_vigente();
BEGIN
  IF NOT public.muro_es_moderador() THEN RAISE EXCEPTION 'Sólo RRHH puede publicar eventos' USING ERRCODE = '42501'; END IF;

  INSERT INTO public.eventos (titulo, descripcion, tipo, inicio, fin, todo_el_dia, lugar, enlace, pide_asistencia, creado_por, organizacion_id)
  VALUES (trim(_titulo), coalesce(trim(_descripcion), ''), coalesce(_tipo, 'evento'), _inicio, _fin, coalesce(_todo_el_dia, false),
          nullif(trim(_lugar), ''), nullif(trim(_enlace), ''), coalesce(_pide_asistencia, true), auth.uid(), _org)
  RETURNING id INTO _id;

  IF coalesce(_anunciar, true) THEN
    _cuando := to_char(_inicio AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM')
      || CASE WHEN coalesce(_todo_el_dia, false) THEN '' ELSE ' · ' || to_char(_inicio AT TIME ZONE 'America/Argentina/Buenos_Aires', 'HH24:MI') || ' h' END;
    INSERT INTO public.muro_publicaciones (autor_id, contenido, tipo, organizacion_id)
    VALUES (auth.uid(), trim(_titulo) || chr(10) || _cuando || CASE WHEN nullif(trim(_lugar), '') IS NOT NULL THEN ' · ' || trim(_lugar) ELSE '' END, 'evento', _org)
    RETURNING id INTO _pub;
    UPDATE public.eventos SET publicacion_id = _pub WHERE id = _id;

    INSERT INTO public.notificaciones (user_id, titulo, mensaje, link, organizacion_id)
    SELECT DISTINCT ur.user_id, 'Nuevo evento', trim(_titulo) || ' · ' || _cuando, '/eventos?evento=' || _id, _org
    FROM public.user_roles ur
    WHERE ur.organizacion_id = _org
      AND ur.user_id <> auth.uid() AND ur.role <> 'registro_asistencia'::app_role;
  END IF;
  RETURN _id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.muro_confirmar_lectura(_publicacion_id uuid)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _at timestamptz := now();
  _org uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado' USING ERRCODE = '42501'; END IF;
  SELECT organizacion_id INTO _org FROM public.muro_publicaciones
   WHERE id = _publicacion_id AND requiere_confirmacion AND NOT oculta AND organizacion_id = public.org_vigente();
  IF _org IS NULL THEN
    RAISE EXCEPTION 'Esta publicación no pide confirmación';
  END IF;
  INSERT INTO public.muro_lecturas (publicacion_id, user_id, confirmado_at, organizacion_id)
  VALUES (_publicacion_id, auth.uid(), _at, _org)
  ON CONFLICT (publicacion_id, user_id) DO UPDATE SET confirmado_at = COALESCE(public.muro_lecturas.confirmado_at, EXCLUDED.confirmado_at)
  RETURNING confirmado_at INTO _at;
  RETURN _at;
END;
$function$;

CREATE OR REPLACE FUNCTION public.muro_registrar_vistas(_ids uuid[])
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  INSERT INTO public.muro_lecturas (publicacion_id, user_id, organizacion_id)
  SELECT p.id, auth.uid(), p.organizacion_id
  FROM public.muro_publicaciones p
  WHERE p.id = ANY (_ids) AND auth.uid() IS NOT NULL AND NOT p.oculta
    AND p.organizacion_id = public.org_vigente()
  ON CONFLICT (publicacion_id, user_id) DO NOTHING
$function$;

CREATE OR REPLACE FUNCTION public.muro_notificar_publicacion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _grupo text;
BEGIN
  IF NEW.mencion_user_id IS NOT NULL AND NEW.mencion_user_id <> NEW.autor_id THEN
    INSERT INTO public.notificaciones (user_id, titulo, mensaje, link, organizacion_id)
    VALUES (
      NEW.mencion_user_id,
      CASE NEW.tipo
        WHEN 'cumpleanios' THEN '¡Te saludaron por tu cumpleaños!'
        WHEN 'aniversario' THEN '¡Te saludaron por tu aniversario!'
        ELSE 'Te mencionaron en el muro'
      END,
      left(NEW.contenido, 140),
      '/muro',
      NEW.organizacion_id
    );
  END IF;

  IF NEW.tipo = 'comunicado' THEN
    IF NEW.grupo_id IS NULL THEN
      INSERT INTO public.notificaciones (user_id, titulo, mensaje, link, organizacion_id)
      SELECT DISTINCT ur.user_id,
             CASE WHEN NEW.requiere_confirmacion THEN 'Comunicado: confirmá la lectura' ELSE 'Nuevo comunicado oficial' END,
             left(NEW.contenido, 140), '/muro', NEW.organizacion_id
      FROM public.user_roles ur
      WHERE ur.organizacion_id = NEW.organizacion_id
        AND ur.user_id <> NEW.autor_id AND ur.role <> 'registro_asistencia'::app_role;
    ELSE
      SELECT nombre INTO _grupo FROM public.grupos WHERE id = NEW.grupo_id;
      INSERT INTO public.notificaciones (user_id, titulo, mensaje, link, organizacion_id)
      SELECT gm.user_id,
             CASE WHEN NEW.requiere_confirmacion THEN 'Comunicado en ' || _grupo || ': confirmá la lectura' ELSE 'Comunicado en ' || _grupo END,
             left(NEW.contenido, 140), '/grupos/' || NEW.grupo_id, NEW.organizacion_id
      FROM public.grupo_miembros gm
      WHERE gm.grupo_id = NEW.grupo_id AND gm.user_id <> NEW.autor_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.muro_notificar_comentario()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _autor_pub uuid;
BEGIN
  SELECT autor_id INTO _autor_pub FROM public.muro_publicaciones WHERE id = NEW.publicacion_id;
  IF _autor_pub IS NOT NULL AND _autor_pub <> NEW.autor_id THEN
    INSERT INTO public.notificaciones (user_id, titulo, mensaje, link, organizacion_id)
    VALUES (_autor_pub, 'Nuevo comentario en tu publicación', left(NEW.contenido, 140), '/muro', NEW.organizacion_id);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.chat_crear_grupo(_nombre text, _miembros uuid[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _yo uuid := auth.uid();
  _id uuid;
  _org uuid := public.org_vigente();
BEGIN
  IF _yo IS NULL THEN RAISE EXCEPTION 'No autenticado' USING ERRCODE = '42501'; END IF;
  IF coalesce(trim(_nombre), '') = '' THEN RAISE EXCEPTION 'Poné un nombre al grupo'; END IF;
  IF coalesce(array_length(_miembros, 1), 0) < 2 THEN RAISE EXCEPTION 'Elegí al menos dos personas'; END IF;
  IF array_length(_miembros, 1) > 100 THEN RAISE EXCEPTION 'Máximo 100 personas por grupo'; END IF;

  INSERT INTO public.chat_conversaciones (tipo, nombre, creada_por, organizacion_id) VALUES ('grupo', trim(_nombre), _yo, _org) RETURNING id INTO _id;
  INSERT INTO public.chat_participantes (conversacion_id, user_id, organizacion_id)
  SELECT _id, m, _org FROM (
    SELECT DISTINCT unnest(_miembros || _yo) AS m
  ) s
  WHERE EXISTS (SELECT 1 FROM public.user_roles ur
                 WHERE ur.user_id = s.m AND ur.organizacion_id = _org AND ur.role <> 'registro_asistencia'::app_role);
  RETURN _id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.chat_iniciar_directa(_otro uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _yo uuid := auth.uid();
  _id uuid;
  _org uuid := public.org_vigente();
BEGIN
  IF _yo IS NULL THEN RAISE EXCEPTION 'No autenticado' USING ERRCODE = '42501'; END IF;
  IF _otro IS NULL OR _otro = _yo THEN RAISE EXCEPTION 'Elegí otra persona'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = _otro AND organizacion_id = _org AND role <> 'registro_asistencia'::app_role
  ) THEN
    RAISE EXCEPTION 'Esa persona no está disponible para chatear';
  END IF;

  -- Serializa la creación entre el mismo par para no duplicar conversaciones
  PERFORM pg_advisory_xact_lock(hashtext(LEAST(_yo, _otro)::text || GREATEST(_yo, _otro)::text || _org::text));

  SELECT c.id INTO _id
  FROM public.chat_conversaciones c
  JOIN public.chat_participantes a ON a.conversacion_id = c.id AND a.user_id = _yo
  JOIN public.chat_participantes b ON b.conversacion_id = c.id AND b.user_id = _otro
  WHERE c.tipo = 'directa' AND c.organizacion_id = _org
  LIMIT 1;

  IF _id IS NULL THEN
    INSERT INTO public.chat_conversaciones (tipo, creada_por, organizacion_id) VALUES ('directa', _yo, _org) RETURNING id INTO _id;
    INSERT INTO public.chat_participantes (conversacion_id, user_id, organizacion_id) VALUES (_id, _yo, _org), (_id, _otro, _org);
  END IF;
  RETURN _id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.grupo_agregar_masivo(_grupo_id uuid, _empresa_id uuid, _sucursal_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _n integer;
  _org uuid;
BEGIN
  IF NOT public.es_admin_grupo(_grupo_id) THEN RAISE EXCEPTION 'Sólo los administradores del grupo pueden sumar personas' USING ERRCODE = '42501'; END IF;
  SELECT organizacion_id INTO _org FROM public.grupos WHERE id = _grupo_id;
  INSERT INTO public.grupo_miembros (grupo_id, user_id, organizacion_id)
  SELECT DISTINCT _grupo_id, e.user_id, _org
  FROM public.empleados e
  WHERE e.organizacion_id = _org
    AND e.user_id IS NOT NULL AND e.estado <> 'Baja'
    AND (_empresa_id IS NULL OR e.empresa_id = _empresa_id)
    AND (_sucursal_id IS NULL OR e.sucursal_id = _sucursal_id)
  ON CONFLICT (grupo_id, user_id) DO NOTHING;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END;
$function$;

CREATE OR REPLACE FUNCTION public.grupos_al_crear()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.grupo_miembros (grupo_id, user_id, rol, organizacion_id) VALUES (NEW.id, NEW.creado_por, 'admin', NEW.organizacion_id)
  ON CONFLICT (grupo_id, user_id) DO UPDATE SET rol = 'admin';
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.solicitudes_alta_avisar()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notificaciones (user_id, titulo, mensaje, link, organizacion_id)
  SELECT DISTINCT ur.user_id, 'Nueva solicitud de alta',
         NEW.apellido || ', ' || NEW.nombre || ' (DNI ' || NEW.dni || ') creó su cuenta y espera aprobación.',
         '/altas', NEW.organizacion_id
  FROM public.user_roles ur
  WHERE ur.organizacion_id = NEW.organizacion_id
    AND ur.role IN ('admin', 'rrhh');
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.empleados_registrar_cambios()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _campos text[] := ARRAY[
    'nombre', 'apellido', 'dni', 'cuil', 'fecha_nacimiento', 'email', 'telefono',
    'domicilio_calle', 'domicilio_numero', 'domicilio_piso', 'domicilio_localidad', 'domicilio_provincia', 'domicilio_cp',
    'estado_civil', 'nacionalidad', 'sexo', 'puesto', 'categoria', 'cct', 'sueldo_basico', 'estado',
    'empresa_id', 'sucursal_id', 'fecha_ingreso', 'legajo', 'user_id'
  ];
  _o jsonb := to_jsonb(OLD);
  _n jsonb := to_jsonb(NEW);
  _campo text;
  _origen text := 'sistema';
  _cambiados text[] := '{}';
BEGIN
  IF auth.uid() IS NOT NULL THEN
    _origen := 'rrhh';
    IF auth.uid() = NEW.user_id THEN
      _origen := 'empleado';
    END IF;
  END IF;

  FOREACH _campo IN ARRAY _campos LOOP
    IF (_o ->> _campo) IS DISTINCT FROM (_n ->> _campo) THEN
      INSERT INTO public.empleados_cambios (empleado_id, campo, valor_anterior, valor_nuevo, origen, cambiado_por, organizacion_id)
      VALUES (NEW.id, _campo, _o ->> _campo, _n ->> _campo, _origen, auth.uid(), NEW.organizacion_id);
      _cambiados := _cambiados || _campo;
    END IF;
  END LOOP;

  IF _origen = 'empleado' AND cardinality(_cambiados) > 0 THEN
    INSERT INTO public.notificaciones (user_id, titulo, mensaje, link, organizacion_id)
    SELECT DISTINCT ur.user_id, 'Datos actualizados por el empleado',
           NEW.apellido || ', ' || NEW.nombre || ' actualizó: ' || replace(array_to_string(_cambiados, ', '), '_', ' '),
           '/legajos/' || NEW.id, NEW.organizacion_id
    FROM public.user_roles ur
    WHERE ur.organizacion_id = NEW.organizacion_id
      AND ur.role IN ('admin', 'rrhh');
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.memorandums_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.emitido_por := COALESCE(NEW.emitido_por, auth.uid());
    RETURN NEW;
  END IF;
  IF NOT public.is_manager() THEN
    NEW.id := OLD.id;
    NEW.titulo := OLD.titulo;
    NEW.contenido := OLD.contenido;
    NEW.fecha := OLD.fecha;
    NEW.numero := OLD.numero;
    -- Si se borró la empresa o el legajo (ON DELETE SET NULL) se acepta el NULL
    IF NOT (NEW.empresa_id IS NULL AND NOT EXISTS (SELECT 1 FROM public.empresas WHERE id = OLD.empresa_id)) THEN
      NEW.empresa_id := OLD.empresa_id;
    END IF;
    IF NOT (NEW.destinatario_empleado_id IS NULL AND NOT EXISTS (SELECT 1 FROM public.empleados WHERE id = OLD.destinatario_empleado_id)) THEN
      NEW.destinatario_empleado_id := OLD.destinatario_empleado_id;
    END IF;
    NEW.destinatario_nombre := OLD.destinatario_nombre;
    NEW.created_by := OLD.created_by;
    NEW.created_at := OLD.created_at;
    NEW.emitido_por := OLD.emitido_por;
    NEW.emisor_nombre := OLD.emisor_nombre;
    NEW.emisor_cargo := OLD.emisor_cargo;
    NEW.emisor_sector := OLD.emisor_sector;

    IF NEW.estado IS DISTINCT FROM OLD.estado AND NOT (
         (OLD.estado = 'enviado' AND NEW.estado = 'recibido')
      OR (OLD.estado IN ('enviado', 'recibido') AND NEW.estado = 'firmado')
    ) THEN
      NEW.estado := OLD.estado;
    END IF;

    IF NEW.estado = 'firmado' AND OLD.estado IS DISTINCT FROM 'firmado' THEN
      NEW.firmado_por := auth.uid();
      NEW.fecha_firma := now();
    ELSE
      NEW.firmado_por := OLD.firmado_por;
      NEW.fecha_firma := OLD.fecha_firma;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.memorandums_notificar()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _destinatario uuid;
  _empleado text;
BEGIN
  SELECT e.user_id, e.apellido || ', ' || e.nombre INTO _destinatario, _empleado
  FROM public.empleados e WHERE e.id = NEW.destinatario_empleado_id AND e.organizacion_id = NEW.organizacion_id;

  IF NEW.estado = 'enviado' AND _destinatario IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.estado IS DISTINCT FROM 'enviado') THEN
    INSERT INTO public.notificaciones (user_id, titulo, mensaje, link, organizacion_id)
    VALUES (_destinatario, 'Tenés un memorándum nuevo',
            NEW.titulo || ' · Abrilo para confirmar que lo recibiste y firmarlo.',
            '/autogestion?tab=memorandums', NEW.organizacion_id);
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.estado = 'recibido' AND OLD.estado IS DISTINCT FROM 'recibido' AND NEW.created_by IS NOT NULL THEN
    INSERT INTO public.notificaciones (user_id, titulo, mensaje, link, organizacion_id)
    VALUES (NEW.created_by, 'Memorándum recibido', coalesce(_empleado, 'El empleado') || ' confirmó que recibió: ' || NEW.titulo, '/memorandums', NEW.organizacion_id);
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.estado = 'firmado' AND OLD.estado IS DISTINCT FROM 'firmado' AND NEW.created_by IS NOT NULL THEN
    INSERT INTO public.notificaciones (user_id, titulo, mensaje, link, organizacion_id)
    VALUES (NEW.created_by, 'Memorándum firmado', coalesce(_empleado, 'El empleado') || ' firmó: ' || NEW.titulo, '/memorandums', NEW.organizacion_id);
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.solicitudes_permiso_avisar()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user uuid;
  _nombre text;
  _motivo text;
  _fechas text;
  _sale text := nullif(left(btrim(coalesce(NEW.hora_salida, '')), 5), '');
  _vuelve text := nullif(left(btrim(coalesce(NEW.hora_reintegro, '')), 5), '');
BEGIN
  SELECT e.user_id, e.apellido || ', ' || e.nombre INTO _user, _nombre
  FROM public.empleados e WHERE e.id = NEW.empleado_id AND e.organizacion_id = NEW.organizacion_id;

  _motivo := NEW.motivo || CASE WHEN coalesce(NEW.motivo_detalle, '') <> '' THEN ': ' || NEW.motivo_detalle ELSE '' END;
  _fechas := CASE WHEN NEW.fecha_hasta IS NULL OR NEW.fecha_hasta = NEW.fecha_desde
                  THEN 'el ' || to_char(NEW.fecha_desde, 'DD/MM/YYYY')
                  ELSE 'del ' || to_char(NEW.fecha_desde, 'DD/MM/YYYY') || ' al ' || to_char(NEW.fecha_hasta, 'DD/MM/YYYY') END
           || CASE WHEN _sale IS NOT NULL AND _vuelve IS NOT NULL THEN ', de ' || _sale || ' a ' || _vuelve || ' hs'
                  WHEN _sale IS NOT NULL THEN ', saliendo a las ' || _sale || ' hs'
                  WHEN _vuelve IS NOT NULL THEN ', regresando a las ' || _vuelve || ' hs'
                  ELSE '' END;

  IF TG_OP = 'INSERT' AND NEW.estado = 'pendiente' THEN
    INSERT INTO public.notificaciones (user_id, titulo, mensaje, link, organizacion_id)
    SELECT d, 'Nueva solicitud de permiso',
           coalesce(_nombre, 'Un empleado') || ' pidió permiso ' || _fechas || ' · ' || _motivo,
           '/legajos/' || NEW.empleado_id || '?tab=permisos&solicitud=' || NEW.id, NEW.organizacion_id
    FROM public.solicitudes_destinatarios_gestion(ARRAY[_user, auth.uid()], NEW.organizacion_id) d;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.estado IS DISTINCT FROM OLD.estado AND NEW.estado IN ('aprobada', 'rechazada')
     AND _user IS NOT NULL AND _user IS DISTINCT FROM auth.uid() THEN
    INSERT INTO public.notificaciones (user_id, titulo, mensaje, link, organizacion_id)
    VALUES (_user,
            CASE WHEN NEW.estado = 'aprobada' THEN 'Tu permiso fue aprobado' ELSE 'Tu permiso fue rechazado' END,
            'Permiso ' || _fechas || ' · ' || _motivo
              || CASE WHEN coalesce(NEW.aprobado_nombre, '') <> '' THEN ' · Firmó: ' || NEW.aprobado_nombre ELSE '' END
              || CASE WHEN coalesce(NEW.observaciones, '') <> '' THEN ' · ' || NEW.observaciones ELSE '' END,
            '/autogestion?tab=permisos', NEW.organizacion_id);
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.solicitudes_vacaciones_avisar()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user uuid;
  _nombre text;
  _detalle text;
BEGIN
  SELECT e.user_id, e.apellido || ', ' || e.nombre INTO _user, _nombre
  FROM public.empleados e WHERE e.id = NEW.empleado_id AND e.organizacion_id = NEW.organizacion_id;

  _detalle := 'del ' || to_char(NEW.fecha_desde, 'DD/MM/YYYY') || ' al ' || to_char(NEW.fecha_hasta, 'DD/MM/YYYY')
              || coalesce(' (' || NEW.dias_solicitados || ' días)', '');

  IF TG_OP = 'INSERT' AND NEW.estado = 'pendiente' THEN
    INSERT INTO public.notificaciones (user_id, titulo, mensaje, link, organizacion_id)
    SELECT d, 'Nueva solicitud de vacaciones',
           coalesce(_nombre, 'Un empleado') || ' pidió vacaciones ' || _detalle,
           '/vacaciones', NEW.organizacion_id
    FROM public.solicitudes_destinatarios_gestion(ARRAY[_user, auth.uid()], NEW.organizacion_id) d;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.estado IS DISTINCT FROM OLD.estado AND NEW.estado IN ('aprobada', 'rechazada')
     AND _user IS NOT NULL AND _user IS DISTINCT FROM auth.uid() THEN
    INSERT INTO public.notificaciones (user_id, titulo, mensaje, link, organizacion_id)
    VALUES (_user,
            CASE WHEN NEW.estado = 'aprobada' THEN 'Tus vacaciones fueron aprobadas' ELSE 'Tus vacaciones fueron rechazadas' END,
            'Vacaciones ' || _detalle
              || CASE WHEN coalesce(NEW.observaciones, '') <> '' THEN ' · ' || NEW.observaciones ELSE '' END,
            '/autogestion?tab=vacaciones', NEW.organizacion_id);
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.solicitudes_permiso_firma()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
        FROM public.empleados e WHERE e.user_id = NEW.aprobado_por AND e.organizacion_id = NEW.organizacion_id
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
$function$;

CREATE OR REPLACE FUNCTION public.tareas_notificar()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.asignada_a <> NEW.creada_por THEN
    INSERT INTO public.notificaciones (user_id, titulo, mensaje, link, organizacion_id)
    VALUES (NEW.asignada_a, 'Te asignaron una tarea', NEW.titulo || CASE WHEN NEW.vence IS NOT NULL THEN ' · vence ' || to_char(NEW.vence, 'DD/MM') ELSE '' END, '/tareas', NEW.organizacion_id);
  ELSIF TG_OP = 'UPDATE' AND NEW.asignada_a <> OLD.asignada_a AND NEW.asignada_a <> auth.uid() THEN
    INSERT INTO public.notificaciones (user_id, titulo, mensaje, link, organizacion_id)
    VALUES (NEW.asignada_a, 'Te asignaron una tarea', NEW.titulo, '/tareas', NEW.organizacion_id);
  ELSIF TG_OP = 'UPDATE' AND NEW.estado = 'hecha' AND OLD.estado <> 'hecha' AND NEW.creada_por <> auth.uid() THEN
    INSERT INTO public.notificaciones (user_id, titulo, mensaje, link, organizacion_id)
    VALUES (NEW.creada_por, 'Tarea completada', NEW.titulo, '/tareas', NEW.organizacion_id);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.soporte_completar()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  SELECT u.email, coalesce(e.apellido || ', ' || e.nombre, split_part(u.email, '@', 1))
    INTO NEW.usuario_email, NEW.usuario_nombre
  FROM auth.users u
  LEFT JOIN public.empleados e ON e.user_id = u.id AND e.organizacion_id = NEW.organizacion_id
  WHERE u.id = NEW.usuario_id
  LIMIT 1;
  NEW.contenido := trim(NEW.contenido);
  NEW.leido := false;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.soporte_avisar()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _soporte uuid := public.soporte_user_id();
BEGIN
  IF NEW.autor_id = NEW.usuario_id THEN
    IF _soporte IS NOT NULL AND _soporte <> NEW.usuario_id THEN
      -- El aviso a soporte va a la organización en la que soporte está trabajando, para que lo vea
      INSERT INTO public.notificaciones (user_id, titulo, mensaje, link, organizacion_id)
      VALUES (_soporte, 'Consulta de soporte: ' || coalesce(NEW.usuario_nombre, 'usuario'), left(NEW.contenido, 140), '/soporte?u=' || NEW.usuario_id,
              coalesce(public.org_de_usuario(_soporte), NEW.organizacion_id));
    END IF;
  ELSE
    INSERT INTO public.notificaciones (user_id, titulo, mensaje, link, organizacion_id)
    VALUES (NEW.usuario_id, 'Respuesta de soporte', left(NEW.contenido, 140), '/ayuda', NEW.organizacion_id);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.configurar_registro(_abierto boolean, _regenerar boolean)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _codigo text;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'rrhh'::app_role)) THEN
    RAISE EXCEPTION 'Sólo RRHH o administración pueden cambiar el registro' USING ERRCODE = '42501';
  END IF;
  UPDATE public.configuracion_grupo
     SET registro_abierto = _abierto,
         registro_codigo = CASE WHEN _regenerar OR registro_codigo IS NULL THEN public.nuevo_codigo_registro() ELSE registro_codigo END
   WHERE organizacion_id = public.org_vigente()
   RETURNING registro_codigo INTO _codigo;
  RETURN _codigo;
END;
$function$;