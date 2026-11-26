-- Vuelta atrás de la Tanda 1 (20261126160000_multiempresa_t1_organizaciones.sql)
-- Deja user_roles y las funciones de permisos exactamente como estaban antes.
-- Sólo es válida mientras todos los usuarios tengan un único rol (nadie en dos organizaciones);
-- si no, el UNIQUE (user_id, role) puede seguir valiendo pero se perderían membresías: revisar antes.

BEGIN;

DROP FUNCTION IF EXISTS public.cambiar_organizacion(uuid);
DROP FUNCTION IF EXISTS public.mis_organizaciones();

DROP POLICY IF EXISTS "Aislamiento por organización" ON public.user_roles;

-- Funciones de permisos originales
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $function$;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'rrhh', 'gerente')) $function$;

CREATE OR REPLACE FUNCTION public.is_manager_or_contador()
RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'rrhh', 'gerente', 'contador')) $function$;

-- user_roles como estaba
ALTER TABLE public.user_roles ALTER COLUMN organizacion_id DROP DEFAULT;
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_organizacion_usuario_key;
DROP INDEX IF EXISTS public.user_roles_user_id_idx;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
ALTER TABLE public.user_roles DROP COLUMN organizacion_id;

DROP FUNCTION IF EXISTS public.org_vigente();
DROP FUNCTION IF EXISTS public.org_actual();
DROP TABLE IF EXISTS public.usuario_organizacion_activa;
DROP TABLE IF EXISTS public.organizaciones;
DROP FUNCTION IF EXISTS public.org_transicion_demo();

COMMIT;
