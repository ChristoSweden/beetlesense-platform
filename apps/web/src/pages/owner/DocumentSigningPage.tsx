import { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  FileSignature,
  Plus,
  Search,
  Filter,
  ChevronRight,
  ChevronDown,
  Upload,
  Trash2,
  Send,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Eye,
  FileText,
  Users,
  X,
  Loader2,
  Shield,
  Calendar,
} from 'lucide-react';
import { useToast } from '@/components/common/Toast';
import { isDemo } from '@/lib/demoData';

// ─── Types ───

interface Signer {
  name: string;
  email: string;
  role: string;
  status: 'pending' | 'signed' | 'declined';
  signed_at?: string;
  ip_address?: string;
}

interface SigningDocument {
  id: string;
  title: string;
  type: DocumentType;
  status: DocumentStatus;
  signers: Signer[];
  file_url?: string;
  file_size?: number;
  content_hash?: string;
  parcel_id?: string;
  expires_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  audit_log: AuditEntry[];
}

interface AuditEntry {
  id: string;
  actor_email: string;
  action: string;
  ip_address?: string;
  user_agent?: string;
  details?: Record<string, unknown>;
  created_at: string;
}

type DocumentType = 'timber_contract' | 'insurance_policy' | 'lease_agreement' | 'harvest_plan' | 'regulatory_filing' | 'survey_report' | 'other';
type DocumentStatus = 'draft' | 'pending_signature' | 'signed' | 'countersigned' | 'expired' | 'voided';

// ─── Constants ───

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  timber_contract: 'Timber Contract',
  insurance_policy: 'Insurance Policy',
  lease_agreement: 'Lease Agreement',
  harvest_plan: 'Harvest Plan',
  regulatory_filing: 'Regulatory Filing',
  survey_report: 'Survey Report',
  other: 'Other',
};

const DOC_TYPE_ICONS: Record<DocumentType, string> = {
  timber_contract: '\uD83E\uDE93',
  insurance_policy: '\uD83D\uDEE1\uFE0F',
  lease_agreement: '\uD83C\uDFE0',
  harvest_plan: '\uD83C\uDF32',
  regulatory_filing: '\uD83D\uDCCB',
  survey_report: '\uD83D\uDDFA\uFE0F',
  other: '\uD83D\uDCC4',
};

const STATUS_CONFIG: Record<DocumentStatus, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: '#6b7280', bg: '#6b728015' },
  pending_signature: { label: 'Pending Signature', color: '#d97706', bg: '#d9770615' },
  signed: { label: 'Signed', color: '#16a34a', bg: '#16a34a15' },
  countersigned: { label: 'Countersigned', color: '#059669', bg: '#05966915' },
  expired: { label: 'Expired', color: '#ef4444', bg: '#ef444415' },
  voided: { label: 'Voided', color: '#6b7280', bg: '#6b728015' },
};

// ─── Demo data ───

const DEMO_DOCUMENTS: SigningDocument[] = [
  {
    id: 'doc-1',
    title: 'Pine Timber Sale Agreement - Norr\u00e5ker',
    type: 'timber_contract',
    status: 'pending_signature',
    signers: [
      { name: 'Erik Lindqvist', email: 'erik@forestowner.se', role: 'Seller', status: 'signed', signed_at: '2026-04-02T14:30:00Z', ip_address: '81.234.12.45' },
      { name: 'Svens Timber AB', email: 'contracts@svenstimber.se', role: 'Buyer', status: 'pending' },
      { name: 'Anna Bergstr\u00f6m', email: 'anna@witness.se', role: 'Witness', status: 'pending' },
    ],
    file_url: '/documents/pine-sale-2026.pdf',
    file_size: 245_000,
    expires_at: '2026-05-06T00:00:00Z',
    notes: 'Sale of 420 m\u00b3 pine from parcel Norr\u00e5ker Norra',
    created_at: '2026-04-01T10:00:00Z',
    updated_at: '2026-04-02T14:30:00Z',
    audit_log: [
      { id: 'a1', actor_email: 'erik@forestowner.se', action: 'created', created_at: '2026-04-01T10:00:00Z' },
      { id: 'a2', actor_email: 'erik@forestowner.se', action: 'sent_for_signature', created_at: '2026-04-01T10:05:00Z', details: { recipients: 3 } },
      { id: 'a3', actor_email: 'erik@forestowner.se', action: 'signed', ip_address: '81.234.12.45', user_agent: 'Chrome/124', created_at: '2026-04-02T14:30:00Z' },
    ],
  },
  {
    id: 'doc-2',
    title: 'Forest Insurance Policy 2026',
    type: 'insurance_policy',
    status: 'signed',
    signers: [
      { name: 'Erik Lindqvist', email: 'erik@forestowner.se', role: 'Policyholder', status: 'signed', signed_at: '2026-03-15T09:00:00Z' },
      { name: 'L\u00e4nsf\u00f6rs\u00e4kringar', email: 'forest@lf.se', role: 'Insurer', status: 'signed', signed_at: '2026-03-16T11:00:00Z' },
    ],
    file_size: 180_000,
    completed_at: '2026-03-16T11:00:00Z',
    created_at: '2026-03-14T08:00:00Z',
    updated_at: '2026-03-16T11:00:00Z',
    audit_log: [
      { id: 'a4', actor_email: 'erik@forestowner.se', action: 'created', created_at: '2026-03-14T08:00:00Z' },
      { id: 'a5', actor_email: 'erik@forestowner.se', action: 'signed', created_at: '2026-03-15T09:00:00Z' },
      { id: 'a6', actor_email: 'forest@lf.se', action: 'countersigned', created_at: '2026-03-16T11:00:00Z' },
    ],
  },
  {
    id: 'doc-3',
    title: 'Harvest Plan Q2 2026 - S\u00f6dra Skogen',
    type: 'harvest_plan',
    status: 'draft',
    signers: [],
    file_size: 95_000,
    created_at: '2026-04-05T16:00:00Z',
    updated_at: '2026-04-05T16:00:00Z',
    audit_log: [
      { id: 'a7', actor_email: 'erik@forestowner.se', action: 'created', created_at: '2026-04-05T16:00:00Z' },
    ],
  },
  {
    id: 'doc-4',
    title: 'EUDR Compliance Declaration',
    type: 'regulatory_filing',
    status: 'expired',
    signers: [
      { name: 'Erik Lindqvist', email: 'erik@forestowner.se', role: 'Declarant', status: 'signed', signed_at: '2026-01-10T12:00:00Z' },
    ],
    file_size: 62_000,
    expires_at: '2026-02-10T00:00:00Z',
    created_at: '2026-01-10T10:00:00Z',
    updated_at: '2026-01-10T12:00:00Z',
    completed_at: '2026-01-10T12:00:00Z',
    audit_log: [
      { id: 'a8', actor_email: 'erik@forestowner.se', action: 'created', created_at: '2026-01-10T10:00:00Z' },
      { id: 'a9', actor_email: 'erik@forestowner.se', action: 'signed', created_at: '2026-01-10T12:00:00Z' },
      { id: 'a10', actor_email: 'system', action: 'expired', created_at: '2026-02-10T00:00:01Z' },
    ],
  },
];

// ─── Helpers ───

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return iso; }
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  } catch { return iso; }
}

// ─── Sub-components ───

function StatusBadge({ status }: { status: DocumentStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase whitespace-nowrap"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}

function SignerStatusIcon({ status }: { status: Signer['status'] }) {
  if (status === 'signed') return <CheckCircle2 size={14} className="text-[#16a34a]" />;
  if (status === 'declined') return <XCircle size={14} className="text-[#ef4444]" />;
  return <Clock size={14} className="text-[#d97706]" />;
}

// ─── Wizard: Create New Document ───

type WizardStep = 'type' | 'signers' | 'review';

interface WizardData {
  title: string;
  type: DocumentType | '';
  file: File | null;
  signers: Signer[];
  expiryDays: number;
  notes: string;
  includeSelf: boolean;
}

function CreateWizard({ onClose, onCreate }: { onClose: () => void; onCreate: (doc: SigningDocument) => void }) {
  const toast = useToast();
  const [step, setStep] = useState<WizardStep>('type');
  const [sending, setSending] = useState(false);
  const [data, setData] = useState<WizardData>({
    title: '',
    type: '',
    file: null,
    signers: [{ name: '', email: '', role: '', status: 'pending' }],
    expiryDays: 30,
    notes: '',
    includeSelf: true,
  });

  const canProceedType = data.title.trim() && data.type;
  const canProceedSigners = data.signers.some(s => s.name.trim() && s.email.trim());

  function addSigner() {
    setData(d => ({ ...d, signers: [...d.signers, { name: '', email: '', role: '', status: 'pending' as const }] }));
  }

  function removeSigner(idx: number) {
    setData(d => ({ ...d, signers: d.signers.filter((_, i) => i !== idx) }));
  }

  function updateSigner(idx: number, field: keyof Signer, value: string) {
    setData(d => ({
      ...d,
      signers: d.signers.map((s, i) => i === idx ? { ...s, [field]: value } : s),
    }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      toast('File must be under 10 MB', 'error');
      return;
    }
    if (f.type !== 'application/pdf') {
      toast('Only PDF files are supported', 'error');
      return;
    }
    setData(d => ({ ...d, file: f }));
  }

  async function handleSend() {
    setSending(true);
    // Simulate network delay
    await new Promise(r => setTimeout(r, 1200));
    const now = new Date().toISOString();
    const newDoc: SigningDocument = {
      id: `doc-${Date.now()}`,
      title: data.title,
      type: data.type as DocumentType,
      status: 'pending_signature',
      signers: data.signers.filter(s => s.name.trim() && s.email.trim()),
      file_size: data.file?.size ?? 0,
      expires_at: new Date(Date.now() + data.expiryDays * 86_400_000).toISOString(),
      notes: data.notes,
      created_at: now,
      updated_at: now,
      audit_log: [
        { id: `a-${Date.now()}`, actor_email: 'you@example.com', action: 'created', created_at: now },
        { id: `a-${Date.now() + 1}`, actor_email: 'you@example.com', action: 'sent_for_signature', created_at: now, details: { recipients: data.signers.length } },
      ],
    };
    onCreate(newDoc);
    setSending(false);
    toast('Document sent for signature', 'success');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="relative w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--bg2)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <FileSignature size={18} className="text-[var(--green)]" />
            <h2 className="text-sm font-bold text-[var(--text)]">New Signing Document</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border)] bg-[var(--bg)]">
          {(['type', 'signers', 'review'] as WizardStep[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <ChevronRight size={12} className="text-[var(--text3)]" />}
              <span
                className={`text-[11px] font-semibold uppercase tracking-wider ${step === s ? 'text-[var(--green)]' : 'text-[var(--text3)]'}`}
              >
                {i + 1}. {s === 'type' ? 'Document' : s === 'signers' ? 'Signers' : 'Review'}
              </span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
          {step === 'type' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[var(--text2)] block mb-1">Document Title</label>
                <input
                  type="text"
                  value={data.title}
                  onChange={e => setData(d => ({ ...d, title: e.target.value }))}
                  placeholder="e.g. Pine Timber Sale Agreement"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-2 focus:ring-[var(--green)]/30"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text2)] block mb-2">Document Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(DOC_TYPE_LABELS) as [DocumentType, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setData(d => ({ ...d, type: key }))}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left text-sm transition-colors ${
                        data.type === key
                          ? 'border-[var(--green)] bg-[var(--green)]/5 text-[var(--text)]'
                          : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text2)] hover:border-[var(--green)]/40'
                      }`}
                    >
                      <span className="text-base">{DOC_TYPE_ICONS[key]}</span>
                      <span className="text-xs font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text2)] block mb-1">Upload PDF (max 10 MB)</label>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex items-center gap-2 px-3 py-3 rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg)] text-[var(--text3)]">
                    <Upload size={16} />
                    <span className="text-xs">
                      {data.file ? `${data.file.name} (${formatBytes(data.file.size)})` : 'Click or drag to upload'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'signers' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.includeSelf}
                    onChange={e => setData(d => ({ ...d, includeSelf: e.target.checked }))}
                    className="rounded border-[var(--border)] text-[var(--green)] focus:ring-[var(--green)]"
                  />
                  <span className="text-xs text-[var(--text2)]">Include myself as a signer</span>
                </label>
              </div>
              {data.signers.map((signer, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-[var(--text3)] uppercase">Signer {idx + 1}</span>
                    {data.signers.length > 1 && (
                      <button onClick={() => removeSigner(idx)} className="p-1 rounded text-[var(--text3)] hover:text-[#ef4444] transition-colors">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={signer.name}
                    onChange={e => updateSigner(idx, 'name', e.target.value)}
                    placeholder="Name"
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[var(--border)] bg-[var(--bg2)] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-1 focus:ring-[var(--green)]/30"
                  />
                  <input
                    type="email"
                    value={signer.email}
                    onChange={e => updateSigner(idx, 'email', e.target.value)}
                    placeholder="Email"
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[var(--border)] bg-[var(--bg2)] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-1 focus:ring-[var(--green)]/30"
                  />
                  <input
                    type="text"
                    value={signer.role}
                    onChange={e => updateSigner(idx, 'role', e.target.value)}
                    placeholder="Role (e.g. Seller, Buyer, Witness)"
                    className="w-full px-2.5 py-1.5 text-xs rounded-md border border-[var(--border)] bg-[var(--bg2)] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-1 focus:ring-[var(--green)]/30"
                  />
                </div>
              ))}
              <button
                onClick={addSigner}
                className="flex items-center gap-1.5 text-xs font-medium text-[var(--green)] hover:underline"
              >
                <Plus size={14} /> Add another signer
              </button>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{data.type ? DOC_TYPE_ICONS[data.type as DocumentType] : ''}</span>
                  <span className="text-sm font-semibold text-[var(--text)]">{data.title}</span>
                </div>
                <div className="flex flex-wrap gap-3 text-[11px] text-[var(--text3)]">
                  <span>{data.type ? DOC_TYPE_LABELS[data.type as DocumentType] : ''}</span>
                  {data.file && <span>{formatBytes(data.file.size)}</span>}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-[var(--text2)] mb-2">Signers ({data.signers.filter(s => s.name.trim()).length})</h4>
                {data.signers.filter(s => s.name.trim()).map((s, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5 text-xs text-[var(--text)]">
                    <Users size={12} className="text-[var(--text3)]" />
                    <span className="font-medium">{s.name}</span>
                    <span className="text-[var(--text3)]">{s.email}</span>
                    {s.role && <span className="text-[var(--text3)]">({s.role})</span>}
                  </div>
                ))}
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text2)] block mb-1">Expires in</label>
                <select
                  value={data.expiryDays}
                  onChange={e => setData(d => ({ ...d, expiryDays: Number(e.target.value) }))}
                  className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-[var(--green)]/30"
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text2)] block mb-1">Notes (optional)</label>
                <textarea
                  value={data.notes}
                  onChange={e => setData(d => ({ ...d, notes: e.target.value }))}
                  placeholder="Additional notes about this document..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-1 focus:ring-[var(--green)]/30 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)] bg-[var(--bg)]">
          {step === 'type' ? (
            <button onClick={onClose} className="text-xs text-[var(--text3)] hover:text-[var(--text)] transition-colors">Cancel</button>
          ) : (
            <button
              onClick={() => setStep(step === 'review' ? 'signers' : 'type')}
              className="text-xs text-[var(--text3)] hover:text-[var(--text)] transition-colors"
            >
              Back
            </button>
          )}

          {step === 'type' && (
            <button
              onClick={() => setStep('signers')}
              disabled={!canProceedType}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--green)] text-white transition-colors hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next <ChevronRight size={14} />
            </button>
          )}
          {step === 'signers' && (
            <button
              onClick={() => setStep('review')}
              disabled={!canProceedSigners}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--green)] text-white transition-colors hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next <ChevronRight size={14} />
            </button>
          )}
          {step === 'review' && (
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[var(--green)] text-white transition-colors hover:brightness-110 disabled:opacity-60"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              {sending ? 'Sending...' : 'Send for Signature'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Signing Modal ───

function SigningModal({ doc, onClose, onSign, onDecline }: {
  doc: SigningDocument;
  onClose: () => void;
  onSign: () => void;
  onDecline: (reason: string) => void;
}) {
  const [agreed, setAgreed] = useState(false);
  const [showDecline, setShowDecline] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [signing, setSigning] = useState(false);

  async function handleSign() {
    setSigning(true);
    await new Promise(r => setTimeout(r, 1000));
    onSign();
    setSigning(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="relative w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--bg2)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-bold text-[var(--text)]">Sign Document</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
            <p className="text-sm font-semibold text-[var(--text)] mb-1">{doc.title}</p>
            <p className="text-[11px] text-[var(--text3)]">{DOC_TYPE_LABELS[doc.type]} &middot; {doc.file_size ? formatBytes(doc.file_size) : 'No file'}</p>
          </div>

          {!showDecline ? (
            <>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                  className="mt-0.5 rounded border-[var(--border)] text-[var(--green)] focus:ring-[var(--green)]"
                />
                <span className="text-xs text-[var(--text2)] leading-relaxed">
                  I have reviewed this document and agree to sign it. I understand this creates a legally binding signature record with my timestamp and IP address.
                </span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSign}
                  disabled={!agreed || signing}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-lg bg-[var(--green)] text-white transition-colors hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {signing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  {signing ? 'Signing...' : 'Sign Document'}
                </button>
                <button
                  onClick={() => setShowDecline(true)}
                  className="px-4 py-2.5 text-xs font-medium rounded-lg border border-[var(--border)] text-[var(--text3)] hover:text-[#ef4444] hover:border-[#ef4444]/40 transition-colors"
                >
                  Decline
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-xs font-semibold text-[var(--text2)] block mb-1">Reason for declining</label>
                <textarea
                  value={declineReason}
                  onChange={e => setDeclineReason(e.target.value)}
                  placeholder="Please provide a reason..."
                  rows={3}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-1 focus:ring-[#ef4444]/30 resize-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { onDecline(declineReason); }}
                  disabled={!declineReason.trim()}
                  className="flex-1 px-4 py-2.5 text-xs font-semibold rounded-lg bg-[#ef4444] text-white transition-colors hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Confirm Decline
                </button>
                <button
                  onClick={() => setShowDecline(false)}
                  className="px-4 py-2.5 text-xs font-medium rounded-lg border border-[var(--border)] text-[var(--text3)] hover:text-[var(--text)] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Audit Trail ───

function AuditTrail({ entries }: { entries: AuditEntry[] }) {
  const actionLabels: Record<string, { label: string; icon: typeof CheckCircle2 }> = {
    created: { label: 'Document created', icon: FileText },
    sent_for_signature: { label: 'Sent for signature', icon: Send },
    viewed: { label: 'Viewed document', icon: Eye },
    signed: { label: 'Signed', icon: CheckCircle2 },
    countersigned: { label: 'Countersigned', icon: Shield },
    declined: { label: 'Declined', icon: XCircle },
    expired: { label: 'Document expired', icon: AlertTriangle },
    voided: { label: 'Document voided', icon: XCircle },
  };

  return (
    <div className="space-y-0">
      {entries.map((entry, idx) => {
        const cfg = actionLabels[entry.action] ?? { label: entry.action, icon: FileText };
        const Icon = cfg.icon;
        return (
          <div key={entry.id} className="flex gap-3 relative">
            {/* Timeline line */}
            {idx < entries.length - 1 && (
              <div className="absolute left-[11px] top-[22px] w-px h-[calc(100%-6px)] bg-[var(--border)]" />
            )}
            {/* Dot */}
            <div className="w-6 h-6 rounded-full bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center flex-shrink-0 z-10">
              <Icon size={10} className="text-[var(--text3)]" />
            </div>
            {/* Content */}
            <div className="pb-4 min-w-0">
              <p className="text-xs font-medium text-[var(--text)]">{cfg.label}</p>
              <p className="text-[10px] text-[var(--text3)]">
                {entry.actor_email} &middot; {formatDateTime(entry.created_at)}
              </p>
              {entry.ip_address && (
                <p className="text-[10px] text-[var(--text3)]">IP: {entry.ip_address}</p>
              )}
              {entry.user_agent && (
                <p className="text-[10px] text-[var(--text3)]">UA: {entry.user_agent}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Document Detail ───

function DocumentDetail({ doc, onClose, onSign, onDecline }: {
  doc: SigningDocument;
  onClose: () => void;
  onSign: () => void;
  onDecline: (reason: string) => void;
}) {
  const [showSigning, setShowSigning] = useState(false);

  const needsMySignature = doc.status === 'pending_signature' && doc.signers.some(s => s.status === 'pending');

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
        <div className="relative w-full max-w-lg max-h-[85vh] rounded-xl border border-[var(--border)] bg-[var(--bg2)] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base">{DOC_TYPE_ICONS[doc.type]}</span>
              <h2 className="text-sm font-bold text-[var(--text)] truncate">{doc.title}</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors flex-shrink-0">
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {/* Status + metadata */}
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={doc.status} />
              <span className="text-[11px] text-[var(--text3)]">{DOC_TYPE_LABELS[doc.type]}</span>
              {doc.file_size ? <span className="text-[11px] text-[var(--text3)]">{formatBytes(doc.file_size)}</span> : null}
              <span className="text-[11px] text-[var(--text3)]">Created {formatDate(doc.created_at)}</span>
            </div>

            {doc.expires_at && (
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--text3)]">
                <Calendar size={12} />
                Expires {formatDate(doc.expires_at)}
              </div>
            )}

            {doc.notes && (
              <div className="p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                <p className="text-xs text-[var(--text2)]">{doc.notes}</p>
              </div>
            )}

            {/* Signers */}
            <div>
              <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-2">Signers</h3>
              <div className="space-y-2">
                {doc.signers.map((s, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
                    <SignerStatusIcon status={s.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--text)] truncate">{s.name}</p>
                      <p className="text-[10px] text-[var(--text3)] truncate">{s.email} {s.role ? `(${s.role})` : ''}</p>
                    </div>
                    <span className="text-[10px] font-medium capitalize" style={{
                      color: s.status === 'signed' ? '#16a34a' : s.status === 'declined' ? '#ef4444' : '#d97706'
                    }}>
                      {s.status}
                    </span>
                    {s.signed_at && (
                      <span className="text-[10px] text-[var(--text3)]">{formatDate(s.signed_at)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Sign button */}
            {needsMySignature && (
              <button
                onClick={() => setShowSigning(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-lg bg-[var(--green)] text-white transition-colors hover:brightness-110"
              >
                <FileSignature size={16} /> Sign This Document
              </button>
            )}

            {/* Audit trail */}
            <div>
              <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-3">Audit Trail</h3>
              <AuditTrail entries={doc.audit_log} />
            </div>
          </div>
        </div>
      </div>

      {showSigning && (
        <SigningModal
          doc={doc}
          onClose={() => setShowSigning(false)}
          onSign={() => { setShowSigning(false); onSign(); }}
          onDecline={(reason) => { setShowSigning(false); onDecline(reason); }}
        />
      )}
    </>
  );
}

// ─── Main Page ───

export default function DocumentSigningPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const isDemoMode = isDemo();

  const [documents, setDocuments] = useState<SigningDocument[]>(DEMO_DOCUMENTS);
  const [showWizard, setShowWizard] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<SigningDocument | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<DocumentType | ''>('');
  const [filterStatus, setFilterStatus] = useState<DocumentStatus | ''>('');
  const [sortDesc, setSortDesc] = useState(true);

  const filtered = useMemo(() => {
    let result = documents;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d => d.title.toLowerCase().includes(q) || d.signers.some(s => s.name.toLowerCase().includes(q)));
    }
    if (filterType) result = result.filter(d => d.type === filterType);
    if (filterStatus) result = result.filter(d => d.status === filterStatus);
    result.sort((a, b) => {
      const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return sortDesc ? diff : -diff;
    });
    return result;
  }, [documents, searchQuery, filterType, filterStatus, sortDesc]);

  const handleCreate = useCallback((doc: SigningDocument) => {
    setDocuments(prev => [doc, ...prev]);
  }, []);

  const handleSign = useCallback((docId: string) => {
    const now = new Date().toISOString();
    setDocuments(prev => prev.map(d => {
      if (d.id !== docId) return d;
      const updatedSigners = d.signers.map(s =>
        s.status === 'pending' ? { ...s, status: 'signed' as const, signed_at: now, ip_address: '127.0.0.1' } : s
      );
      const allSigned = updatedSigners.every(s => s.status === 'signed');
      return {
        ...d,
        signers: updatedSigners,
        status: allSigned ? 'signed' as const : d.status,
        completed_at: allSigned ? now : d.completed_at,
        updated_at: now,
        audit_log: [...d.audit_log, { id: `a-${Date.now()}`, actor_email: 'you@example.com', action: 'signed', ip_address: '127.0.0.1', user_agent: navigator.userAgent, created_at: now }],
      };
    }));
    setSelectedDoc(null);
    toast('Document signed successfully', 'success');
  }, [toast]);

  const handleDecline = useCallback((docId: string, reason: string) => {
    const now = new Date().toISOString();
    setDocuments(prev => prev.map(d => {
      if (d.id !== docId) return d;
      return {
        ...d,
        updated_at: now,
        audit_log: [...d.audit_log, { id: `a-${Date.now()}`, actor_email: 'you@example.com', action: 'declined', created_at: now, details: { reason } }],
      };
    }));
    setSelectedDoc(null);
    toast('Signature declined', 'warning');
  }, [toast]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/owner/documents"
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-[var(--border)] hover:bg-[var(--bg3)] transition-colors"
          >
            <ArrowLeft size={16} className="text-[var(--text2)]" />
          </Link>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[var(--green)]/10">
              <FileSignature size={18} className="text-[var(--green)]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--text)]">Document Signing</h1>
              <p className="text-[11px] text-[var(--text3)]">Create, send, and track document signatures</p>
            </div>
          </div>
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[var(--green)] text-white hover:brightness-110 transition-colors"
          >
            <Plus size={14} /> New
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search documents or signers..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg2)] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-2 focus:ring-[var(--green)]/20"
            />
          </div>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as DocumentType | '')}
            className="px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg2)] text-[var(--text)] focus:outline-none"
          >
            <option value="">All types</option>
            {(Object.entries(DOC_TYPE_LABELS) as [DocumentType, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as DocumentStatus | '')}
            className="px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg2)] text-[var(--text)] focus:outline-none"
          >
            <option value="">All statuses</option>
            {(Object.entries(STATUS_CONFIG) as [DocumentStatus, { label: string }][]).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <button
            onClick={() => setSortDesc(p => !p)}
            className="flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-[var(--border)] bg-[var(--bg2)] text-[var(--text3)] hover:text-[var(--text)] transition-colors"
          >
            <Filter size={12} />
            {sortDesc ? 'Newest' : 'Oldest'}
          </button>
        </div>

        {/* Document vault table */}
        <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <FileText size={32} className="mx-auto text-[var(--text3)] mb-3 opacity-40" />
              <p className="text-sm text-[var(--text3)]">No documents found</p>
              <button
                onClick={() => setShowWizard(true)}
                className="mt-3 text-xs font-medium text-[var(--green)] hover:underline"
              >
                Create your first signing document
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {filtered.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--bg3)]/50 transition-colors"
                >
                  <span className="text-lg flex-shrink-0">{DOC_TYPE_ICONS[doc.type]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[var(--text)] truncate">{doc.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-[var(--text3)]">{DOC_TYPE_LABELS[doc.type]}</span>
                      <span className="text-[10px] text-[var(--text3)]">&middot;</span>
                      <span className="text-[10px] text-[var(--text3)]">{doc.signers.length} signer{doc.signers.length !== 1 ? 's' : ''}</span>
                      <span className="text-[10px] text-[var(--text3)]">&middot;</span>
                      <span className="text-[10px] text-[var(--text3)]">{formatDate(doc.created_at)}</span>
                    </div>
                  </div>
                  <StatusBadge status={doc.status} />
                  <ChevronRight size={14} className="text-[var(--text3)] flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {([
            { label: 'Total', count: documents.length, color: 'var(--text2)' },
            { label: 'Pending', count: documents.filter(d => d.status === 'pending_signature').length, color: '#d97706' },
            { label: 'Signed', count: documents.filter(d => d.status === 'signed' || d.status === 'countersigned').length, color: '#16a34a' },
            { label: 'Expired', count: documents.filter(d => d.status === 'expired').length, color: '#ef4444' },
          ]).map(stat => (
            <div key={stat.label} className="rounded-lg border border-[var(--border)] px-3 py-2.5 text-center" style={{ background: 'var(--bg2)' }}>
              <p className="text-lg font-bold font-mono" style={{ color: stat.color }}>{stat.count}</p>
              <p className="text-[10px] text-[var(--text3)] uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {showWizard && <CreateWizard onClose={() => setShowWizard(false)} onCreate={handleCreate} />}
      {selectedDoc && (
        <DocumentDetail
          doc={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onSign={() => handleSign(selectedDoc.id)}
          onDecline={(reason) => handleDecline(selectedDoc.id, reason)}
        />
      )}
    </div>
  );
}
