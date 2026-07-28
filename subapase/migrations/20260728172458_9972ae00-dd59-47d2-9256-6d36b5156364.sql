REVOKE ALL ON FUNCTION public.salon_access_status(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.salon_access_status(uuid) TO service_role;