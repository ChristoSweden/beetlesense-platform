/**
 * AvverkningsanmalanPage — Multi-step government submission form
 * for filing a harvesting notification (avverkningsanmälan) to Skogsstyrelsen.
 *
 * Steps: 1. Property & Area  2. Planning Details  3. Environmental Review
 *        4. Review & Submit  5. Confirmation
 */

import { useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight,
  ChevronLeft,
  TreePine,
  Calendar,
  Shield,
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  FileDown,
  Loader2,
  Info,
  MapPin,
} from 'lucide-react';
import { isDemo, DEMO_PARCELS } from '@/lib/demoData';
import { useToast } from '@/components/common/Toast';

// ── Types ───────────────────────────────────────────────────────────────────

type HarvestMethod = 'slutavverkning' | 'gallring' | 'rojarning' | 'other' | '';
type SubmissionStatus = 'draft' | 'ready' | 'submitted' | 'acknowledged' | 'approved' | 'rejected';

interface FormData {
  // Step 1
  parcelId: string;
  fastighetsbeteckning: string;
  areaHa: string;
  method: HarvestMethod;

  // Step 2
  plannedStart: string;
  plannedEnd: string;
  volumeM3: string;
  sprucePct: string;
  pinePct: string;
  birchPct: string;
  otherPct: string;
  contractor: string;

  // Step 3
  natura2000Overlap: boolean;
  nyckelbiotopOverlap: boolean;
  waterProtection: boolean;
  culturalHeritage: string;
  environmentalMeasures: string;
}

interface Submission {
  id: string;
  type: string;
  status: SubmissionStatus;
  referenceNumber: string;
  fastighetsbeteckning: string;
  areaHa: number;
  method: string;
  plannedStart: string;
  plannedEnd: string;
  submittedAt: string;
  createdAt: string;
}

const INITIAL_FORM: FormData = {
  parcelId: '',
  fastighetsbeteckning: '',
  areaHa: '',
  method: '',
  plannedStart: '',
  plannedEnd: '',
  volumeM3: '',
  sprucePct: '60',
  pinePct: '30',
  birchPct: '10',
  otherPct: '0',
  contractor: '',
  natura2000Overlap: false,
  nyckelbiotopOverlap: false,
  waterProtection: false,
  culturalHeritage: '',
  environmentalMeasures: '',
};

const METHOD_LABELS: Record<string, string> = {
  slutavverkning: 'Final felling (Slutavverkning)',
  gallring: 'Thinning (Gallring)',
  rojarning: 'Clearing (Röjning)',
  other: 'Other',
};

const STATUS_CONFIG: Record<SubmissionStatus, { label: string; color: string; bg: string }> = {
  draft:        { label: 'Draft',        color: 'text-[var(--text3)]',  bg: 'bg-[var(--bg3)]' },
  ready:        { label: 'Ready',        color: 'text-blue-600',        bg: 'bg-blue-50' },
  submitted:    { label: 'Submitted',    color: 'text-amber-600',       bg: 'bg-amber-50' },
  acknowledged: { label: 'Acknowledged', color: 'text-indigo-600',      bg: 'bg-indigo-50' },
  approved:     { label: 'Approved',     color: 'text-[var(--green)]',  bg: 'bg-emerald-50' },
  rejected:     { label: 'Rejected',     color: 'text-red-600',         bg: 'bg-red-50' },
};

// ── Validation helpers ──────────────────────────────────────────────────────

function sixWeeksFromNow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 42);
  return d.toISOString().slice(0, 10);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function generateRefNumber(): string {
  const yr = new Date().getFullYear();
  const seq = Math.floor(10000 + Math.random() * 90000);
  return `SKS-${yr}-${seq}`;
}

// ── Demo submissions ────────────────────────────────────────────────────────

function getDemoSubmissions(): Submission[] {
  try {
    const raw = localStorage.getItem('beetlesense-gov-submissions');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDemoSubmissions(subs: Submission[]) {
  try {
    localStorage.setItem('beetlesense-gov-submissions', JSON.stringify(subs));
  } catch { /* ignore */ }
}

// ── Step indicator ──────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Property & Area', icon: MapPin },
  { label: 'Planning',        icon: Calendar },
  { label: 'Environment',     icon: Shield },
  { label: 'Review',          icon: ClipboardCheck },
  { label: 'Confirmation',    icon: CheckCircle2 },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-between mb-8">
      {STEPS.map((step, i) => {
        const StepIcon = step.icon;
        const isActive = i === current;
        const isDone = i < current;
        return (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
              isActive ? 'border-[var(--green)] bg-[var(--green)]/10 text-[var(--green)]' :
              isDone ? 'border-[var(--green)] bg-[var(--green)] text-white' :
              'border-[var(--border)] text-[var(--text3)]'
            }`}>
              {isDone ? <CheckCircle2 size={14} /> : <StepIcon size={14} />}
            </div>
            <span className={`text-[10px] font-medium hidden sm:block ${
              isActive ? 'text-[var(--text)]' : 'text-[var(--text3)]'
            }`}>
              {step.label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-2 ${isDone ? 'bg-[var(--green)]' : 'bg-[var(--border)]'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Validation warnings ─────────────────────────────────────────────────────

function getWarnings(form: FormData): string[] {
  const w: string[] = [];
  const area = parseFloat(form.areaHa);
  if (area > 0.5) {
    w.push('Area exceeds 0.5 ha — a harvesting notification (avverkningsanmälan) is required by law.');
  }
  if (form.plannedStart && form.plannedStart < sixWeeksFromNow()) {
    w.push('Planned start date is less than 6 weeks from today. Skogsstyrelsen requires at least 6 weeks notice.');
  }
  const totalPct = [form.sprucePct, form.pinePct, form.birchPct, form.otherPct]
    .reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
  if (Math.abs(totalPct - 100) > 1) {
    w.push(`Species mix totals ${totalPct}% — should equal 100%.`);
  }
  if (form.natura2000Overlap) {
    w.push('This area overlaps with a Natura 2000 zone. Additional consultation (samråd) with Länsstyrelsen may be required.');
  }
  if (form.nyckelbiotopOverlap) {
    w.push('Key habitat (nyckelbiotop) detected. Consider alternative harvesting methods or exclusion zones.');
  }
  return w;
}

// ── Main component ──────────────────────────────────────────────────────────

export default function AvverkningsanmalanPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState('');
  const [submissions, setSubmissions] = useState<Submission[]>(() => getDemoSubmissions());

  const parcels = useMemo(() => {
    if (isDemo()) return DEMO_PARCELS;
    return [];
  }, []);

  // Auto-fill from parcel
  const handleParcelChange = useCallback((parcelId: string) => {
    setForm((prev) => {
      const parcel = parcels.find((p) => p.id === parcelId);
      if (!parcel) return { ...prev, parcelId };
      // Generate a realistic fastighetsbeteckning from the parcel name
      const fbeteckning = `${parcel.municipality} ${parcel.name} 1:${Math.floor(Math.random() * 50 + 1)}`;
      return {
        ...prev,
        parcelId,
        fastighetsbeteckning: fbeteckning,
        areaHa: parcel.area_hectares.toString(),
      };
    });
  }, [parcels]);

  const updateField = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const warnings = useMemo(() => getWarnings(form), [form]);

  // Can we proceed from this step?
  const canProceed = useMemo(() => {
    switch (step) {
      case 0:
        return form.fastighetsbeteckning.trim() !== '' && form.areaHa !== '' && form.method !== '';
      case 1:
        return form.plannedStart !== '' && form.plannedEnd !== '';
      case 2:
        return true; // Environment is optional text
      case 3:
        return true; // Review step — always can submit
      default:
        return false;
    }
  }, [step, form]);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);

    // Simulate submission delay
    await new Promise((res) => setTimeout(res, 2000));

    const ref = generateRefNumber();
    const newSub: Submission = {
      id: `sub-${Date.now()}`,
      type: 'avverkningsanmalan',
      status: 'submitted',
      referenceNumber: ref,
      fastighetsbeteckning: form.fastighetsbeteckning,
      areaHa: parseFloat(form.areaHa),
      method: form.method,
      plannedStart: form.plannedStart,
      plannedEnd: form.plannedEnd,
      submittedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const updated = [newSub, ...submissions];
    setSubmissions(updated);
    saveDemoSubmissions(updated);

    setSubmittedRef(ref);
    setIsSubmitting(false);
    setStep(4); // Go to confirmation
    toast('Harvesting notification submitted successfully!', 'success');
  }, [form, submissions, toast]);

  const handleExportPDF = useCallback(() => {
    const w = window.open('', '_blank');
    if (!w) return;
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Avverkningsanmälan — ${submittedRef}</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:700px;margin:0 auto;padding:32px 24px;color:#1e293b;}
h1{font-size:18px;color:#166534;margin:0 0 4px;}
h2{font-size:14px;margin:24px 0 8px;padding-bottom:4px;border-bottom:1px solid #e5e7eb;}
.meta{font-size:11px;color:#6b7280;margin-bottom:24px;}
table{width:100%;border-collapse:collapse;margin-bottom:16px;} td{padding:6px 8px;font-size:13px;border-bottom:1px solid #f1f5f9;}
td:first-child{font-weight:600;width:200px;color:#374151;}
.badge{display:inline-block;padding:4px 10px;border-radius:12px;font-size:12px;font-weight:600;background:#fef3c7;color:#92400e;}
.footer{margin-top:32px;border-top:1px solid #e5e7eb;padding-top:12px;font-size:10px;color:#9ca3af;text-align:center;}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
</style></head><body>
<h1>Avverkningsanmälan (Harvesting Notification)</h1>
<p class="meta">Reference: ${submittedRef} &middot; Status: <span class="badge">Submitted</span></p>

<h2>Property & Area</h2>
<table>
<tr><td>Fastighetsbeteckning</td><td>${form.fastighetsbeteckning}</td></tr>
<tr><td>Area</td><td>${form.areaHa} ha</td></tr>
<tr><td>Harvest method</td><td>${METHOD_LABELS[form.method] || form.method}</td></tr>
</table>

<h2>Planning Details</h2>
<table>
<tr><td>Planned start</td><td>${form.plannedStart}</td></tr>
<tr><td>Planned end</td><td>${form.plannedEnd}</td></tr>
<tr><td>Estimated volume</td><td>${form.volumeM3 || 'Not specified'} m³</td></tr>
<tr><td>Species mix</td><td>Spruce ${form.sprucePct}%, Pine ${form.pinePct}%, Birch ${form.birchPct}%, Other ${form.otherPct}%</td></tr>
${form.contractor ? `<tr><td>Contractor</td><td>${form.contractor}</td></tr>` : ''}
</table>

<h2>Environmental Review</h2>
<table>
<tr><td>Natura 2000 overlap</td><td>${form.natura2000Overlap ? 'Yes' : 'No'}</td></tr>
<tr><td>Nyckelbiotop overlap</td><td>${form.nyckelbiotopOverlap ? 'Yes' : 'No'}</td></tr>
<tr><td>Water protection area</td><td>${form.waterProtection ? 'Yes' : 'No'}</td></tr>
${form.culturalHeritage ? `<tr><td>Cultural heritage notes</td><td>${form.culturalHeritage}</td></tr>` : ''}
${form.environmentalMeasures ? `<tr><td>Environmental measures</td><td>${form.environmentalMeasures}</td></tr>` : ''}
</table>

<div class="footer">Generated by BeetleSense &mdash; beetlesense.ai<br/>This document is a digital copy. The official submission is recorded with Skogsstyrelsen.</div>
</body></html>`;
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 400);
  }, [form, submittedRef]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 lg:p-6 max-w-3xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-6">
        <Link to="/owner/dashboard" className="hover:text-[var(--text2)]">Dashboard</Link>
        <ChevronRight size={12} />
        <Link to="/owner/compliance" className="hover:text-[var(--text2)]">Compliance</Link>
        <ChevronRight size={12} />
        <span className="text-[var(--text)]">Harvesting Notification</span>
      </nav>

      <h1 className="text-xl font-serif font-bold text-[var(--text)] mb-2">
        Avverkningsanmälan
      </h1>
      <p className="text-xs text-[var(--text3)] mb-6">
        File a harvesting notification to Skogsstyrelsen. All fields marked are required by regulation.
      </p>

      {/* Step indicator */}
      <StepIndicator current={step} />

      {/* ── Step 0: Property & Area ──────────────────────────────────────── */}
      {step === 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-6 space-y-5">
          <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
            <MapPin size={16} className="text-[var(--green)]" />
            Property & Area
          </h2>

          {/* Parcel selector */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[var(--text3)] mb-1.5">
              Select parcel (optional — auto-fills fields)
            </label>
            <select
              value={form.parcelId}
              onChange={(e) => handleParcelChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] outline-none focus:border-[var(--green)]/50"
            >
              <option value="">-- Select parcel --</option>
              {parcels.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.area_hectares} ha)</option>
              ))}
            </select>
          </div>

          {/* Fastighetsbeteckning */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[var(--text3)] mb-1.5">
              Fastighetsbeteckning *
            </label>
            <input
              type="text"
              value={form.fastighetsbeteckning}
              onChange={(e) => updateField('fastighetsbeteckning', e.target.value)}
              placeholder="e.g. Värnamo Norra Skogen 1:12"
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] outline-none focus:border-[var(--green)]/50"
            />
          </div>

          {/* Area */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[var(--text3)] mb-1.5">
              Harvest area (hectares) *
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={form.areaHa}
              onChange={(e) => updateField('areaHa', e.target.value)}
              placeholder="e.g. 12.5"
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] outline-none focus:border-[var(--green)]/50"
            />
          </div>

          {/* Method */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[var(--text3)] mb-1.5">
              Harvest method *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(METHOD_LABELS) as [HarvestMethod, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => updateField('method', key as HarvestMethod)}
                  className={`px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                    form.method === key
                      ? 'border-[var(--green)] bg-[var(--green)]/5 text-[var(--green)]'
                      : 'border-[var(--border)] text-[var(--text2)] hover:border-[var(--border2)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Step 1: Planning Details ─────────────────────────────────────── */}
      {step === 1 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-6 space-y-5">
          <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
            <Calendar size={16} className="text-[var(--green)]" />
            Planning Details
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[var(--text3)] mb-1.5">
                Planned start date *
              </label>
              <input
                type="date"
                value={form.plannedStart}
                min={sixWeeksFromNow()}
                onChange={(e) => updateField('plannedStart', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] outline-none focus:border-[var(--green)]/50"
              />
              <p className="text-[9px] text-[var(--text3)] mt-1">Must be at least 6 weeks from today</p>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[var(--text3)] mb-1.5">
                Planned end date *
              </label>
              <input
                type="date"
                value={form.plannedEnd}
                min={form.plannedStart || sixWeeksFromNow()}
                onChange={(e) => updateField('plannedEnd', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] outline-none focus:border-[var(--green)]/50"
              />
            </div>
          </div>

          {/* Volume */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[var(--text3)] mb-1.5">
              Estimated volume (m3)
            </label>
            <input
              type="number"
              min="0"
              value={form.volumeM3}
              onChange={(e) => updateField('volumeM3', e.target.value)}
              placeholder="e.g. 350"
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] outline-none focus:border-[var(--green)]/50"
            />
          </div>

          {/* Species mix */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[var(--text3)] mb-2">
              Species mix (%)
            </label>
            <div className="grid grid-cols-4 gap-3">
              {([
                ['sprucePct', 'Spruce'],
                ['pinePct', 'Pine'],
                ['birchPct', 'Birch'],
                ['otherPct', 'Other'],
              ] as const).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-[9px] text-[var(--text3)] mb-1">{label}</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form[key]}
                    onChange={(e) => updateField(key, e.target.value)}
                    className="w-full px-2 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] text-center outline-none focus:border-[var(--green)]/50"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Contractor */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[var(--text3)] mb-1.5">
              Contractor (if known)
            </label>
            <input
              type="text"
              value={form.contractor}
              onChange={(e) => updateField('contractor', e.target.value)}
              placeholder="e.g. Skogsentreprenörerna AB"
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] outline-none focus:border-[var(--green)]/50"
            />
          </div>
        </div>
      )}

      {/* ── Step 2: Environmental Review ─────────────────────────────────── */}
      {step === 2 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-6 space-y-5">
          <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
            <Shield size={16} className="text-[var(--green)]" />
            Environmental Review
          </h2>

          {/* Natura 2000 */}
          <div className="flex items-start gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
            <input
              type="checkbox"
              id="natura2000"
              checked={form.natura2000Overlap}
              onChange={(e) => updateField('natura2000Overlap', e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-[var(--border)] text-[var(--green)] focus:ring-[var(--green)]"
            />
            <div>
              <label htmlFor="natura2000" className="text-xs font-medium text-[var(--text)] cursor-pointer">
                Natura 2000 overlap detected
              </label>
              <p className="text-[10px] text-[var(--text3)] mt-0.5">
                Auto-detected from parcel geometry. If checked, consultation with Lansstyrelsen is required.
              </p>
            </div>
          </div>

          {/* Nyckelbiotop */}
          <div className="flex items-start gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
            <input
              type="checkbox"
              id="nyckelbiotop"
              checked={form.nyckelbiotopOverlap}
              onChange={(e) => updateField('nyckelbiotopOverlap', e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-[var(--border)] text-[var(--green)] focus:ring-[var(--green)]"
            />
            <div>
              <label htmlFor="nyckelbiotop" className="text-xs font-medium text-[var(--text)] cursor-pointer">
                Key habitat (nyckelbiotop) overlap
              </label>
              <p className="text-[10px] text-[var(--text3)] mt-0.5">
                Based on Skogsstyrelsens nyckelbiotopsinventering data.
              </p>
            </div>
          </div>

          {/* Water protection */}
          <div className="flex items-start gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
            <input
              type="checkbox"
              id="waterProtection"
              checked={form.waterProtection}
              onChange={(e) => updateField('waterProtection', e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-[var(--border)] text-[var(--green)] focus:ring-[var(--green)]"
            />
            <div>
              <label htmlFor="waterProtection" className="text-xs font-medium text-[var(--text)] cursor-pointer">
                Water protection area
              </label>
              <p className="text-[10px] text-[var(--text3)] mt-0.5">
                Proximity to watercourses, lakes, or protected water sources.
              </p>
            </div>
          </div>

          {/* Cultural heritage */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[var(--text3)] mb-1.5">
              Cultural heritage considerations
            </label>
            <textarea
              value={form.culturalHeritage}
              onChange={(e) => updateField('culturalHeritage', e.target.value)}
              rows={3}
              placeholder="Note any known archaeological sites, historical landmarks, or cultural values in the area..."
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] outline-none focus:border-[var(--green)]/50 resize-none"
            />
          </div>

          {/* Environmental measures */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[var(--text3)] mb-1.5">
              Planned environmental measures
            </label>
            <textarea
              value={form.environmentalMeasures}
              onChange={(e) => updateField('environmentalMeasures', e.target.value)}
              rows={3}
              placeholder="Describe buffer zones, retention trees, soil protection measures, etc..."
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] outline-none focus:border-[var(--green)]/50 resize-none"
            />
          </div>
        </div>
      )}

      {/* ── Step 3: Review & Submit ──────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-6">
            <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2 mb-4">
              <ClipboardCheck size={16} className="text-[var(--green)]" />
              Review your submission
            </h2>

            <div className="space-y-3">
              <SummaryRow label="Fastighetsbeteckning" value={form.fastighetsbeteckning} />
              <SummaryRow label="Harvest area" value={`${form.areaHa} ha`} />
              <SummaryRow label="Method" value={METHOD_LABELS[form.method] || form.method} />
              <SummaryRow label="Planned start" value={form.plannedStart} />
              <SummaryRow label="Planned end" value={form.plannedEnd} />
              <SummaryRow label="Estimated volume" value={form.volumeM3 ? `${form.volumeM3} m3` : 'Not specified'} />
              <SummaryRow label="Species mix" value={`Spruce ${form.sprucePct}%, Pine ${form.pinePct}%, Birch ${form.birchPct}%, Other ${form.otherPct}%`} />
              {form.contractor && <SummaryRow label="Contractor" value={form.contractor} />}
              <SummaryRow label="Natura 2000" value={form.natura2000Overlap ? 'Yes — overlap detected' : 'No overlap'} />
              <SummaryRow label="Nyckelbiotop" value={form.nyckelbiotopOverlap ? 'Yes — overlap detected' : 'No overlap'} />
              <SummaryRow label="Water protection" value={form.waterProtection ? 'Yes' : 'No'} />
              {form.culturalHeritage && <SummaryRow label="Cultural heritage" value={form.culturalHeritage} />}
              {form.environmentalMeasures && <SummaryRow label="Environmental measures" value={form.environmentalMeasures} />}
            </div>
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h3 className="text-xs font-semibold text-amber-700 flex items-center gap-2 mb-2">
                <AlertTriangle size={14} />
                Validation warnings
              </h3>
              <ul className="space-y-1.5">
                {warnings.map((w, i) => (
                  <li key={i} className="flex gap-2 text-[11px] text-amber-700">
                    <span>&bull;</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Pre-submission checklist */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
            <h3 className="text-xs font-semibold text-[var(--text)] mb-3">Pre-submission checklist</h3>
            <div className="space-y-2">
              {[
                'I have verified the property designation (fastighetsbeteckning) is correct',
                'I have reviewed the environmental considerations',
                'I understand the 6-week waiting period before harvesting can begin',
                'I confirm this notification is accurate to the best of my knowledge',
              ].map((item, i) => (
                <label key={i} className="flex items-start gap-2 text-[11px] text-[var(--text2)] cursor-pointer">
                  <input type="checkbox" className="mt-0.5 w-3.5 h-3.5 rounded border-[var(--border)]" />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Info box */}
          <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50">
            <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-700 leading-relaxed">
              In production, this submits directly via Skogsstyrelsens e-service API.
              In demo mode, the submission is simulated and stored locally.
            </p>
          </div>
        </div>
      )}

      {/* ── Step 4: Confirmation ─────────────────────────────────────────── */}
      {step === 4 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--green)]/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-[var(--green)]" />
          </div>
          <h2 className="text-lg font-serif font-bold text-[var(--text)] mb-2">
            Notification Submitted
          </h2>
          <p className="text-xs text-[var(--text3)] mb-6 max-w-md mx-auto">
            Your harvesting notification has been submitted to Skogsstyrelsen.
            You will receive an acknowledgement within 5 business days.
          </p>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-4 mb-6 max-w-sm mx-auto">
            <div className="space-y-2 text-left">
              <SummaryRow label="Reference number" value={submittedRef} />
              <SummaryRow label="Status" value="Submitted — awaiting acknowledgement" />
              <SummaryRow label="Expected response" value="Within 6 weeks" />
              <SummaryRow label="Submitted at" value={new Date().toLocaleDateString('en-GB', {
                day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })} />
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-xs font-semibold hover:bg-[var(--bg3)] transition-colors"
            >
              <FileDown size={14} />
              Download PDF copy
            </button>
            <button
              onClick={() => navigate('/owner/compliance')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--green)] text-[var(--bg)] text-xs font-semibold hover:bg-[var(--green2)] transition-colors"
            >
              <ClipboardCheck size={14} />
              View all submissions
            </button>
          </div>
        </div>
      )}

      {/* ── Navigation buttons ───────────────────────────────────────────── */}
      {step < 4 && (
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={14} />
            Back
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--green)] text-[var(--bg)] text-xs font-semibold hover:bg-[var(--green2)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Continue
              <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--green)] text-[var(--bg)] text-xs font-semibold hover:bg-[var(--green2)] transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <TreePine size={14} />
                  Submit to Skogsstyrelsen
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* ── Submissions dashboard ────────────────────────────────────────── */}
      {submissions.length > 0 && step !== 4 && (
        <div className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
            <ClipboardCheck size={16} className="text-[var(--text3)]" />
            My Submissions ({submissions.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-[9px] uppercase tracking-wider text-[var(--text3)] pb-2 pr-4">Reference</th>
                  <th className="text-[9px] uppercase tracking-wider text-[var(--text3)] pb-2 pr-4">Property</th>
                  <th className="text-[9px] uppercase tracking-wider text-[var(--text3)] pb-2 pr-4">Area</th>
                  <th className="text-[9px] uppercase tracking-wider text-[var(--text3)] pb-2 pr-4">Method</th>
                  <th className="text-[9px] uppercase tracking-wider text-[var(--text3)] pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => {
                  const cfg = STATUS_CONFIG[sub.status];
                  return (
                    <tr key={sub.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="py-2.5 pr-4 text-[11px] font-mono text-[var(--text)]">{sub.referenceNumber}</td>
                      <td className="py-2.5 pr-4 text-[11px] text-[var(--text2)]">{sub.fastighetsbeteckning}</td>
                      <td className="py-2.5 pr-4 text-[11px] text-[var(--text2)]">{sub.areaHa} ha</td>
                      <td className="py-2.5 pr-4 text-[11px] text-[var(--text2)]">{METHOD_LABELS[sub.method] || sub.method}</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${cfg.color} ${cfg.bg}`}>
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Summary row helper ──────────────────────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between py-1.5 border-b border-[var(--border)] last:border-0">
      <span className="text-[10px] uppercase tracking-wider text-[var(--text3)] flex-shrink-0 w-40">{label}</span>
      <span className="text-xs text-[var(--text)] text-right">{value}</span>
    </div>
  );
}
