
CREATE TABLE restricciones_horario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL UNIQUE,
  hora_desde time NOT NULL DEFAULT '00:00',
  hora_hasta time NOT NULL DEFAULT '23:59',
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE restricciones_horario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_restricciones" ON restricciones_horario
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_manage_restricciones" ON restricciones_horario
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Insert defaults for all roles except admin (no restriction = 00:00 to 23:59)
INSERT INTO restricciones_horario (role, hora_desde, hora_hasta, activo) VALUES
  ('usuario', '00:00', '23:59', false),
  ('contador', '00:00', '23:59', false),
  ('gerente', '00:00', '23:59', false),
  ('rrhh', '00:00', '23:59', false),
  ('empleado', '06:00', '22:00', true),
  ('registro_asistencia', '05:00', '23:00', true);
