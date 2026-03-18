/**
 * CountryStatus — Country cards showing outbreak status, severity, trend, and relevance for Sweden.
 */

import { TrendingUp, TrendingDown, Minus, MapPin, TreePine, DollarSign, Shield } from 'lucide-react';
import type { CountryOutbreak, OutbreakSeverity, TrendDirection } from '@/hooks/useCrossBorderAlert';

const SEVERITY_COLORS: Record<OutbreakSeverity, { bg: string; text: string; label: string }> = {
  critical: { bg: 'rgba(239,68,68,0.15)', text: '#ef4444', label: 'Kritisk' },
  severe: { bg: 'rgba(249,115,22,0.15)', text: '#f97316', label: 'Allvarlig' },
  moderate: { bg: 'rgba(234,179,8,0.15)', text: '#eab308', label: 'Måttlig' },
  low: { bg: 'rgba(74,222,128,0.15)', text: '#4ade80', label: 'Låg' },
  minimal: { bg: 'rgba(107,114,128,0.15)', text: '#6b7280', label: 'Minimal' },
};

const TREND_CONFIG: Record<TrendDirection, { icon: typeof TrendingUp; color: string; label: string }> = {
  expanding: { icon: TrendingUp, color: '#ef4444', label: 'Expanderar' },
  stable: { icon: Minus, color: '#eab308', label: 'Stabilt' },
  declining: { icon: TrendingDown, color: '#4ade80', label: 'Minskande' },
};

interface CountryStatusProps {
  countries: CountryOutbreak[];
}

export function CountryStatus({ countries }: CountryStatusProps) {
  // Sort by relevance for Sweden descending
  const sorted = [...countries].sort((a, b) => b.relevanceForSweden - a.relevanceForSweden);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-[var(--text)]">Länderstatus</h3>
        <span className="text-[10px] text-[var(--text3)]">
          Sorterat efter relevans för Sverige
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {sorted.map((country) => (
          <CountryCard key={country.id} country={country} />
        ))}
      </div>
    </div>
  );
}

function CountryCard({ country }: { country: CountryOutbreak }) {
  const sev = SEVERITY_COLORS[country.severity];
  const trend = TREND_CONFIG[country.trend];
  const TrendIcon = trend.icon;

  const relevanceColor =
    country.relevanceForSweden >= 80
      ? '#ef4444'
      : country.relevanceForSweden >= 60
        ? '#f97316'
        : country.relevanceForSweden >= 40
          ? '#eab308'
          : '#4ade80';

  return (
    <div
      className="rounded-xl border border-[var(--border)] overflow-hidden hover:border-[var(--text3)] transition-colors"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between p-3 pb-2">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{country.flag}</span>
          <div>
            <div className="text-sm font-semibold text-[var(--text)]">{country.country}</div>
            <div className="text-[10px] text-[var(--text3)]">Sedan {country.yearDetected}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
            style={{ background: sev.bg, color: sev.text }}
          >
            {sev.label}
          </span>
          <div className="flex items-center gap-1" style={{ color: trend.color }}>
            <TrendIcon size={12} />
            <span className="text-[10px] font-medium">{trend.label}</span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-px bg-[var(--border)]">
        <StatCell
          icon={<TreePine size={12} />}
          label="Drabbad areal"
          value={`${(country.totalAffectedHa / 1000).toFixed(0)}k ha`}
          color="#f97316"
        />
        <StatCell
          icon={<TreePine size={12} />}
          label="m3 förlust"
          value={`${(country.cubicMetersLost / 1000000).toFixed(0)}M`}
          color="#ef4444"
        />
        <StatCell
          icon={<DollarSign size={12} />}
          label="Ekonomisk skada"
          value={`${(country.economicDamageMSEK / 1000).toFixed(1)} mdr SEK`}
          color="#eab308"
        />
        <StatCell
          icon={<Shield size={12} />}
          label="Bekämpningseffekt"
          value={`${country.responseEffectiveness}%`}
          color={country.responseEffectiveness >= 60 ? '#4ade80' : country.responseEffectiveness >= 40 ? '#eab308' : '#ef4444'}
        />
      </div>

      {/* Bottom row */}
      <div className="p-3 pt-2 border-t border-[var(--border)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <MapPin size={12} className="text-[var(--text3)]" />
            <span className="text-[10px] text-[var(--text3)]">
              {country.distanceToSwedenKm === 0
                ? 'Gränsar till Sverige'
                : `${country.distanceToSwedenKm} km till Sverige`}
            </span>
          </div>
        </div>

        {/* Relevance bar */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--text3)] flex-shrink-0">Relevans</span>
          <div className="flex-1 h-2 rounded-full bg-[var(--bg3)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${country.relevanceForSweden}%`,
                background: relevanceColor,
              }}
            />
          </div>
          <span
            className="text-xs font-mono font-bold flex-shrink-0"
            style={{ color: relevanceColor }}
          >
            {country.relevanceForSweden}%
          </span>
        </div>

        {/* Species */}
        <div className="flex flex-wrap gap-1 mt-2">
          {country.speciesAffected.map((sp) => (
            <span
              key={sp}
              className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--bg3)] text-[var(--text3)]"
            >
              {sp}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCell({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="p-2.5" style={{ background: 'var(--bg2)' }}>
      <div className="flex items-center gap-1 mb-1">
        <span style={{ color }} className="opacity-60">
          {icon}
        </span>
        <span className="text-[9px] text-[var(--text3)]">{label}</span>
      </div>
      <div className="text-sm font-mono font-bold text-[var(--text)]">{value}</div>
    </div>
  );
}
