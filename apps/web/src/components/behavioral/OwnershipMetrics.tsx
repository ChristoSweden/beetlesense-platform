import { TreePine, Heart, Wind, AlertTriangle, Bug, Leaf } from 'lucide-react';
import {
  frameEndowment,
  estimateTreeCount,
  estimateCO2Absorption,
  co2ToPeople,
} from '@/services/behavioralFraming';

interface OwnershipMetricsProps {
  /** Area in hectares */
  areaHa: number;
  /** Owner's first name (optional, defaults to "Dina") */
  ownerName?: string;
  /** Override tree count (otherwise estimated from area) */
  treeCount?: number;
  /** Average tree age in years */
  avgTreeAge?: number;
  /** Number of healthy trees */
  healthyTrees?: number;
  /** Number of stressed trees */
  stressedTrees?: number;
  /** Number of trees under active attack */
  attackedTrees?: number;
  /** Dominant species */
  dominantSpecies?: string;
}

interface MetricRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  subtext?: string;
}

function MetricRow({ icon, label, value, color, subtext }: MetricRowProps) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: `${color}15`, color }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--text, #e5e7eb)' }}>{label}</p>
        <p className="text-lg font-bold font-mono" style={{ color }}>{value}</p>
        {subtext && (
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text3, #6b7280)' }}>{subtext}</p>
        )}
      </div>
    </div>
  );
}

export function OwnershipMetrics({
  areaHa,
  ownerName,
  treeCount: treeCountProp,
  avgTreeAge = 65,
  healthyTrees: healthyProp,
  stressedTrees: stressedProp,
  attackedTrees: attackedProp,
  dominantSpecies = 'gran',
}: OwnershipMetricsProps) {
  const totalTrees = treeCountProp ?? estimateTreeCount(areaHa);
  const stressedTrees = stressedProp ?? Math.round(totalTrees * 0.022);
  const attackedTrees = attackedProp ?? Math.round(totalTrees * 0.0016);
  const healthyTrees = healthyProp ?? (totalTrees - stressedTrees - attackedTrees);

  const co2 = estimateCO2Absorption(areaHa);
  const people = co2ToPeople(co2);

  const endowment = frameEndowment(areaHa, totalTrees, ownerName);

  return (
    <div
      className="rounded-2xl border p-5"
      style={{
        background: 'var(--bg2, #0a1f0d)',
        borderColor: 'var(--border, #1a3a1f)',
      }}
    >
      {/* Header — personalized */}
      <div className="mb-1">
        <p className="text-xl font-bold" style={{ color: '#22c55e' }}>
          {endowment.personalLabel}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text3, #6b7280)' }}>
          {endowment.treeLabel}
        </p>
      </div>

      {/* Divider */}
      <div className="h-px w-full my-3" style={{ background: 'var(--border, #1a3a1f)' }} />

      {/* Metrics */}
      <div className="space-y-0 divide-y" style={{ borderColor: 'var(--border, #1a3a1f)' }}>
        <MetricRow
          icon={<TreePine size={16} />}
          label={`${ownerName ? ownerName + 's' : 'Dina'} äldsta ${dominantSpecies}ar`}
          value={`~${avgTreeAge} år`}
          color="#22c55e"
          subtext={`Mogna träd med högt virkesvärde`}
        />

        <MetricRow
          icon={<Wind size={16} />}
          label={`${ownerName ? ownerName + 's' : 'Din'} skog andas åt`}
          value={`${people.toLocaleString('sv-SE')} människor`}
          color="#38bdf8"
          subtext={`${co2.toLocaleString('sv-SE')} ton CO₂ per år`}
        />

        {/* Health breakdown — traffic light */}
        <div className="py-3">
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: '#22c55e15', color: '#22c55e' }}
            >
              <Heart size={16} />
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text, #e5e7eb)' }}>
              Hälsostatus
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* Healthy */}
            <div
              className="rounded-xl p-3 text-center"
              style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.15)' }}
            >
              <div className="flex items-center justify-center gap-1 mb-1">
                <Leaf size={12} style={{ color: '#22c55e' }} />
              </div>
              <p className="text-lg font-bold font-mono" style={{ color: '#22c55e' }}>
                {healthyTrees.toLocaleString('sv-SE')}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--text3, #6b7280)' }}>Friska</p>
            </div>

            {/* Stressed */}
            <div
              className="rounded-xl p-3 text-center"
              style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.15)' }}
            >
              <div className="flex items-center justify-center gap-1 mb-1">
                <AlertTriangle size={12} style={{ color: '#f59e0b' }} />
              </div>
              <p className="text-lg font-bold font-mono" style={{ color: '#f59e0b' }}>
                {stressedTrees.toLocaleString('sv-SE')}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--text3, #6b7280)' }}>Stressade</p>
            </div>

            {/* Under attack */}
            <div
              className="rounded-xl p-3 text-center"
              style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.15)' }}
            >
              <div className="flex items-center justify-center gap-1 mb-1">
                <Bug size={12} style={{ color: '#ef4444' }} />
              </div>
              <p className="text-lg font-bold font-mono" style={{ color: '#ef4444' }}>
                {attackedTrees.toLocaleString('sv-SE')}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--text3, #6b7280)' }}>Under angrepp</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default OwnershipMetrics;
