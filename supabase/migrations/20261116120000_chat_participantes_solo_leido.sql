-- ═══════════════════════════════════════════════════════════════════
-- Chat: un participante sólo puede marcar como leído, nada más.
-- La política "Chat: marcar leído lo propio" deja actualizar la fila propia,
-- pero con permiso de UPDATE sobre todas las columnas se podía cambiar
-- conversacion_id y así sumarse a una conversación ajena.
-- ═══════════════════════════════════════════════════════════════════

-- 1) Permiso por columna: desde la app sólo se toca ultimo_leido_at
REVOKE UPDATE ON public.chat_participantes FROM anon, authenticated;
GRANT UPDATE (ultimo_leido_at) ON public.chat_participantes TO authenticated;

-- 2) Red de seguridad: aunque cambien los permisos, la conversación,
--    el usuario y la fecha de alta de una participación no se mueven.
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
