import { useTranslation } from 'react-i18next';
import type { SpeciesInfo } from '@/hooks/useForestProfile';

// ─── Stylized tree SVG icons ───

function SpruceIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 40" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 0L5 14h3L4 24h4L3 36h18L16 24h4L16 14h3L12 0z" opacity="0.85" />
      <rect x="10" y="36" width="4" height="4" rx="0.5" opacity="0.5" />
    </svg>
  );
}

function PineIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 40" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 4L6 16h4L5 28h14L14 16h4L12 4z" opacity="0.85" />
      <rect x="10" y="28" width="4" height="12" rx="0.5" opacity="0.4" />
    </svg>
  );
}

function BirchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 40" className={className} fill="currentColor" aria-hidden="true">
      <ellipse cx="12" cy="14" rx="8" ry="12" opacity="0.7" />
      <ellipse cx="9" cy="10" rx="5" ry="6" opacity="0.85" />
      <rect x="11" y="22" width="2" height="18" rx="1" opacity="0.5" />
    </svg>
  );
}

function OakIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 40" className={className} fill="currentColor" aria-hidden="true">
      <ellipse cx="12" cy="14" rx="10" ry="13" opacity="0.8" />
      <circle cx="7" cy="10" r="5" opacity="0.9" />
      <circle cx="17" cy="11" r="4" opacity="0.85" />
      <rect x="11" y="24" width="2" height="16" rx="1" opacity="0.5" />
    </svg>
  );
}

function GenericTreeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 40" className={className} fill="currentColor" aria-hidden="true">
      <ellipse cx="12" cy="16" rx="9" ry="14" opacity="0.8" />
      <rect x="11" y="26" width="2" height="14" rx="1" opacity="0.5" />
    </svg>
  );
}

const TREE_ICON_MAP: Record<string, typeof SpruceIcon> = {
  spruce: SpruceIcon,
  pine: PineIcon,
  birch: BirchIcon,
  oak: OakIcon,
  alder: BirchIcon,
  beech: OakIcon,
  other: GenericTreeIcon,
};

const SPECIES_COLORS: Record<string, string> = {
  spruce: '#22c55e',
  pine: '#84cc16',
  birch: '#a3e635',
  oak: '#65a30d',
  alder: '#4ade80',
  beech: '#16a34a',
  other: '#86efac',
};

interface SpeciesBreakdownVisualProps {
  species: SpeciesInfo[];
}

export function SpeciesBreakdownVisual({ species }: SpeciesBreakdownVisualProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      {/* Visual proportional tree row */}
      <div className="flex items-end justify-center gap-1 py-3 px-2" role="img" aria-label={t('forestProfile.speciesBreakdown')}>
        {species.map((sp) => {
          const TreeIcon = TREE_ICON_MAP[sp.icon] ?? GenericTreeIcon;
          const color = SPECIES_COLORS[sp.icon] ?? SPECIES_COLORS.other;
          // Scale tree count proportionally (min 1, max 8)
          const count = Math.max(1, Math.min(8, Math.round(sp.percentage / 12)));
          const size = sp.percentage >= 40 ? 'h-10 w-5' : sp.percentage >= 20 ? 'h-8 w-4' : 'h-6 w-3';
          return (
            <div key={sp.id} className="flex items-end gap-0.5" title={`${sp.name} ${sp.percentage}%`}>
              {Array.from({ length: count }).map((_, i) => (
                <TreeIcon
                  key={i}
                  className={`${size} transition-transform hover:scale-110`}
                  // @ts-expect-error style prop for SVG color
                  style={{ color }}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* Species detail cards */}
      <div className="space-y-3">
        {species.map((sp) => {
          const color = SPECIES_COLORS[sp.icon] ?? SPECIES_COLORS.other;
          return (
            <div key={sp.id} className="rounded-lg border border-[var(--border)] p-3" style={{ background: 'var(--bg)' }}>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-[var(--text)]">
                      {t(`forestProfile.species.${sp.icon}`, sp.name)}
                    </span>
                    {sp.latinName && (
                      <span className="text-[10px] italic text-[var(--text3)]">{sp.latinName}</span>
                    )}
                  </div>
                </div>
                <span className="text-sm font-mono font-bold text-[var(--text)]">{sp.percentage}%</span>
              </div>

              {/* Percentage bar */}
              <div className="h-2 rounded-full bg-[var(--bg3)] overflow-hidden mb-2">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${sp.percentage}%`, backgroundColor: color }}
                />
              </div>

              {/* Age and description */}
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg3)] text-[var(--text3)]">
                  {t(`forestProfile.ageClass.${sp.ageClass}`)}
                </span>
                <span className="text-[10px] text-[var(--text3)]">
                  ~{sp.ageYears} {t('forestProfile.years')}
                </span>
              </div>

              <p className="text-[11px] leading-relaxed text-[var(--text2)]">
                {t(`forestProfile.speciesDescription.${sp.icon}`, {
                  percentage: sp.percentage,
                  age: sp.ageYears,
                })}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
