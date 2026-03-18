-- Migration: Create timber_prices table for real-time price scraping cache
-- Run with: supabase db push or apply manually

CREATE TABLE IF NOT EXISTS timber_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer text NOT NULL,
  assortment text NOT NULL,
  price_sek_per_m3fub numeric NOT NULL,
  region text NOT NULL DEFAULT 'Gotaland',
  valid_from date NOT NULL,
  valid_to date,
  source_url text,
  is_estimated boolean DEFAULT false,
  fetched_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(buyer, assortment, region, valid_from)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_timber_prices_buyer ON timber_prices(buyer);
CREATE INDEX IF NOT EXISTS idx_timber_prices_assortment ON timber_prices(assortment);
CREATE INDEX IF NOT EXISTS idx_timber_prices_fetched ON timber_prices(fetched_at);
CREATE INDEX IF NOT EXISTS idx_timber_prices_region ON timber_prices(region);

-- RLS: Allow authenticated users to read prices (public data)
ALTER TABLE timber_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read timber prices"
  ON timber_prices FOR SELECT
  USING (true);

-- Only service role can insert/update (Edge Function uses service key)
CREATE POLICY "Service role can manage timber prices"
  ON timber_prices FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Comment for documentation
COMMENT ON TABLE timber_prices IS 'Cached timber prices scraped from major Swedish buyers. Refreshed every 24h by the timber-prices Edge Function.';
COMMENT ON COLUMN timber_prices.buyer IS 'Buyer name: Sodra, SCA, Holmen, Stora Enso, Sveaskog, Vida, Setra, Moelven, Skogsstyrelsen';
COMMENT ON COLUMN timber_prices.assortment IS 'Timber assortment: Talltimmer, Grantimmer, Massaved tall, Massaved gran, Bjorkmassa';
COMMENT ON COLUMN timber_prices.price_sek_per_m3fub IS 'Price in SEK per cubic metre solid under bark (m3fub)';
COMMENT ON COLUMN timber_prices.region IS 'Price region: Gotaland, Svealand, Norrland, Hela Sverige';
COMMENT ON COLUMN timber_prices.is_estimated IS 'True if price is from fallback demo data rather than live scrape';
