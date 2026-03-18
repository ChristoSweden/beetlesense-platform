import { useState } from 'react';
import {
  Users,
  ChevronDown,
  ChevronUp,
  MapPin,
  AlertTriangle,
  HandHeart,
  TreePine,
  Activity,
  Shield,
} from 'lucide-react';

// ─── Types ───

interface CommunityActivity {
  id: string;
  text: string;
  time: string;
  type: 'report' | 'action' | 'milestone';
}

interface SharedThreat {
  id: string;
  label: string;
  severity: 'low' | 'medium' | 'high';
  affectedArea: string;
}

interface ScarfRelatednessProps {
  activeUsersNearby?: number;
  regionName?: string;
  neighborCoopEnabled?: boolean;
  onToggleNeighborCoop?: (enabled: boolean) => void;
  sharedThreats?: SharedThreat[];
  communityActivities?: CommunityActivity[];
  collectiveTreesSaved?: number;
  collectiveSeason?: string;
  className?: string;
}

// ─── Default data ───

function defaultThreats(): SharedThreat[] {
  return [
    {
      id: 'beetle-outbreak',
      label: 'Barkborreutbrott — ökad aktivitet',
      severity: 'high',
      affectedArea: 'Sydöstra Kronoberg',
    },
    {
      id: 'storm-damage',
      label: 'Stormskador efter senaste stormen',
      severity: 'medium',
      affectedArea: 'Norra Småland',
    },
  ];
}

function defaultActivities(): CommunityActivity[] {
  return [
    {
      id: 'a1',
      text: 'En skogsägare 8 km bort rapporterade barkborre igår',
      time: '1 dag sedan',
      type: 'report',
    },
    {
      id: 'a2',
      text: 'Ny undersökning genomförd i ditt närområde',
      time: '2 dagar sedan',
      type: 'action',
    },
    {
      id: 'a3',
      text: '50 skogsägare i länet har nu registrerat sina skiften',
      time: '3 dagar sedan',
      type: 'milestone',
    },
  ];
}

// ─── Helpers ───

function severityColor(severity: SharedThreat['severity']): string {
  switch (severity) {
    case 'high':
      return '#ef4444';
    case 'medium':
      return '#eab308';
    default:
      return '#4ade80';
  }
}

function activityIcon(type: CommunityActivity['type']): React.ReactNode {
  switch (type) {
    case 'report':
      return <AlertTriangle size={10} className="text-[#eab308]" />;
    case 'action':
      return <Activity size={10} className="text-[var(--green)]" />;
    case 'milestone':
      return <TreePine size={10} className="text-[#4ade80]" />;
  }
}

// ─── Component ───

export function ScarfRelatedness(props: ScarfRelatednessProps) {
  const {
    activeUsersNearby = 23,
    regionName = 'Kronoberg',
    neighborCoopEnabled: coopProp,
    onToggleNeighborCoop,
    sharedThreats,
    communityActivities,
    collectiveTreesSaved = 4200,
    collectiveSeason = 'denna säsong',
    className = '',
  } = props;

  const [expanded, setExpanded] = useState(false);
  const [coopEnabled, setCoopEnabled] = useState(coopProp ?? false);

  const threats = sharedThreats ?? defaultThreats();
  const activities = communityActivities ?? defaultActivities();

  const handleCoopToggle = () => {
    const next = !coopEnabled;
    setCoopEnabled(next);
    onToggleNeighborCoop?.(next);
  };

  return (
    <div
      className={`rounded-xl border border-[var(--border)] p-4 ${className}`}
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--green)]/10">
            <Users size={16} className="text-[var(--green)]" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-[var(--text)]">Skogsägare nära dig</h3>
            <span className="text-[10px] text-[var(--text3)]">Gemensam kraft i {regionName}</span>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 rounded hover:bg-[var(--bg3)] transition-colors text-[var(--text3)]"
          aria-label={expanded ? 'Dölj detaljer' : 'Visa detaljer'}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Active users nearby */}
      <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-[var(--bg3)]">
        <MapPin size={12} className="text-[var(--green)]" />
        <span className="text-xs text-[var(--text)]">
          <span className="font-semibold font-mono text-[var(--green)]">{activeUsersNearby}</span>{' '}
          aktiva skogsägare i ditt närområde
        </span>
      </div>

      {/* Shared threats */}
      <div className="mb-3">
        <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wide mb-1.5">
          Gemensamma utmaningar
        </p>
        <div className="space-y-1.5">
          {threats.map((threat) => (
            <div key={threat.id} className="flex items-center gap-2 text-xs">
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: severityColor(threat.severity) }}
              />
              <div className="flex-1">
                <span className="text-[var(--text)]">{threat.label}</span>
                <span className="text-[10px] text-[var(--text3)] ml-1">— {threat.affectedArea}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Collective impact */}
      <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--green)]/5 mb-3">
        <HandHeart size={14} className="text-[var(--green)] flex-shrink-0" />
        <p className="text-xs text-[var(--text)]">
          <span className="font-medium">Din insats räknas</span> — Tillsammans har skogsägare i{' '}
          {regionName} räddat{' '}
          <span className="font-semibold font-mono text-[var(--green)]">
            {collectiveTreesSaved.toLocaleString('sv-SE')}
          </span>{' '}
          träd {collectiveSeason}
        </p>
      </div>

      {expanded && (
        <div className="pt-3 border-t border-[var(--border)] space-y-3">
          {/* Neighbor cooperation toggle */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg3)]">
            <div className="flex items-center gap-2">
              <Shield size={12} className="text-[var(--green)]" />
              <div>
                <p className="text-xs font-medium text-[var(--text)]">Grannsamverkan</p>
                <p className="text-[10px] text-[var(--text3)]">
                  Dela barkborrelarm med grannar (anonymt)
                </p>
              </div>
            </div>
            <button
              onClick={handleCoopToggle}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                coopEnabled ? 'bg-[var(--green)]' : 'bg-[var(--bg2)]'
              }`}
              role="switch"
              aria-checked={coopEnabled}
              aria-label="Grannsamverkan"
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  coopEnabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Community activity feed */}
          <div>
            <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wide mb-2">
              Aktivitet i närområdet
            </p>
            <div className="space-y-2">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-2 text-[10px]">
                  <div className="w-4 h-4 rounded flex items-center justify-center bg-[var(--bg3)] flex-shrink-0 mt-0.5">
                    {activityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-[var(--text2)]">{activity.text}</p>
                    <span className="text-[var(--text3)]">{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
