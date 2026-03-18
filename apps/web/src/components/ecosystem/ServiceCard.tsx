import { useState } from 'react';
import {
  Droplets,
  Shield,
  Wind,
  Flower2,
  Leaf,
  Tent,
  Mountain,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  Clock,
  XCircle,
  Satellite,
  BarChart3,
  Bug,
  Ruler,
} from 'lucide-react';
import type { EcosystemService } from '@/hooks/useEcosystemServices';
import { Link } from 'react-router-dom';

const ICON_MAP: Record<string, React.ReactNode> = {
  droplets: <Droplets size={18} />,
  shield: <Shield size={18} />,
  wind: <Wind size={18} />,
  flower: <Flower2 size={18} />,
  leaf: <Leaf size={18} />,
  tent: <Tent size={18} />,
  mountain: <Mountain size={18} />,
};

const VERIFICATION_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  satellite: { label: 'Satellitverifiering', icon: <Satellite size={12} /> },
  hydrology_model: { label: 'Hydrologisk modell', icon: <BarChart3 size={12} /> },
  biodiversity_survey: { label: 'Biodiversitetsinventering', icon: <Bug size={12} /> },
  field_measurement: { label: 'Fältmätning', icon: <Ruler size={12} /> },
  visitor_statistics: { label: 'Besöksstatistik', icon: <BarChart3 size={12} /> },
};

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  monetized: { label: 'Monetariserad', icon: <CheckCircle2 size={12} />, color: '#4ade80' },
  potential: { label: 'Potential', icon: <Clock size={12} />, color: '#fbbf24' },
  not_applicable: { label: 'Ej tillämplig', icon: <XCircle size={12} />, color: 'var(--text3)' },
};

const TREND_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  increasing: { label: 'Ökande', icon: <TrendingUp size={12} />, color: '#4ade80' },
  stable: { label: 'Stabil', icon: <Minus size={12} />, color: 'var(--text2)' },
  decreasing: { label: 'Minskande', icon: <TrendingDown size={12} />, color: '#ef4444' },
};

interface ServiceCardProps {
  service: EcosystemService;
  onActivate?: (serviceId: string) => void;
}

export function ServiceCard({ service, onActivate }: ServiceCardProps) {
  const [activating, setActivating] = useState(false);

  const status = STATUS_CONFIG[service.status];
  const trend = TREND_CONFIG[service.trend];
  const verification = VERIFICATION_LABELS[service.verificationMethod];

  const handleActivate = () => {
    setActivating(true);
    onActivate?.(service.id);
    setTimeout(() => setActivating(false), 1500);
  };

  const isCarbon = service.id === 'carbon';

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4 hover:border-[var(--border2)] transition-all"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: `${service.color}15`, color: service.color }}
          >
            {ICON_MAP[service.icon] ?? <Leaf size={18} />}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">{service.nameSv}</h3>
            <p className="text-[10px] text-[var(--text3)]">{service.nameEn}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: `${status.color}15`, color: status.color }}>
          {status.icon}
          <span>{status.label}</span>
        </div>
      </div>

      {/* Quantified output */}
      <div className="mb-3 p-3 rounded-lg" style={{ background: 'var(--bg)' }}>
        <p className="text-xs font-medium text-[var(--text2)] mb-1">Kvantifierad output</p>
        <p className="text-sm font-mono font-semibold text-[var(--text)]">
          {service.outputDescription}
        </p>
      </div>

      {/* Value */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-[10px] text-[var(--text3)] mb-0.5">Ekonomiskt värde</p>
          <p className="text-lg font-bold font-mono" style={{ color: service.color }}>
            {service.annualValueSEK.toLocaleString('sv-SE')} <span className="text-xs font-normal text-[var(--text3)]">SEK/år</span>
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--text3)] mb-0.5">Pris per hektar</p>
          <p className="text-sm font-mono text-[var(--text)]">
            {service.pricePerHa} <span className="text-[10px] text-[var(--text3)]">SEK/ha/år</span>
          </p>
          <p className="text-[10px] text-[var(--text3)]">
            (intervall: {service.priceLow}–{service.priceHigh})
          </p>
        </div>
      </div>

      {/* Trend & Verification */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-1 text-[10px]" style={{ color: trend.color }}>
          {trend.icon}
          <span>{trend.label}</span>
        </div>
        <div className="w-px h-3 bg-[var(--border)]" />
        <div className="flex items-center gap-1 text-[10px] text-[var(--text3)]">
          {verification.icon}
          <span>{verification.label}</span>
        </div>
      </div>

      {/* Buyers preview */}
      {service.buyers.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] text-[var(--text3)] mb-1">Potentiella köpare</p>
          <div className="flex flex-wrap gap-1.5">
            {service.buyers.slice(0, 3).map(buyer => (
              <span
                key={buyer.id}
                className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--text2)]"
              >
                {buyer.name}
              </span>
            ))}
            {service.buyers.length > 3 && (
              <span className="text-[10px] text-[var(--text3)]">+{service.buyers.length - 3} till</span>
            )}
          </div>
        </div>
      )}

      {/* Action */}
      {isCarbon ? (
        <Link
          to="/owner/carbon"
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-[var(--green)]/30 text-[var(--green)] hover:bg-[var(--green)]/10 transition-colors"
        >
          <Leaf size={14} />
          Se kolsida
        </Link>
      ) : service.status === 'potential' ? (
        <button
          onClick={handleActivate}
          disabled={activating}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-[var(--green)] text-[#030d05] hover:bg-[var(--green)]/90 transition-colors disabled:opacity-50"
        >
          {activating ? (
            <>
              <div className="w-3 h-3 rounded-full border-2 border-[#030d05]/30 border-t-[#030d05] animate-spin" />
              Aktiverar...
            </>
          ) : (
            'Aktivera tjänst'
          )}
        </button>
      ) : service.status === 'monetized' ? (
        <div className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20">
          <CheckCircle2 size={14} />
          Aktiv — intäkter genereras
        </div>
      ) : null}
    </div>
  );
}
