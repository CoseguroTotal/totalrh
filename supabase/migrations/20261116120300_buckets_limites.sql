-- ═══════════════════════════════════════════════════════════════════
-- Storage: límite de tamaño en todos los buckets y lista de tipos donde
-- el contenido es siempre el mismo. Sin SVG (puede llevar scripts).
-- Los límites quedan por encima de lo que la app usa hoy.
-- documentos-legajo y chat aceptan documentos variados (Word, Excel, zip…):
-- llevan límite de tamaño pero no lista de tipos.
-- ═══════════════════════════════════════════════════════════════════

-- Legajos: documentos de cualquier tipo, hasta 20 MB
UPDATE storage.buckets SET file_size_limit = 20 * 1024 * 1024
WHERE id = 'documentos-legajo';

-- PDFs de memorándums generados por la app, hasta 10 MB
UPDATE storage.buckets SET file_size_limit = 10 * 1024 * 1024,
  allowed_mime_types = ARRAY['application/pdf']
WHERE id = 'memorandums-pdf';

-- Fotos del muro, hasta 10 MB
UPDATE storage.buckets SET file_size_limit = 10 * 1024 * 1024,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
WHERE id = 'muro';

-- Logos de empresas (bucket público), hasta 5 MB
UPDATE storage.buckets SET file_size_limit = 5 * 1024 * 1024,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'logos-empresas';

-- Adjuntos de permisos: PDF o fotos (el límite de 10 MB ya estaba).
-- octet-stream: PDFs que el celular manda sin tipo (la app los acepta por la extensión)
UPDATE storage.buckets SET
  allowed_mime_types = ARRAY['application/pdf', 'application/octet-stream', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif', 'image/bmp', 'image/tiff']
WHERE id = 'permisos';

-- Fotos de fichaje: sólo JPEG (el límite de 300 KB ya estaba)
UPDATE storage.buckets SET allowed_mime_types = ARRAY['image/jpeg']
WHERE id = 'rostros';
