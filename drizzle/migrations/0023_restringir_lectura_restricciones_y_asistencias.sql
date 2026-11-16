DROP POLICY IF EXISTS "auth_select_restricciones" ON public.restricciones_horario;
CREATE POLICY "auth_select_restricciones" ON public.restricciones_horario FOR SELECT TO authenticated
USING (
  public.is_manager()
  OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role::text = restricciones_horario.role)
);

DROP POLICY IF EXISTS "Asistencias: todos ven quién va" ON public.evento_asistencias;
CREATE POLICY "Asistencias: propias, creador y gestión" ON public.evento_asistencias FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_manager()
  OR EXISTS (SELECT 1 FROM public.eventos e WHERE e.id = evento_asistencias.evento_id AND e.creado_por = auth.uid())
);