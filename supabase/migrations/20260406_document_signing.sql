CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('timber_contract', 'insurance_policy', 'lease_agreement', 'harvest_plan', 'regulatory_filing', 'survey_report', 'other')),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'pending_signature', 'signed', 'countersigned', 'expired', 'voided')),
  file_url text,
  file_size integer,
  content_hash text,

  -- Signing parties
  signers jsonb DEFAULT '[]',
  -- Each signer: { name, email, role, status: 'pending'|'signed'|'declined', signed_at, ip_address }

  -- Metadata
  parcel_id uuid REFERENCES public.parcels(id) ON DELETE SET NULL,
  related_transaction_id uuid,
  expires_at timestamptz,
  notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.document_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  actor_email text NOT NULL,
  action text NOT NULL,
  ip_address text,
  user_agent text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_documents_user ON public.documents(user_id);
CREATE INDEX idx_documents_status ON public.documents(status);
CREATE INDEX idx_document_audit ON public.document_audit_log(document_id);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own documents" ON public.documents FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users view own doc audit" ON public.document_audit_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.user_id = auth.uid())
);
