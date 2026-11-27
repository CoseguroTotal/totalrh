-- Multiempresa, tanda 6: se quita el respaldo "Grupo Demo".
-- org_vigente() pasa a ser sólo org_actual(): una escritura con la clave de servicio que no indique
-- organizacion_id falla, y un usuario sin membresía no ve datos de ninguna organización.
-- org_transicion_demo() se mantiene: storage_org() la usa para los archivos viejos sin carpeta de organización.

CREATE OR REPLACE FUNCTION public.org_vigente()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$ SELECT public.org_actual() $$;

COMMENT ON FUNCTION public.org_vigente() IS
  'Organización de quien llama (igual a org_actual). Desde la tanda 6 no hay respaldo: sin membresía da null.';