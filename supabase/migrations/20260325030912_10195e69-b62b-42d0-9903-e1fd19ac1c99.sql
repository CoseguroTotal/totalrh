
-- Enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'usuario');

-- User roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles
CREATE POLICY "users_read_own_roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins_manage_roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Configuracion grupo table
CREATE TABLE public.configuracion_grupo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_grupo text NOT NULL DEFAULT 'GrupoRH',
  logo_url text,
  domicilio text,
  cuit text,
  telefono text,
  email text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.configuracion_grupo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_config" ON public.configuracion_grupo FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_config" ON public.configuracion_grupo FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Insert default config
INSERT INTO public.configuracion_grupo (nombre_grupo) VALUES ('GrupoRH');

-- Add logo_url to empresas
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS logo_url text;

-- Logos bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('logos-empresas', 'logos-empresas', true) ON CONFLICT DO NOTHING;
CREATE POLICY "auth_upload_logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'logos-empresas');
CREATE POLICY "public_read_logos" ON storage.objects FOR SELECT USING (bucket_id = 'logos-empresas');
CREATE POLICY "auth_update_logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'logos-empresas');
CREATE POLICY "auth_delete_logos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'logos-empresas');

-- Enum for memorandum estado
CREATE TYPE public.estado_memorandum AS ENUM ('borrador', 'enviado', 'recibido', 'firmado');

-- Memorandums table
CREATE TABLE public.memorandums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero serial,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  contenido text NOT NULL DEFAULT '',
  destinatario_empleado_id uuid REFERENCES public.empleados(id) ON DELETE SET NULL,
  destinatario_nombre text,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  estado estado_memorandum NOT NULL DEFAULT 'borrador',
  firmado_por uuid,
  fecha_firma timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.memorandums ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_memorandums" ON public.memorandums FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_memorandums" ON public.memorandums FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_memorandums" ON public.memorandums FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_memorandums" ON public.memorandums FOR DELETE TO authenticated USING (true);

-- Notificaciones table
CREATE TABLE public.notificaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  titulo text NOT NULL,
  mensaje text NOT NULL DEFAULT '',
  leida boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own_notifs" ON public.notificaciones FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "auth_insert_notifs" ON public.notificaciones FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "users_update_own_notifs" ON public.notificaciones FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Enable realtime for notificaciones
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificaciones;

-- Asignaciones de turno table
CREATE TABLE public.asignaciones_turno (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id uuid REFERENCES public.empleados(id) ON DELETE CASCADE NOT NULL,
  dia_semana integer NOT NULL CHECK (dia_semana >= 0 AND dia_semana <= 6),
  hora_entrada time NOT NULL,
  hora_salida time NOT NULL,
  vigente_desde date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.asignaciones_turno ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_select_asignaciones" ON public.asignaciones_turno FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_asignaciones" ON public.asignaciones_turno FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_asignaciones" ON public.asignaciones_turno FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_asignaciones" ON public.asignaciones_turno FOR DELETE TO authenticated USING (true);
