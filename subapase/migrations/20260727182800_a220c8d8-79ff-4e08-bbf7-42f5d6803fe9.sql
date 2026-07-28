-- =========================
-- SUBSCRIPTIONS
-- =========================
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID NOT NULL UNIQUE REFERENCES public.salons(id) ON DELETE CASCADE,
  trial_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  status TEXT NOT NULL DEFAULT 'trial',
  plan TEXT NOT NULL DEFAULT 'pro',
  price_cents INTEGER NOT NULL DEFAULT 9700,
  currency TEXT NOT NULL DEFAULT 'BRL',
  next_billing_date TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  provider TEXT,
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  payment_method_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read subscription" ON public.subscriptions
  FOR SELECT TO authenticated USING (public.is_salon_member(salon_id, auth.uid()));
CREATE POLICY "owner writes subscription" ON public.subscriptions
  FOR UPDATE TO authenticated
  USING (public.has_role(salon_id, auth.uid(), 'dono'::app_role))
  WITH CHECK (public.has_role(salon_id, auth.uid(), 'dono'::app_role));

-- =========================
-- PAYMENTS
-- =========================
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'pago',
  description TEXT,
  provider TEXT,
  provider_payment_id TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read payments" ON public.payments
  FOR SELECT TO authenticated USING (public.is_salon_member(salon_id, auth.uid()));

-- =========================
-- NOTIFICATIONS
-- =========================
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX notifications_salon_created_idx ON public.notifications (salon_id, created_at DESC);

GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read notifications" ON public.notifications
  FOR SELECT TO authenticated USING (public.is_salon_member(salon_id, auth.uid()));
CREATE POLICY "members update notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (public.is_salon_member(salon_id, auth.uid()))
  WITH CHECK (public.is_salon_member(salon_id, auth.uid()));
CREATE POLICY "members delete notifications" ON public.notifications
  FOR DELETE TO authenticated USING (public.is_salon_member(salon_id, auth.uid()));

-- =========================
-- PROFESSIONAL <-> SERVICES
-- =========================
CREATE TABLE public.professional_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (professional_id, service_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.professional_services TO authenticated;
GRANT SELECT ON public.professional_services TO anon;
GRANT ALL ON public.professional_services TO service_role;
ALTER TABLE public.professional_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read professional services" ON public.professional_services
  FOR SELECT TO authenticated USING (public.is_salon_member(salon_id, auth.uid()));
CREATE POLICY "staff writes professional services" ON public.professional_services
  FOR ALL TO authenticated
  USING (public.has_role(salon_id, auth.uid(), 'dono'::app_role))
  WITH CHECK (public.has_role(salon_id, auth.uid(), 'dono'::app_role));
CREATE POLICY "public read professional services" ON public.professional_services
  FOR SELECT TO anon USING (public.salon_is_public(salon_id));

-- =========================
-- EXTRA COLUMNS
-- =========================
ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS cover_url TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS accent_color TEXT NOT NULL DEFAULT '#3b2a44';

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS start_time TEXT,
  ADD COLUMN IF NOT EXISTS end_time TEXT,
  ADD COLUMN IF NOT EXISTS break_start TEXT,
  ADD COLUMN IF NOT EXISTS break_end TEXT;

-- =========================
-- ACCESS STATUS FUNCTION
-- =========================
CREATE OR REPLACE FUNCTION public.salon_access_status(_salon_id uuid)
RETURNS TABLE (status text, days_left integer, trial_ends_at timestamptz, blocked boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.subscriptions%ROWTYPE;
  computed text;
  remaining integer;
BEGIN
  SELECT * INTO s FROM public.subscriptions WHERE salon_id = _salon_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'expired'::text, 0, NULL::timestamptz, true;
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
$$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER subscriptions_touch_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
