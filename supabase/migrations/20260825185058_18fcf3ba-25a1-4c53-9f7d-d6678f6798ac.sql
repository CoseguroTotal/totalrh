ALTER TABLE public.empleados
ADD COLUMN IF NOT EXISTS user_id uuid;

UPDATE public.empleados e
SET user_id = u.id
FROM auth.users u
WHERE e.user_id IS NULL
  AND e.email IS NOT NULL
  AND lower(trim(e.email)) = lower(trim(u.email::text));

CREATE UNIQUE INDEX IF NOT EXISTS empleados_user_id_unique
ON public.empleados (user_id)
WHERE user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.get_server_time()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT to_char(now() AT TIME ZONE 'America/Argentina/Buenos_Aires', 'HH24:MI')
$function$;

CREATE OR REPLACE FUNCTION public.my_empleado_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT e.id
  FROM public.empleados e
  WHERE e.user_id = auth.uid()
  LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.get_users_with_roles()
RETURNS TABLE(id uuid, user_id uuid, email text, role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT ur.id, ur.user_id, u.email::text, ur.role::text
  FROM public.user_roles ur
  JOIN auth.users u ON u.id = ur.user_id
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
  ORDER BY u.email
$function$;

REVOKE ALL ON FUNCTION public.get_server_time() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_server_time() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_users_with_roles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_users_with_roles() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_manager() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_manager() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_manager_or_contador() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_manager_or_contador() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.my_empleado_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_empleado_id() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;

DROP POLICY IF EXISTS "auth_select_asignaciones" ON public.asignaciones_turno;
CREATE POLICY "staff_or_employee_read_asignaciones"
ON public.asignaciones_turno
FOR SELECT
TO authenticated
USING (public.is_manager_or_contador() OR empleado_id = public.my_empleado_id());

DROP POLICY IF EXISTS "auth_select_candidatos" ON public.candidatos;
CREATE POLICY "managers_read_candidatos"
ON public.candidatos
FOR SELECT
TO authenticated
USING (public.is_manager());

DROP POLICY IF EXISTS "auth_select_conceptos" ON public.conceptos_liquidacion;
CREATE POLICY "payroll_staff_read_conceptos"
ON public.conceptos_liquidacion
FOR SELECT
TO authenticated
USING (public.is_manager_or_contador());

DROP POLICY IF EXISTS "auth_select_datos_medicos" ON public.datos_medicos;
CREATE POLICY "managers_or_employee_read_datos_medicos"
ON public.datos_medicos
FOR SELECT
TO authenticated
USING (public.is_manager() OR empleado_id = public.my_empleado_id());

DROP POLICY IF EXISTS "Authenticated users can read documentos" ON public.documentos_legajo;
CREATE POLICY "managers_or_employee_read_documentos"
ON public.documentos_legajo
FOR SELECT
TO authenticated
USING (public.is_manager() OR empleado_id = public.my_empleado_id());

DROP POLICY IF EXISTS "Authenticated users can read empleados" ON public.empleados;
CREATE POLICY "staff_or_employee_read_empleados"
ON public.empleados
FOR SELECT
TO authenticated
USING (public.is_manager_or_contador() OR user_id = auth.uid());

DROP POLICY IF EXISTS "auth_select_estudios" ON public.estudios_empleado;
CREATE POLICY "staff_or_employee_read_estudios"
ON public.estudios_empleado
FOR SELECT
TO authenticated
USING (public.is_manager_or_contador() OR empleado_id = public.my_empleado_id());

DROP POLICY IF EXISTS "Authenticated users can read eventos" ON public.eventos_legajo;
CREATE POLICY "staff_or_employee_read_eventos"
ON public.eventos_legajo
FOR SELECT
TO authenticated
USING (public.is_manager_or_contador() OR empleado_id = public.my_empleado_id());

DROP POLICY IF EXISTS "auth_select_fichadas" ON public.fichadas;
CREATE POLICY "staff_employee_or_terminal_read_fichadas"
ON public.fichadas
FOR SELECT
TO authenticated
USING (
  public.is_manager_or_contador()
  OR empleado_id = public.my_empleado_id()
  OR (public.has_role(auth.uid(), 'registro_asistencia'::app_role) AND terminal_user_id = auth.uid())
);

DROP POLICY IF EXISTS "auth_select_grupo_familiar" ON public.grupo_familiar;
CREATE POLICY "managers_or_employee_read_grupo_familiar"
ON public.grupo_familiar
FOR SELECT
TO authenticated
USING (public.is_manager() OR empleado_id = public.my_empleado_id());

DROP POLICY IF EXISTS "auth_select_liquidaciones" ON public.liquidaciones;
CREATE POLICY "payroll_staff_or_employee_read_liquidaciones"
ON public.liquidaciones
FOR SELECT
TO authenticated
USING (public.is_manager_or_contador() OR empleado_id = public.my_empleado_id());

DROP POLICY IF EXISTS "auth_select_lineas" ON public.liquidacion_lineas;
CREATE POLICY "payroll_staff_or_employee_read_lineas"
ON public.liquidacion_lineas
FOR SELECT
TO authenticated
USING (
  public.is_manager_or_contador()
  OR EXISTS (
    SELECT 1
    FROM public.liquidaciones l
    WHERE l.id = liquidacion_id
      AND l.empleado_id = public.my_empleado_id()
  )
);

DROP POLICY IF EXISTS "auth_select_memorandums" ON public.memorandums;
CREATE POLICY "managers_or_recipient_read_memorandums"
ON public.memorandums
FOR SELECT
TO authenticated
USING (public.is_manager() OR destinatario_empleado_id = public.my_empleado_id());

DROP POLICY IF EXISTS "auth_select_novedades" ON public.novedades_asistencia;
CREATE POLICY "staff_or_employee_read_novedades"
ON public.novedades_asistencia
FOR SELECT
TO authenticated
USING (public.is_manager_or_contador() OR empleado_id = public.my_empleado_id());

DROP POLICY IF EXISTS "auth_select_sanciones" ON public.sanciones;
CREATE POLICY "managers_or_employee_read_sanciones"
ON public.sanciones
FOR SELECT
TO authenticated
USING (public.is_manager() OR empleado_id = public.my_empleado_id());

DROP POLICY IF EXISTS "auth_select_solicitudes" ON public.solicitudes_permiso;
CREATE POLICY "managers_or_employee_read_solicitudes_permiso"
ON public.solicitudes_permiso
FOR SELECT
TO authenticated
USING (public.is_manager() OR empleado_id = public.my_empleado_id());

DROP POLICY IF EXISTS "auth_select_sol_vac" ON public.solicitudes_vacaciones;
CREATE POLICY "staff_or_employee_read_solicitudes_vacaciones"
ON public.solicitudes_vacaciones
FOR SELECT
TO authenticated
USING (public.is_manager_or_contador() OR empleado_id = public.my_empleado_id());

DROP POLICY IF EXISTS "auth_select_tokens_consumidos" ON public.tokens_consumidos;
CREATE POLICY "attendance_staff_read_tokens_consumidos"
ON public.tokens_consumidos
FOR SELECT
TO authenticated
USING (public.is_manager() OR public.has_role(auth.uid(), 'registro_asistencia'::app_role));

DROP POLICY IF EXISTS "empleado_read_own_token" ON public.tokens_asistencia;
DROP POLICY IF EXISTS "empleado_insert_own_token" ON public.tokens_asistencia;
CREATE POLICY "managers_read_tokens_asistencia"
ON public.tokens_asistencia
FOR SELECT
TO authenticated
USING (public.is_manager());

DROP POLICY IF EXISTS "auth_select_vacantes" ON public.vacantes;
CREATE POLICY "managers_read_vacantes"
ON public.vacantes
FOR SELECT
TO authenticated
USING (public.is_manager());

DROP POLICY IF EXISTS "no_direct_access_qr_sesiones" ON public.qr_sesiones;
CREATE POLICY "no_direct_access_qr_sesiones"
ON public.qr_sesiones
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "Authenticated users can read docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete docs" ON storage.objects;

CREATE POLICY "documentos_legajo_read_by_owner_or_manager"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documentos-legajo'
  AND (
    public.is_manager()
    OR (storage.foldername(name))[1] = public.my_empleado_id()::text
    OR EXISTS (
      SELECT 1
      FROM public.documentos_legajo d
      WHERE d.storage_path = name
        AND d.empleado_id = public.my_empleado_id()
    )
  )
);

CREATE POLICY "documentos_legajo_upload_by_owner_or_manager"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documentos-legajo'
  AND (
    public.is_manager()
    OR (storage.foldername(name))[1] = public.my_empleado_id()::text
  )
);

CREATE POLICY "documentos_legajo_delete_by_manager"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documentos-legajo' AND public.is_manager());

CREATE POLICY "documentos_legajo_update_by_manager"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'documentos-legajo' AND public.is_manager())
WITH CHECK (bucket_id = 'documentos-legajo' AND public.is_manager());