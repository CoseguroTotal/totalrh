-- ═══════════════════════════════════════════════════════════════════
-- Feriados (nacionales, puentes, no laborables y propios de la empresa)
-- y parámetros para calcular horas extra.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE public.feriados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL,
  nombre text NOT NULL CHECK (char_length(nombre) BETWEEN 2 AND 120),
  -- inamovible / trasladable: feriado nacional; puente: día no laborable con fines turísticos;
  -- no_laborable: optativo para el empleador; empresa: asueto propio del grupo
  tipo text NOT NULL DEFAULT 'inamovible' CHECK (tipo IN ('inamovible', 'trasladable', 'puente', 'no_laborable', 'empresa')),
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fecha, nombre)
);

CREATE INDEX idx_feriados_fecha ON public.feriados (fecha);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feriados TO authenticated;
ALTER TABLE public.feriados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Feriados: todos los ven" ON public.feriados FOR SELECT TO authenticated USING (true);
CREATE POLICY "Feriados: RRHH carga" ON public.feriados FOR INSERT TO authenticated WITH CHECK (public.muro_es_moderador());
CREATE POLICY "Feriados: RRHH edita" ON public.feriados FOR UPDATE TO authenticated USING (public.muro_es_moderador()) WITH CHECK (public.muro_es_moderador());
CREATE POLICY "Feriados: RRHH borra" ON public.feriados FOR DELETE TO authenticated USING (public.muro_es_moderador());

-- Feriados nacionales 2026 (Ley 27.399, con los traslados de los trasladables).
-- Los días puente los fija el Poder Ejecutivo cada año: se cargan desde la app.
INSERT INTO public.feriados (fecha, nombre, tipo, created_by) VALUES
  ('2026-01-01', 'Año Nuevo', 'inamovible', NULL),
  ('2026-02-16', 'Carnaval', 'inamovible', NULL),
  ('2026-02-17', 'Carnaval', 'inamovible', NULL),
  ('2026-03-24', 'Día Nacional de la Memoria por la Verdad y la Justicia', 'inamovible', NULL),
  ('2026-04-02', 'Día del Veterano y de los Caídos en la Guerra de Malvinas', 'inamovible', NULL),
  ('2026-04-03', 'Viernes Santo', 'inamovible', NULL),
  ('2026-05-01', 'Día del Trabajador', 'inamovible', NULL),
  ('2026-05-25', 'Día de la Revolución de Mayo', 'inamovible', NULL),
  ('2026-06-15', 'Paso a la Inmortalidad del Gral. Martín Miguel de Güemes', 'trasladable', NULL),
  ('2026-06-20', 'Paso a la Inmortalidad del Gral. Manuel Belgrano', 'inamovible', NULL),
  ('2026-07-09', 'Día de la Independencia', 'inamovible', NULL),
  ('2026-08-17', 'Paso a la Inmortalidad del Gral. José de San Martín', 'trasladable', NULL),
  ('2026-10-12', 'Día del Respeto a la Diversidad Cultural', 'trasladable', NULL),
  ('2026-11-23', 'Día de la Soberanía Nacional', 'trasladable', NULL),
  ('2026-12-08', 'Inmaculada Concepción de María', 'inamovible', NULL),
  ('2026-12-25', 'Navidad', 'inamovible', NULL)
ON CONFLICT (fecha, nombre) DO NOTHING;

-- Horas extra (art. 201 LCT y Decreto 484/2000)
ALTER TABLE public.configuracion_grupo
  -- Valor hora = remuneración mensual / divisor (200 para jornada completa de 48 h; ajustar según convenio)
  ADD COLUMN IF NOT EXISTS divisor_hora integer NOT NULL DEFAULT 200 CHECK (divisor_hora BETWEEN 100 AND 300),
  -- Minutos de extra que no se cuentan (redondeo/tolerancia a la salida)
  ADD COLUMN IF NOT EXISTS extra_minimo_minutos integer NOT NULL DEFAULT 15 CHECK (extra_minimo_minutos BETWEEN 0 AND 120);