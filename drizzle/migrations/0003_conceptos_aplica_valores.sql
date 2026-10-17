-- ═══════════════════════════════════════════════════════════════════
-- Conceptos por categoría o convenio: a qué categorías / CCT aplica.
-- ═══════════════════════════════════════════════════════════════════

-- Valores objetivo del filtro aplica_a:
--   aplica_a = 'todos'     → se ignora
--   aplica_a = 'categoria' → empleados.categoria debe estar en la lista
--   aplica_a = 'convenio'  → empleados.cct debe estar en la lista
-- Lista vacía con aplica_a distinto de 'todos' = no se le liquida a nadie.
ALTER TABLE public.conceptos_liquidacion
  ADD COLUMN IF NOT EXISTS aplica_valores text[] NOT NULL DEFAULT '{}';
