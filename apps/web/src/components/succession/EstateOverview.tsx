/**
 * EstateOverview — Current estate visualization for succession planning.
 *
 * Shows total estimated value with breakdown, parcel cards,
 * value trend, and skogsbruksvarde vs marknadsvarde comparison.
 */

import { useTranslation } from 'react-i18next';
import {
  TreePine,
  Landmark,
  Leaf,
  Target,
  TrendingUp,
  MapPin,
  ArrowUpRight,
} from 'lucide-react';
import type { EstateValuation } from '@/hooks/useSuccessionPlan';
import { formatSEK } from '@/services/successionService';

interface EstateOverviewProps {
  estate: EstateValuation;
}

const VALUE_CATEGORIES = [
  { key: 'timber', icon: TreePine, color: '#4ade80', labelEn: 'Standing timber', labelSv: 'Staende virke' },
  { key: 'land', icon: Landmark, color: '#60a5fa', labelEn: 'Land value', labelSv: 'Markvarde' },
  { key: 'carbon', icon: Leaf, color: '#a78bfa', labelEn: 'Carbon credits', labelSv: 'Kolkrediter' },
  { key: 'hunting', icon: Target, color: '#f59e0b', labelEn: 'Hunting rights', labelSv: 'Jaktratt' },
] as const;

export function EstateOverview({ estate }: EstateOverviewProps) {
  const { i18n } = useTranslation();
  const isSv = i18n.language === 'sv';

  const valueMap: Record<string, number> = {
    timber: estate.timberValue,
    land: estate.landValue,
    carbon: estate.carbonCreditsValue,
    hunting: estate.huntingRightsValue,
  };

  const avgTrend =
    estate.valueTrend.length > 0
      ? estate.valueTrend.reduce((s, v) => s + v, 0) / estate.valueTrend.length
      : 0;

  return (
    <div className="space-y-5">
      {/* Total value hero */}
      <div
        className="rounded-xl border border-[var(--border)] p-5"
        style={{ background: 'var(--bg2)' }}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-[var(--text3)]">
            {isSv ? 'Totalt uppskattat varde' : 'Total estimated value'}
          </span>
          <span className="flex items-center gap-1 text-[10px] font-mono text-[var(--green)] bg-[var(--green)]/10 px-2 py-0.5 rounded-full">
            <TrendingUp size={10} />
            +{avgTrend.toFixed(1)}% {isSv ? '/ar' : '/yr'}
          </span>
        </div>
        <p className="text-3xl font-bold font-mono text-[var(--text)] mb-4">
          {formatSEK(estate.totalValue)}
        </p>

        {/* Value breakdown bar */}
        <div className="h-3 rounded-full overflow-hidden flex mb-3">
          {VALUE_CATEGORIES.map(({ key, color }) => {
            const pct = estate.totalValue > 0 ? (valueMap[key] / estate.totalValue) * 100 : 0;
            return (
              <div
                key={key}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            );
          })}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {VALUE_CATEGORIES.map(({ key, icon: Icon, color, labelEn, labelSv }) => {
            const val = valueMap[key];
            const pct = estate.totalValue > 0 ? (val / estate.totalValue) * 100 : 0;
            return (
              <div key={key} className="flex items-start gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: `${color}15`, color }}
                >
                  <Icon size={14} />
                </div>
                <div>
                  <p className="text-xs text-[var(--text3)]">{isSv ? labelSv : labelEn}</p>
                  <p className="text-sm font-mono font-semibold text-[var(--text)]">
                    {formatSEK(val)}
                  </p>
                  <p className="text-[10px] text-[var(--text3)]">{pct.toFixed(1)}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Skogsbruksvarde vs Marknadsvarde */}
      <div
        className="rounded-xl border border-[var(--border)] p-4"
        style={{ background: 'var(--bg2)' }}
      >
        <h3 className="text-xs font-semibold text-[var(--text)] mb-3">
          {isSv ? 'Skogsbruksvarde vs Marknadsvarde' : 'Forestry value vs Market value'}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-[var(--border)] p-3" style={{ background: 'var(--bg)' }}>
            <p className="text-[10px] text-[var(--text3)] mb-1">
              {isSv ? 'Skogsbruksvarde' : 'Forestry value'}
            </p>
            <p className="text-lg font-mono font-bold text-[var(--text)]">
              {formatSEK(estate.skogsbruksvarde)}
            </p>
            <p className="text-[10px] text-[var(--text3)] mt-1">
              {isSv ? 'Avkastningsvarde for skogsbruk' : 'Yield value for forestry operations'}
            </p>
          </div>
          <div className="rounded-lg border border-[var(--green)]/20 bg-[var(--green)]/5 p-3">
            <p className="text-[10px] text-[var(--text3)] mb-1">
              {isSv ? 'Marknadsvarde' : 'Market value'}
            </p>
            <p className="text-lg font-mono font-bold text-[var(--green)]">
              {formatSEK(estate.marknadsvarde)}
            </p>
            <p className="text-[10px] text-[var(--text3)] mt-1">
              {isSv
                ? 'Forvantat pris vid forsaljning'
                : 'Expected price at sale'}
            </p>
          </div>
        </div>
        <p className="text-[10px] text-[var(--text3)] mt-2">
          {isSv
            ? 'Marknadsvarde ar ofta 25-40% hogre an skogsbruksvarde pa grund av icke-produktiva varden (jakt, rekreation, tillvaxt).'
            : 'Market value is often 25-40% higher than forestry value due to non-productive values (hunting, recreation, growth potential).'}
        </p>
      </div>

      {/* Parcel cards */}
      <div>
        <h3 className="text-xs font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
          <TreePine size={14} className="text-[var(--green)]" />
          {isSv ? 'Skiften' : 'Parcels'}
          <span className="text-[var(--text3)] font-normal">
            ({estate.parcels.length} st, {estate.totalAreaHa} ha)
          </span>
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {estate.parcels.map((parcel) => {
            const total =
              parcel.timberValueSEK +
              parcel.landValueSEK +
              parcel.huntingRightsValueSEK +
              parcel.carbonCreditsValueSEK;

            return (
              <div
                key={parcel.id}
                className="rounded-xl border border-[var(--border)] p-4"
                style={{ background: 'var(--bg2)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-[var(--green)]" />
                    <span className="text-sm font-semibold text-[var(--text)]">
                      {parcel.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--text3)] bg-[var(--bg3)] px-2 py-0.5 rounded-full">
                    {parcel.percentOfTotal.toFixed(1)}%
                  </span>
                </div>

                <p className="text-xl font-mono font-bold text-[var(--text)] mb-2">
                  {formatSEK(total)}
                </p>

                <div className="space-y-1.5 text-[10px]">
                  <div className="flex justify-between text-[var(--text3)]">
                    <span>{isSv ? 'Areal' : 'Area'}</span>
                    <span className="font-mono text-[var(--text2)]">{parcel.areaHa} ha</span>
                  </div>
                  <div className="flex justify-between text-[var(--text3)]">
                    <span>{isSv ? 'Virke' : 'Timber'}</span>
                    <span className="font-mono text-[var(--text2)]">
                      {formatSEK(parcel.timberValueSEK)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[var(--text3)]">
                    <span>{isSv ? 'Mark' : 'Land'}</span>
                    <span className="font-mono text-[var(--text2)]">
                      {formatSEK(parcel.landValueSEK)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[var(--text3)]">
                    <span>{isSv ? 'Kol' : 'Carbon'}</span>
                    <span className="font-mono text-[var(--text2)]">
                      {formatSEK(parcel.carbonCreditsValueSEK)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[var(--text3)]">
                    <span>{isSv ? 'Jakt' : 'Hunting'}</span>
                    <span className="font-mono text-[var(--text2)]">
                      {formatSEK(parcel.huntingRightsValueSEK)}
                    </span>
                  </div>
                </div>

                {/* Quality badges */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--bg3)] text-[var(--text3)]">
                    {parcel.locationQuality}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--bg3)] text-[var(--text3)]">
                    {isSv ? 'vag' : 'road'}: {parcel.accessRoadQuality}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--bg3)] text-[var(--text3)]">
                    {isSv ? 'tillvaxt' : 'growth'}: {parcel.futureGrowthPotential}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Value trend */}
      <div
        className="rounded-xl border border-[var(--border)] p-4"
        style={{ background: 'var(--bg2)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-[var(--text)] flex items-center gap-2">
            <TrendingUp size={14} className="text-[var(--green)]" />
            {isSv ? 'Vardetrend (senaste 5 aren)' : 'Value trend (last 5 years)'}
          </h3>
          <span className="flex items-center gap-1 text-[10px] text-[var(--green)]">
            <ArrowUpRight size={10} />
            +{avgTrend.toFixed(1)}% {isSv ? 'snitt/ar' : 'avg/yr'}
          </span>
        </div>

        {/* Simple bar chart */}
        <div className="flex items-end gap-2 h-20">
          {estate.valueTrend.map((pct, i) => {
            const maxPct = Math.max(...estate.valueTrend);
            const barHeight = maxPct > 0 ? (pct / maxPct) * 100 : 0;
            const year = new Date().getFullYear() - estate.valueTrend.length + i + 1;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] font-mono text-[var(--green)]">
                  +{pct.toFixed(1)}%
                </span>
                <div
                  className="w-full rounded-t-md bg-[var(--green)]/20 border border-[var(--green)]/30 relative"
                  style={{ height: `${barHeight}%`, minHeight: '8px' }}
                >
                  <div
                    className="absolute bottom-0 left-0 right-0 rounded-t-md bg-[var(--green)]"
                    style={{ height: `${barHeight}%` }}
                  />
                </div>
                <span className="text-[9px] text-[var(--text3)]">{year}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
