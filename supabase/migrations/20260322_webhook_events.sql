-- Webhook event deduplication table for idempotent Stripe webhook processing.
-- Prevents duplicate subscription updates when Stripe retries events.

CREATE TABLE IF NOT EXISTS webhook_events (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  stripe_event_id text NOT NULL UNIQUE,
  event_type    text NOT NULL,
  processed_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups by Stripe event ID
CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_id
  ON webhook_events (stripe_event_id);

-- Auto-cleanup: events older than 30 days are safe to remove.
-- Run periodically via pg_cron or a scheduled function.
COMMENT ON TABLE webhook_events IS
  'Stripe webhook deduplication. Safe to prune rows older than 30 days.';
