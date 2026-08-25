CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'rrhh', 'gerente')
  )
$function$;

CREATE OR REPLACE FUNCTION public.is_manager_or_contador()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'rrhh', 'gerente', 'contador')
  )
$function$;

CREATE OR REPLACE FUNCTION public.my_empleado_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT e.id
  FROM public.empleados e
  WHERE e.user_id = auth.uid()
  LIMIT 1
$function$;

DROP POLICY IF EXISTS "admins_manage_roles" ON public.user_roles;

REVOKE ALL ON FUNCTION public.get_users_with_roles() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_users_with_roles() TO service_role;

REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;