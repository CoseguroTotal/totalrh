REVOKE EXECUTE ON FUNCTION public.get_users_with_roles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_users_with_roles() TO authenticated;