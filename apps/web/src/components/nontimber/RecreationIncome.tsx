/**
 * RecreationIncome — Recreation & ecotourism income component.
 *
 * Activity cards, seasonal calendar, revenue potential,
 * booking placeholders, and success stories.
 */

import { useState } from 'react';
import {
  TreePine,
  Tent,
  Bird,
  Bike,
  Camera,
  Heart,
  Shield,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Star,
  ExternalLink,
} from 'lucide-react';
import type { RecreationActivity } from '@/hooks/useNonTimberIncome';

interface RecreationIncomeProps {
  activities: RecreationActivity[];
  totalIncome: number;
}

function formatSEK(v: number): string {
  return v.toLocaleString('sv-SE');
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];

const TYPE_ICONS: Record<RecreationActivity['type'], React.ReactNode> = {
  guided_tour: <TreePine size={14} />,
  camping: <Tent size={14} />,
  birdwatching: <Bird size={14} />,
  forest_bathing: <Heart size={14} />,
  mtb: <Bike size={14} />,
  hunting_experience: <Star size={14} />,
  photography: <Camera size={14} />,
};

function statusColor(status: RecreationActivity['status']) {
  switch (status) {
    case 'active': return { bg: 'bg-[var(--green)]/10', text: 'text-[var(--green)]', label: 'Aktiv' };
    case 'planned': return { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Planerad' };
    case 'potential': return { bg: 'bg-purple-500/10', text: 'text-purple-400', label: 'Potential' };
  }
}

function ActivityCard({ activity }: { activity: RecreationActivity }) {
  const [expanded, setExpanded] = useState(false);
  const sc = statusColor(activity.status);

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-[var(--bg3)] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[var(--green)]/10 flex items-center justify-center text-[var(--green)] flex-shrink-0">
            {TYPE_ICONS[activity.type]}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-semibold text-[var(--text)] truncate">{activity.nameSv}</span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-[var(--text3)]">
              <span className="font-mono text-[var(--green)]">{formatSEK(activity.annualRevenueSEK)} SEK/år</span>
              <span>&middot; {activity.eventsPerYear} tillfällen/år</span>
            </div>
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="text-[var(--text3)] flex-shrink-0" /> : <ChevronDown size={16} className="text-[var(--text3)] flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[var(--border)] pt-3 space-y-3">
          <p className="text-xs text-[var(--text2)]">{activity.descriptionSv}</p>

          {/* Revenue breakdown */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-center">
              <p className="text-[10px] text-[var(--text3)]">Per tillfälle</p>
              <p className="text-xs font-mono font-semibold text-[var(--text)]">{formatSEK(activity.revenuePerEvent)} SEK</p>
            </div>
            <div className="p-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-center">
              <p className="text-[10px] text-[var(--text3)]">Tillfällen/år</p>
              <p className="text-xs font-mono font-semibold text-[var(--text)]">{activity.eventsPerYear}</p>
            </div>
            <div className="p-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-center">
              <p className="text-[10px] text-[var(--text3)]">Årlig intäkt</p>
              <p className="text-xs font-mono font-semibold text-[var(--green)]">{formatSEK(activity.annualRevenueSEK)} SEK</p>
            </div>
          </div>

          {/* Best months */}
          <div>
            <p className="text-[10px] text-[var(--text3)] mb-1.5 uppercase tracking-wider">Bästa månader</p>
            <div className="flex gap-1">
              {MONTH_NAMES.map((m, i) => {
                const isBest = activity.bestMonths.includes(i + 1);
                return (
                  <div
                    key={m}
                    className={`flex-1 text-center py-1 rounded text-[8px] font-mono ${
                      isBest ? 'bg-[var(--green)]/15 text-[var(--green)]' : 'bg-[var(--bg)] text-[var(--text3)]'
                    }`}
                  >
                    {m}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Requirements */}
          <div className="flex flex-wrap gap-2 text-[10px]">
            {activity.requiresPermit && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
                <Shield size={10} /> Tillstånd krävs
              </span>
            )}
            {activity.insuranceRequired && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                <Shield size={10} /> Försäkring krävs
              </span>
            )}
            <span className="px-2 py-0.5 rounded-full bg-[var(--bg3)] text-[var(--text3)]">
              Svårighetsgrad: {activity.difficulty === 'easy' ? 'Lätt' : activity.difficulty === 'medium' ? 'Medel' : 'Svår'}
            </span>
          </div>

          {/* Booking placeholder */}
          {activity.status === 'active' && (
            <button className="w-full py-2 rounded-lg border border-[var(--green)]/30 text-xs text-[var(--green)] hover:bg-[var(--green)]/10 transition-colors flex items-center justify-center gap-1.5">
              <ExternalLink size={12} /> Hantera bokningar
            </button>
          )}
          {activity.status === 'potential' && (
            <button className="w-full py-2 rounded-lg border border-purple-500/30 text-xs text-purple-400 hover:bg-purple-500/10 transition-colors flex items-center justify-center gap-1.5">
              <Sparkles size={12} /> Utforska möjligheten
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const SUCCESS_STORIES = [
  {
    name: 'Karin, Ljungby',
    text: 'Började med guidade skogsbad 2024. Nu en av kommunens mest bokade friluftsupplevelser. Intäkter: 48 000 SEK/år.',
  },
  {
    name: 'Per & Annika, Gränna',
    text: 'Öppnade vildmarkscamping med 8 platser. Via Naturcamp.se fyller de bokningar hela sommaren. Intäkter: 85 000 SEK/år.',
  },
  {
    name: 'Ola, Vetlanda',
    text: 'Älgfotogömslen ger 2 000 SEK/session. Med 3 gömslen och internationella kunder: 120 000 SEK/år.',
  },
];

export function RecreationIncome({ activities, totalIncome }: RecreationIncomeProps) {
  const [showStories, setShowStories] = useState(false);

  const activeCount = activities.filter(a => a.status === 'active').length;
  const potentialRevenue = activities
    .filter(a => a.status !== 'active')
    .reduce((s, a) => s + a.annualRevenueSEK, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--green)]/10 flex items-center justify-center">
              <TreePine size={16} className="text-[var(--green)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">Naturturism i din skog</p>
              <p className="text-[10px] text-[var(--text3)]">{activeCount} aktiva aktiviteter</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-mono font-bold text-[var(--green)]">{formatSEK(totalIncome)} <span className="text-xs text-[var(--text3)]">SEK/år</span></p>
          </div>
        </div>

        {potentialRevenue > 0 && (
          <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-start gap-2">
              <Sparkles size={14} className="text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-purple-400">Outnyttjad potential</p>
                <p className="text-[10px] text-purple-400/80 mt-0.5">
                  Ytterligare {formatSEK(potentialRevenue)} SEK/år möjligt med planerade och potentiella aktiviteter.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Activity cards */}
      <div className="space-y-2">
        {activities.map(activity => (
          <ActivityCard key={activity.id} activity={activity} />
        ))}
      </div>

      {/* Insurance & liability */}
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Shield size={14} className="text-[var(--green)]" />
          <p className="text-sm font-semibold text-[var(--text)]">Försäkring & ansvar</p>
        </div>
        <ul className="space-y-1.5 text-[10px] text-[var(--text3)]">
          <li className="flex items-start gap-1.5">
            <span className="text-[var(--green)] mt-0.5">&bull;</span>
            Ansvarsförsäkring rekommenderas för alla kommersiella aktiviteter (ca 3 000-8 000 SEK/år).
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-[var(--green)] mt-0.5">&bull;</span>
            LRF erbjuder tilläggsförsäkring för naturturism som komplement till din skogsförsäkring.
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-[var(--green)] mt-0.5">&bull;</span>
            Deltagare bör skriva under ansvarsfrihet/waiver vid aktiviteter med förhöjd risk.
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-[var(--green)] mt-0.5">&bull;</span>
            Kontakta kommunen om krav på detaljplan vid permanent verksamhet.
          </li>
        </ul>
      </div>

      {/* Success stories */}
      <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
        <button
          onClick={() => setShowStories(!showStories)}
          className="w-full p-4 flex items-center justify-between hover:bg-[var(--bg3)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Star size={14} className="text-[var(--green)]" />
            <span className="text-sm font-semibold text-[var(--text)]">Framgångshistorier</span>
          </div>
          {showStories ? <ChevronUp size={16} className="text-[var(--text3)]" /> : <ChevronDown size={16} className="text-[var(--text3)]" />}
        </button>
        {showStories && (
          <div className="px-4 pb-4 space-y-2">
            {SUCCESS_STORIES.map(story => (
              <div key={story.name} className="p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                <p className="text-xs font-medium text-[var(--text)] mb-1">{story.name}</p>
                <p className="text-[10px] text-[var(--text3)]">{story.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
