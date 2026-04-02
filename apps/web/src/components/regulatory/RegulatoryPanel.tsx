import { useTranslation } from 'react-i18next';
import {
  Shield,
  X,
  ExternalLink,
  Sparkles,
  Leaf,
  Globe,
  Waves,
  Droplets,
  Axe,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState } from 'react';
import {
  type RegulatoryZone,
  type RegulatoryZoneType,
  ZONE_COLORS,
} from '@/hooks/useRegulatoryData';

interface RegulatoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  zones: RegulatoryZone[];
  constraintCount: number;
  isLoading: boolean;
  parcelName?: string;
  onAskAI?: (zone: RegulatoryZone) => void;
}

const ZONE_TYPE_ICONS: Record<RegulatoryZoneType, React.ReactNode> = {
  nyckelbiotop: <Leaf size={14} />,
  natura2000: <Globe size={14} />,
  strandskydd: <Waves size={14} />,
  vattenskydd: <Droplets size={14} />,
  avverkningsanmalan: <Axe size={14} />,
};

export function RegulatoryPanel({
  isOpen,
  onClose,
  zones,
  constraintCount,
  isLoading,
  parcelName,
  onAskAI,
}: RegulatoryPanelProps) {
  const { t } = useTranslation();
  const [expandedZone, setExpandedZone] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="relative ml-auto w-full max-w-md border-l border-[var(--border)] shadow-2xl overflow-y-auto animate-slide-in-right"
        style={{ background: 'var(--bg2)' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-[var(--border)] px-5 py-4" style={{ background: 'var(--bg2)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--amber)]/10 border border-[var(--amber)]/20 flex items-center justify-center">
                <Shield size={18} className="text-[var(--amber)]" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[var(--text)]">
                  {t('regulatory.title')}
                </h2>
                {parcelName && (
                  <p className="text-[11px] text-[var(--text3)]">{parcelName}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Summary */}
          {!isLoading && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--amber)]/5 border border-[var(--amber)]/15">
              <AlertTriangle size={14} className="text-[var(--amber)] flex-shrink-0" />
              <p className="text-xs text-[var(--amber)]">
                {t('regulatory.constraintsSummary', { count: constraintCount })}
              </p>
            </div>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-2 border-[var(--green)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-[var(--text3)]">{t('common.loading')}</p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && zones.length === 0 && (
          <div className="p-8 text-center">
            <Shield size={32} className="mx-auto text-[var(--green)] mb-3" />
            <p className="text-sm font-medium text-[var(--text)]">
              {t('regulatory.noConstraints')}
            </p>
            <p className="text-xs text-[var(--text3)] mt-1">
              {t('regulatory.noConstraintsDesc')}
            </p>
          </div>
        )}

        {/* Zone list */}
        {!isLoading && zones.length > 0 && (
          <div className="p-4 space-y-3">
            {zones.map((zone) => {
              const isExpanded = expandedZone === zone.id;
              const zoneColor = ZONE_COLORS[zone.type];
              const icon = ZONE_TYPE_ICONS[zone.type];

              return (
                <div
                  key={zone.id}
                  className="rounded-xl border border-[var(--border)] overflow-hidden"
                  style={{ background: 'var(--bg)' }}
                >
                  {/* Zone header */}
                  <button
                    onClick={() => setExpandedZone(isExpanded ? null : zone.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--bg3)] transition-colors"
                  >
                    {/* Color badge + icon */}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${zoneColor}15`, color: zoneColor }}
                    >
                      {icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Type label */}
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: zoneColor }}
                      >
                        {t(`regulatory.types.${zone.type}`)}
                      </span>
                      {/* Name */}
                      <p className="text-sm font-medium text-[var(--text)] truncate">
                        {zone.name}
                      </p>
                    </div>

                    {/* Area badge */}
                    {zone.areaHectares && (
                      <span className="text-[10px] font-mono text-[var(--text3)] flex-shrink-0">
                        {zone.areaHectares.toFixed(1)} ha
                      </span>
                    )}

                    {isExpanded ? (
                      <ChevronUp size={14} className="text-[var(--text3)] flex-shrink-0" />
                    ) : (
                      <ChevronDown size={14} className="text-[var(--text3)] flex-shrink-0" />
                    )}
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-[var(--border)] px-4 py-3 space-y-3">
                      {/* Description */}
                      <p className="text-xs text-[var(--text2)] leading-relaxed">
                        {zone.description}
                      </p>

                      {/* Requirements */}
                      {zone.requirements.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)] mb-2">
                            {t('regulatory.requiredActions')}
                          </p>
                          <ul className="space-y-2">
                            {zone.requirements.map((req, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-2 text-xs text-[var(--text2)]"
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                                  style={{ background: zoneColor }}
                                />
                                <div>
                                  <p>{req.action}</p>
                                  {req.deadline && (
                                    <p className="text-[var(--amber)] text-[10px] mt-0.5">
                                      {t('regulatory.deadline')}: {req.deadline}
                                    </p>
                                  )}
                                  <p className="text-[var(--text3)] text-[10px] mt-0.5">
                                    {t('regulatory.authority')}: {req.authority}
                                  </p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        {zone.skogsstyrelsenUrl && (
                          <a
                            href={zone.skogsstyrelsenUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text2)] hover:text-[var(--green)] hover:border-[var(--green)]/30 transition-colors"
                          >
                            <ExternalLink size={12} />
                            {t('regulatory.viewOnSkogsstyrelsen')}
                          </a>
                        )}
                        {onAskAI && (
                          <button
                            onClick={() => onAskAI(zone)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--green)]/10 border border-[var(--green)]/20 text-xs text-[var(--green)] hover:bg-[var(--green)]/15 transition-colors"
                          >
                            <Sparkles size={12} />
                            {t('regulatory.askAI')}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Slide-in animation */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}
