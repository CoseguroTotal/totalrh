-- Multiempresa · Tanda 1: organizaciones y membresías
-- Todo lo existente queda en la organización "Grupo Demo". Para los usuarios no cambia nada.

CREATE TABLE public.organizaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL CHECK (char_length(nombre) BETWEEN 2 AND 120),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9](-?[a-z0-9])*$' AND char_length(slug) <= 60),
  estado text NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'prueba', 'suspendida', 'baja')),
  plan text NOT NULL DEFAULT 'demo',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.organizaciones ENABLE ROW LEVEL SECURITY;

INSERT INTO public.organizaciones (id, nombre, slug, estado, plan)
VALUES ('de000000-0000-4000-8000-000000000001', 'Grupo Demo', 'grupo-demo', 'activa', 'demo');

CREATE FUNCTION public.org_transicion_demo()
RETURNS uuid LANGUAGE sql IMMUTABLE SET search_path = public
AS $$ SELECT 'de000000-0000-4000-8000-000000000001'::uuid $$;

ALTER TABLE public.user_roles
  ADD COLUMN organizacion_id uuid REFERENCES public.organizaciones (id) ON DELETE CASCADE;
UPDATE public.user_roles SET organizacion_id = public.org_transicion_demo();
ALTER TABLE public.user_roles ALTER COLUMN organizacion_id SET NOT NULL;

ALTER TABLE public.user_roles DROP CONSTRAINT user_roles_user_id_role_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_organizacion_usuario_key UNIQUE (organizacion_id, user_id);
CREATE INDEX user_roles_user_id_idx ON public.user_roles (user_id);

CREATE TABLE public.usuario_organizacion_activa (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  organizacion_id uuid NOT NULL REFERENCES public.organizaciones (id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.usuario_organizacion_activa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organización activa: ver la propia" ON public.usuario_organizacion_activa
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE FUNCTION public.org_actual()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT a.organizacion_id
       FROM public.usuario_organizacion_activa a
      WHERE a.user_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.user_roles r
                     WHERE r.user_id = a.user_id AND r.organizacion_id = a.organizacion_id)),
    (SELECT r.organizacion_id
       FROM public.user_roles r
       JOIN public.organizaciones o ON o.id = r.organizacion_id
      WHERE r.user_id = auth.uid()
      ORDER BY o.created_at, o.id
      LIMIT 1)
  )
$$;

CREATE FUNCTION public.org_vigente()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT coalesce(public.org_actual(), public.org_transicion_demo()) $$;

REVOKE EXECUTE ON FUNCTION public.org_actual() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.org_vigente() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.org_transicion_demo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.org_actual() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.org_vigente() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.org_transicion_demo() TO authenticated, service_role;

ALTER TABLE public.user_roles ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = _user_id
       AND role = _role
       AND organizacion_id = public.org_vigente()
  )
$$;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean LANGUAGE sql STABLE SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = auth.uid()
       AND role IN ('admin', 'rrhh', 'gerente')
       AND organizacion_id = public.org_vigente()
  )
$$;

CREATE OR REPLACE FUNCTION public.is_manager_or_contador()
RETURNS boolean LANGUAGE sql STABLE SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = auth.uid()
       AND role IN ('admin', 'rrhh', 'gerente', 'contador')
       AND organizacion_id = public.org_vigente()
  )
$$;

CREATE POLICY "Aislamiento por organización" ON public.user_roles
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_actual()))
  WITH CHECK (organizacion_id = (SELECT public.org_actual()));

CREATE POLICY "Organizaciones: ver la actual" ON public.organizaciones
  FOR SELECT TO authenticated USING (id = (SELECT public.org_actual()));

CREATE FUNCTION public.mis_organizaciones()
RETURNS TABLE (id uuid, nombre text, slug text, rol app_role, actual boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT o.id, o.nombre, o.slug, r.role, o.id = public.org_actual()
    FROM public.user_roles r
    JOIN public.organizaciones o ON o.id = r.organizacion_id
   WHERE r.user_id = auth.uid()
   ORDER BY o.nombre
$$;

CREATE FUNCTION public.cambiar_organizacion(_organizacion_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autenticado' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles
                  WHERE user_id = auth.uid() AND organizacion_id = _organizacion_id) THEN
    RAISE EXCEPTION 'No pertenecés a esa organización' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.usuario_organizacion_activa (user_id, organizacion_id, updated_at)
  VALUES (auth.uid(), _organizacion_id, now())
  ON CONFLICT (user_id) DO UPDATE SET organizacion_id = EXCLUDED.organizacion_id, updated_at = now();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mis_organizaciones() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cambiar_organizacion(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mis_organizaciones() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cambiar_organizacion(uuid) TO authenticated;