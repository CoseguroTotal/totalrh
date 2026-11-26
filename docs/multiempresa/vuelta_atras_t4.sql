-- Vuelta atrás de la Tanda 4 (20261126220000_multiempresa_t4_funciones.sql)
-- Restaura las definiciones originales, que la migración guardó en multiempresa_respaldo.funciones
-- antes de reemplazarlas, y borra las funciones auxiliares nuevas.
--
-- Revisar antes de correr: SELECT firma, guardada_at FROM multiempresa_respaldo.funciones WHERE tanda = 4;
-- (tienen que ser 34 filas)

BEGIN;

DO $vuelta$
DECLARE
  r record;
  n integer := 0;
BEGIN
  FOR r IN SELECT firma, definicion FROM multiempresa_respaldo.funciones WHERE tanda = 4 ORDER BY firma LOOP
    EXECUTE r.definicion;
    n := n + 1;
  END LOOP;
  IF n <> 34 THEN
    RAISE EXCEPTION 'Se esperaban 34 funciones guardadas y hay %', n;
  END IF;
END
$vuelta$;

DROP FUNCTION public.solicitudes_destinatarios_gestion(uuid[], uuid);
DROP FUNCTION public.soporte_org_de(uuid);
DROP FUNCTION public.org_de_usuario(uuid);

-- La copia queda guardada; borrarla cuando ya no haga falta:
--   DELETE FROM multiempresa_respaldo.funciones WHERE tanda = 4;

COMMIT;
