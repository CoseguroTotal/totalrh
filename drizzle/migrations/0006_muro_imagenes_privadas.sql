-- Imágenes del muro: el bucket "muro" es privado, así que las URLs públicas que se
-- guardaban no abrían ("Bucket not found"). Se ven con URLs firmadas, y para crearlas
-- hace falta permiso de lectura: cualquier usuario con sesión puede ver las fotos del muro.
-- (El bucket ya es privado; el UPDATE a storage.buckets no está permitido por esta vía.)

CREATE POLICY "Muro: ver imágenes con sesión iniciada"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'muro');