ALTER TABLE public.configuracion_grupo
  ADD COLUMN IF NOT EXISTS demo_codigo_minutos integer NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS demo_max_intentos_codigo integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS demo_max_solicitudes_ip_hora integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS demo_max_fallos_ip_hora integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS demo_bloqueo_minutos integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS demo_acceso_dias integer NOT NULL DEFAULT 3;

CREATE TABLE public.demo_intentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text, email text, tipo text NOT NULL, resultado text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX ON public.demo_intentos (ip, created_at);
CREATE INDEX ON public.demo_intentos (email, created_at);

CREATE TABLE public.demo_bloqueos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clave text NOT NULL UNIQUE, motivo text, hasta timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now());

CREATE TABLE public.demo_cuentas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.demo_leads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, rol text NOT NULL, email text NOT NULL,
  empleado_id uuid, expira_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id, rol));

CREATE TABLE public.demo_codigo_maestro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_hash text NOT NULL, expira_at timestamptz NOT NULL,
  activo boolean NOT NULL DEFAULT true, usos integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now());

GRANT SELECT ON public.demo_intentos, public.demo_bloqueos, public.demo_cuentas, public.demo_codigo_maestro TO authenticated;
GRANT ALL ON public.demo_intentos, public.demo_bloqueos, public.demo_cuentas, public.demo_codigo_maestro TO service_role;
ALTER TABLE public.demo_intentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_bloqueos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_cuentas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_codigo_maestro ENABLE ROW LEVEL SECURITY;
CREATE POLICY "superadmin lee intentos" ON public.demo_intentos FOR SELECT TO authenticated USING (public.is_superadmin());
CREATE POLICY "superadmin lee bloqueos" ON public.demo_bloqueos FOR SELECT TO authenticated USING (public.is_superadmin());
CREATE POLICY "superadmin lee cuentas" ON public.demo_cuentas FOR SELECT TO authenticated USING (public.is_superadmin());
CREATE POLICY "superadmin lee maestro" ON public.demo_codigo_maestro FOR SELECT TO authenticated USING (public.is_superadmin());