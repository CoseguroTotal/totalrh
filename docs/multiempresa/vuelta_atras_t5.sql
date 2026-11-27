-- Vuelta atrás de la Tanda 5 (20261127120000_multiempresa_t5_storage.sql)
-- Vuelve las políticas de storage a leer la primera carpeta y quita la restrictiva.
-- Ojo: los archivos subidos después de la tanda 5 tienen el prefijo {organizacion_id}/ y con estas
-- políticas dejan de verse (salvo logos, muro y lo que RRHH ve por rol). Antes de revertir, revisar:
--   SELECT bucket_id, count(*) FROM storage.objects WHERE public.storage_org(name)::text = split_part(name, '/', 1) GROUP BY 1;

BEGIN;

DROP POLICY "Aislamiento por organización" ON storage.objects;

DROP POLICY "Chat: subir adjuntos a mis conversaciones" ON storage.objects;
CREATE POLICY "Chat: subir adjuntos a mis conversaciones" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat' AND public.chat_es_participante_carpeta((storage.foldername(name))[1]));

DROP POLICY "Chat: ver adjuntos de mis conversaciones" ON storage.objects;
CREATE POLICY "Chat: ver adjuntos de mis conversaciones" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat' AND public.chat_es_participante_carpeta((storage.foldername(name))[1]));

DROP POLICY "Muro: borrar imágenes propias" ON storage.objects;
CREATE POLICY "Muro: borrar imágenes propias" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'muro' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.muro_es_moderador()));

DROP POLICY "Muro: subir imágenes a carpeta propia" ON storage.objects;
CREATE POLICY "Muro: subir imágenes a carpeta propia" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'muro' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY "Permisos: borrar documentos propios o RRHH" ON storage.objects;
CREATE POLICY "Permisos: borrar documentos propios o RRHH" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'permisos' AND ((storage.foldername(name))[1] = public.my_empleado_id()::text OR public.is_manager()));

DROP POLICY "Permisos: subir documentos propios o RRHH" ON storage.objects;
CREATE POLICY "Permisos: subir documentos propios o RRHH" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'permisos' AND ((storage.foldername(name))[1] = public.my_empleado_id()::text OR public.is_manager()));

DROP POLICY "Permisos: ver documentos propios o RRHH" ON storage.objects;
CREATE POLICY "Permisos: ver documentos propios o RRHH" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'permisos' AND ((storage.foldername(name))[1] = public.my_empleado_id()::text OR public.is_manager()));

DROP POLICY "documentos_legajo_read_by_owner_or_manager" ON storage.objects;
CREATE POLICY "documentos_legajo_read_by_owner_or_manager" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documentos-legajo' AND (
    public.is_manager()
    OR (storage.foldername(name))[1] = public.my_empleado_id()::text
    OR EXISTS (SELECT 1 FROM public.documentos_legajo d
                WHERE d.storage_path = objects.name AND d.empleado_id = public.my_empleado_id())));

DROP POLICY "documentos_legajo_upload_by_owner_or_manager" ON storage.objects;
CREATE POLICY "documentos_legajo_upload_by_owner_or_manager" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documentos-legajo' AND (public.is_manager() OR (storage.foldername(name))[1] = public.my_empleado_id()::text));

DROP POLICY "memo_pdf_read_by_recipient_or_manager" ON storage.objects;
CREATE POLICY "memo_pdf_read_by_recipient_or_manager" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'memorandums-pdf' AND (
    public.is_manager_or_contador()
    OR EXISTS (SELECT 1 FROM public.memorandums m
                WHERE m.id::text = (storage.foldername(objects.name))[1]
                  AND m.destinatario_empleado_id = public.my_empleado_id()
                  AND m.estado = ANY (ARRAY['enviado'::estado_memorandum, 'recibido'::estado_memorandum, 'firmado'::estado_memorandum]))));

-- multiempresa_revision: volver a la versión de la tanda 3 (sin los dos chequeos de storage) con
-- el CREATE OR REPLACE de supabase/migrations/20261126200000_multiempresa_t3_politicas.sql.

DROP FUNCTION public.storage_carpeta(text);
DROP FUNCTION public.storage_org(text);

COMMIT;
