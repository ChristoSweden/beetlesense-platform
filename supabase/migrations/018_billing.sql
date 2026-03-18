-- ============================================================
-- BeetleSense.ai — Billing & Subscription Schema
-- 018_billing.sql
-- Tables: subscriptions, usage_stats, invoices, plan_limits
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Subscriptions
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_customer_id     text,
  stripe_subscription_id text,
  plan                   text        NOT NULL DEFAULT 'gratis'
                                     CHECK (plan IN ('gratis', 'pro', 'enterprise')),
  status                 text        NOT NULL DEFAULT 'active'
                                     CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing', 'cancelling')),
  billing_cycle          text        NOT NULL DEFAULT 'monthly'
                                     CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  payment_method         jsonb,      -- {brand, last4, exp_month, exp_year}
  cancel_at_period_end   boolean     NOT NULL DEFAULT false,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id            ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan               ON public.subscriptions(plan);

CREATE TRIGGER set_updated_at_subscriptions
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ────────────────────────────────────────────────────────────
-- 2. Usage Stats
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.usage_stats (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parcels_used        integer     NOT NULL DEFAULT 0,
  api_calls           integer     NOT NULL DEFAULT 0,
  storage_mb          real        NOT NULL DEFAULT 0,
  surveys_this_month  integer     NOT NULL DEFAULT 0,
  drone_minutes_used  real        NOT NULL DEFAULT 0,
  period_start        timestamptz NOT NULL DEFAULT date_trunc('month', now()),
  period_end          timestamptz NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_usage_stats_user_id ON public.usage_stats(user_id);

CREATE TRIGGER set_updated_at_usage_stats
  BEFORE UPDATE ON public.usage_stats
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ────────────────────────────────────────────────────────────
-- 3. Invoices
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.invoices (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_invoice_id  text,
  date               timestamptz NOT NULL DEFAULT now(),
  amount             integer     NOT NULL DEFAULT 0,   -- amount in ore (1/100 SEK)
  currency           text        NOT NULL DEFAULT 'sek',
  status             text        NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('paid', 'pending', 'failed', 'refunded')),
  pdf_url            text,
  description        text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date    ON public.invoices(user_id, date DESC);

-- ────────────────────────────────────────────────────────────
-- 4. Plan Limits (reference table)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.plan_limits (
  plan                  text    PRIMARY KEY CHECK (plan IN ('gratis', 'pro', 'enterprise')),
  max_parcels           integer NOT NULL,
  max_surveys_per_month integer NOT NULL,
  max_storage_mb        integer NOT NULL,
  max_api_calls         integer NOT NULL,
  features              text[]  NOT NULL DEFAULT '{}'
);

-- Seed plan limits
INSERT INTO public.plan_limits (plan, max_parcels, max_surveys_per_month, max_storage_mb, max_api_calls, features)
VALUES
  ('gratis',     3,    5,     500,   1000,  ARRAY[
    'Satellitovervakning',
    'Grundlaggande AI-analys',
    'Community-atkomst'
  ]),
  ('pro',        -1,   50,    51200, 50000, ARRAY[
    'Dronare + satellitovervakning',
    'Full AI-kompanjon',
    'Prioriterad support',
    'Dataexport (CSV, GeoJSON)',
    'PDF-rapporter'
  ]),
  ('enterprise', -1,   -1,    -1,    -1,    ARRAY[
    'API-atkomst',
    'Anpassade integrationer',
    'Dedikerad support',
    'SLA-garanti',
    'On-premise mojlighet'
  ])
ON CONFLICT (plan) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 5. RLS Policies
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_stats   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_limits   ENABLE ROW LEVEL SECURITY;

-- Subscriptions: users see/update only their own
CREATE POLICY "subscriptions_select_own" ON public.subscriptions FOR SELECT
  TO authenticated USING (user_id = auth.uid());
CREATE POLICY "subscriptions_insert_own" ON public.subscriptions FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "subscriptions_update_own" ON public.subscriptions FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Usage stats: users see only their own
CREATE POLICY "usage_stats_select_own" ON public.usage_stats FOR SELECT
  TO authenticated USING (user_id = auth.uid());
CREATE POLICY "usage_stats_insert_own" ON public.usage_stats FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "usage_stats_update_own" ON public.usage_stats FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Invoices: users see only their own
CREATE POLICY "invoices_select_own" ON public.invoices FOR SELECT
  TO authenticated USING (user_id = auth.uid());
CREATE POLICY "invoices_insert_own" ON public.invoices FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

-- Plan limits: readable by all authenticated users (reference data)
CREATE POLICY "plan_limits_select_all" ON public.plan_limits FOR SELECT
  TO authenticated USING (true);

-- ────────────────────────────────────────────────────────────
-- 6. Service role grants (for Edge Functions / webhooks)
-- ────────────────────────────────────────────────────────────

GRANT ALL ON public.subscriptions TO service_role;
GRANT ALL ON public.usage_stats   TO service_role;
GRANT ALL ON public.invoices      TO service_role;
GRANT ALL ON public.plan_limits   TO service_role;
