-- Multiempresa · Tanda 2: organizacion_id en las 49 tablas de datos de cliente
-- Todas las filas existentes quedan en "Grupo Demo". Lo nuevo toma la organización de quien lo crea
-- (o "Grupo Demo" si lo crea una edge function, hasta la tanda 6). Todavía no se filtra nada por organización.

ALTER TABLE public.asignaciones_turno ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.candidatos ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.chat_conversaciones ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.chat_mensajes ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.chat_participantes ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.conceptos_liquidacion ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.configuracion_grupo ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.datos_medicos ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.documentos_legajo ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.empleados ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.empleados_cambios ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.empresas ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.encuesta_participaciones ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.encuesta_preguntas ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.encuesta_respuestas ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.encuestas ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.estudios_empleado ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.evento_asistencias ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.eventos ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.eventos_legajo ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.feriados ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.fichadas ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.grupo_familiar ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.grupo_miembros ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.grupos ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.liquidacion_lineas ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.liquidaciones ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.memorandums ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.muro_comentarios ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.muro_lecturas ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.muro_publicaciones ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.muro_reacciones ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.notificaciones ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.novedades_asistencia ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.qr_sesiones ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.restricciones_horario ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.rostros_empleados ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.sanciones ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.solicitudes_alta ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.solicitudes_permiso ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.solicitudes_vacaciones ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.soporte_mensajes ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.sucursales ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.tareas ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.tokens_asistencia ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.tokens_consumidos ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.turnos ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.vacaciones_config ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);
ALTER TABLE public.vacantes ADD COLUMN organizacion_id uuid NOT NULL DEFAULT 'de000000-0000-4000-8000-000000000001' REFERENCES public.organizaciones (id);

ALTER TABLE public.asignaciones_turno ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.candidatos ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.chat_conversaciones ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.chat_mensajes ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.chat_participantes ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.conceptos_liquidacion ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.configuracion_grupo ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.datos_medicos ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.documentos_legajo ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.empleados ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.empleados_cambios ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.empresas ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.encuesta_participaciones ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.encuesta_preguntas ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.encuesta_respuestas ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.encuestas ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.estudios_empleado ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.evento_asistencias ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.eventos ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.eventos_legajo ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.feriados ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.fichadas ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.grupo_familiar ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.grupo_miembros ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.grupos ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.liquidacion_lineas ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.liquidaciones ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.memorandums ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.muro_comentarios ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.muro_lecturas ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.muro_publicaciones ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.muro_reacciones ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.notificaciones ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.novedades_asistencia ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.qr_sesiones ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.restricciones_horario ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.rostros_empleados ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.sanciones ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.solicitudes_alta ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.solicitudes_permiso ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.solicitudes_vacaciones ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.soporte_mensajes ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.sucursales ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.tareas ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.tokens_asistencia ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.tokens_consumidos ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.turnos ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.vacaciones_config ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();
ALTER TABLE public.vacantes ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();

CREATE INDEX asignaciones_turno_organizacion_id_idx ON public.asignaciones_turno (organizacion_id);
CREATE INDEX candidatos_organizacion_id_idx ON public.candidatos (organizacion_id);
CREATE INDEX chat_mensajes_organizacion_id_idx ON public.chat_mensajes (organizacion_id);
CREATE INDEX chat_participantes_organizacion_id_idx ON public.chat_participantes (organizacion_id);
CREATE INDEX configuracion_grupo_organizacion_id_idx ON public.configuracion_grupo (organizacion_id);
CREATE INDEX datos_medicos_organizacion_id_idx ON public.datos_medicos (organizacion_id);
CREATE INDEX documentos_legajo_organizacion_id_idx ON public.documentos_legajo (organizacion_id);
CREATE INDEX empleados_cambios_organizacion_id_idx ON public.empleados_cambios (organizacion_id);
CREATE INDEX encuesta_participaciones_organizacion_id_idx ON public.encuesta_participaciones (organizacion_id);
CREATE INDEX encuesta_respuestas_organizacion_id_idx ON public.encuesta_respuestas (organizacion_id);
CREATE INDEX estudios_empleado_organizacion_id_idx ON public.estudios_empleado (organizacion_id);
CREATE INDEX evento_asistencias_organizacion_id_idx ON public.evento_asistencias (organizacion_id);
CREATE INDEX eventos_legajo_organizacion_id_idx ON public.eventos_legajo (organizacion_id);
CREATE INDEX feriados_organizacion_id_idx ON public.feriados (organizacion_id);
CREATE INDEX fichadas_organizacion_id_idx ON public.fichadas (organizacion_id);
CREATE INDEX grupo_familiar_organizacion_id_idx ON public.grupo_familiar (organizacion_id);
CREATE INDEX grupo_miembros_organizacion_id_idx ON public.grupo_miembros (organizacion_id);
CREATE INDEX liquidacion_lineas_organizacion_id_idx ON public.liquidacion_lineas (organizacion_id);
CREATE INDEX memorandums_organizacion_id_idx ON public.memorandums (organizacion_id);
CREATE INDEX muro_comentarios_organizacion_id_idx ON public.muro_comentarios (organizacion_id);
CREATE INDEX muro_lecturas_organizacion_id_idx ON public.muro_lecturas (organizacion_id);
CREATE INDEX muro_reacciones_organizacion_id_idx ON public.muro_reacciones (organizacion_id);
CREATE INDEX notificaciones_organizacion_id_idx ON public.notificaciones (organizacion_id);
CREATE INDEX novedades_asistencia_organizacion_id_idx ON public.novedades_asistencia (organizacion_id);
CREATE INDEX qr_sesiones_organizacion_id_idx ON public.qr_sesiones (organizacion_id);
CREATE INDEX restricciones_horario_organizacion_id_idx ON public.restricciones_horario (organizacion_id);
CREATE INDEX rostros_empleados_organizacion_id_idx ON public.rostros_empleados (organizacion_id);
CREATE INDEX sanciones_organizacion_id_idx ON public.sanciones (organizacion_id);
CREATE INDEX solicitudes_alta_organizacion_id_idx ON public.solicitudes_alta (organizacion_id);
CREATE INDEX solicitudes_permiso_organizacion_id_idx ON public.solicitudes_permiso (organizacion_id);
CREATE INDEX solicitudes_vacaciones_organizacion_id_idx ON public.solicitudes_vacaciones (organizacion_id);
CREATE INDEX soporte_mensajes_organizacion_id_idx ON public.soporte_mensajes (organizacion_id);
CREATE INDEX tareas_organizacion_id_idx ON public.tareas (organizacion_id);
CREATE INDEX tokens_asistencia_organizacion_id_idx ON public.tokens_asistencia (organizacion_id);
CREATE INDEX tokens_consumidos_organizacion_id_idx ON public.tokens_consumidos (organizacion_id);
CREATE INDEX vacaciones_config_organizacion_id_idx ON public.vacaciones_config (organizacion_id);

CREATE FUNCTION public.forzar_organizacion()
RETURNS trigger LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  -- Sin sesión (edge functions con clave de servicio) se respeta lo que venga o el valor por defecto.
  IF auth.uid() IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN
      NEW.organizacion_id := public.org_vigente();
    ELSE
      NEW.organizacion_id := OLD.organizacion_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.forzar_organizacion() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.asignaciones_turno FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.candidatos FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.chat_conversaciones FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.chat_mensajes FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.chat_participantes FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.conceptos_liquidacion FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.configuracion_grupo FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.datos_medicos FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.documentos_legajo FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.empleados FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.empleados_cambios FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.encuesta_participaciones FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.encuesta_preguntas FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.encuesta_respuestas FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.encuestas FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.estudios_empleado FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.evento_asistencias FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.eventos FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.eventos_legajo FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.feriados FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.fichadas FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.grupo_familiar FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.grupo_miembros FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.grupos FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.liquidacion_lineas FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.liquidaciones FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.memorandums FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.muro_comentarios FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.muro_lecturas FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.muro_publicaciones FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.muro_reacciones FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.notificaciones FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.novedades_asistencia FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.qr_sesiones FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.restricciones_horario FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.rostros_empleados FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.sanciones FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.solicitudes_alta FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.solicitudes_permiso FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.solicitudes_vacaciones FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.soporte_mensajes FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.sucursales FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.tareas FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.tokens_asistencia FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.tokens_consumidos FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.turnos FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.vacaciones_config FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();
CREATE TRIGGER forzar_organizacion BEFORE INSERT OR UPDATE ON public.vacantes FOR EACH ROW EXECUTE FUNCTION public.forzar_organizacion();

ALTER TABLE public.conceptos_liquidacion DROP CONSTRAINT conceptos_liquidacion_codigo_key;
ALTER TABLE public.conceptos_liquidacion ADD CONSTRAINT conceptos_liquidacion_org_codigo_key UNIQUE (organizacion_id, codigo);
ALTER TABLE public.empleados DROP CONSTRAINT empleados_legajo_key;
ALTER TABLE public.empleados ADD CONSTRAINT empleados_org_legajo_key UNIQUE (organizacion_id, legajo);
ALTER TABLE public.empleados DROP CONSTRAINT empleados_codigo_asistencia_key;
ALTER TABLE public.empleados ADD CONSTRAINT empleados_org_codigo_asistencia_key UNIQUE (organizacion_id, codigo_asistencia);
ALTER TABLE public.feriados DROP CONSTRAINT feriados_fecha_nombre_key;
ALTER TABLE public.feriados ADD CONSTRAINT feriados_org_fecha_nombre_key UNIQUE (organizacion_id, fecha, nombre);
ALTER TABLE public.restricciones_horario DROP CONSTRAINT restricciones_horario_role_key;
ALTER TABLE public.restricciones_horario ADD CONSTRAINT restricciones_horario_org_role_key UNIQUE (organizacion_id, role);
DROP INDEX public.empleados_user_id_unique;
CREATE UNIQUE INDEX empleados_org_user_id_key ON public.empleados (organizacion_id, user_id) WHERE (user_id IS NOT NULL);
DROP INDEX public.uq_solicitudes_alta_dni_pendiente;
CREATE UNIQUE INDEX solicitudes_alta_org_dni_pendiente_key ON public.solicitudes_alta (organizacion_id, dni) WHERE (estado = 'pendiente'::text);
ALTER TABLE public.configuracion_grupo ADD CONSTRAINT configuracion_grupo_organizacion_key UNIQUE (organizacion_id);
CREATE UNIQUE INDEX configuracion_grupo_registro_codigo_key ON public.configuracion_grupo (registro_codigo) WHERE (registro_codigo IS NOT NULL);

ALTER TABLE public.chat_conversaciones ADD CONSTRAINT chat_conversaciones_organizacion_id_id_key UNIQUE (organizacion_id, id);
ALTER TABLE public.conceptos_liquidacion ADD CONSTRAINT conceptos_liquidacion_organizacion_id_id_key UNIQUE (organizacion_id, id);
ALTER TABLE public.empleados ADD CONSTRAINT empleados_organizacion_id_id_key UNIQUE (organizacion_id, id);
ALTER TABLE public.empresas ADD CONSTRAINT empresas_organizacion_id_id_key UNIQUE (organizacion_id, id);
ALTER TABLE public.encuesta_preguntas ADD CONSTRAINT encuesta_preguntas_organizacion_id_id_key UNIQUE (organizacion_id, id);
ALTER TABLE public.encuestas ADD CONSTRAINT encuestas_organizacion_id_id_key UNIQUE (organizacion_id, id);
ALTER TABLE public.eventos ADD CONSTRAINT eventos_organizacion_id_id_key UNIQUE (organizacion_id, id);
ALTER TABLE public.grupos ADD CONSTRAINT grupos_organizacion_id_id_key UNIQUE (organizacion_id, id);
ALTER TABLE public.liquidaciones ADD CONSTRAINT liquidaciones_organizacion_id_id_key UNIQUE (organizacion_id, id);
ALTER TABLE public.muro_publicaciones ADD CONSTRAINT muro_publicaciones_organizacion_id_id_key UNIQUE (organizacion_id, id);
ALTER TABLE public.sucursales ADD CONSTRAINT sucursales_organizacion_id_id_key UNIQUE (organizacion_id, id);
ALTER TABLE public.turnos ADD CONSTRAINT turnos_organizacion_id_id_key UNIQUE (organizacion_id, id);
ALTER TABLE public.vacantes ADD CONSTRAINT vacantes_organizacion_id_id_key UNIQUE (organizacion_id, id);

ALTER TABLE public.asignaciones_turno DROP CONSTRAINT asignaciones_turno_empleado_id_fkey,
  ADD CONSTRAINT asignaciones_turno_empleado_id_fkey FOREIGN KEY (organizacion_id, empleado_id) REFERENCES public.empleados (organizacion_id, id) ON DELETE CASCADE;
ALTER TABLE public.candidatos DROP CONSTRAINT candidatos_vacante_id_fkey,
  ADD CONSTRAINT candidatos_vacante_id_fkey FOREIGN KEY (organizacion_id, vacante_id) REFERENCES public.vacantes (organizacion_id, id) ON DELETE CASCADE;
ALTER TABLE public.chat_mensajes DROP CONSTRAINT chat_mensajes_conversacion_id_fkey,
  ADD CONSTRAINT chat_mensajes_conversacion_id_fkey FOREIGN KEY (organizacion_id, conversacion_id) REFERENCES public.chat_conversaciones (organizacion_id, id) ON DELETE CASCADE;
ALTER TABLE public.chat_participantes DROP CONSTRAINT chat_participantes_conversacion_id_fkey,
  ADD CONSTRAINT chat_participantes_conversacion_id_fkey FOREIGN KEY (organizacion_id, conversacion_id) REFERENCES public.chat_conversaciones (organizacion_id, id) ON DELETE CASCADE;
ALTER TABLE public.conceptos_liquidacion DROP CONSTRAINT conceptos_liquidacion_concepto_base_id_fkey,
  ADD CONSTRAINT conceptos_liquidacion_concepto_base_id_fkey FOREIGN KEY (organizacion_id, concepto_base_id) REFERENCES public.conceptos_liquidacion (organizacion_id, id) ON DELETE SET NULL (concepto_base_id);
ALTER TABLE public.datos_medicos DROP CONSTRAINT datos_medicos_empleado_id_fkey,
  ADD CONSTRAINT datos_medicos_empleado_id_fkey FOREIGN KEY (organizacion_id, empleado_id) REFERENCES public.empleados (organizacion_id, id) ON DELETE CASCADE;
ALTER TABLE public.documentos_legajo DROP CONSTRAINT documentos_legajo_empleado_id_fkey,
  ADD CONSTRAINT documentos_legajo_empleado_id_fkey FOREIGN KEY (organizacion_id, empleado_id) REFERENCES public.empleados (organizacion_id, id) ON DELETE CASCADE;
ALTER TABLE public.empleados DROP CONSTRAINT empleados_sucursal_id_fkey,
  ADD CONSTRAINT empleados_sucursal_id_fkey FOREIGN KEY (organizacion_id, sucursal_id) REFERENCES public.sucursales (organizacion_id, id) ON DELETE RESTRICT;
ALTER TABLE public.empleados DROP CONSTRAINT empleados_empresa_id_fkey,
  ADD CONSTRAINT empleados_empresa_id_fkey FOREIGN KEY (organizacion_id, empresa_id) REFERENCES public.empresas (organizacion_id, id) ON DELETE RESTRICT;
ALTER TABLE public.empleados_cambios DROP CONSTRAINT empleados_cambios_empleado_id_fkey,
  ADD CONSTRAINT empleados_cambios_empleado_id_fkey FOREIGN KEY (organizacion_id, empleado_id) REFERENCES public.empleados (organizacion_id, id) ON DELETE CASCADE;
ALTER TABLE public.encuesta_participaciones DROP CONSTRAINT encuesta_participaciones_encuesta_id_fkey,
  ADD CONSTRAINT encuesta_participaciones_encuesta_id_fkey FOREIGN KEY (organizacion_id, encuesta_id) REFERENCES public.encuestas (organizacion_id, id) ON DELETE CASCADE;
ALTER TABLE public.encuesta_preguntas DROP CONSTRAINT encuesta_preguntas_encuesta_id_fkey,
  ADD CONSTRAINT encuesta_preguntas_encuesta_id_fkey FOREIGN KEY (organizacion_id, encuesta_id) REFERENCES public.encuestas (organizacion_id, id) ON DELETE CASCADE;
ALTER TABLE public.encuesta_respuestas DROP CONSTRAINT encuesta_respuestas_pregunta_id_fkey,
  ADD CONSTRAINT encuesta_respuestas_pregunta_id_fkey FOREIGN KEY (organizacion_id, pregunta_id) REFERENCES public.encuesta_preguntas (organizacion_id, id) ON DELETE CASCADE;
ALTER TABLE public.encuesta_respuestas DROP CONSTRAINT encuesta_respuestas_encuesta_id_fkey,
  ADD CONSTRAINT encuesta_respuestas_encuesta_id_fkey FOREIGN KEY (organizacion_id, encuesta_id) REFERENCES public.encuestas (organizacion_id, id) ON DELETE CASCADE;
ALTER TABLE public.encuestas DROP CONSTRAINT encuestas_publicacion_id_fkey,
  ADD CONSTRAINT encuestas_publicacion_id_fkey FOREIGN KEY (organizacion_id, publicacion_id) REFERENCES public.muro_publicaciones (organizacion_id, id) ON DELETE SET NULL (publicacion_id);
ALTER TABLE public.estudios_empleado DROP CONSTRAINT estudios_empleado_empleado_id_fkey,
  ADD CONSTRAINT estudios_empleado_empleado_id_fkey FOREIGN KEY (organizacion_id, empleado_id) REFERENCES public.empleados (organizacion_id, id) ON DELETE CASCADE;
ALTER TABLE public.evento_asistencias DROP CONSTRAINT evento_asistencias_evento_id_fkey,
  ADD CONSTRAINT evento_asistencias_evento_id_fkey FOREIGN KEY (organizacion_id, evento_id) REFERENCES public.eventos (organizacion_id, id) ON DELETE CASCADE;
ALTER TABLE public.eventos DROP CONSTRAINT eventos_publicacion_id_fkey,
  ADD CONSTRAINT eventos_publicacion_id_fkey FOREIGN KEY (organizacion_id, publicacion_id) REFERENCES public.muro_publicaciones (organizacion_id, id) ON DELETE SET NULL (publicacion_id);
ALTER TABLE public.eventos_legajo DROP CONSTRAINT eventos_legajo_empleado_id_fkey,
  ADD CONSTRAINT eventos_legajo_empleado_id_fkey FOREIGN KEY (organizacion_id, empleado_id) REFERENCES public.empleados (organizacion_id, id) ON DELETE CASCADE;
ALTER TABLE public.fichadas DROP CONSTRAINT fichadas_turno_id_fkey,
  ADD CONSTRAINT fichadas_turno_id_fkey FOREIGN KEY (organizacion_id, turno_id) REFERENCES public.turnos (organizacion_id, id);
ALTER TABLE public.fichadas DROP CONSTRAINT fichadas_empleado_id_fkey,
  ADD CONSTRAINT fichadas_empleado_id_fkey FOREIGN KEY (organizacion_id, empleado_id) REFERENCES public.empleados (organizacion_id, id) ON DELETE CASCADE;
ALTER TABLE public.grupo_familiar DROP CONSTRAINT grupo_familiar_empleado_id_fkey,
  ADD CONSTRAINT grupo_familiar_empleado_id_fkey FOREIGN KEY (organizacion_id, empleado_id) REFERENCES public.empleados (organizacion_id, id) ON DELETE CASCADE;
ALTER TABLE public.grupo_miembros DROP CONSTRAINT grupo_miembros_grupo_id_fkey,
  ADD CONSTRAINT grupo_miembros_grupo_id_fkey FOREIGN KEY (organizacion_id, grupo_id) REFERENCES public.grupos (organizacion_id, id) ON DELETE CASCADE;
ALTER TABLE public.liquidacion_lineas DROP CONSTRAINT liquidacion_lineas_concepto_id_fkey,
  ADD CONSTRAINT liquidacion_lineas_concepto_id_fkey FOREIGN KEY (organizacion_id, concepto_id) REFERENCES public.conceptos_liquidacion (organizacion_id, id);
ALTER TABLE public.liquidacion_lineas DROP CONSTRAINT liquidacion_lineas_liquidacion_id_fkey,
  ADD CONSTRAINT liquidacion_lineas_liquidacion_id_fkey FOREIGN KEY (organizacion_id, liquidacion_id) REFERENCES public.liquidaciones (organizacion_id, id) ON DELETE CASCADE;
ALTER TABLE public.liquidaciones DROP CONSTRAINT liquidaciones_empleado_id_fkey,
  ADD CONSTRAINT liquidaciones_empleado_id_fkey FOREIGN KEY (organizacion_id, empleado_id) REFERENCES public.empleados (organizacion_id, id) ON DELETE CASCADE;
ALTER TABLE public.memorandums DROP CONSTRAINT memorandums_empresa_id_fkey,
  ADD CONSTRAINT memorandums_empresa_id_fkey FOREIGN KEY (organizacion_id, empresa_id) REFERENCES public.empresas (organizacion_id, id) ON DELETE SET NULL (empresa_id);
ALTER TABLE public.memorandums DROP CONSTRAINT memorandums_destinatario_empleado_id_fkey,
  ADD CONSTRAINT memorandums_destinatario_empleado_id_fkey FOREIGN KEY (organizacion_id, destinatario_empleado_id) REFERENCES public.empleados (organizacion_id, id) ON DELETE SET NULL (destinatario_empleado_id);
ALTER TABLE public.muro_comentarios DROP CONSTRAINT muro_comentarios_publicacion_id_fkey,
  ADD CONSTRAINT muro_comentarios_publicacion_id_fkey FOREIGN KEY (organizacion_id, publicacion_id) REFERENCES public.muro_publicaciones (organizacion_id, id) ON DELETE CASCADE;
ALTER TABLE public.muro_lecturas DROP CONSTRAINT muro_lecturas_publicacion_id_fkey,
  ADD CONSTRAINT muro_lecturas_publicacion_id_fkey FOREIGN KEY (organizacion_id, publicacion_id) REFERENCES public.muro_publicaciones (organizacion_id, id) ON DELETE CASCADE;
ALTER TABLE public.muro_publicaciones DROP CONSTRAINT muro_publicaciones_grupo_id_fkey,
  ADD CONSTRAINT muro_publicaciones_grupo_id_fkey FOREIGN KEY (organizacion_id, grupo_id) REFERENCES public.grupos (organizacion_id, id) ON DELETE CASCADE;
ALTER TABLE public.muro_reacciones DROP CONSTRAINT muro_reacciones_publicacion_id_fkey,
  ADD CONSTRAINT muro_reacciones_publicacion_id_fkey FOREIGN KEY (organizacion_id, publicacion_id) REFERENCES public.muro_publicaciones (organizacion_id, id) ON DELETE CASCADE;
ALTER TABLE public.novedades_asistencia DROP CONSTRAINT novedades_asistencia_empleado_id_fkey,
  ADD CONSTRAINT novedades_asistencia_empleado_id_fkey FOREIGN KEY (organizacion_id, empleado_id) REFERENCES public.empleados (organizacion_id, id) ON DELETE CASCADE;
ALTER TABLE public.qr_sesiones DROP CONSTRAINT qr_sesiones_consumido_por_fkey,
  ADD CONSTRAINT qr_sesiones_consumido_por_fkey FOREIGN KEY (organizacion_id, consumido_por) REFERENCES public.empleados (organizacion_id, id) ON DELETE SET NULL (consumido_por);
ALTER TABLE public.rostros_empleados DROP CONSTRAINT rostros_empleados_empleado_id_fkey,
  ADD CONSTRAINT rostros_empleados_empleado_id_fkey FOREIGN KEY (organizacion_id, empleado_id) REFERENCES public.empleados (organizacion_id, id) ON DELETE CASCADE;
ALTER TABLE public.sanciones DROP CONSTRAINT sanciones_empleado_id_fkey,
  ADD CONSTRAINT sanciones_empleado_id_fkey FOREIGN KEY (organizacion_id, empleado_id) REFERENCES public.empleados (organizacion_id, id) ON DELETE CASCADE;
ALTER TABLE public.solicitudes_alta DROP CONSTRAINT solicitudes_alta_sucursal_id_fkey,
  ADD CONSTRAINT solicitudes_alta_sucursal_id_fkey FOREIGN KEY (organizacion_id, sucursal_id) REFERENCES public.sucursales (organizacion_id, id) ON DELETE SET NULL (sucursal_id);
ALTER TABLE public.solicitudes_alta DROP CONSTRAINT solicitudes_alta_empresa_id_fkey,
  ADD CONSTRAINT solicitudes_alta_empresa_id_fkey FOREIGN KEY (organizacion_id, empresa_id) REFERENCES public.empresas (organizacion_id, id) ON DELETE SET NULL (empresa_id);
ALTER TABLE public.solicitudes_alta DROP CONSTRAINT solicitudes_alta_empleado_id_fkey,
  ADD CONSTRAINT solicitudes_alta_empleado_id_fkey FOREIGN KEY (organizacion_id, empleado_id) REFERENCES public.empleados (organizacion_id, id) ON DELETE SET NULL (empleado_id);
ALTER TABLE public.solicitudes_permiso DROP CONSTRAINT solicitudes_permiso_empleado_id_fkey,
  ADD CONSTRAINT solicitudes_permiso_empleado_id_fkey FOREIGN KEY (organizacion_id, empleado_id) REFERENCES public.empleados (organizacion_id, id) ON DELETE CASCADE;
ALTER TABLE public.solicitudes_vacaciones DROP CONSTRAINT solicitudes_vacaciones_empleado_id_fkey,
  ADD CONSTRAINT solicitudes_vacaciones_empleado_id_fkey FOREIGN KEY (organizacion_id, empleado_id) REFERENCES public.empleados (organizacion_id, id) ON DELETE CASCADE;
ALTER TABLE public.sucursales DROP CONSTRAINT sucursales_empresa_id_fkey,
  ADD CONSTRAINT sucursales_empresa_id_fkey FOREIGN KEY (organizacion_id, empresa_id) REFERENCES public.empresas (organizacion_id, id) ON DELETE CASCADE;
ALTER TABLE public.tokens_asistencia DROP CONSTRAINT tokens_asistencia_empleado_id_fkey,
  ADD CONSTRAINT tokens_asistencia_empleado_id_fkey FOREIGN KEY (organizacion_id, empleado_id) REFERENCES public.empleados (organizacion_id, id) ON DELETE CASCADE;
ALTER TABLE public.tokens_consumidos DROP CONSTRAINT tokens_consumidos_empleado_id_fkey,
  ADD CONSTRAINT tokens_consumidos_empleado_id_fkey FOREIGN KEY (organizacion_id, empleado_id) REFERENCES public.empleados (organizacion_id, id) ON DELETE CASCADE;
ALTER TABLE public.vacaciones_config DROP CONSTRAINT vacaciones_config_empresa_id_fkey,
  ADD CONSTRAINT vacaciones_config_empresa_id_fkey FOREIGN KEY (organizacion_id, empresa_id) REFERENCES public.empresas (organizacion_id, id) ON DELETE CASCADE;
ALTER TABLE public.vacantes DROP CONSTRAINT vacantes_empresa_id_fkey,
  ADD CONSTRAINT vacantes_empresa_id_fkey FOREIGN KEY (organizacion_id, empresa_id) REFERENCES public.empresas (organizacion_id, id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.my_empleado_id()
RETURNS uuid LANGUAGE sql STABLE SET search_path = public
AS $$
  SELECT e.id FROM public.empleados e
   WHERE e.user_id = auth.uid()
     AND e.organizacion_id = public.org_vigente()
   LIMIT 1
$$;
