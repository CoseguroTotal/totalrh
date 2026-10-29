-- ═══════════════════════════════════════════════════════════════════
-- Ayuda: cada usuario le escribe al administrador maestro (soporte de TotalRH)
-- desde la app. El soporte no participa del chat interno de la empresa.
-- ═══════════════════════════════════════════════════════════════════

-- Cuenta de soporte (la misma en todas las instalaciones)
CREATE OR REPLACE FUNCTION public.soporte_email()
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 'mcponce.torres@gmail.com'::text $$;

CREATE OR REPLACE FUNCTION public.es_soporte()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$ SELECT lower(coalesce(auth.jwt() ->> 'email', '')) = public.soporte_email() $$;

CREATE OR REPLACE FUNCTION public.soporte_user_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$ SELECT id FROM auth.users WHERE lower(email) = public.soporte_email() LIMIT 1 $$;

REVOKE EXECUTE ON FUNCTION public.soporte_user_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.es_soporte() TO authenticated;

-- ── Mensajes de soporte: una conversación por usuario ──
CREATE TABLE public.soporte_mensajes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Dueño de la conversación (quien pidió ayuda)
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  autor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contenido text NOT NULL CHECK (char_length(trim(contenido)) BETWEEN 1 AND 4000),
  -- Pantalla desde la que escribió, para entender el contexto
  pantalla text,
  usuario_nombre text,
  usuario_email text,
  -- Leído por la otra parte
  leido boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_soporte_mensajes_usuario ON public.soporte_mensajes (usuario_id, created_at);

GRANT SELECT, INSERT ON public.soporte_mensajes TO authenticated;
GRANT UPDATE (leido) ON public.soporte_mensajes TO authenticated;
GRANT ALL ON public.soporte_mensajes TO service_role;
ALTER TABLE public.soporte_mensajes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Soporte: cada uno ve su conversación; soporte ve todas"
ON public.soporte_mensajes FOR SELECT TO authenticated
USING (usuario_id = auth.uid() OR public.es_soporte());

CREATE POLICY "Soporte: escribir en la propia conversación o responder"
ON public.soporte_mensajes FOR INSERT TO authenticated
WITH CHECK (autor_id = auth.uid() AND (usuario_id = auth.uid() OR public.es_soporte()));

CREATE POLICY "Soporte: marcar como leído"
ON public.soporte_mensajes FOR UPDATE TO authenticated
USING (usuario_id = auth.uid() OR public.es_soporte())
WITH CHECK (usuario_id = auth.uid() OR public.es_soporte());

-- Completa el nombre y el email de quien pide ayuda (el soporte no puede leer auth.users)
CREATE OR REPLACE FUNCTION public.soporte_completar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT u.email, coalesce(e.apellido || ', ' || e.nombre, split_part(u.email, '@', 1))
    INTO NEW.usuario_email, NEW.usuario_nombre
  FROM auth.users u
  LEFT JOIN public.empleados e ON e.user_id = u.id
  WHERE u.id = NEW.usuario_id
  LIMIT 1;
  NEW.contenido := trim(NEW.contenido);
  NEW.leido := false;
  RETURN NEW;
END;
$$;

CREATE TRIGGER soporte_completar
BEFORE INSERT ON public.soporte_mensajes
FOR EACH ROW EXECUTE FUNCTION public.soporte_completar();

-- Aviso en la campanita a la otra parte
CREATE OR REPLACE FUNCTION public.soporte_avisar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _soporte uuid := public.soporte_user_id();
BEGIN
  IF NEW.autor_id = NEW.usuario_id THEN
    IF _soporte IS NOT NULL AND _soporte <> NEW.usuario_id THEN
      INSERT INTO public.notificaciones (user_id, titulo, mensaje, link)
      VALUES (_soporte, 'Consulta de soporte: ' || coalesce(NEW.usuario_nombre, 'usuario'), left(NEW.contenido, 140), '/soporte?u=' || NEW.usuario_id);
    END IF;
  ELSE
    INSERT INTO public.notificaciones (user_id, titulo, mensaje, link)
    VALUES (NEW.usuario_id, 'Respuesta de soporte', left(NEW.contenido, 140), '/ayuda');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER soporte_avisar
AFTER INSERT ON public.soporte_mensajes
FOR EACH ROW EXECUTE FUNCTION public.soporte_avisar();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'soporte_mensajes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.soporte_mensajes;
  END IF;
END;
$$;

-- ── El soporte no participa del chat interno ──
-- No aparece en el directorio para iniciar conversaciones
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
    AND lower(u.email) <> public.soporte_email()
    AND (e.id IS NULL OR e.estado <> 'Baja')
  ORDER BY 2, 3
$$;

-- Y no se lo puede sumar a una conversación por ningún camino
CREATE OR REPLACE FUNCTION public.chat_participantes_sin_soporte()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id = public.soporte_user_id() THEN
    RAISE EXCEPTION 'El soporte de TotalRH no participa del chat interno; usá el botón de Ayuda';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_participantes_sin_soporte ON public.chat_participantes;
CREATE TRIGGER chat_participantes_sin_soporte
BEFORE INSERT ON public.chat_participantes
FOR EACH ROW EXECUTE FUNCTION public.chat_participantes_sin_soporte();

-- Si ya estaba en alguna conversación, se lo saca
DELETE FROM public.chat_participantes WHERE user_id = public.soporte_user_id();