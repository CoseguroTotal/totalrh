CREATE OR REPLACE FUNCTION public.sanciones_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_manager() THEN
    RETURN NEW;
  END IF;
  IF OLD.descargo_cerrado IS TRUE THEN
    RAISE EXCEPTION 'El descargo de esta sanción ya está cerrado' USING ERRCODE = '42501';
  END IF;
  NEW.id := OLD.id;
  NEW.empleado_id := OLD.empleado_id;
  NEW.tipo := OLD.tipo;
  NEW.motivo := OLD.motivo;
  NEW.descripcion := OLD.descripcion;
  NEW.fecha := OLD.fecha;
  NEW.emitido_por := OLD.emitido_por;
  NEW.descargo_cerrado := OLD.descargo_cerrado;
  NEW.created_at := OLD.created_at;
  IF NEW.descargo_texto IS DISTINCT FROM OLD.descargo_texto
     OR NEW.descargo_documento_url IS DISTINCT FROM OLD.descargo_documento_url THEN
    NEW.descargo_fecha := now();
  ELSE
    NEW.descargo_fecha := OLD.descargo_fecha;
  END IF;
  RETURN NEW;
END;
$$;