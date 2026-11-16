REVOKE UPDATE ON public.chat_participantes FROM anon, authenticated;
GRANT UPDATE (ultimo_leido_at) ON public.chat_participantes TO authenticated;

CREATE OR REPLACE FUNCTION public.chat_participantes_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.conversacion_id := OLD.conversacion_id;
  NEW.user_id := OLD.user_id;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_participantes_guard ON public.chat_participantes;
CREATE TRIGGER chat_participantes_guard
BEFORE UPDATE ON public.chat_participantes
FOR EACH ROW EXECUTE FUNCTION public.chat_participantes_guard();