-- ═══════════════════════════════════════════════════════════════════
-- Alta de empleados desde el portal: el empleado crea su cuenta con el
-- código de la empresa, RRHH la aprueba y la vincula a un legajo.
-- Después el empleado actualiza sus datos y queda un historial de cambios.
-- También: verificación en persona del registro facial.
-- ═══════════════════════════════════════════════════════════════════

-- ── Código de registro (se comparte por WhatsApp) ──
CREATE OR REPLACE FUNCTION public.nuevo_codigo_registro()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  -- 8 caracteres sin los que se confunden (0/O, 1/I/L)
  SELECT string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '')
  FROM generate_series(1, 8)
$$;

ALTER TABLE public.configuracion_grupo
  ADD COLUMN IF NOT EXISTS registro_codigo text,
  ADD COLUMN IF NOT EXISTS registro_abierto boolean NOT NULL DEFAULT true;

UPDATE public.configuracion_grupo SET registro_codigo = public.nuevo_codigo_registro() WHERE registro_codigo IS NULL;

-- RRHH o admin abren/cierran el registro o cambian el código (la tabla sólo la edita admin)
CREATE OR REPLACE FUNCTION public.configurar_registro(_abierto boolean, _regenerar boolean)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _codigo text;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'rrhh'::app_role)) THEN
    RAISE EXCEPTION 'Sólo RRHH o administración pueden cambiar el registro' USING ERRCODE = '42501';
  END IF;
  UPDATE public.configuracion_grupo
     SET registro_abierto = _abierto,
         registro_codigo = CASE WHEN _regenerar OR registro_codigo IS NULL THEN public.nuevo_codigo_registro() ELSE registro_codigo END
   RETURNING registro_codigo INTO _codigo;
  RETURN _codigo;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.nuevo_codigo_registro() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.configurar_registro(boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.configurar_registro(boolean, boolean) TO authenticated;

-- ── Solicitudes de alta ──
-- Las crea y resuelve la edge function registro-empleado (service_role).
-- La cuenta queda suspendida hasta que RRHH la aprueba.
CREATE TABLE public.solicitudes_alta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  dni text NOT NULL,
  cuil text NOT NULL,
  nombre text NOT NULL,
  apellido text NOT NULL,
  fecha_nacimiento date,
  telefono text NOT NULL,
  email text NOT NULL,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL,
  sucursal_id uuid REFERENCES public.sucursales(id) ON DELETE SET NULL,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  motivo_rechazo text,
  empleado_id uuid REFERENCES public.empleados(id) ON DELETE SET NULL,
  revisado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  revisado_at timestamptz,
  consentimiento_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_solicitudes_alta_estado ON public.solicitudes_alta (estado, created_at DESC);
CREATE UNIQUE INDEX uq_solicitudes_alta_dni_pendiente ON public.solicitudes_alta (dni) WHERE estado = 'pendiente';

GRANT SELECT ON public.solicitudes_alta TO authenticated;
GRANT ALL ON public.solicitudes_alta TO service_role;
ALTER TABLE public.solicitudes_alta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Altas: RRHH y admin las ven"
ON public.solicitudes_alta FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'rrhh'::app_role));

-- Aviso a RRHH y admin cuando llega una solicitud
CREATE OR REPLACE FUNCTION public.solicitudes_alta_avisar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notificaciones (user_id, titulo, mensaje, link)
  SELECT DISTINCT ur.user_id, 'Nueva solicitud de alta',
         NEW.apellido || ', ' || NEW.nombre || ' (DNI ' || NEW.dni || ') creó su cuenta y espera aprobación.',
         '/altas'
  FROM public.user_roles ur
  WHERE ur.role IN ('admin', 'rrhh');
  RETURN NEW;
END;
$$;

CREATE TRIGGER solicitudes_alta_avisar
AFTER INSERT ON public.solicitudes_alta
FOR EACH ROW EXECUTE FUNCTION public.solicitudes_alta_avisar();

-- ── Historial de cambios del legajo ──
CREATE TABLE public.empleados_cambios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id uuid NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  campo text NOT NULL,
  valor_anterior text,
  valor_nuevo text,
  -- empleado: lo cambió el propio empleado; rrhh: alguien de gestión; sistema: altas y procesos automáticos
  origen text NOT NULL CHECK (origen IN ('empleado', 'rrhh', 'sistema')),
  cambiado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_empleados_cambios_empleado ON public.empleados_cambios (empleado_id, created_at DESC);

GRANT SELECT ON public.empleados_cambios TO authenticated;
GRANT ALL ON public.empleados_cambios TO service_role;
ALTER TABLE public.empleados_cambios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cambios: gestión y el propio empleado"
ON public.empleados_cambios FOR SELECT TO authenticated
USING (public.is_manager_or_contador() OR empleado_id = public.my_empleado_id());

-- Registra cada cambio de los datos del legajo y avisa a RRHH si lo hizo el empleado
CREATE OR REPLACE FUNCTION public.empleados_registrar_cambios()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _campos text[] := ARRAY[
    'nombre', 'apellido', 'dni', 'cuil', 'fecha_nacimiento', 'email', 'telefono',
    'domicilio_calle', 'domicilio_numero', 'domicilio_piso', 'domicilio_localidad', 'domicilio_provincia', 'domicilio_cp',
    'estado_civil', 'nacionalidad', 'sexo', 'puesto', 'categoria', 'cct', 'sueldo_basico', 'estado',
    'empresa_id', 'sucursal_id', 'fecha_ingreso', 'legajo', 'user_id'
  ];
  _o jsonb := to_jsonb(OLD);
  _n jsonb := to_jsonb(NEW);
  _campo text;
  _origen text := 'sistema';
  _cambiados text[] := '{}';
BEGIN
  IF auth.uid() IS NOT NULL THEN
    _origen := 'rrhh';
    IF auth.uid() = NEW.user_id THEN
      _origen := 'empleado';
    END IF;
  END IF;

  FOREACH _campo IN ARRAY _campos LOOP
    IF (_o ->> _campo) IS DISTINCT FROM (_n ->> _campo) THEN
      INSERT INTO public.empleados_cambios (empleado_id, campo, valor_anterior, valor_nuevo, origen, cambiado_por)
      VALUES (NEW.id, _campo, _o ->> _campo, _n ->> _campo, _origen, auth.uid());
      _cambiados := _cambiados || _campo;
    END IF;
  END LOOP;

  IF _origen = 'empleado' AND cardinality(_cambiados) > 0 THEN
    INSERT INTO public.notificaciones (user_id, titulo, mensaje, link)
    SELECT DISTINCT ur.user_id, 'Datos actualizados por el empleado',
           NEW.apellido || ', ' || NEW.nombre || ' actualizó: ' || replace(array_to_string(_cambiados, ', '), '_', ' '),
           '/legajos/' || NEW.id
    FROM public.user_roles ur
    WHERE ur.role IN ('admin', 'rrhh');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER empleados_registrar_cambios
AFTER UPDATE ON public.empleados
FOR EACH ROW EXECUTE FUNCTION public.empleados_registrar_cambios();

-- El empleado actualiza sus datos de contacto y personales (no los de identidad ni laborales)
CREATE OR REPLACE FUNCTION public.actualizar_mis_datos(_datos jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid := public.my_empleado_id();
  _email text := lower(trim(coalesce(_datos ->> 'email', '')));
BEGIN
  IF _id IS NULL THEN
    RAISE EXCEPTION 'Tu usuario no está vinculado a un legajo' USING ERRCODE = '42501';
  END IF;
  IF _email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' THEN
    RAISE EXCEPTION 'Ingresá un email válido: ahí te llegan los memorándums y las firmas';
  END IF;
  IF char_length(trim(coalesce(_datos ->> 'telefono', ''))) < 6 THEN
    RAISE EXCEPTION 'Ingresá un teléfono válido';
  END IF;

  UPDATE public.empleados SET
    email = _email,
    telefono = trim(_datos ->> 'telefono'),
    domicilio_calle = nullif(trim(coalesce(_datos ->> 'domicilio_calle', '')), ''),
    domicilio_numero = nullif(trim(coalesce(_datos ->> 'domicilio_numero', '')), ''),
    domicilio_piso = nullif(trim(coalesce(_datos ->> 'domicilio_piso', '')), ''),
    domicilio_localidad = nullif(trim(coalesce(_datos ->> 'domicilio_localidad', '')), ''),
    domicilio_provincia = nullif(trim(coalesce(_datos ->> 'domicilio_provincia', '')), ''),
    domicilio_cp = nullif(trim(coalesce(_datos ->> 'domicilio_cp', '')), ''),
    estado_civil = nullif(trim(coalesce(_datos ->> 'estado_civil', '')), ''),
    nacionalidad = nullif(trim(coalesce(_datos ->> 'nacionalidad', '')), '')
  WHERE id = _id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.actualizar_mis_datos(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.actualizar_mis_datos(jsonb) TO authenticated;

-- ── Verificación en persona del registro facial ──
-- Si el empleado registra su rostro desde el celular, RRHH lo verifica frente a la cámara
-- antes de que la terminal lo acepte. Si lo registra RRHH, ya queda verificado.
ALTER TABLE public.rostros_empleados
  ADD COLUMN IF NOT EXISTS verificado_at timestamptz,
  ADD COLUMN IF NOT EXISTS verificado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Los registros existentes ya se hicieron con RRHH o en la terminal
UPDATE public.rostros_empleados SET verificado_at = coalesce(updated_at, now()) WHERE verificado_at IS NULL;

GRANT SELECT (verificado_at, verificado_por) ON public.rostros_empleados TO authenticated;
