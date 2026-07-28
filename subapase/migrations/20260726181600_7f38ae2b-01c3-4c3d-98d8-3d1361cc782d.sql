-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- roles enum
CREATE TYPE public.app_role AS ENUM ('dono', 'profissional', 'recepcao');

-- salons
CREATE TABLE public.salons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  business_type text,
  owner_name text,
  address text,
  phone text,
  whatsapp text,
  instagram text,
  slug text NOT NULL UNIQUE,
  brand_color text NOT NULL DEFAULT '#d94f80',
  logo_url text,
  public_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.salon_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (salon_id, user_id)
);

CREATE TABLE public.member_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (salon_id, user_id, role)
);

CREATE OR REPLACE FUNCTION public.is_salon_member(_salon_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.salon_members WHERE salon_id = _salon_id AND user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.has_role(_salon_id uuid, _user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.member_roles WHERE salon_id = _salon_id AND user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.salon_is_public(_salon_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.salons WHERE id = _salon_id AND public_enabled);
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.salons TO authenticated;
GRANT SELECT ON public.salons TO anon;
GRANT ALL ON public.salons TO service_role;
ALTER TABLE public.salons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read salon" ON public.salons FOR SELECT TO authenticated USING (public.is_salon_member(id, auth.uid()));
CREATE POLICY "public read active salon" ON public.salons FOR SELECT TO anon USING (public_enabled);
CREATE POLICY "owner creates salon" ON public.salons FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner updates salon" ON public.salons FOR UPDATE TO authenticated USING (public.has_role(id, auth.uid(), 'dono')) WITH CHECK (public.has_role(id, auth.uid(), 'dono'));
CREATE POLICY "owner deletes salon" ON public.salons FOR DELETE TO authenticated USING (owner_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.salon_members TO authenticated;
GRANT ALL ON public.salon_members TO service_role;
ALTER TABLE public.salon_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read members" ON public.salon_members FOR SELECT TO authenticated USING (public.is_salon_member(salon_id, auth.uid()));
CREATE POLICY "self join" ON public.salon_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "owner manages members" ON public.salon_members FOR DELETE TO authenticated USING (public.has_role(salon_id, auth.uid(), 'dono'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_roles TO authenticated;
GRANT ALL ON public.member_roles TO service_role;
ALTER TABLE public.member_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read roles" ON public.member_roles FOR SELECT TO authenticated USING (public.is_salon_member(salon_id, auth.uid()));
CREATE POLICY "owner writes roles" ON public.member_roles FOR ALL TO authenticated
  USING (public.has_role(salon_id, auth.uid(), 'dono'))
  WITH CHECK (public.has_role(salon_id, auth.uid(), 'dono'));

CREATE TABLE public.salon_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'profissional',
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (salon_id, email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salon_invites TO authenticated;
GRANT ALL ON public.salon_invites TO service_role;
ALTER TABLE public.salon_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read invites" ON public.salon_invites FOR SELECT TO authenticated USING (public.is_salon_member(salon_id, auth.uid()));
CREATE POLICY "owner writes invites" ON public.salon_invites FOR ALL TO authenticated
  USING (public.has_role(salon_id, auth.uid(), 'dono'))
  WITH CHECK (public.has_role(salon_id, auth.uid(), 'dono'));

CREATE TABLE public.business_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  weekday smallint NOT NULL,
  open_time text,
  close_time text,
  closed boolean NOT NULL DEFAULT false,
  UNIQUE (salon_id, weekday)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_hours TO authenticated;
GRANT SELECT ON public.business_hours TO anon;
GRANT ALL ON public.business_hours TO service_role;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read hours" ON public.business_hours FOR SELECT TO authenticated USING (public.is_salon_member(salon_id, auth.uid()));
CREATE POLICY "public read hours" ON public.business_hours FOR SELECT TO anon USING (public.salon_is_public(salon_id));
CREATE POLICY "owner writes hours" ON public.business_hours FOR ALL TO authenticated
  USING (public.has_role(salon_id, auth.uid(), 'dono'))
  WITH CHECK (public.has_role(salon_id, auth.uid(), 'dono'));

CREATE TABLE public.professionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  user_id uuid,
  name text NOT NULL,
  role text,
  initials text,
  days text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professionals TO authenticated;
GRANT SELECT ON public.professionals TO anon;
GRANT ALL ON public.professionals TO service_role;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read pros" ON public.professionals FOR SELECT TO authenticated USING (public.is_salon_member(salon_id, auth.uid()));
CREATE POLICY "public read pros" ON public.professionals FOR SELECT TO anon USING (active AND public.salon_is_public(salon_id));
CREATE POLICY "staff writes pros" ON public.professionals FOR ALL TO authenticated
  USING (public.has_role(salon_id, auth.uid(), 'dono'))
  WITH CHECK (public.has_role(salon_id, auth.uid(), 'dono'));

CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  professional_id uuid REFERENCES public.professionals(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  duration integer NOT NULL DEFAULT 60,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT SELECT ON public.services TO anon;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read services" ON public.services FOR SELECT TO authenticated USING (public.is_salon_member(salon_id, auth.uid()));
CREATE POLICY "public read services" ON public.services FOR SELECT TO anon USING (active AND public.salon_is_public(salon_id));
CREATE POLICY "staff writes services" ON public.services FOR ALL TO authenticated
  USING (public.has_role(salon_id, auth.uid(), 'dono'))
  WITH CHECK (public.has_role(salon_id, auth.uid(), 'dono'));

CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (salon_id, phone)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read clients" ON public.clients FOR SELECT TO authenticated USING (public.is_salon_member(salon_id, auth.uid()));
CREATE POLICY "members write clients" ON public.clients FOR ALL TO authenticated
  USING (public.is_salon_member(salon_id, auth.uid()))
  WITH CHECK (public.is_salon_member(salon_id, auth.uid()));

CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id uuid NOT NULL REFERENCES public.salons(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  client_phone text,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  service_name text NOT NULL,
  professional_id uuid REFERENCES public.professionals(id) ON DELETE SET NULL,
  professional_name text,
  date date NOT NULL,
  time text NOT NULL,
  duration integer NOT NULL DEFAULT 60,
  price numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'agendado',
  source text NOT NULL DEFAULT 'interno',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX appointments_salon_date_idx ON public.appointments (salon_id, date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read appointments" ON public.appointments FOR SELECT TO authenticated USING (public.is_salon_member(salon_id, auth.uid()));
CREATE POLICY "members write appointments" ON public.appointments FOR ALL TO authenticated
  USING (public.is_salon_member(salon_id, auth.uid()))
  WITH CHECK (public.is_salon_member(salon_id, auth.uid()));