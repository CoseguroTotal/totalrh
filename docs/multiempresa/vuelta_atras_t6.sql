-- Vuelta atrás de la tanda 6 de multiempresa: vuelve el respaldo "Grupo Demo".
-- Lo que el servidor cree sin indicar la organización vuelve a caer en la Demo.
-- Las edge functions de la tanda 6 siguen funcionando igual (indican la organización explícitamente),
-- así que no hace falta volver a desplegar las anteriores.

CREATE OR REPLACE FUNCTION public.org_vigente()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$ SELECT coalesce(public.org_actual(), public.org_transicion_demo()) $$;

COMMENT ON FUNCTION public.org_vigente() IS NULL;
