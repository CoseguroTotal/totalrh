
-- Add codigo_asistencia to empleados
ALTER TABLE empleados ADD COLUMN codigo_asistencia text UNIQUE;

-- Add registro_asistencia role
ALTER TYPE app_role ADD VALUE 'registro_asistencia';

-- Token secrets table
CREATE TABLE tokens_asistencia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id uuid NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  secret text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(empleado_id)
);
ALTER TABLE tokens_asistencia ENABLE ROW LEVEL SECURITY;

-- Employees can read their own token
CREATE POLICY "empleado_read_own_token" ON tokens_asistencia
  FOR SELECT TO authenticated
  USING (
    empleado_id IN (
      SELECT id FROM empleados WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Employees can insert their own token
CREATE POLICY "empleado_insert_own_token" ON tokens_asistencia
  FOR INSERT TO authenticated
  WITH CHECK (
    empleado_id IN (
      SELECT id FROM empleados WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Admins/rrhh can manage all tokens
CREATE POLICY "admin_manage_tokens" ON tokens_asistencia
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'rrhh'));

-- Consumed tokens table (anti-replay)
CREATE TABLE tokens_consumidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id uuid NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  token text NOT NULL,
  usado_at timestamptz DEFAULT now(),
  UNIQUE(empleado_id, token)
);
ALTER TABLE tokens_consumidos ENABLE ROW LEVEL SECURITY;

-- Only service role / edge functions insert consumed tokens
CREATE POLICY "auth_insert_tokens_consumidos" ON tokens_consumidos
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "auth_select_tokens_consumidos" ON tokens_consumidos
  FOR SELECT TO authenticated
  USING (true);
