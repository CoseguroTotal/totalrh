
-- Fix remaining permissive policies on notificaciones and tokens_consumidos
-- notificaciones: INSERT should be restricted to managers (notifications are system-generated)
DROP POLICY IF EXISTS "auth_insert_notifs" ON notificaciones;
CREATE POLICY "managers_insert_notifs" ON notificaciones FOR INSERT TO authenticated WITH CHECK (public.is_manager());

-- tokens_consumidos: INSERT should be allowed for registro_asistencia role too
DROP POLICY IF EXISTS "auth_insert_tokens_consumidos" ON tokens_consumidos;
CREATE POLICY "managers_insert_tokens_consumidos" ON tokens_consumidos FOR INSERT TO authenticated WITH CHECK (public.is_manager() OR has_role(auth.uid(), 'registro_asistencia'));
