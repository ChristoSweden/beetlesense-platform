import { useTranslation } from 'react-i18next';
import {
  TreePine,
  Palette,
  Flame,
  Droplets,
  Sprout,
  Wind,
  HelpCircle,
} from 'lucide-react';
import type { ObservationType } from '@/services/satelliteValidationService';
import type { ReactNode } from 'react';

interface ObservationSelectorProps {
  selected: ObservationType | null;
  onSelect: (type: ObservationType) => void;
}

interface ObservationOption {
  type: ObservationType;
  icon: ReactNode;
  color: string;
  indices: string;
}

const OPTIONS: ObservationOption[] = [
  {
    type: 'thinning_crowns',
    icon: <TreePine size={24} />,
    color: '#f59e0b',
    indices: 'NDVI + Canopy',
  },
  {
    type: 'color_change',
    icon: <Palette size={24} />,
    color: '#ef4444',
    indices: 'NDVI + Chlorophyll',
  },
  {
    type: 'dry_trees',
    icon: <Flame size={24} />,
    color: '#f97316',
    indices: 'Moisture + NDVI',
  },
  {
    type: 'wet_area',
    icon: <Droplets size={24} />,
    color: '#3b82f6',
    indices: 'Soil Moisture + NDWI',
  },
  {
    type: 'unusual_growth',
    icon: <Sprout size={24} />,
    color: '#4ade80',
    indices: 'NDVI + Canopy + CHL',
  },
  {
    type: 'wind_damage',
    icon: <Wind size={24} />,
    color: '#8b5cf6',
    indices: 'Canopy + NDVI',
  },
  {
    type: 'other',
    icon: <HelpCircle size={24} />,
    color: '#6b7280',
    indices: 'NDVI + Moisture + Canopy',
  },
];

export function ObservationSelector({ selected, onSelect }: ObservationSelectorProps) {
  const { t } = useTranslation();

  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--text)] mb-3">
        {t('satelliteCheck.whatDidYouNotice')}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {OPTIONS.map((opt) => {
          const isSelected = selected === opt.type;
          return (
            <button
              key={opt.type}
              onClick={() => onSelect(opt.type)}
              className={`
                relative flex flex-col items-center gap-2 p-4 rounded-xl border text-center
                transition-all duration-150 cursor-pointer
                ${
                  isSelected
                    ? 'border-[var(--green)] bg-[var(--green)]/8'
                    : 'border-[var(--border)] hover:border-[var(--border2)] hover:bg-[var(--bg3)]'
                }
              `}
              aria-pressed={isSelected}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{
                  background: `${opt.color}15`,
                  color: isSelected ? opt.color : 'var(--text3)',
                }}
              >
                {opt.icon}
              </div>
              <span className={`text-xs font-medium ${isSelected ? 'text-[var(--green)]' : 'text-[var(--text)]'}`}>
                {t(`satelliteCheck.types.${opt.type}`)}
              </span>
              <span className="text-[10px] font-mono text-[var(--text3)]">
                {opt.indices}
              </span>
              {isSelected && (
                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--green)]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
