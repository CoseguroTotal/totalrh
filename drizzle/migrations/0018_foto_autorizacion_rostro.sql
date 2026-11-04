-- Foto de autorización del rostro: cuando el empleado registra su rostro desde el celular se
-- guarda una foto chica para que RRHH lo autorice sin tenerlo enfrente. La foto se borra en
-- cuanto RRHH autoriza, rechaza o verifica en persona. El bucket es privado y sin políticas:
-- sólo la función de asistencia (rol de servicio) sube, firma y borra las fotos.
-- Bucket creado aparte por la API de Storage (el backend no permite escribir storage.buckets por SQL):
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES ('rostros', 'rostros', false, 300000, ARRAY['image/jpeg'])
-- ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.rostros_empleados ADD COLUMN IF NOT EXISTS foto_path text;
GRANT SELECT (foto_path) ON public.rostros_empleados TO authenticated;
