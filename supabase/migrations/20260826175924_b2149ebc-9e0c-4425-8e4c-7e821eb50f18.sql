CREATE OR REPLACE FUNCTION public.terminal_ultimas_fichadas()
RETURNS TABLE (nombre text, apellido text, legajo text, tipo text, hora timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.nombre, e.apellido, e.legajo,
         CASE WHEN f.hora_salida IS NOT NULL THEN 'salida' ELSE 'entrada' END AS tipo,
         COALESCE(f.hora_salida, f.hora_entrada) AS hora
  FROM public.fichadas f
  JOIN public.empleados e ON e.id = f.empleado_id
  WHERE f.terminal_user_id = auth.uid()
    AND f.fecha = (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
    AND public.has_role(auth.uid(), 'registro_asistencia'::app_role)
  ORDER BY COALESCE(f.hora_salida, f.hora_entrada) DESC
  LIMIT 5
$$;

REVOKE ALL ON FUNCTION public.terminal_ultimas_fichadas() FROM public;
GRANT EXECUTE ON FUNCTION public.terminal_ultimas_fichadas() TO authenticated;