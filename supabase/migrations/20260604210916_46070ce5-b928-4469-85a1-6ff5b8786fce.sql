
-- PROMOTIONS
CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('buy_2_get_1_free','buy_1_get_half_off','flat_off')),
  flat_amount numeric,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.promotions TO anon, authenticated;
GRANT ALL ON public.promotions TO service_role;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promotions public read" ON public.promotions FOR SELECT USING (true);
CREATE POLICY "promotions admin write" ON public.promotions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER promotions_touch BEFORE UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- SIGNUP REWARDS
CREATE TABLE public.signup_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  percent_off integer NOT NULL DEFAULT 20,
  used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.signup_rewards TO authenticated;
GRANT ALL ON public.signup_rewards TO service_role;
ALTER TABLE public.signup_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signup_rewards own read" ON public.signup_rewards FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- USER CARTS
CREATE TABLE public.user_carts (
  user_id uuid PRIMARY KEY,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_carts TO authenticated;
GRANT ALL ON public.user_carts TO service_role;
ALTER TABLE public.user_carts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_carts own" ON public.user_carts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER user_carts_touch BEFORE UPDATE ON public.user_carts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Update handle_new_user to also create a signup reward
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  reward_code text;
BEGIN
  INSERT INTO public.profiles(id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;

  reward_code := 'WELCOME20-' || upper(substr(replace(NEW.id::text,'-',''), 1, 8));
  INSERT INTO public.signup_rewards(user_id, code, percent_off, expires_at)
  VALUES (NEW.id, reward_code, 20, now() + interval '90 days')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
