-- Multiempresa, tanda 6: se quita el respaldo "Grupo Demo".
--
-- Hasta acá org_vigente() era coalesce(org_actual(), Grupo Demo): lo que el servidor creaba sin decir
-- la organización caía en la Demo. Las edge functions ahora indican siempre la organización, así que
-- org_vigente() pasa a ser sólo org_actual():
--   - una escritura con la clave de servicio que no indique organizacion_id falla (la columna es obligatoria);
--   - un usuario sin membresía no ve datos de ninguna organización.
--
-- org_transicion_demo() se mantiene: storage_org() la usa para los archivos viejos sin carpeta de
-- organización, que son de Grupo Demo (no es un respaldo, es de quién son esos archivos).
-- Vuelta atrás: docs/multiempresa/vuelta_atras_t6.sql

CREATE OR REPLACE FUNCTION public.org_vigente()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$ SELECT public.org_actual() $$;

COMMENT ON FUNCTION public.org_vigente() IS
  'Organización de quien llama (igual a org_actual). Desde la tanda 6 no hay respaldo: sin membresía da null.';
