-- Multiempresa · Tanda 3: cada usuario ve y escribe sólo datos de su organización.
-- Una política RESTRICTIVA por tabla, combinada con AND con las políticas existentes (que no se tocan).

CREATE POLICY "Aislamiento por organización" ON public.asignaciones_turno AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.candidatos AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.chat_conversaciones AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.chat_mensajes AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.chat_participantes AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.conceptos_liquidacion AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.configuracion_grupo AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.datos_medicos AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.documentos_legajo AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.empleados AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.empleados_cambios AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.empresas AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.encuesta_participaciones AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.encuesta_preguntas AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.encuesta_respuestas AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.encuestas AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.estudios_empleado AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.evento_asistencias AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.eventos AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.eventos_legajo AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.feriados AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.fichadas AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.grupo_familiar AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.grupo_miembros AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.grupos AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.liquidacion_lineas AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.liquidaciones AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.memorandums AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.muro_comentarios AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.muro_lecturas AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.muro_publicaciones AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.muro_reacciones AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.notificaciones AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.novedades_asistencia AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.qr_sesiones AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.restricciones_horario AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.rostros_empleados AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.sanciones AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.solicitudes_alta AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.solicitudes_permiso AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.solicitudes_vacaciones AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.sucursales AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.tareas AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.tokens_asistencia AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.tokens_consumidos AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.turnos AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.vacaciones_config AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));
CREATE POLICY "Aislamiento por organización" ON public.vacantes AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente())) WITH CHECK (organizacion_id = (SELECT public.org_vigente()));

-- Soporte atiende a todas las organizaciones
CREATE POLICY "Aislamiento por organización" ON public.soporte_mensajes AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_vigente()) OR (SELECT public.es_soporte()))
  WITH CHECK (organizacion_id = (SELECT public.org_vigente()) OR (SELECT public.es_soporte()));

-- Revisión del catálogo: debe devolver 0 filas. Correr después de cada migración:
--   SELECT * FROM public.multiempresa_revision();
CREATE FUNCTION public.multiempresa_revision()
RETURNS TABLE (objeto text, problema text)
LANGUAGE sql STABLE SET search_path = public
AS $$
  WITH tablas AS (
    SELECT c.oid, c.relname, c.relrowsecurity
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r'
  ), cliente AS (
    SELECT * FROM tablas
     WHERE relname NOT IN ('demo_bloqueos', 'demo_codigo_maestro', 'demo_codigos', 'demo_cuentas', 'demo_intentos', 'demo_leads', 'push_config', 'push_suscripciones', 'organizaciones', 'usuario_organizacion_activa')
  )
  SELECT relname::text, 'sin RLS activado' FROM tablas WHERE NOT relrowsecurity
  UNION ALL
  SELECT relname::text, 'sin columna organizacion_id obligatoria' FROM cliente t
   WHERE NOT EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = t.oid AND a.attname = 'organizacion_id' AND a.attnotnull AND NOT a.attisdropped)
  UNION ALL
  SELECT relname::text, 'sin política restrictiva por organización' FROM cliente t
   WHERE NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = t.oid AND NOT p.polpermissive
                       AND pg_get_expr(p.polqual, p.polrelid) LIKE '%organizacion_id%')
  UNION ALL
  SELECT relname::text, 'sin trigger forzar_organizacion' FROM cliente t
   WHERE relname <> 'user_roles'
     AND NOT EXISTS (SELECT 1 FROM pg_trigger g WHERE g.tgrelid = t.oid AND g.tgname = 'forzar_organizacion')
  UNION ALL
  SELECT p.proname::text, 'función SECURITY DEFINER sin search_path fijo'
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.prosecdef
     AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig, '{}')) c WHERE c LIKE 'search_path=%')
$$;
REVOKE EXECUTE ON FUNCTION public.multiempresa_revision() FROM PUBLIC, anon, authenticated;