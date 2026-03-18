/**
 * OtherRevenue — Additional non-timber revenue streams.
 *
 * Wind power, telecom towers, gravel extraction, water rights,
 * solar parks, and event venues. Revenue comparison and total summary.
 */

import { useState } from 'react';
import {
  Wind,
  Radio,
  Mountain,
  Droplets,
  Sun,
  Calendar,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  MapPin,
  CheckCircle2,
  Clock,
  XCircle,
  Sparkles,
} from 'lucide-react';
import type { OtherRevenueStream, NonTimberSummary } from '@/hooks/useNonTimberIncome';

interface OtherRevenueProps {
  streams: OtherRevenueStream[];
  totalIncome: number;
  summary: NonTimberSummary;
}

function formatSEK(v: number): string {
  return v.toLocaleString('sv-SE');
}

const TYPE_ICONS: Record<OtherRevenueStream['type'], React.ReactNode> = {
  wind_power: <Wind size={14} />,
  telecom: <Radio size={14} />,
  gravel: <Mountain size={14} />,
  water: <Droplets size={14} />,
  solar: <Sun size={14} />,
  events: <Calendar size={14} />,
};

const TYPE_COLORS: Record<OtherRevenueStream['type'], string> = {
  wind_power: '#60a5fa',
  telecom: '#a78bfa',
  gravel: '#f59e0b',
  water: '#22d3ee',
  solar: '#fbbf24',
  events: '#f472b6',
};

function statusInfo(status: OtherRevenueStream['status']) {
  const map = {
    active: { icon: <CheckCircle2 size={12} />, label: 'Aktiv', cls: 'bg-[var(--green)]/10 text-[var(--green)]' },
    under_negotiation: { icon: <Clock size={12} />, label: 'Under förhandling', cls: 'bg-amber-500/10 text-amber-400' },
    potential: { icon: <Sparkles size={12} />, label: 'Potential', cls: 'bg-blue-500/10 text-blue-400' },
    not_suitable: { icon: <XCircle size={12} />, label: 'Ej lämplig', cls: 'bg-red-500/10 text-red-400' },
  };
  return map[status];
}

function RevenueStreamCard({ stream }: { stream: OtherRevenueStream }) {
  const [expanded, setExpanded] = useState(false);
  const si = statusInfo(stream.status);
  const color = TYPE_COLORS[stream.type];

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-[var(--bg3)] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}15`, color }}
          >
            {TYPE_ICONS[stream.type]}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-semibold text-[var(--text)] truncate">{stream.nameSv}</span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${si.cls}`}>
                {si.icon} {si.label}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-[var(--text3)]">
              {stream.parcelName && (
                <span className="flex items-center gap-1">
                  <MapPin size={10} /> {stream.parcelName}
                </span>
              )}
              {stream.annualRevenueSEK > 0 ? (
                <span className="font-mono text-[var(--green)]">{formatSEK(stream.annualRevenueSEK)} SEK/år</span>
              ) : (
                <span className="font-mono" style={{ color }}>Potential: {formatSEK(stream.potentialRevenueSEK)} SEK/år</span>
              )}
            </div>
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="text-[var(--text3)] flex-shrink-0" /> : <ChevronDown size={16} className="text-[var(--text3)] flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[var(--border)] pt-3 space-y-3">
          <p className="text-xs text-[var(--text2)]">{stream.descriptionSv}</p>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-center">
              <p className="text-[10px] text-[var(--text3)]">Nuvarande intäkt</p>
              <p className="text-sm font-mono font-semibold text-[var(--text)]">{formatSEK(stream.annualRevenueSEK)} SEK/år</p>
            </div>
            <div className="p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-center">
              <p className="text-[10px] text-[var(--text3)]">Potential</p>
              <p className="text-sm font-mono font-semibold" style={{ color }}>{formatSEK(stream.potentialRevenueSEK)} SEK/år</p>
            </div>
          </div>

          {stream.requirements && stream.requirements.length > 0 && (
            <div>
              <p className="text-[10px] text-[var(--text3)] mb-1.5 uppercase tracking-wider">Krav</p>
              <ul className="space-y-1">
                {stream.requirements.map(r => (
                  <li key={r} className="flex items-start gap-1.5 text-[10px] text-[var(--text2)]">
                    <span className="text-[var(--text3)] mt-0.5">&bull;</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function OtherRevenue({ streams, totalIncome, summary }: OtherRevenueProps) {
  const [_showComparison, _setShowComparison] = useState(true);

  const activeStreams = streams.filter(s => s.status === 'active');
  const potentialTotal = streams
    .filter(s => s.status !== 'active' && s.status !== 'not_suitable')
    .reduce((acc, s) => acc + s.potentialRevenueSEK, 0);

  const revenueTypes = [
    { label: 'Jaktarrende', value: summary.huntingIncome, color: '#4ade80' },
    { label: 'Friluftsliv', value: summary.recreationIncome, color: '#60a5fa' },
    { label: 'Svamp & Bär', value: summary.foragingIncome, color: '#f97316' },
    { label: 'Övriga intäkter', value: summary.otherIncome, color: '#a78bfa' },
  ];

  const maxRevenue = Math.max(...revenueTypes.map(r => r.value), 1);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <TrendingUp size={16} className="text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">Övriga intäkter</p>
              <p className="text-[10px] text-[var(--text3)]">{activeStreams.length} aktiva inkomstflöden</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-mono font-bold text-purple-400">{formatSEK(totalIncome)} <span className="text-xs text-[var(--text3)]">SEK/år</span></p>
          </div>
        </div>

        {potentialTotal > 0 && (
          <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-start gap-2">
              <Sparkles size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-blue-400">Outnyttjad potential</p>
                <p className="text-[10px] text-blue-400/80 mt-0.5">
                  Ytterligare {formatSEK(potentialTotal)} SEK/år möjligt från vindkraft, solpark och övriga intäkter under utredning.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Revenue streams */}
      <div className="space-y-2">
        {streams.map(stream => (
          <RevenueStreamCard key={stream.id} stream={stream} />
        ))}
      </div>

      {/* Market reference */}
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <p className="text-xs font-semibold text-[var(--text)] mb-3">Typiska arrendenivåer i Sverige</p>
        <div className="space-y-2">
          {[
            { label: 'Vindkraft', range: '20 000-50 000 SEK/turbin/år', color: '#60a5fa' },
            { label: 'Telekommast', range: '15 000-40 000 SEK/mast/år', color: '#a78bfa' },
            { label: 'Grustäkt', range: '2-5 SEK/ton uttag', color: '#f59e0b' },
            { label: 'Solpark', range: '5 000-15 000 SEK/ha/år', color: '#fbbf24' },
            { label: 'Vattentäkt', range: '5 000-25 000 SEK/år', color: '#22d3ee' },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
              <span className="text-xs text-[var(--text)]" style={{ color: item.color }}>{item.label}</span>
              <span className="text-[10px] font-mono text-[var(--text2)]">{item.range}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Total non-timber summary */}
      <div className="rounded-xl border border-[var(--green)]/30 p-4" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-[var(--green)]" />
          <p className="text-sm font-semibold text-[var(--text)]">Total icke-virkes intäkter</p>
        </div>

        {/* Revenue bar chart */}
        <div className="space-y-2 mb-4">
          {revenueTypes.map(r => (
            <div key={r.label} className="flex items-center gap-3">
              <span className="text-[10px] text-[var(--text3)] w-20 flex-shrink-0">{r.label}</span>
              <div className="flex-1 h-5 rounded-full bg-[var(--bg)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(r.value / maxRevenue) * 100}%`, background: r.color }}
                />
              </div>
              <span className="text-[10px] font-mono text-[var(--text)] w-20 text-right flex-shrink-0">{formatSEK(r.value)}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[var(--border)]">
          <div className="text-center">
            <p className="text-xl font-mono font-bold text-[var(--green)]">{formatSEK(summary.totalAnnualIncome)}</p>
            <p className="text-[10px] text-[var(--text3)]">SEK/år totalt</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-mono font-bold text-[var(--text)]">{summary.incomePerHa}</p>
            <p className="text-[10px] text-[var(--text3)]">SEK/ha/år</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-mono font-bold text-blue-400">+{formatSEK(summary.potentialAdditional)}</p>
            <p className="text-[10px] text-[var(--text3)]">SEK/år potential</p>
          </div>
        </div>

        <div className="mt-3 p-2.5 rounded-lg bg-[var(--green)]/5 border border-[var(--green)]/20">
          <p className="text-[10px] text-[var(--green)]">
            Dina icke-virkes intäkter motsvarar {summary.incomePerHa} SEK/ha/år &mdash; {summary.incomePerHa > 300 ? 'bra nivå! Fortsätt utforska nya möjligheter.' : 'det finns stor potential att öka. Södra och Stora Enso fokuserar bara på virke.'}
          </p>
        </div>
      </div>
    </div>
  );
}
