
ALTER TABLE public.configuracion_grupo ADD COLUMN IF NOT EXISTS notificaciones_email_activas boolean DEFAULT false;

CREATE TABLE public.sanciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  motivo text NOT NULL,
  descripcion text,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  emitido_por uuid,
  descargo_texto text,
  descargo_documento_url text,
  descargo_fecha timestamptz,
  descargo_cerrado boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.sanciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_sanciones" ON public.sanciones FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_sanciones" ON public.sanciones FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_sanciones" ON public.sanciones FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_sanciones" ON public.sanciones FOR DELETE TO authenticated USING (true);
