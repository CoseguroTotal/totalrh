
-- =============================================
-- PASO 1: Reforzar RLS - Restringir escritura a admin/rrhh/gerente
-- =============================================

-- Helper: check if user is manager-level
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'rrhh', 'gerente')
  )
$$;

-- Helper: check if user is manager or contador
CREATE OR REPLACE FUNCTION public.is_manager_or_contador()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'rrhh', 'gerente', 'contador')
  )
$$;

-- Helper: get empleado_id for current user by email
CREATE OR REPLACE FUNCTION public.my_empleado_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id FROM public.empleados e
  JOIN auth.users u ON u.email::text = e.email
  WHERE u.id = auth.uid()
  LIMIT 1
$$;

-- =============================================
-- EMPLEADOS
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can insert empleados" ON empleados;
DROP POLICY IF EXISTS "Authenticated users can update empleados" ON empleados;
DROP POLICY IF EXISTS "Authenticated users can delete empleados" ON empleados;

CREATE POLICY "managers_insert_empleados" ON empleados FOR INSERT TO authenticated WITH CHECK (public.is_manager());
CREATE POLICY "managers_update_empleados" ON empleados FOR UPDATE TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "managers_delete_empleados" ON empleados FOR DELETE TO authenticated USING (public.is_manager());

-- =============================================
-- EMPRESAS
-- =============================================
DROP POLICY IF EXISTS "auth_insert_empresas" ON empresas;
DROP POLICY IF EXISTS "auth_update_empresas" ON empresas;
DROP POLICY IF EXISTS "auth_delete_empresas" ON empresas;

CREATE POLICY "managers_insert_empresas" ON empresas FOR INSERT TO authenticated WITH CHECK (public.is_manager());
CREATE POLICY "managers_update_empresas" ON empresas FOR UPDATE TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "managers_delete_empresas" ON empresas FOR DELETE TO authenticated USING (public.is_manager());

-- =============================================
-- SUCURSALES
-- =============================================
DROP POLICY IF EXISTS "auth_insert_sucursales" ON sucursales;
DROP POLICY IF EXISTS "auth_update_sucursales" ON sucursales;
DROP POLICY IF EXISTS "auth_delete_sucursales" ON sucursales;

CREATE POLICY "managers_insert_sucursales" ON sucursales FOR INSERT TO authenticated WITH CHECK (public.is_manager());
CREATE POLICY "managers_update_sucursales" ON sucursales FOR UPDATE TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "managers_delete_sucursales" ON sucursales FOR DELETE TO authenticated USING (public.is_manager());

-- =============================================
-- FICHADAS
-- =============================================
DROP POLICY IF EXISTS "auth_insert_fichadas" ON fichadas;
DROP POLICY IF EXISTS "auth_update_fichadas" ON fichadas;
DROP POLICY IF EXISTS "auth_delete_fichadas" ON fichadas;

CREATE POLICY "managers_insert_fichadas" ON fichadas FOR INSERT TO authenticated WITH CHECK (public.is_manager() OR has_role(auth.uid(), 'registro_asistencia'));
CREATE POLICY "managers_update_fichadas" ON fichadas FOR UPDATE TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "managers_delete_fichadas" ON fichadas FOR DELETE TO authenticated USING (public.is_manager());

-- =============================================
-- LIQUIDACIONES
-- =============================================
DROP POLICY IF EXISTS "auth_insert_liquidaciones" ON liquidaciones;
DROP POLICY IF EXISTS "auth_update_liquidaciones" ON liquidaciones;
DROP POLICY IF EXISTS "auth_delete_liquidaciones" ON liquidaciones;

CREATE POLICY "managers_insert_liquidaciones" ON liquidaciones FOR INSERT TO authenticated WITH CHECK (public.is_manager_or_contador());
CREATE POLICY "managers_update_liquidaciones" ON liquidaciones FOR UPDATE TO authenticated USING (public.is_manager_or_contador()) WITH CHECK (public.is_manager_or_contador());
CREATE POLICY "managers_delete_liquidaciones" ON liquidaciones FOR DELETE TO authenticated USING (public.is_manager_or_contador());

-- =============================================
-- LIQUIDACION_LINEAS
-- =============================================
DROP POLICY IF EXISTS "auth_insert_lineas" ON liquidacion_lineas;
DROP POLICY IF EXISTS "auth_update_lineas" ON liquidacion_lineas;
DROP POLICY IF EXISTS "auth_delete_lineas" ON liquidacion_lineas;

CREATE POLICY "managers_insert_lineas" ON liquidacion_lineas FOR INSERT TO authenticated WITH CHECK (public.is_manager_or_contador());
CREATE POLICY "managers_update_lineas" ON liquidacion_lineas FOR UPDATE TO authenticated USING (public.is_manager_or_contador()) WITH CHECK (public.is_manager_or_contador());
CREATE POLICY "managers_delete_lineas" ON liquidacion_lineas FOR DELETE TO authenticated USING (public.is_manager_or_contador());

-- =============================================
-- CONCEPTOS_LIQUIDACION
-- =============================================
DROP POLICY IF EXISTS "auth_insert_conceptos" ON conceptos_liquidacion;
DROP POLICY IF EXISTS "auth_update_conceptos" ON conceptos_liquidacion;
DROP POLICY IF EXISTS "auth_delete_conceptos" ON conceptos_liquidacion;

CREATE POLICY "managers_insert_conceptos" ON conceptos_liquidacion FOR INSERT TO authenticated WITH CHECK (public.is_manager_or_contador());
CREATE POLICY "managers_update_conceptos" ON conceptos_liquidacion FOR UPDATE TO authenticated USING (public.is_manager_or_contador()) WITH CHECK (public.is_manager_or_contador());
CREATE POLICY "managers_delete_conceptos" ON conceptos_liquidacion FOR DELETE TO authenticated USING (public.is_manager_or_contador());

-- =============================================
-- MEMORANDUMS
-- =============================================
DROP POLICY IF EXISTS "auth_insert_memorandums" ON memorandums;
DROP POLICY IF EXISTS "auth_update_memorandums" ON memorandums;
DROP POLICY IF EXISTS "auth_delete_memorandums" ON memorandums;

CREATE POLICY "managers_insert_memorandums" ON memorandums FOR INSERT TO authenticated WITH CHECK (public.is_manager());
CREATE POLICY "managers_update_memorandums" ON memorandums FOR UPDATE TO authenticated USING (public.is_manager() OR destinatario_empleado_id = public.my_empleado_id()) WITH CHECK (public.is_manager() OR destinatario_empleado_id = public.my_empleado_id());
CREATE POLICY "managers_delete_memorandums" ON memorandums FOR DELETE TO authenticated USING (public.is_manager());

-- =============================================
-- SANCIONES
-- =============================================
DROP POLICY IF EXISTS "auth_insert_sanciones" ON sanciones;
DROP POLICY IF EXISTS "auth_update_sanciones" ON sanciones;
DROP POLICY IF EXISTS "auth_delete_sanciones" ON sanciones;

CREATE POLICY "managers_insert_sanciones" ON sanciones FOR INSERT TO authenticated WITH CHECK (public.is_manager());
CREATE POLICY "managers_update_sanciones" ON sanciones FOR UPDATE TO authenticated USING (public.is_manager() OR empleado_id = public.my_empleado_id()) WITH CHECK (public.is_manager() OR empleado_id = public.my_empleado_id());
CREATE POLICY "managers_delete_sanciones" ON sanciones FOR DELETE TO authenticated USING (public.is_manager());

-- =============================================
-- DOCUMENTOS_LEGAJO
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can insert documentos" ON documentos_legajo;
DROP POLICY IF EXISTS "auth_update_documentos" ON documentos_legajo;
DROP POLICY IF EXISTS "Authenticated users can delete documentos" ON documentos_legajo;

CREATE POLICY "managers_insert_documentos" ON documentos_legajo FOR INSERT TO authenticated WITH CHECK (public.is_manager());
CREATE POLICY "managers_update_documentos" ON documentos_legajo FOR UPDATE TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "managers_delete_documentos" ON documentos_legajo FOR DELETE TO authenticated USING (public.is_manager());

-- =============================================
-- EVENTOS_LEGAJO
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can insert eventos" ON eventos_legajo;
DROP POLICY IF EXISTS "auth_update_eventos" ON eventos_legajo;
DROP POLICY IF EXISTS "auth_delete_eventos" ON eventos_legajo;

CREATE POLICY "managers_insert_eventos" ON eventos_legajo FOR INSERT TO authenticated WITH CHECK (public.is_manager());
CREATE POLICY "managers_update_eventos" ON eventos_legajo FOR UPDATE TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "managers_delete_eventos" ON eventos_legajo FOR DELETE TO authenticated USING (public.is_manager());

-- =============================================
-- GRUPO_FAMILIAR
-- =============================================
DROP POLICY IF EXISTS "auth_insert_grupo_familiar" ON grupo_familiar;
DROP POLICY IF EXISTS "auth_update_grupo_familiar" ON grupo_familiar;
DROP POLICY IF EXISTS "auth_delete_grupo_familiar" ON grupo_familiar;

CREATE POLICY "managers_insert_grupo_familiar" ON grupo_familiar FOR INSERT TO authenticated WITH CHECK (public.is_manager());
CREATE POLICY "managers_update_grupo_familiar" ON grupo_familiar FOR UPDATE TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "managers_delete_grupo_familiar" ON grupo_familiar FOR DELETE TO authenticated USING (public.is_manager());

-- =============================================
-- DATOS_MEDICOS
-- =============================================
DROP POLICY IF EXISTS "auth_insert_datos_medicos" ON datos_medicos;
DROP POLICY IF EXISTS "auth_update_datos_medicos" ON datos_medicos;
DROP POLICY IF EXISTS "auth_delete_datos_medicos" ON datos_medicos;

CREATE POLICY "managers_insert_datos_medicos" ON datos_medicos FOR INSERT TO authenticated WITH CHECK (public.is_manager());
CREATE POLICY "managers_update_datos_medicos" ON datos_medicos FOR UPDATE TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "managers_delete_datos_medicos" ON datos_medicos FOR DELETE TO authenticated USING (public.is_manager());

-- =============================================
-- ESTUDIOS_EMPLEADO
-- =============================================
DROP POLICY IF EXISTS "auth_insert_estudios" ON estudios_empleado;
DROP POLICY IF EXISTS "auth_update_estudios" ON estudios_empleado;
DROP POLICY IF EXISTS "auth_delete_estudios" ON estudios_empleado;

CREATE POLICY "managers_insert_estudios" ON estudios_empleado FOR INSERT TO authenticated WITH CHECK (public.is_manager());
CREATE POLICY "managers_update_estudios" ON estudios_empleado FOR UPDATE TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "managers_delete_estudios" ON estudios_empleado FOR DELETE TO authenticated USING (public.is_manager());

-- =============================================
-- NOVEDADES_ASISTENCIA
-- =============================================
DROP POLICY IF EXISTS "auth_insert_novedades" ON novedades_asistencia;
DROP POLICY IF EXISTS "auth_update_novedades" ON novedades_asistencia;
DROP POLICY IF EXISTS "auth_delete_novedades" ON novedades_asistencia;

CREATE POLICY "managers_insert_novedades" ON novedades_asistencia FOR INSERT TO authenticated WITH CHECK (public.is_manager());
CREATE POLICY "managers_update_novedades" ON novedades_asistencia FOR UPDATE TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "managers_delete_novedades" ON novedades_asistencia FOR DELETE TO authenticated USING (public.is_manager());

-- =============================================
-- TURNOS
-- =============================================
DROP POLICY IF EXISTS "auth_insert_turnos" ON turnos;
DROP POLICY IF EXISTS "auth_update_turnos" ON turnos;
DROP POLICY IF EXISTS "auth_delete_turnos" ON turnos;

CREATE POLICY "managers_insert_turnos" ON turnos FOR INSERT TO authenticated WITH CHECK (public.is_manager());
CREATE POLICY "managers_update_turnos" ON turnos FOR UPDATE TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "managers_delete_turnos" ON turnos FOR DELETE TO authenticated USING (public.is_manager());

-- =============================================
-- ASIGNACIONES_TURNO
-- =============================================
DROP POLICY IF EXISTS "auth_insert_asignaciones" ON asignaciones_turno;
DROP POLICY IF EXISTS "auth_update_asignaciones" ON asignaciones_turno;
DROP POLICY IF EXISTS "auth_delete_asignaciones" ON asignaciones_turno;

CREATE POLICY "managers_insert_asignaciones" ON asignaciones_turno FOR INSERT TO authenticated WITH CHECK (public.is_manager());
CREATE POLICY "managers_update_asignaciones" ON asignaciones_turno FOR UPDATE TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "managers_delete_asignaciones" ON asignaciones_turno FOR DELETE TO authenticated USING (public.is_manager());

-- =============================================
-- VACANTES
-- =============================================
DROP POLICY IF EXISTS "auth_insert_vacantes" ON vacantes;
DROP POLICY IF EXISTS "auth_update_vacantes" ON vacantes;
DROP POLICY IF EXISTS "auth_delete_vacantes" ON vacantes;

CREATE POLICY "managers_insert_vacantes" ON vacantes FOR INSERT TO authenticated WITH CHECK (public.is_manager());
CREATE POLICY "managers_update_vacantes" ON vacantes FOR UPDATE TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "managers_delete_vacantes" ON vacantes FOR DELETE TO authenticated USING (public.is_manager());

-- =============================================
-- CANDIDATOS
-- =============================================
DROP POLICY IF EXISTS "auth_insert_candidatos" ON candidatos;
DROP POLICY IF EXISTS "auth_update_candidatos" ON candidatos;
DROP POLICY IF EXISTS "auth_delete_candidatos" ON candidatos;

CREATE POLICY "managers_insert_candidatos" ON candidatos FOR INSERT TO authenticated WITH CHECK (public.is_manager());
CREATE POLICY "managers_update_candidatos" ON candidatos FOR UPDATE TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "managers_delete_candidatos" ON candidatos FOR DELETE TO authenticated USING (public.is_manager());

-- =============================================
-- VACACIONES_CONFIG
-- =============================================
DROP POLICY IF EXISTS "auth_insert_vac_config" ON vacaciones_config;
DROP POLICY IF EXISTS "auth_update_vac_config" ON vacaciones_config;
DROP POLICY IF EXISTS "auth_delete_vac_config" ON vacaciones_config;

CREATE POLICY "managers_insert_vac_config" ON vacaciones_config FOR INSERT TO authenticated WITH CHECK (public.is_manager());
CREATE POLICY "managers_update_vac_config" ON vacaciones_config FOR UPDATE TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "managers_delete_vac_config" ON vacaciones_config FOR DELETE TO authenticated USING (public.is_manager());

-- =============================================
-- SOLICITUDES_PERMISO (empleados pueden INSERT propias)
-- =============================================
DROP POLICY IF EXISTS "auth_insert_solicitudes" ON solicitudes_permiso;
DROP POLICY IF EXISTS "auth_update_solicitudes" ON solicitudes_permiso;
DROP POLICY IF EXISTS "auth_delete_solicitudes" ON solicitudes_permiso;

CREATE POLICY "empleado_insert_own_solicitud" ON solicitudes_permiso FOR INSERT TO authenticated WITH CHECK (public.is_manager() OR empleado_id = public.my_empleado_id());
CREATE POLICY "managers_update_solicitudes" ON solicitudes_permiso FOR UPDATE TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "managers_delete_solicitudes" ON solicitudes_permiso FOR DELETE TO authenticated USING (public.is_manager());

-- =============================================
-- SOLICITUDES_VACACIONES (empleados pueden INSERT propias)
-- =============================================
DROP POLICY IF EXISTS "auth_insert_sol_vac" ON solicitudes_vacaciones;
DROP POLICY IF EXISTS "auth_update_sol_vac" ON solicitudes_vacaciones;
DROP POLICY IF EXISTS "auth_delete_sol_vac" ON solicitudes_vacaciones;

CREATE POLICY "empleado_insert_own_sol_vac" ON solicitudes_vacaciones FOR INSERT TO authenticated WITH CHECK (public.is_manager() OR empleado_id = public.my_empleado_id());
CREATE POLICY "managers_update_sol_vac" ON solicitudes_vacaciones FOR UPDATE TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "managers_delete_sol_vac" ON solicitudes_vacaciones FOR DELETE TO authenticated USING (public.is_manager());

-- =============================================
-- PASO 2: Función get_users_with_roles (security definer)
-- =============================================
CREATE OR REPLACE FUNCTION public.get_users_with_roles()
RETURNS TABLE(id uuid, user_id uuid, email text, role text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ur.id, ur.user_id, u.email::text, ur.role::text
  FROM public.user_roles ur
  JOIN auth.users u ON u.id = ur.user_id
  ORDER BY u.email
$$;
