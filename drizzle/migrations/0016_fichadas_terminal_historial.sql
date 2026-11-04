-- La cuenta de la terminal no puede grabar fichadas directo: solo la función de asistencia
-- (rol de servicio) registra fichadas por rostro, ubicación o QR. Las cargas de RRHH quedan
-- marcadas como manual/importada con quién las cargó.
ALTER TABLE public.fichadas ADD COLUMN IF NOT EXISTS cargada_por uuid;

DROP POLICY IF EXISTS managers_insert_fichadas ON public.fichadas;
CREATE POLICY managers_insert_fichadas ON public.fichadas FOR INSERT TO authenticated WITH CHECK (public.is_manager());

CREATE OR REPLACE FUNCTION public.fichadas_guard_carga()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NEW.metodo IS NULL OR NEW.metodo NOT IN ('manual','importada') THEN
      NEW.metodo := 'manual';
    END IF;
    NEW.cargada_por := auth.uid();
    NEW.terminal_user_id := NULL;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.fichadas_guard_carga() FROM anon, public;

DROP TRIGGER IF EXISTS fichadas_guard_carga ON public.fichadas;
CREATE TRIGGER fichadas_guard_carga BEFORE INSERT ON public.fichadas FOR EACH ROW EXECUTE FUNCTION public.fichadas_guard_carga();

-- El historial de cambios del legajo lo ve solo la gestión, no el propio empleado
DROP POLICY IF EXISTS "Cambios: gestión y el propio empleado" ON public.empleados_cambios;
DROP POLICY IF EXISTS "Cambios: solo gestión" ON public.empleados_cambios;
CREATE POLICY "Cambios: solo gestión" ON public.empleados_cambios FOR SELECT TO authenticated USING (public.is_manager_or_contador());
