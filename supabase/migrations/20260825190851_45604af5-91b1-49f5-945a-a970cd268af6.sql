DROP POLICY IF EXISTS "public_read_memo_pdf" ON storage.objects;
DROP POLICY IF EXISTS "auth_upload_memo_pdf" ON storage.objects;
DROP POLICY IF EXISTS "auth_delete_memo_pdf" ON storage.objects;
DROP POLICY IF EXISTS "auth_upload_logos" ON storage.objects;
DROP POLICY IF EXISTS "auth_update_logos" ON storage.objects;
DROP POLICY IF EXISTS "auth_delete_logos" ON storage.objects;

CREATE POLICY "memo_pdf_read_by_recipient_or_manager"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'memorandums-pdf'
  AND (
    public.is_manager_or_contador()
    OR EXISTS (
      SELECT 1
      FROM public.memorandums m
      WHERE m.id::text = (storage.foldername(storage.objects.name))[1]
        AND m.destinatario_empleado_id = public.my_empleado_id()
        AND m.estado IN ('enviado', 'recibido', 'firmado')
    )
  )
);

CREATE POLICY "memo_pdf_write_by_manager"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'memorandums-pdf'
  AND public.is_manager()
);

CREATE POLICY "memo_pdf_update_by_manager"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'memorandums-pdf'
  AND public.is_manager()
)
WITH CHECK (
  bucket_id = 'memorandums-pdf'
  AND public.is_manager()
);

CREATE POLICY "memo_pdf_delete_by_manager"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'memorandums-pdf'
  AND public.is_manager()
);

CREATE POLICY "logos_upload_by_manager"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'logos-empresas'
  AND public.is_manager()
);

CREATE POLICY "logos_update_by_manager"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'logos-empresas'
  AND public.is_manager()
)
WITH CHECK (
  bucket_id = 'logos-empresas'
  AND public.is_manager()
);

CREATE POLICY "logos_delete_by_manager"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'logos-empresas'
  AND public.is_manager()
);