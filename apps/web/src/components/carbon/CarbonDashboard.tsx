import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Leaf, TreePine, TrendingUp, Plane, Car, Zap } from 'lucide-react';
import {
  type ParcelCarbonResult,
  formatCO2,
  getEquivalences,
} from '@/services/carbonService';

// ─── Animated count-up ───

function useCountUp(target: number, duration = 1400, enabled = true): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || target <= 0) { setValue(target); return; }
    startRef.current = null;
    setValue(0);

    function animate(ts: number) {
      if (startRef.current === null) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration, enabled]);

  return value;
}

// ─── Animated tree SVG ───

function AnimatedTree({ progress }: { progress: number }) {
  // progress 0..1 represents carbon storage level
  const trunkH = 30 + progress * 40;
  const crownR = 10 + progress * 25;
  const opacity = 0.3 + progress * 0.7;

  return (
    <svg viewBox="0 0 100 120" className="w-full h-full" aria-hidden="true">
      {/* Ground */}
      <ellipse cx="50" cy="110" rx="35" ry="6" fill="var(--green)" opacity="0.15" />
      {/* Trunk */}
      <rect
        x="46"
        y={110 - trunkH}
        width="8"
        height={trunkH}
        rx="3"
        fill="#5a3e2b"
        opacity={opacity}
      >
        <animate attributeName="height" from="0" to={trunkH} dur="1.2s" fill="freeze" />
      </rect>
      {/* Crown layers */}
      {[0.9, 0.65, 0.4].map((scale, i) => (
        <ellipse
          key={i}
          cx="50"
          cy={110 - trunkH - i * crownR * 0.5}
          rx={crownR * scale}
          ry={crownR * scale * 0.7}
          fill="var(--green)"
          opacity={opacity * (0.5 + i * 0.15)}
        >
          <animate attributeName="rx" from="0" to={crownR * scale} dur={`${1 + i * 0.3}s`} fill="freeze" />
          <animate attributeName="ry" from="0" to={crownR * scale * 0.7} dur={`${1 + i * 0.3}s`} fill="freeze" />
        </ellipse>
      ))}
      {/* CO₂ particles floating up */}
      {[20, 40, 60, 75].map((x, i) => (
        <text
          key={i}
          x={x}
          y={90 - i * 15}
          fontSize="6"
          fill="var(--green)"
          opacity="0.3"
          className="font-mono"
        >
          CO₂
          <animateTransform
            attributeName="transform"
            type="translate"
            values={`0,0; 0,-20`}
            dur={`${2.5 + i * 0.5}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.3;0.1;0.3"
            dur={`${2.5 + i * 0.5}s`}
            repeatCount="indefinite"
          />
        </text>
      ))}
    </svg>
  );
}

// ─── Equivalence card ───

function EquivalenceCard({ icon, value, label }: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--green)]/10 text-[var(--green)]">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold font-mono text-[var(--text)]">{value}</p>
        <p className="text-[10px] text-[var(--text3)]">{label}</p>
      </div>
    </div>
  );
}

// ─── Main Component ───

interface CarbonDashboardProps {
  results: ParcelCarbonResult[];
}

export function CarbonDashboard({ results }: CarbonDashboardProps) {
  const { t } = useTranslation();

  const totals = useMemo(() => {
    const totalStored = results.reduce((s, r) => s + r.stock.totalCO2, 0);
    const totalAnnual = results.reduce((s, r) => s + r.annualSequestration, 0);
    return { totalStored, totalAnnual };
  }, [results]);

  const animatedStored = useCountUp(totals.totalStored);
  const animatedAnnual = useCountUp(totals.totalAnnual);

  const equivalences = useMemo(
    () => getEquivalences(totals.totalAnnual),
    [totals.totalAnnual],
  );

  // Tree progress based on average maturity (0-1 scale)
  const avgAge = results.reduce((s, r) => s + r.parcel.ageYears, 0) / (results.length || 1);
  const treeProgress = Math.min(avgAge / 80, 1);

  return (
    <div className="space-y-6">
      {/* Hero card */}
      <div className="rounded-xl border border-[var(--border)] p-6 relative overflow-hidden" style={{ background: 'var(--bg2)' }}>
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--green)]/5 to-transparent pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row items-center gap-6">
          {/* Animated tree */}
          <div className="w-32 h-36 flex-shrink-0">
            <AnimatedTree progress={treeProgress} />
          </div>

          {/* Numbers */}
          <div className="flex-1 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-2 mb-2">
              <Leaf size={18} className="text-[var(--green)]" />
              <span className="text-xs font-mono uppercase tracking-widest text-[var(--text3)]">
                {t('carbon.dashboard.totalStored')}
              </span>
            </div>
            <p className="text-4xl lg:text-5xl font-bold font-mono text-[var(--text)] tracking-tight">
              {formatCO2(animatedStored)}
              <span className="text-lg text-[var(--text3)] ml-2">{t('carbon.dashboard.tonCO2')}</span>
            </p>
            <div className="flex items-center justify-center lg:justify-start gap-2 mt-3">
              <TrendingUp size={14} className="text-[var(--green)]" />
              <span className="text-sm text-[var(--green)] font-medium">
                +{formatCO2(animatedAnnual)} {t('carbon.dashboard.tonPerYear')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Equivalences */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text)] mb-3">
          {t('carbon.dashboard.equivalences')}
        </h3>
        <p className="text-xs text-[var(--text3)] mb-3">
          {t('carbon.dashboard.equivalencesDesc')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <EquivalenceCard
            icon={<Plane size={16} />}
            value={formatCO2(equivalences.flights)}
            label={t('carbon.dashboard.flightsSthlmMalmo')}
          />
          <EquivalenceCard
            icon={<Car size={16} />}
            value={formatCO2(equivalences.carsPerYear)}
            label={t('carbon.dashboard.carsPerYear')}
          />
          <EquivalenceCard
            icon={<Zap size={16} />}
            value={formatCO2(equivalences.households)}
            label={t('carbon.dashboard.householdsPerYear')}
          />
        </div>
      </div>

      {/* Per-parcel breakdown */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text)] mb-3">
          {t('carbon.dashboard.parcelBreakdown')}
        </h3>
        <div className="space-y-3">
          {results.map((r) => {
            const pct = totals.totalStored > 0 ? (r.stock.totalCO2 / totals.totalStored) * 100 : 0;
            return (
              <div
                key={r.parcel.id}
                className="rounded-lg border border-[var(--border)] p-4"
                style={{ background: 'var(--bg2)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TreePine size={14} className="text-[var(--green)]" />
                    <span className="text-sm font-medium text-[var(--text)]">{r.parcel.name}</span>
                  </div>
                  <span className="text-xs font-mono text-[var(--text3)]">
                    {r.parcel.areaHa} ha &middot; {r.parcel.ageYears} {t('carbon.dashboard.years')}
                  </span>
                </div>
                <div className="flex items-center gap-4 mb-2">
                  <div>
                    <p className="text-lg font-semibold font-mono text-[var(--text)]">
                      {formatCO2(r.stock.totalCO2)}
                    </p>
                    <p className="text-[10px] text-[var(--text3)]">{t('carbon.dashboard.tonCO2Stored')}</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold font-mono text-[var(--green)]">
                      +{formatCO2(r.annualSequestration)}
                    </p>
                    <p className="text-[10px] text-[var(--text3)]">{t('carbon.dashboard.tonPerYear')}</p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 rounded-full bg-[var(--bg3)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--green)] transition-all duration-1000"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[10px] text-[var(--text3)] mt-1">
                  {pct.toFixed(1)}% {t('carbon.dashboard.ofTotal')}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
