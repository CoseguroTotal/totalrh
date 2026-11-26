-- Multiempresa · Tanda 1: organizaciones y membresías
-- Plan: docs/PLAN_MULTIEMPRESA_ETAPA1.md · Vuelta atrás: docs/multiempresa/vuelta_atras_t1.sql
--
-- Todo lo existente queda en la organización "Grupo Demo". Para los usuarios no cambia nada:
-- tienen un solo rol, en esa organización, y las funciones de permisos devuelven lo mismo que antes.

-- ── 1. Organizaciones ──────────────────────────────────────────────────────────
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

-- Organización a la que va lo que se crea sin usuario (edge functions con clave de servicio).
-- Es de transición: se quita en la tanda 6, cuando cada edge function indique la organización.
CREATE FUNCTION public.org_transicion_demo()
RETURNS uuid LANGUAGE sql IMMUTABLE SET search_path = public
AS $$ SELECT 'de000000-0000-4000-8000-000000000001'::uuid $$;

-- ── 2. Membresías: user_roles pasa a ser "rol del usuario en una organización" ──
ALTER TABLE public.user_roles
  ADD COLUMN organizacion_id uuid REFERENCES public.organizaciones (id) ON DELETE CASCADE;
UPDATE public.user_roles SET organizacion_id = public.org_transicion_demo();
ALTER TABLE public.user_roles ALTER COLUMN organizacion_id SET NOT NULL;

-- Un rol por organización (el frontend ya lo supone: useUserRole usa maybeSingle)
ALTER TABLE public.user_roles DROP CONSTRAINT user_roles_user_id_role_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_organizacion_usuario_key UNIQUE (organizacion_id, user_id);
CREATE INDEX user_roles_user_id_idx ON public.user_roles (user_id);

-- ── 3. Organización elegida (sólo importa a quien pertenece a más de una) ──────
CREATE TABLE public.usuario_organizacion_activa (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  organizacion_id uuid NOT NULL REFERENCES public.organizaciones (id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.usuario_organizacion_activa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organización activa: ver la propia" ON public.usuario_organizacion_activa
  FOR SELECT TO authenticated USING (user_id = auth.uid());
-- Se escribe sólo con cambiar_organizacion()

-- ── 4. Organización actual ─────────────────────────────────────────────────────
-- La elegida si todavía es miembro; si no, la membresía más antigua. NULL sin sesión o sin membresía.
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

-- Organización a usar en permisos y valores por defecto: la actual, o "Grupo Demo" si no hay usuario.
-- Al quitar el respaldo (tanda 6) se reemplaza por org_actual().
CREATE FUNCTION public.org_vigente()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT coalesce(public.org_actual(), public.org_transicion_demo()) $$;

REVOKE EXECUTE ON FUNCTION public.org_actual() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.org_vigente() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.org_transicion_demo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.org_actual() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.org_vigente() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.org_transicion_demo() TO authenticated, service_role;

-- Lo que crean las edge functions sin indicar organización queda en "Grupo Demo", como hoy
ALTER TABLE public.user_roles ALTER COLUMN organizacion_id SET DEFAULT public.org_vigente();

-- ── 5. Permisos: el rol cuenta sólo en la organización actual ──────────────────
-- Mismos nombres y firmas: las ~200 políticas existentes siguen sirviendo sin cambios.
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
-- muro_es_moderador() usa has_role(): queda por organización sin tocarla.
-- my_empleado_id() se ajusta en la tanda 2, cuando empleados tenga organizacion_id.

-- ── 6. Cada usuario ve su rol de la organización actual ────────────────────────
CREATE POLICY "Aislamiento por organización" ON public.user_roles
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (organizacion_id = (SELECT public.org_actual()))
  WITH CHECK (organizacion_id = (SELECT public.org_actual()));

CREATE POLICY "Organizaciones: ver la actual" ON public.organizaciones
  FOR SELECT TO authenticated USING (id = (SELECT public.org_actual()));

-- ── 7. Elegir organización ─────────────────────────────────────────────────────
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
