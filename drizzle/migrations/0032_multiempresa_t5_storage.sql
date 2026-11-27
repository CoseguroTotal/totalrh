-- Multiempresa · Tanda 5: archivos aislados por organización
-- Rutas nuevas: {organizacion_id}/{lo de antes}. Las rutas viejas (sin prefijo) cuentan como "Grupo Demo".

CREATE FUNCTION public.storage_org(_name text)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT coalesce(
    (SELECT o.id FROM public.organizaciones o WHERE o.id::text = split_part(_name, '/', 1)),
    public.org_transicion_demo()
  )
$$;

CREATE FUNCTION public.storage_carpeta(_name text)
RETURNS text
LANGUAGE sql STABLE SET search_path TO 'public'
AS $$
  SELECT (storage.foldername(
    CASE WHEN public.storage_org(_name)::text = split_part(_name, '/', 1)
         THEN substr(_name, strpos(_name, '/') + 1)
         ELSE _name END
  ))[1]
$$;

CREATE POLICY "Aislamiento por organización" ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.storage_org(name) = (SELECT public.org_vigente()))
  WITH CHECK (public.storage_org(name) = (SELECT public.org_vigente()));

DROP POLICY "Chat: subir adjuntos a mis conversaciones" ON storage.objects;
CREATE POLICY "Chat: subir adjuntos a mis conversaciones" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat' AND public.chat_es_participante_carpeta(public.storage_carpeta(name)));

DROP POLICY "Chat: ver adjuntos de mis conversaciones" ON storage.objects;
CREATE POLICY "Chat: ver adjuntos de mis conversaciones" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat' AND public.chat_es_participante_carpeta(public.storage_carpeta(name)));

DROP POLICY "Muro: borrar imágenes propias" ON storage.objects;
CREATE POLICY "Muro: borrar imágenes propias" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'muro' AND (public.storage_carpeta(name) = auth.uid()::text OR public.muro_es_moderador()));

DROP POLICY "Muro: subir imágenes a carpeta propia" ON storage.objects;
CREATE POLICY "Muro: subir imágenes a carpeta propia" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'muro' AND public.storage_carpeta(name) = auth.uid()::text);

DROP POLICY "Permisos: borrar documentos propios o RRHH" ON storage.objects;
CREATE POLICY "Permisos: borrar documentos propios o RRHH" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'permisos' AND (public.storage_carpeta(name) = public.my_empleado_id()::text OR public.is_manager()));

DROP POLICY "Permisos: subir documentos propios o RRHH" ON storage.objects;
CREATE POLICY "Permisos: subir documentos propios o RRHH" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'permisos' AND (public.storage_carpeta(name) = public.my_empleado_id()::text OR public.is_manager()));

DROP POLICY "Permisos: ver documentos propios o RRHH" ON storage.objects;
CREATE POLICY "Permisos: ver documentos propios o RRHH" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'permisos' AND (public.storage_carpeta(name) = public.my_empleado_id()::text OR public.is_manager()));

DROP POLICY "documentos_legajo_read_by_owner_or_manager" ON storage.objects;
CREATE POLICY "documentos_legajo_read_by_owner_or_manager" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documentos-legajo' AND (
    public.is_manager()
    OR public.storage_carpeta(name) = public.my_empleado_id()::text
    OR EXISTS (SELECT 1 FROM public.documentos_legajo d
                WHERE d.storage_path = objects.name AND d.empleado_id = public.my_empleado_id())));

DROP POLICY "documentos_legajo_upload_by_owner_or_manager" ON storage.objects;
CREATE POLICY "documentos_legajo_upload_by_owner_or_manager" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documentos-legajo' AND (public.is_manager() OR public.storage_carpeta(name) = public.my_empleado_id()::text));

DROP POLICY "memo_pdf_read_by_recipient_or_manager" ON storage.objects;
CREATE POLICY "memo_pdf_read_by_recipient_or_manager" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'memorandums-pdf' AND (
    public.is_manager_or_contador()
    OR EXISTS (SELECT 1 FROM public.memorandums m
                WHERE m.id::text = public.storage_carpeta(objects.name)
                  AND m.destinatario_empleado_id = public.my_empleado_id()
                  AND m.estado = ANY (ARRAY['enviado'::estado_memorandum, 'recibido'::estado_memorandum, 'firmado'::estado_memorandum]))));

CREATE OR REPLACE FUNCTION public.multiempresa_revision()
 RETURNS TABLE(objeto text, problema text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH tablas AS (
    SELECT c.oid, c.relname, c.relrowsecurity
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r'
  ), cliente AS (
    SELECT * FROM tablas
     WHERE relname NOT IN ('demo_bloqueos', 'demo_codigo_maestro', 'demo_codigos', 'demo_cuentas', 'demo_intentos', 'demo_leads', 'push_config', 'push_suscripciones', 'organizaciones', 'usuario_organizacion_activa')
  )
  SELECT relname::text, 'sin RLS activado' FROM tablas WHERE NOT relrowsecurity
  UNION ALL
  SELECT relname::text, 'sin columna organizacion_id obligatoria' FROM cliente t
   WHERE NOT EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = t.oid AND a.attname = 'organizacion_id' AND a.attnotnull AND NOT a.attisdropped)
  UNION ALL
  SELECT relname::text, 'sin política restrictiva por organización' FROM cliente t
   WHERE NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = t.oid AND NOT p.polpermissive
                       AND pg_get_expr(p.polqual, p.polrelid) LIKE '%organizacion_id%')
  UNION ALL
  SELECT relname::text, 'sin trigger forzar_organizacion' FROM cliente t
   WHERE relname <> 'user_roles'
     AND NOT EXISTS (SELECT 1 FROM pg_trigger g WHERE g.tgrelid = t.oid AND g.tgname = 'forzar_organizacion')
  UNION ALL
  SELECT p.proname::text, 'función SECURITY DEFINER sin search_path fijo'
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.prosecdef
     AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig, '{}')) c WHERE c LIKE 'search_path=%')
  UNION ALL
  SELECT 'storage.objects', 'sin política restrictiva por organización'
   WHERE NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = 'storage.objects'::regclass AND NOT p.polpermissive
                       AND pg_get_expr(p.polqual, p.polrelid) LIKE '%storage_org%')
  UNION ALL
  SELECT 'storage.objects: ' || p.polname, 'política que controla la primera carpeta sin storage_carpeta()'
    FROM pg_policy p
   WHERE p.polrelid = 'storage.objects'::regclass
     AND coalesce(pg_get_expr(p.polqual, p.polrelid), '') || coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') LIKE '%foldername%'
$function$;
