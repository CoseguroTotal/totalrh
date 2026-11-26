-- Vuelta atrás de la Tanda 2 (20261126180000_multiempresa_t2_columnas.sql)
-- Deja las 49 tablas, sus claves y my_empleado_id() exactamente como estaban.
-- Válida mientras todo siga en "Grupo Demo" (antes de crear una segunda organización).

BEGIN;

CREATE OR REPLACE FUNCTION public.my_empleado_id()
RETURNS uuid LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$ SELECT e.id FROM public.empleados e WHERE e.user_id = auth.uid() LIMIT 1 $function$;

-- Claves foráneas originales
ALTER TABLE public.asignaciones_turno DROP CONSTRAINT asignaciones_turno_empleado_id_fkey,
  ADD CONSTRAINT asignaciones_turno_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES public.empleados (id) ON DELETE CASCADE;
ALTER TABLE public.candidatos DROP CONSTRAINT candidatos_vacante_id_fkey,
  ADD CONSTRAINT candidatos_vacante_id_fkey FOREIGN KEY (vacante_id) REFERENCES public.vacantes (id) ON DELETE CASCADE;
ALTER TABLE public.chat_mensajes DROP CONSTRAINT chat_mensajes_conversacion_id_fkey,
  ADD CONSTRAINT chat_mensajes_conversacion_id_fkey FOREIGN KEY (conversacion_id) REFERENCES public.chat_conversaciones (id) ON DELETE CASCADE;
ALTER TABLE public.chat_participantes DROP CONSTRAINT chat_participantes_conversacion_id_fkey,
  ADD CONSTRAINT chat_participantes_conversacion_id_fkey FOREIGN KEY (conversacion_id) REFERENCES public.chat_conversaciones (id) ON DELETE CASCADE;
ALTER TABLE public.conceptos_liquidacion DROP CONSTRAINT conceptos_liquidacion_concepto_base_id_fkey,
  ADD CONSTRAINT conceptos_liquidacion_concepto_base_id_fkey FOREIGN KEY (concepto_base_id) REFERENCES public.conceptos_liquidacion (id) ON DELETE SET NULL;
ALTER TABLE public.datos_medicos DROP CONSTRAINT datos_medicos_empleado_id_fkey,
  ADD CONSTRAINT datos_medicos_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES public.empleados (id) ON DELETE CASCADE;
ALTER TABLE public.documentos_legajo DROP CONSTRAINT documentos_legajo_empleado_id_fkey,
  ADD CONSTRAINT documentos_legajo_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES public.empleados (id) ON DELETE CASCADE;
ALTER TABLE public.empleados DROP CONSTRAINT empleados_sucursal_id_fkey,
  ADD CONSTRAINT empleados_sucursal_id_fkey FOREIGN KEY (sucursal_id) REFERENCES public.sucursales (id) ON DELETE RESTRICT;
ALTER TABLE public.empleados DROP CONSTRAINT empleados_empresa_id_fkey,
  ADD CONSTRAINT empleados_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas (id) ON DELETE RESTRICT;
ALTER TABLE public.empleados_cambios DROP CONSTRAINT empleados_cambios_empleado_id_fkey,
  ADD CONSTRAINT empleados_cambios_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES public.empleados (id) ON DELETE CASCADE;
ALTER TABLE public.encuesta_participaciones DROP CONSTRAINT encuesta_participaciones_encuesta_id_fkey,
  ADD CONSTRAINT encuesta_participaciones_encuesta_id_fkey FOREIGN KEY (encuesta_id) REFERENCES public.encuestas (id) ON DELETE CASCADE;
ALTER TABLE public.encuesta_preguntas DROP CONSTRAINT encuesta_preguntas_encuesta_id_fkey,
  ADD CONSTRAINT encuesta_preguntas_encuesta_id_fkey FOREIGN KEY (encuesta_id) REFERENCES public.encuestas (id) ON DELETE CASCADE;
ALTER TABLE public.encuesta_respuestas DROP CONSTRAINT encuesta_respuestas_pregunta_id_fkey,
  ADD CONSTRAINT encuesta_respuestas_pregunta_id_fkey FOREIGN KEY (pregunta_id) REFERENCES public.encuesta_preguntas (id) ON DELETE CASCADE;
ALTER TABLE public.encuesta_respuestas DROP CONSTRAINT encuesta_respuestas_encuesta_id_fkey,
  ADD CONSTRAINT encuesta_respuestas_encuesta_id_fkey FOREIGN KEY (encuesta_id) REFERENCES public.encuestas (id) ON DELETE CASCADE;
ALTER TABLE public.encuestas DROP CONSTRAINT encuestas_publicacion_id_fkey,
  ADD CONSTRAINT encuestas_publicacion_id_fkey FOREIGN KEY (publicacion_id) REFERENCES public.muro_publicaciones (id) ON DELETE SET NULL;
ALTER TABLE public.estudios_empleado DROP CONSTRAINT estudios_empleado_empleado_id_fkey,
  ADD CONSTRAINT estudios_empleado_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES public.empleados (id) ON DELETE CASCADE;
ALTER TABLE public.evento_asistencias DROP CONSTRAINT evento_asistencias_evento_id_fkey,
  ADD CONSTRAINT evento_asistencias_evento_id_fkey FOREIGN KEY (evento_id) REFERENCES public.eventos (id) ON DELETE CASCADE;
ALTER TABLE public.eventos DROP CONSTRAINT eventos_publicacion_id_fkey,
  ADD CONSTRAINT eventos_publicacion_id_fkey FOREIGN KEY (publicacion_id) REFERENCES public.muro_publicaciones (id) ON DELETE SET NULL;
ALTER TABLE public.eventos_legajo DROP CONSTRAINT eventos_legajo_empleado_id_fkey,
  ADD CONSTRAINT eventos_legajo_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES public.empleados (id) ON DELETE CASCADE;
ALTER TABLE public.fichadas DROP CONSTRAINT fichadas_turno_id_fkey,
  ADD CONSTRAINT fichadas_turno_id_fkey FOREIGN KEY (turno_id) REFERENCES public.turnos (id);
ALTER TABLE public.fichadas DROP CONSTRAINT fichadas_empleado_id_fkey,
  ADD CONSTRAINT fichadas_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES public.empleados (id) ON DELETE CASCADE;
ALTER TABLE public.grupo_familiar DROP CONSTRAINT grupo_familiar_empleado_id_fkey,
  ADD CONSTRAINT grupo_familiar_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES public.empleados (id) ON DELETE CASCADE;
ALTER TABLE public.grupo_miembros DROP CONSTRAINT grupo_miembros_grupo_id_fkey,
  ADD CONSTRAINT grupo_miembros_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.grupos (id) ON DELETE CASCADE;
ALTER TABLE public.liquidacion_lineas DROP CONSTRAINT liquidacion_lineas_concepto_id_fkey,
  ADD CONSTRAINT liquidacion_lineas_concepto_id_fkey FOREIGN KEY (concepto_id) REFERENCES public.conceptos_liquidacion (id);
ALTER TABLE public.liquidacion_lineas DROP CONSTRAINT liquidacion_lineas_liquidacion_id_fkey,
  ADD CONSTRAINT liquidacion_lineas_liquidacion_id_fkey FOREIGN KEY (liquidacion_id) REFERENCES public.liquidaciones (id) ON DELETE CASCADE;
ALTER TABLE public.liquidaciones DROP CONSTRAINT liquidaciones_empleado_id_fkey,
  ADD CONSTRAINT liquidaciones_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES public.empleados (id) ON DELETE CASCADE;
ALTER TABLE public.memorandums DROP CONSTRAINT memorandums_empresa_id_fkey,
  ADD CONSTRAINT memorandums_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas (id) ON DELETE SET NULL;
ALTER TABLE public.memorandums DROP CONSTRAINT memorandums_destinatario_empleado_id_fkey,
  ADD CONSTRAINT memorandums_destinatario_empleado_id_fkey FOREIGN KEY (destinatario_empleado_id) REFERENCES public.empleados (id) ON DELETE SET NULL;
ALTER TABLE public.muro_comentarios DROP CONSTRAINT muro_comentarios_publicacion_id_fkey,
  ADD CONSTRAINT muro_comentarios_publicacion_id_fkey FOREIGN KEY (publicacion_id) REFERENCES public.muro_publicaciones (id) ON DELETE CASCADE;
ALTER TABLE public.muro_lecturas DROP CONSTRAINT muro_lecturas_publicacion_id_fkey,
  ADD CONSTRAINT muro_lecturas_publicacion_id_fkey FOREIGN KEY (publicacion_id) REFERENCES public.muro_publicaciones (id) ON DELETE CASCADE;
ALTER TABLE public.muro_publicaciones DROP CONSTRAINT muro_publicaciones_grupo_id_fkey,
  ADD CONSTRAINT muro_publicaciones_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.grupos (id) ON DELETE CASCADE;
ALTER TABLE public.muro_reacciones DROP CONSTRAINT muro_reacciones_publicacion_id_fkey,
  ADD CONSTRAINT muro_reacciones_publicacion_id_fkey FOREIGN KEY (publicacion_id) REFERENCES public.muro_publicaciones (id) ON DELETE CASCADE;
ALTER TABLE public.novedades_asistencia DROP CONSTRAINT novedades_asistencia_empleado_id_fkey,
  ADD CONSTRAINT novedades_asistencia_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES public.empleados (id) ON DELETE CASCADE;
ALTER TABLE public.qr_sesiones DROP CONSTRAINT qr_sesiones_consumido_por_fkey,
  ADD CONSTRAINT qr_sesiones_consumido_por_fkey FOREIGN KEY (consumido_por) REFERENCES public.empleados (id) ON DELETE SET NULL;
ALTER TABLE public.rostros_empleados DROP CONSTRAINT rostros_empleados_empleado_id_fkey,
  ADD CONSTRAINT rostros_empleados_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES public.empleados (id) ON DELETE CASCADE;
ALTER TABLE public.sanciones DROP CONSTRAINT sanciones_empleado_id_fkey,
  ADD CONSTRAINT sanciones_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES public.empleados (id) ON DELETE CASCADE;
ALTER TABLE public.solicitudes_alta DROP CONSTRAINT solicitudes_alta_sucursal_id_fkey,
  ADD CONSTRAINT solicitudes_alta_sucursal_id_fkey FOREIGN KEY (sucursal_id) REFERENCES public.sucursales (id) ON DELETE SET NULL;
ALTER TABLE public.solicitudes_alta DROP CONSTRAINT solicitudes_alta_empresa_id_fkey,
  ADD CONSTRAINT solicitudes_alta_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas (id) ON DELETE SET NULL;
ALTER TABLE public.solicitudes_alta DROP CONSTRAINT solicitudes_alta_empleado_id_fkey,
  ADD CONSTRAINT solicitudes_alta_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES public.empleados (id) ON DELETE SET NULL;
ALTER TABLE public.solicitudes_permiso DROP CONSTRAINT solicitudes_permiso_empleado_id_fkey,
  ADD CONSTRAINT solicitudes_permiso_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES public.empleados (id) ON DELETE CASCADE;
ALTER TABLE public.solicitudes_vacaciones DROP CONSTRAINT solicitudes_vacaciones_empleado_id_fkey,
  ADD CONSTRAINT solicitudes_vacaciones_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES public.empleados (id) ON DELETE CASCADE;
ALTER TABLE public.sucursales DROP CONSTRAINT sucursales_empresa_id_fkey,
  ADD CONSTRAINT sucursales_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas (id) ON DELETE CASCADE;
ALTER TABLE public.tokens_asistencia DROP CONSTRAINT tokens_asistencia_empleado_id_fkey,
  ADD CONSTRAINT tokens_asistencia_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES public.empleados (id) ON DELETE CASCADE;
ALTER TABLE public.tokens_consumidos DROP CONSTRAINT tokens_consumidos_empleado_id_fkey,
  ADD CONSTRAINT tokens_consumidos_empleado_id_fkey FOREIGN KEY (empleado_id) REFERENCES public.empleados (id) ON DELETE CASCADE;
ALTER TABLE public.vacaciones_config DROP CONSTRAINT vacaciones_config_empresa_id_fkey,
  ADD CONSTRAINT vacaciones_config_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas (id) ON DELETE CASCADE;
ALTER TABLE public.vacantes DROP CONSTRAINT vacantes_empresa_id_fkey,
  ADD CONSTRAINT vacantes_empresa_id_fkey FOREIGN KEY (empresa_id) REFERENCES public.empresas (id) ON DELETE CASCADE;
ALTER TABLE public.chat_conversaciones DROP CONSTRAINT chat_conversaciones_organizacion_id_id_key;
ALTER TABLE public.conceptos_liquidacion DROP CONSTRAINT conceptos_liquidacion_organizacion_id_id_key;
ALTER TABLE public.empleados DROP CONSTRAINT empleados_organizacion_id_id_key;
ALTER TABLE public.empresas DROP CONSTRAINT empresas_organizacion_id_id_key;
ALTER TABLE public.encuesta_preguntas DROP CONSTRAINT encuesta_preguntas_organizacion_id_id_key;
ALTER TABLE public.encuestas DROP CONSTRAINT encuestas_organizacion_id_id_key;
ALTER TABLE public.eventos DROP CONSTRAINT eventos_organizacion_id_id_key;
ALTER TABLE public.grupos DROP CONSTRAINT grupos_organizacion_id_id_key;
ALTER TABLE public.liquidaciones DROP CONSTRAINT liquidaciones_organizacion_id_id_key;
ALTER TABLE public.muro_publicaciones DROP CONSTRAINT muro_publicaciones_organizacion_id_id_key;
ALTER TABLE public.sucursales DROP CONSTRAINT sucursales_organizacion_id_id_key;
ALTER TABLE public.turnos DROP CONSTRAINT turnos_organizacion_id_id_key;
ALTER TABLE public.vacantes DROP CONSTRAINT vacantes_organizacion_id_id_key;

-- Únicas originales
DROP INDEX public.configuracion_grupo_registro_codigo_key;
ALTER TABLE public.configuracion_grupo DROP CONSTRAINT configuracion_grupo_organizacion_key;
ALTER TABLE public.conceptos_liquidacion DROP CONSTRAINT conceptos_liquidacion_org_codigo_key;
ALTER TABLE public.conceptos_liquidacion ADD CONSTRAINT conceptos_liquidacion_codigo_key UNIQUE (codigo);
ALTER TABLE public.empleados DROP CONSTRAINT empleados_org_legajo_key;
ALTER TABLE public.empleados ADD CONSTRAINT empleados_legajo_key UNIQUE (legajo);
ALTER TABLE public.empleados DROP CONSTRAINT empleados_org_codigo_asistencia_key;
ALTER TABLE public.empleados ADD CONSTRAINT empleados_codigo_asistencia_key UNIQUE (codigo_asistencia);
ALTER TABLE public.feriados DROP CONSTRAINT feriados_org_fecha_nombre_key;
ALTER TABLE public.feriados ADD CONSTRAINT feriados_fecha_nombre_key UNIQUE (fecha, nombre);
ALTER TABLE public.restricciones_horario DROP CONSTRAINT restricciones_horario_org_role_key;
ALTER TABLE public.restricciones_horario ADD CONSTRAINT restricciones_horario_role_key UNIQUE (role);
DROP INDEX public.empleados_org_user_id_key;
CREATE UNIQUE INDEX empleados_user_id_unique ON public.empleados USING btree (user_id) WHERE (user_id IS NOT NULL);
DROP INDEX public.solicitudes_alta_org_dni_pendiente_key;
CREATE UNIQUE INDEX uq_solicitudes_alta_dni_pendiente ON public.solicitudes_alta USING btree (dni) WHERE (estado = 'pendiente'::text);

-- Triggers, columnas y función
DROP TRIGGER forzar_organizacion ON public.asignaciones_turno;
DROP TRIGGER forzar_organizacion ON public.candidatos;
DROP TRIGGER forzar_organizacion ON public.chat_conversaciones;
DROP TRIGGER forzar_organizacion ON public.chat_mensajes;
DROP TRIGGER forzar_organizacion ON public.chat_participantes;
DROP TRIGGER forzar_organizacion ON public.conceptos_liquidacion;
DROP TRIGGER forzar_organizacion ON public.configuracion_grupo;
DROP TRIGGER forzar_organizacion ON public.datos_medicos;
DROP TRIGGER forzar_organizacion ON public.documentos_legajo;
DROP TRIGGER forzar_organizacion ON public.empleados;
DROP TRIGGER forzar_organizacion ON public.empleados_cambios;
DROP TRIGGER forzar_organizacion ON public.empresas;
DROP TRIGGER forzar_organizacion ON public.encuesta_participaciones;
DROP TRIGGER forzar_organizacion ON public.encuesta_preguntas;
DROP TRIGGER forzar_organizacion ON public.encuesta_respuestas;
DROP TRIGGER forzar_organizacion ON public.encuestas;
DROP TRIGGER forzar_organizacion ON public.estudios_empleado;
DROP TRIGGER forzar_organizacion ON public.evento_asistencias;
DROP TRIGGER forzar_organizacion ON public.eventos;
DROP TRIGGER forzar_organizacion ON public.eventos_legajo;
DROP TRIGGER forzar_organizacion ON public.feriados;
DROP TRIGGER forzar_organizacion ON public.fichadas;
DROP TRIGGER forzar_organizacion ON public.grupo_familiar;
DROP TRIGGER forzar_organizacion ON public.grupo_miembros;
DROP TRIGGER forzar_organizacion ON public.grupos;
DROP TRIGGER forzar_organizacion ON public.liquidacion_lineas;
DROP TRIGGER forzar_organizacion ON public.liquidaciones;
DROP TRIGGER forzar_organizacion ON public.memorandums;
DROP TRIGGER forzar_organizacion ON public.muro_comentarios;
DROP TRIGGER forzar_organizacion ON public.muro_lecturas;
DROP TRIGGER forzar_organizacion ON public.muro_publicaciones;
DROP TRIGGER forzar_organizacion ON public.muro_reacciones;
DROP TRIGGER forzar_organizacion ON public.notificaciones;
DROP TRIGGER forzar_organizacion ON public.novedades_asistencia;
DROP TRIGGER forzar_organizacion ON public.qr_sesiones;
DROP TRIGGER forzar_organizacion ON public.restricciones_horario;
DROP TRIGGER forzar_organizacion ON public.rostros_empleados;
DROP TRIGGER forzar_organizacion ON public.sanciones;
DROP TRIGGER forzar_organizacion ON public.solicitudes_alta;
DROP TRIGGER forzar_organizacion ON public.solicitudes_permiso;
DROP TRIGGER forzar_organizacion ON public.solicitudes_vacaciones;
DROP TRIGGER forzar_organizacion ON public.soporte_mensajes;
DROP TRIGGER forzar_organizacion ON public.sucursales;
DROP TRIGGER forzar_organizacion ON public.tareas;
DROP TRIGGER forzar_organizacion ON public.tokens_asistencia;
DROP TRIGGER forzar_organizacion ON public.tokens_consumidos;
DROP TRIGGER forzar_organizacion ON public.turnos;
DROP TRIGGER forzar_organizacion ON public.vacaciones_config;
DROP TRIGGER forzar_organizacion ON public.vacantes;
DROP FUNCTION public.forzar_organizacion();
ALTER TABLE public.asignaciones_turno DROP COLUMN organizacion_id;
ALTER TABLE public.candidatos DROP COLUMN organizacion_id;
ALTER TABLE public.chat_conversaciones DROP COLUMN organizacion_id;
ALTER TABLE public.chat_mensajes DROP COLUMN organizacion_id;
ALTER TABLE public.chat_participantes DROP COLUMN organizacion_id;
ALTER TABLE public.conceptos_liquidacion DROP COLUMN organizacion_id;
ALTER TABLE public.configuracion_grupo DROP COLUMN organizacion_id;
ALTER TABLE public.datos_medicos DROP COLUMN organizacion_id;
ALTER TABLE public.documentos_legajo DROP COLUMN organizacion_id;
ALTER TABLE public.empleados DROP COLUMN organizacion_id;
ALTER TABLE public.empleados_cambios DROP COLUMN organizacion_id;
ALTER TABLE public.empresas DROP COLUMN organizacion_id;
ALTER TABLE public.encuesta_participaciones DROP COLUMN organizacion_id;
ALTER TABLE public.encuesta_preguntas DROP COLUMN organizacion_id;
ALTER TABLE public.encuesta_respuestas DROP COLUMN organizacion_id;
ALTER TABLE public.encuestas DROP COLUMN organizacion_id;
ALTER TABLE public.estudios_empleado DROP COLUMN organizacion_id;
ALTER TABLE public.evento_asistencias DROP COLUMN organizacion_id;
ALTER TABLE public.eventos DROP COLUMN organizacion_id;
ALTER TABLE public.eventos_legajo DROP COLUMN organizacion_id;
ALTER TABLE public.feriados DROP COLUMN organizacion_id;
ALTER TABLE public.fichadas DROP COLUMN organizacion_id;
ALTER TABLE public.grupo_familiar DROP COLUMN organizacion_id;
ALTER TABLE public.grupo_miembros DROP COLUMN organizacion_id;
ALTER TABLE public.grupos DROP COLUMN organizacion_id;
ALTER TABLE public.liquidacion_lineas DROP COLUMN organizacion_id;
ALTER TABLE public.liquidaciones DROP COLUMN organizacion_id;
ALTER TABLE public.memorandums DROP COLUMN organizacion_id;
ALTER TABLE public.muro_comentarios DROP COLUMN organizacion_id;
ALTER TABLE public.muro_lecturas DROP COLUMN organizacion_id;
ALTER TABLE public.muro_publicaciones DROP COLUMN organizacion_id;
ALTER TABLE public.muro_reacciones DROP COLUMN organizacion_id;
ALTER TABLE public.notificaciones DROP COLUMN organizacion_id;
ALTER TABLE public.novedades_asistencia DROP COLUMN organizacion_id;
ALTER TABLE public.qr_sesiones DROP COLUMN organizacion_id;
ALTER TABLE public.restricciones_horario DROP COLUMN organizacion_id;
ALTER TABLE public.rostros_empleados DROP COLUMN organizacion_id;
ALTER TABLE public.sanciones DROP COLUMN organizacion_id;
ALTER TABLE public.solicitudes_alta DROP COLUMN organizacion_id;
ALTER TABLE public.solicitudes_permiso DROP COLUMN organizacion_id;
ALTER TABLE public.solicitudes_vacaciones DROP COLUMN organizacion_id;
ALTER TABLE public.soporte_mensajes DROP COLUMN organizacion_id;
ALTER TABLE public.sucursales DROP COLUMN organizacion_id;
ALTER TABLE public.tareas DROP COLUMN organizacion_id;
ALTER TABLE public.tokens_asistencia DROP COLUMN organizacion_id;
ALTER TABLE public.tokens_consumidos DROP COLUMN organizacion_id;
ALTER TABLE public.turnos DROP COLUMN organizacion_id;
ALTER TABLE public.vacaciones_config DROP COLUMN organizacion_id;
ALTER TABLE public.vacantes DROP COLUMN organizacion_id;

COMMIT;
