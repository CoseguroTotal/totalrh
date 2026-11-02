-- ═══════════════════════════════════════════════════════════════════
-- Avisos push: llegan al celular aunque la app esté cerrada o la pantalla bloqueada.
-- Hasta ahora los avisaba la propia app abierta, y Android/iPhone la congelan al rato
-- de pasar a segundo plano.
-- ═══════════════════════════════════════════════════════════════════

-- pg_net permite que la base llame a la edge function avisos-push sin esperar la respuesta
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_net;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'pg_net no disponible: los avisos push quedan desactivados (%)', SQLERRM;
END;
$$;

-- Claves VAPID, secreto y dirección de la función. La completa avisos-push la primera vez
-- que alguien activa los avisos; sólo la lee el servicio (sin políticas para usuarios).
CREATE TABLE IF NOT EXISTS public.push_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  vapid_publica text NOT NULL,
  vapid_privada jsonb NOT NULL,
  secreto text NOT NULL,
  url_funcion text NOT NULL,
  clave_anon text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.push_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_config FROM anon, authenticated;
-- La edge function usa el rol de servicio, que en estos backends no tiene permisos por defecto
GRANT ALL ON public.push_config TO service_role;

-- Un registro por navegador o celular donde la persona activó los avisos
CREATE TABLE IF NOT EXISTS public.push_suscripciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  dispositivo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  actualizada_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_suscripciones_user_idx ON public.push_suscripciones (user_id);
ALTER TABLE public.push_suscripciones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_suscripciones FROM anon, authenticated;
-- La edge function usa el rol de servicio, que en estos backends no tiene permisos por defecto
GRANT ALL ON public.push_suscripciones TO service_role;

-- Pide el envío del aviso. Nunca frena el guardado: si algo falla, sólo no sale el push.
CREATE OR REPLACE FUNCTION public.push_disparar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _c record;
BEGIN
  SELECT url_funcion, secreto, clave_anon INTO _c FROM public.push_config WHERE id = 1;
  IF _c.url_funcion IS NULL THEN
    RETURN NEW;
  END IF;
  BEGIN
    PERFORM net.http_post(
      url := _c.url_funcion,
      body := jsonb_build_object('action', 'enviar', 'tabla', TG_TABLE_NAME, 'id', NEW.id),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(_c.clave_anon, ''),
        'x-push-secreto', _c.secreto
      ),
      timeout_milliseconds := 10000
    );
  EXCEPTION WHEN others THEN
    RAISE WARNING 'push_disparar: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.push_disparar() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notificaciones_push ON public.notificaciones;
CREATE TRIGGER notificaciones_push
AFTER INSERT ON public.notificaciones
FOR EACH ROW EXECUTE FUNCTION public.push_disparar();

DROP TRIGGER IF EXISTS chat_mensajes_push ON public.chat_mensajes;
CREATE TRIGGER chat_mensajes_push
AFTER INSERT ON public.chat_mensajes
FOR EACH ROW WHEN (NOT coalesce(NEW.eliminado, false))
EXECUTE FUNCTION public.push_disparar();
