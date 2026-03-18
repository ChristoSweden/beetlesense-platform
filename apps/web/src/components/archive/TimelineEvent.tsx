import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Axe,
  Sprout,
  CloudLightning,
  Route,
  MapPin,
  Eye,
  Heart,
  ChevronDown,
  ChevronUp,
  Trash2,
  Calendar,
  User,
  TreePine,
} from 'lucide-react';
import {
  type ArchiveEvent,
  type ArchiveEventType,
  EVENT_TYPE_COLORS,
} from '@/hooks/useForestArchive';

const EVENT_ICONS: Record<ArchiveEventType, React.ReactNode> = {
  harvest: <Axe size={16} />,
  planting: <Sprout size={16} />,
  storm_damage: <CloudLightning size={16} />,
  road_built: <Route size={16} />,
  boundary_change: <MapPin size={16} />,
  observation: <Eye size={16} />,
  family_note: <Heart size={16} />,
};

interface TimelineEventProps {
  event: ArchiveEvent;
  onDelete?: (id: string) => void;
}

export function TimelineEvent({ event, onDelete }: TimelineEventProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const color = EVENT_TYPE_COLORS[event.type];
  const icon = EVENT_ICONS[event.type];

  const year = new Date(event.date).getFullYear();
  const formattedDate = new Date(event.date).toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="relative flex gap-4 group">
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2"
          style={{
            background: `${color}15`,
            borderColor: `${color}40`,
            color,
          }}
        >
          {icon}
        </div>
        <div className="w-0.5 flex-1 min-h-[24px] bg-[var(--border)]" />
      </div>

      {/* Card */}
      <div
        className="flex-1 mb-6 rounded-xl border overflow-hidden transition-colors hover:border-[var(--border2)]"
        style={{
          background: 'var(--bg2)',
          borderColor: 'var(--border)',
          borderLeftWidth: '3px',
          borderLeftColor: color,
        }}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                  style={{ background: `${color}15`, color }}
                >
                  {t(`archive.types.${event.type}`)}
                </span>
                {(event.stand || event.parcel) && (
                  <span className="text-[10px] font-mono text-[var(--text3)] bg-[var(--bg3)] px-2 py-0.5 rounded-full flex items-center gap-1">
                    <TreePine size={10} />
                    {event.stand || event.parcel}
                  </span>
                )}
              </div>
              <h3 className="text-sm font-semibold text-[var(--text)] leading-snug">
                {event.title}
              </h3>
            </div>

            <span className="text-lg font-mono font-bold text-[var(--text3)] flex-shrink-0">
              {year}
            </span>
          </div>

          {/* Date + recorder */}
          <div className="flex items-center gap-4 mt-2 text-[11px] text-[var(--text3)]">
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {formattedDate}
            </span>
            <span className="flex items-center gap-1">
              <User size={11} />
              {event.recordedBy}
            </span>
          </div>

          {/* Description */}
          <p className="text-xs text-[var(--text2)] mt-2 leading-relaxed line-clamp-2">
            {event.description}
          </p>

          {/* Photo thumbnail */}
          {event.photoUrl && (
            <div className="mt-3">
              <img
                src={event.photoUrl}
                alt={event.title}
                className="w-full max-w-xs h-32 object-cover rounded-lg border border-[var(--border)]"
              />
            </div>
          )}

          {/* Expand/collapse */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-[11px] text-[var(--green)] hover:text-[var(--green2)] transition-colors"
            >
              {expanded ? (
                <>
                  <ChevronUp size={14} />
                  {t('archive.showLess')}
                </>
              ) : (
                <>
                  <ChevronDown size={14} />
                  {t('archive.showMore')}
                </>
              )}
            </button>

            {onDelete && (
              <button
                onClick={() => onDelete(event.id)}
                className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text3)] hover:text-red-400"
                aria-label={t('common.delete')}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {/* Expanded details */}
          {expanded && (
            <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-2">
              {event.notes && (
                <div>
                  <span className="text-[10px] font-mono text-[var(--text3)] uppercase">
                    {t('archive.notes')}
                  </span>
                  <p className="text-xs text-[var(--text2)] mt-1">{event.notes}</p>
                </div>
              )}
              {event.lat && event.lng && (
                <div>
                  <span className="text-[10px] font-mono text-[var(--text3)] uppercase">
                    {t('archive.location')}
                  </span>
                  <p className="text-xs text-[var(--text2)] mt-1">
                    {event.lat.toFixed(4)}, {event.lng.toFixed(4)}
                  </p>
                </div>
              )}
              {event.stand && (
                <div>
                  <span className="text-[10px] font-mono text-[var(--text3)] uppercase">
                    {t('archive.stand')}
                  </span>
                  <p className="text-xs text-[var(--text2)] mt-1">{event.stand}</p>
                </div>
              )}
              {event.parcel && (
                <div>
                  <span className="text-[10px] font-mono text-[var(--text3)] uppercase">
                    {t('archive.parcel')}
                  </span>
                  <p className="text-xs text-[var(--text2)] mt-1">{event.parcel}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
