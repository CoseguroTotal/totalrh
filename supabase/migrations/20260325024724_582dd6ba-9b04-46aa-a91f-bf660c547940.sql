
-- Attendance module tables

CREATE TABLE public.turnos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  hora_entrada time NOT NULL,
  hora_salida time NOT NULL,
  tolerancia_minutos int NOT NULL DEFAULT 15,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.turnos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_turnos" ON public.turnos FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_turnos" ON public.turnos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_turnos" ON public.turnos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_turnos" ON public.turnos FOR DELETE TO authenticated USING (true);

CREATE TABLE public.fichadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  hora_entrada timestamptz,
  hora_salida timestamptz,
  turno_id uuid REFERENCES public.turnos(id),
  estado text NOT NULL DEFAULT 'presente',
  observaciones text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fichadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_fichadas" ON public.fichadas FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_fichadas" ON public.fichadas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_fichadas" ON public.fichadas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_fichadas" ON public.fichadas FOR DELETE TO authenticated USING (true);

CREATE TABLE public.novedades_asistencia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  tipo text NOT NULL,
  descripcion text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.novedades_asistencia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select_novedades" ON public.novedades_asistencia FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_novedades" ON public.novedades_asistencia FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update_novedades" ON public.novedades_asistencia FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_novedades" ON public.novedades_asistencia FOR DELETE TO authenticated USING (true);

-- Add UPDATE/DELETE policies to eventos_legajo (missing)
CREATE POLICY "auth_update_eventos" ON public.eventos_legajo FOR UPDATE TO authenticated USING (true);
CREATE POLICY "auth_delete_eventos" ON public.eventos_legajo FOR DELETE TO authenticated USING (true);
