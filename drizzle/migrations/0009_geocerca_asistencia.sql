-- ═══════════════════════════════════════════════════════════════════
-- Fichada con geolocalización (geocerca por sucursal)
-- ═══════════════════════════════════════════════════════════════════

-- Ubicación de cada sucursal y radio permitido para fichar desde el celular
ALTER TABLE public.sucursales
  ADD COLUMN IF NOT EXISTS latitud double precision CHECK (latitud IS NULL OR latitud BETWEEN -90 AND 90),
  ADD COLUMN IF NOT EXISTS longitud double precision CHECK (longitud IS NULL OR longitud BETWEEN -180 AND 180),
  ADD COLUMN IF NOT EXISTS radio_metros integer NOT NULL DEFAULT 150 CHECK (radio_metros BETWEEN 20 AND 5000);

-- Interruptores en Configuración → Asistencia
ALTER TABLE public.configuracion_grupo
  -- Fichar desde la app con la ubicación del celular, sin terminal
  ADD COLUMN IF NOT EXISTS fichado_geo_activo boolean NOT NULL DEFAULT false,
  -- Al fichar con QR, exigir además estar dentro de la geocerca (evita reenviar el QR por foto)
  ADD COLUMN IF NOT EXISTS geo_exigir_en_qr boolean NOT NULL DEFAULT false;

-- Auditoría: dónde estaba el empleado al fichar desde el celular
ALTER TABLE public.fichadas
  ADD COLUMN IF NOT EXISTS latitud double precision,
  ADD COLUMN IF NOT EXISTS longitud double precision,
  ADD COLUMN IF NOT EXISTS precision_m integer,
  ADD COLUMN IF NOT EXISTS distancia_m integer,
  ADD COLUMN IF NOT EXISTS metodo_salida text;
