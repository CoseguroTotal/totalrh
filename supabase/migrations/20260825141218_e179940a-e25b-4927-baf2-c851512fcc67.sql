CREATE TABLE public.qr_sesiones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  terminal_user_id uuid,
  emitido_at timestamptz NOT NULL DEFAULT now(),
  expira_at timestamptz NOT NULL,
  consumido boolean NOT NULL DEFAULT false,
  consumido_por uuid REFERENCES public.empleados(id) ON DELETE SET NULL,
  consumido_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_qr_sesiones_codigo ON public.qr_sesiones(codigo);

GRANT ALL ON public.qr_sesiones TO service_role;

ALTER TABLE public.qr_sesiones ENABLE ROW LEVEL SECURITY;

-- Sin políticas para authenticated/anon: solo las funciones de servidor acceden.

ALTER TABLE public.fichadas ADD COLUMN IF NOT EXISTS terminal_user_id uuid;
ALTER TABLE public.fichadas ADD COLUMN IF NOT EXISTS metodo text;

ALTER TABLE public.configuracion_grupo ADD COLUMN IF NOT EXISTS fichado_qr_activo boolean NOT NULL DEFAULT true;
ALTER TABLE public.configuracion_grupo ADD COLUMN IF NOT EXISTS fichado_token_activo boolean NOT NULL DEFAULT true;
ALTER TABLE public.configuracion_grupo ADD COLUMN IF NOT EXISTS qr_duracion_segundos integer NOT NULL DEFAULT 10;