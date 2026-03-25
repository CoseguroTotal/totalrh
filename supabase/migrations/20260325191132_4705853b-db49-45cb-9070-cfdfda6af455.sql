
-- Function to get server time (Argentina timezone) for login time restrictions
CREATE OR REPLACE FUNCTION public.get_server_time()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_char(now() AT TIME ZONE 'America/Argentina/Buenos_Aires', 'HH24:MI')
$$;
