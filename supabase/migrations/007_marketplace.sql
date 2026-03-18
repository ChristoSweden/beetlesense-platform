-- ============================================================
-- BeetleSense.ai — Marketplace
-- 007_marketplace.sql
-- Listings for forestry services (drone surveys, harvesting,
-- consulting), bookings, and reviews.
-- ============================================================

SET search_path TO public, extensions;

-- ────────────────────────────────────────────────────────────
-- 1. Marketplace Listings
--    Service providers list their offerings.
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.marketplace_listings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id),
  title           text NOT NULL,
  description     text NOT NULL,
  category        text NOT NULL CHECK (category IN ('drone_survey', 'harvesting', 'planting', 'inspection', 'consulting', 'transport', 'other')),
  subcategory     text,
  price_type      text NOT NULL DEFAULT 'fixed' CHECK (price_type IN ('fixed', 'hourly', 'per_hectare', 'quote')),
  price_amount    numeric,                                       -- NULL for 'quote' type
  currency        text NOT NULL DEFAULT 'SEK',
  coverage_area   geometry(Polygon, 4326),                       -- Geographic service area
  county          text,
  municipality    text,
  image_urls      text[] DEFAULT '{}',
  tags            text[] DEFAULT '{}',
  is_active       boolean NOT NULL DEFAULT true,
  rating_avg      numeric DEFAULT 0,
  review_count    integer DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_provider ON public.marketplace_listings(provider_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_category ON public.marketplace_listings(category, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_county   ON public.marketplace_listings(county) WHERE county IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_coverage ON public.marketplace_listings USING gist (coverage_area) WHERE coverage_area IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_tags     ON public.marketplace_listings USING gin (tags);

CREATE TRIGGER set_marketplace_listings_updated_at
  BEFORE UPDATE ON public.marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ────────────────────────────────────────────────────────────
-- 2. Bookings
--    Forest owners book services from marketplace listings.
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.marketplace_bookings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      uuid NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  customer_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_id     uuid NOT NULL REFERENCES public.profiles(id),
  parcel_id       uuid REFERENCES public.parcels(id),
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'disputed')),
  scheduled_date  date,
  scheduled_time  time,
  notes           text,
  total_price     numeric,
  currency        text NOT NULL DEFAULT 'SEK',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_bookings_customer ON public.marketplace_bookings(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_bookings_provider ON public.marketplace_bookings(provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_bookings_listing  ON public.marketplace_bookings(listing_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_bookings_status   ON public.marketplace_bookings(status);

CREATE TRIGGER set_marketplace_bookings_updated_at
  BEFORE UPDATE ON public.marketplace_bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ────────────────────────────────────────────────────────────
-- 3. Reviews
--    Post-booking reviews from customers.
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.marketplace_reviews (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  uuid NOT NULL REFERENCES public.marketplace_bookings(id) ON DELETE CASCADE,
  listing_id  uuid NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.profiles(id),
  rating      integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title       text,
  body        text,
  is_hidden   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(booking_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_listing  ON public.marketplace_reviews(listing_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_provider ON public.marketplace_reviews(provider_id);

CREATE TRIGGER set_marketplace_reviews_updated_at
  BEFORE UPDATE ON public.marketplace_reviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-update listing rating_avg and review_count
CREATE OR REPLACE FUNCTION public.update_listing_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.marketplace_listings
  SET
    rating_avg = (SELECT COALESCE(AVG(rating), 0) FROM public.marketplace_reviews WHERE listing_id = COALESCE(NEW.listing_id, OLD.listing_id) AND is_hidden = false),
    review_count = (SELECT COUNT(*) FROM public.marketplace_reviews WHERE listing_id = COALESCE(NEW.listing_id, OLD.listing_id) AND is_hidden = false)
  WHERE id = COALESCE(NEW.listing_id, OLD.listing_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_marketplace_reviews_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.marketplace_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_listing_rating();

-- ────────────────────────────────────────────────────────────
-- 4. RLS Policies
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_reviews  ENABLE ROW LEVEL SECURITY;

-- Listings: all authenticated users can browse active listings
CREATE POLICY "marketplace_listings_select" ON public.marketplace_listings
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Listings: providers can see all their own listings (including inactive)
CREATE POLICY "marketplace_listings_select_own" ON public.marketplace_listings
  FOR SELECT TO authenticated
  USING (provider_id = auth.uid());

-- Listings: providers can create listings
CREATE POLICY "marketplace_listings_insert" ON public.marketplace_listings
  FOR INSERT TO authenticated
  WITH CHECK (provider_id = auth.uid());

-- Listings: providers can update their own listings
CREATE POLICY "marketplace_listings_update_own" ON public.marketplace_listings
  FOR UPDATE TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- Bookings: customers and providers can see their own bookings
CREATE POLICY "marketplace_bookings_select" ON public.marketplace_bookings
  FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR provider_id = auth.uid());

-- Bookings: authenticated users can create bookings
CREATE POLICY "marketplace_bookings_insert" ON public.marketplace_bookings
  FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid());

-- Bookings: involved parties can update bookings
CREATE POLICY "marketplace_bookings_update" ON public.marketplace_bookings
  FOR UPDATE TO authenticated
  USING (customer_id = auth.uid() OR provider_id = auth.uid())
  WITH CHECK (customer_id = auth.uid() OR provider_id = auth.uid());

-- Reviews: all authenticated users can read non-hidden reviews
CREATE POLICY "marketplace_reviews_select" ON public.marketplace_reviews
  FOR SELECT TO authenticated
  USING (is_hidden = false);

-- Reviews: customers can create reviews for their bookings
CREATE POLICY "marketplace_reviews_insert" ON public.marketplace_reviews
  FOR INSERT TO authenticated
  WITH CHECK (reviewer_id = auth.uid());

-- Reviews: reviewers can update their own reviews
CREATE POLICY "marketplace_reviews_update_own" ON public.marketplace_reviews
  FOR UPDATE TO authenticated
  USING (reviewer_id = auth.uid())
  WITH CHECK (reviewer_id = auth.uid());
