CREATE TABLE IF NOT EXISTS public.financial_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  category text NOT NULL,
  amount numeric NOT NULL,
  currency text DEFAULT 'SEK',
  description text,
  parcel_id uuid REFERENCES public.parcels(id) ON DELETE SET NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  receipt_url text,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_financial_entries_user ON public.financial_entries(user_id, date DESC);
CREATE INDEX idx_financial_entries_type ON public.financial_entries(user_id, type);

ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own entries" ON public.financial_entries FOR ALL USING (auth.uid() = user_id);
