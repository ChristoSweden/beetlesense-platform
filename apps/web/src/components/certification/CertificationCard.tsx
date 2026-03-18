import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Calendar,
  TrendingUp,
  Leaf,
  Globe,
  Award,
} from 'lucide-react';
import type { Certification, CertificationId } from '@/hooks/useCertification';

interface CertificationCardProps {
  cert: Certification;
  onSelect: (id: CertificationId) => void;
  onShowGapAnalysis: (id: CertificationId) => void;
  lang: string;
}

const CERT_ICONS: Record<CertificationId, React.ReactNode> = {
  fsc: <Shield size={20} />,
  pefc: <ShieldCheck size={20} />,
  eu_taxonomy: <Globe size={20} />,
  naturskydd: <Leaf size={20} />,
};

const CERT_COLORS: Record<CertificationId, string> = {
  fsc: '#4ade80',
  pefc: '#60a5fa',
  eu_taxonomy: '#a78bfa',
  naturskydd: '#34d399',
};

function ComplianceGauge({ pct, color }: { pct: number; color: string }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg width="96" height="96" className="-rotate-90">
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke="var(--bg3)"
          strokeWidth="6"
        />
        <circle
          cx="48"
          cy="48"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-mono font-bold text-[var(--text)]">{pct}%</span>
      </div>
    </div>
  );
}

function StatusBadge({ status, lang }: { status: Certification['status']; lang: string }) {
  const config = {
    certifierad: {
      label_sv: 'Certifierad',
      label_en: 'Certified',
      bg: 'bg-[var(--green)]/15',
      text: 'text-[var(--green)]',
      icon: <ShieldCheck size={12} />,
    },
    pagaende: {
      label_sv: 'Pagaende',
      label_en: 'In Progress',
      bg: 'bg-amber-500/15',
      text: 'text-amber-400',
      icon: <Shield size={12} />,
    },
    ej_pabörjad: {
      label_sv: 'Ej pabörjad',
      label_en: 'Not Started',
      bg: 'bg-[var(--bg3)]',
      text: 'text-[var(--text3)]',
      icon: <ShieldAlert size={12} />,
    },
  };

  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${c.bg} ${c.text}`}>
      {c.icon}
      {lang === 'sv' ? c.label_sv : c.label_en}
    </span>
  );
}

export function CertificationCard({ cert, onSelect, onShowGapAnalysis, lang }: CertificationCardProps) {
  const color = CERT_COLORS[cert.id];
  const icon = CERT_ICONS[cert.id];
  const metCount = cert.requirements.filter((r) => r.status === 'uppfyllt').length;
  const totalCount = cert.requirements.length;
  const topRequirements = cert.requirements.slice(0, 7);

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-5 hover:border-[var(--border2)] transition-all"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: `${color}15`, color }}
          >
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text)]">{cert.name}</h3>
            <p className="text-[10px] text-[var(--text3)] mt-0.5">
              {lang === 'sv' ? cert.issuingBody_sv : cert.issuingBody_en}
            </p>
          </div>
        </div>
        <StatusBadge status={cert.status} lang={lang} />
      </div>

      {/* Full name */}
      <p className="text-[11px] text-[var(--text2)] mb-4">
        {lang === 'sv' ? cert.fullName_sv : cert.fullName_en}
      </p>

      {/* Compliance gauge */}
      <div className="flex items-center gap-5 mb-4">
        <ComplianceGauge pct={cert.compliancePct} color={color} />
        <div className="flex-1">
          <p className="text-xs text-[var(--text2)] mb-1">
            {metCount} / {totalCount} {lang === 'sv' ? 'krav uppfyllda' : 'requirements met'}
          </p>
          <div className="h-1.5 rounded-full bg-[var(--bg3)] overflow-hidden mb-2">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${cert.compliancePct}%`, background: color }}
            />
          </div>
          <p className="text-[10px] text-[var(--text3)]">
            {lang === 'sv' ? cert.description_sv : cert.description_en}
          </p>
        </div>
      </div>

      {/* Key requirements summary */}
      <div className="mb-4 space-y-1">
        <h4 className="text-[11px] font-semibold text-[var(--text2)] mb-1.5">
          {lang === 'sv' ? 'Nyckelkrav' : 'Key Requirements'}
        </h4>
        {topRequirements.map((req) => (
          <div key={req.id} className="flex items-center gap-2 py-0.5">
            {req.status === 'uppfyllt' ? (
              <CheckCircle2 size={13} className="text-[var(--green)] flex-shrink-0" />
            ) : (
              <XCircle size={13} className="text-red-400/60 flex-shrink-0" />
            )}
            <span className={`text-[10px] leading-tight ${req.status === 'uppfyllt' ? 'text-[var(--text2)]' : 'text-[var(--text3)]'}`}>
              {lang === 'sv' ? req.label_sv : req.label_en}
            </span>
          </div>
        ))}
        {cert.requirements.length > 7 && (
          <p className="text-[9px] text-[var(--text3)] pl-5">
            +{cert.requirements.length - 7} {lang === 'sv' ? 'ytterligare krav...' : 'more requirements...'}
          </p>
        )}
      </div>

      {/* Financial benefit */}
      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[var(--green)]/5 border border-[var(--green)]/10 mb-4">
        <TrendingUp size={14} className="text-[var(--green)] flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-[var(--green)]">
          {lang === 'sv' ? cert.financialBenefit_sv : cert.financialBenefit_en}
        </p>
      </div>

      {/* Renewal date if certified */}
      {cert.renewalDate && (
        <div className="flex items-center gap-2 mb-4 text-[10px] text-[var(--text3)]">
          <Calendar size={12} />
          <span>{lang === 'sv' ? 'Forniyelsedag:' : 'Renewal date:'} {cert.renewalDate}</span>
        </div>
      )}

      {/* Carbon credit eligibility */}
      {cert.carbonCreditEligible && (
        <div className="flex items-center gap-2 mb-4">
          <Award size={12} className="text-emerald-400" />
          <span className="text-[10px] text-emerald-400">
            {lang === 'sv' ? 'Berättigar till kolkrediter' : 'Carbon credit eligible'}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onShowGapAnalysis(cert.id)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[var(--border)] text-[11px] font-medium text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
        >
          {lang === 'sv' ? 'Visa gap-analys' : 'View Gap Analysis'}
          <ChevronRight size={13} />
        </button>
        <button
          onClick={() => onSelect(cert.id)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold text-forest-950 transition-all hover:brightness-110"
          style={{ background: color }}
        >
          {cert.status === 'certifierad'
            ? (lang === 'sv' ? 'Visa detaljer' : 'View Details')
            : (lang === 'sv' ? 'Starta certifiering' : 'Start Certification')}
        </button>
      </div>
    </div>
  );
}
