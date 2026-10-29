-- ═══════════════════════════════════════════════════════════════════
-- Buckets de archivos que pueden faltar en alguna instalación.
-- En Coseguro las políticas existían pero los buckets nunca se crearon: el muro
-- respondía "Bucket not found" y tampoco andaban los adjuntos del chat y de permisos.
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public) VALUES ('muro', 'muro', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit) VALUES ('chat', 'chat', false, 26214400)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit) VALUES ('permisos', 'permisos', false, 10485760)
ON CONFLICT (id) DO NOTHING;
