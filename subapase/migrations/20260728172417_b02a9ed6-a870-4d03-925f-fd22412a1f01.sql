INSERT INTO public.subscriptions (salon_id, status, plan, price_cents, currency, trial_started_at, trial_ends_at)
SELECT s.id, 'trialing', 'pro', 9700, 'BRL', s.created_at, s.created_at + interval '7 days'
FROM public.salons s
LEFT JOIN public.subscriptions sub ON sub.salon_id = s.id
WHERE sub.id IS NULL;

CREATE OR REPLACE FUNCTION public.salon_access_status(_salon_id uuid)
 RETURNS TABLE(status text, days_left integer, trial_ends_at timestamp with time zone, blocked boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  s public.subscriptions%ROWTYPE;
  computed text;
  remaining integer;
  fallback_ends timestamptz;
BEGIN
  SELECT * INTO s FROM public.subscriptions WHERE salon_id = _salon_id;
  IF NOT FOUND THEN
    SELECT created_at + interval '7 days' INTO fallback_ends FROM public.salons WHERE id = _salon_id;
    IF fallback_ends IS NULL THEN
      RETURN QUERY SELECT 'expired'::text, 0, NULL::timestamptz, true;
      RETURN;
    END IF;
    remaining := GREATEST(0, CEIL(EXTRACT(EPOCH FROM (fallback_ends - now())) / 86400.0)::int);
    IF now() >= fallback_ends THEN
      RETURN QUERY SELECT 'expired'::text, 0, fallback_ends, true;
    ELSIF remaining <= 3 THEN
      RETURN QUERY SELECT 'trial_expiring'::text, remaining, fallback_ends, false;
    ELSE
      RETURN QUERY SELECT 'trial'::text, remaining, fallback_ends, false;
    END IF;
    RETURN;
  END IF;

  remaining := GREATEST(0, CEIL(EXTRACT(EPOCH FROM (s.trial_ends_at - now())) / 86400.0)::int);

  IF s.status = 'active' THEN
    computed := 'active';
  ELSIF s.status = 'canceled' AND s.next_billing_date IS NOT NULL AND s.next_billing_date > now() THEN
    computed := 'canceled';
  ELSIF s.status = 'canceled' THEN
    computed := 'expired';
  ELSIF now() >= s.trial_ends_at THEN
    computed := 'expired';
  ELSIF remaining <= 3 THEN
    computed := 'trial_expiring';
  ELSE
    computed := 'trial';
  END IF;

  RETURN QUERY SELECT computed, remaining, s.trial_ends_at, (computed = 'expired');
END;
$function$;