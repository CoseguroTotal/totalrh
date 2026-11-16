-- ═══════════════════════════════════════════════════════════════════
-- Memorándums: el destinatario sólo puede acusar recibo o firmar.
-- Antes podía poner cualquier estado, firmar a nombre de otra persona
-- o cambiar la fecha de firma. Ahora la firma lleva siempre su usuario
-- y la hora del servidor, y un memo firmado no vuelve atrás.
-- RRHH (is_manager) sigue pudiendo editar todo.
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.memorandums_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.emitido_por := COALESCE(NEW.emitido_por, auth.uid());
    RETURN NEW;
  END IF;
  IF NOT public.is_manager() THEN
    NEW.id := OLD.id;
    NEW.titulo := OLD.titulo;
    NEW.contenido := OLD.contenido;
    NEW.fecha := OLD.fecha;
    NEW.numero := OLD.numero;
    NEW.empresa_id := OLD.empresa_id;
    NEW.destinatario_empleado_id := OLD.destinatario_empleado_id;
    NEW.destinatario_nombre := OLD.destinatario_nombre;
    NEW.created_by := OLD.created_by;
    NEW.created_at := OLD.created_at;
    NEW.emitido_por := OLD.emitido_por;
    NEW.emisor_nombre := OLD.emisor_nombre;
    NEW.emisor_cargo := OLD.emisor_cargo;
    NEW.emisor_sector := OLD.emisor_sector;

    -- Pasos permitidos: enviado → recibido, y enviado/recibido → firmado.
    -- Cualquier otro cambio de estado se ignora (queda como estaba).
    IF NEW.estado IS DISTINCT FROM OLD.estado AND NOT (
         (OLD.estado = 'enviado' AND NEW.estado = 'recibido')
      OR (OLD.estado IN ('enviado', 'recibido') AND NEW.estado = 'firmado')
    ) THEN
      NEW.estado := OLD.estado;
    END IF;

    IF NEW.estado = 'firmado' AND OLD.estado IS DISTINCT FROM 'firmado' THEN
      -- Firma: siempre quien está logueado y la hora del servidor
      NEW.firmado_por := auth.uid();
      NEW.fecha_firma := now();
    ELSE
      NEW.firmado_por := OLD.firmado_por;
      NEW.fecha_firma := OLD.fecha_firma;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
