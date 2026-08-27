CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
      AND lower(u.email) = 'mcponce.torres@gmail.com'
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_superadmin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated, service_role;

CREATE TABLE public.demo_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  email text NOT NULL UNIQUE,
  empresa text,
  telefono text,
  verificado boolean NOT NULL DEFAULT false,
  accesos integer NOT NULL DEFAULT 0,
  ultimo_acceso timestamptz,
  ultimo_ip text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.demo_leads TO authenticated;
GRANT ALL ON public.demo_leads TO service_role;

ALTER TABLE public.demo_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin puede ver los leads de demo"
ON public.demo_leads FOR SELECT TO authenticated
USING (public.is_superadmin());

CREATE TRIGGER update_demo_leads_updated_at
BEFORE UPDATE ON public.demo_leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.demo_codigos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.demo_leads(id) ON DELETE CASCADE,
  codigo_hash text NOT NULL,
  expira_at timestamptz NOT NULL,
  consumido boolean NOT NULL DEFAULT false,
  consumido_at timestamptz,
  intentos integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.demo_codigos TO service_role;

ALTER TABLE public.demo_codigos ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_demo_codigos_lead ON public.demo_codigos(lead_id, created_at DESC);