
-- Enums
CREATE TYPE public.estado_empleado AS ENUM ('Activo', 'Licencia', 'Baja');
CREATE TYPE public.tipo_evento_legajo AS ENUM ('ingreso', 'promocion', 'sancion', 'licencia', 'cambio');

-- Empresas
CREATE TABLE public.empresas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  cuit TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read empresas" ON public.empresas FOR SELECT TO authenticated USING (true);

-- Sucursales
CREATE TABLE public.sucursales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  direccion TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sucursales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read sucursales" ON public.sucursales FOR SELECT TO authenticated USING (true);

-- Empleados
CREATE TABLE public.empleados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  legajo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  dni TEXT NOT NULL,
  cuil TEXT NOT NULL,
  puesto TEXT NOT NULL,
  categoria TEXT,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  sucursal_id UUID NOT NULL REFERENCES public.sucursales(id) ON DELETE RESTRICT,
  fecha_ingreso DATE NOT NULL,
  cct TEXT,
  estado public.estado_empleado NOT NULL DEFAULT 'Activo',
  email TEXT,
  telefono TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.empleados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read empleados" ON public.empleados FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert empleados" ON public.empleados FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update empleados" ON public.empleados FOR UPDATE TO authenticated USING (true);

-- Eventos Legajo
CREATE TABLE public.eventos_legajo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  tipo public.tipo_evento_legajo NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.eventos_legajo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read eventos" ON public.eventos_legajo FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert eventos" ON public.eventos_legajo FOR INSERT TO authenticated WITH CHECK (true);

-- Documentos Legajo
CREATE TABLE public.documentos_legajo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  nombre_archivo TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  tamano TEXT,
  tipo_documento TEXT,
  fecha_vencimiento DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.documentos_legajo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read documentos" ON public.documentos_legajo FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert documentos" ON public.documentos_legajo FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete documentos" ON public.documentos_legajo FOR DELETE TO authenticated USING (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_empleados_updated_at
  BEFORE UPDATE ON public.empleados
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos-legajo', 'documentos-legajo', false);

CREATE POLICY "Authenticated users can upload docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documentos-legajo');
CREATE POLICY "Authenticated users can read docs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documentos-legajo');
CREATE POLICY "Authenticated users can delete docs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'documentos-legajo');
