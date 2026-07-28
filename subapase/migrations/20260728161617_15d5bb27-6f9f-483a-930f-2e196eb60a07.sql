DROP POLICY IF EXISTS "public read active salon" ON public.salons;
REVOKE SELECT ON public.salons FROM anon;
REVOKE ALL ON public.salon_invites FROM anon;