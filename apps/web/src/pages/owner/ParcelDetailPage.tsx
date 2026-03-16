import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight,
  TreePine,
  MapPin,
  Mountain,
  Layers,
  Calendar,
  ClipboardList,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { DEMO_PARCELS, DEMO_SURVEYS, type DemoSurvey } from '@/lib/demoData';

/* ── Status helpers ── */

const STATUS_STYLES: Record<string, string> = {
  healthy: 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/20',
  at_risk: 'bg-[var(--amber)]/10 text-[var(--amber)] border-[var(--amber)]/20',
  infested: 'bg-red-500/10 text-red-400 border-red-500/20',
  unknown: 'bg-[var(--text3)]/10 text-[var(--text3)] border-[var(--text3)]/20',
};

const STATUS_DOT: Record<string, string> = {
  healthy: 'bg-[var(--green)]',
  at_risk: 'bg-[var(--amber)]',
  infested: 'bg-red-400',
  unknown: 'bg-[var(--text3)]',
};

function statusLabel(status: string, t: (key: string) => string) {
  const labels: Record<string, string> = {
    healthy: t('owner.parcels.healthy'),
    at_risk: t('owner.parcels.atRisk'),
    infested: t('owner.parcels.infested'),
    unknown: t('owner.parcels.unknown'),
  };
  return labels[status] ?? labels.unknown;
}

function statusBadge(status: string, t: (key: string) => string) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_STYLES[status] ?? STATUS_STYLES.unknown}`}
    >
      {statusLabel(status, t)}
    </span>
  );
}

const SURVEY_STATUS_STYLES: Record<string, string> = {
  complete: 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/20',
  processing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  draft: 'bg-[var(--text3)]/10 text-[var(--text3)] border-[var(--text3)]/20',
  failed: 'bg-red-500/10 text-red-400 border-red-500/20',
};

function surveyStatusBadge(status: string) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${SURVEY_STATUS_STYLES[status] ?? SURVEY_STATUS_STYLES.draft}`}
    >
      {label}
    </span>
  );
}

/* ── Page ── */

export default function ParcelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();

  const parcel = DEMO_PARCELS.find((p) => p.id === id);

  if (!parcel) {
    return (
      <div className="p-4 lg:p-6 max-w-5xl">
        <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-6">
          <Link to="/owner/parcels" className="hover:text-[var(--text2)]">
            {t('nav.parcels')}
          </Link>
          <ChevronRight size={12} />
          <span className="text-[var(--text)]">Not found</span>
        </nav>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-12 text-center">
          <AlertCircle size={32} className="mx-auto text-[var(--text3)] mb-3" />
          <p className="text-sm text-[var(--text2)]">Parcel not found.</p>
          <Link
            to="/owner/parcels"
            className="inline-block mt-4 text-xs text-[var(--green)] hover:underline"
          >
            Back to parcels
          </Link>
        </div>
      </div>
    );
  }

  const surveys: DemoSurvey[] = DEMO_SURVEYS.filter((s) => s.parcel_id === parcel.id);
  const speciesStr = parcel.species_mix.map((s) => `${s.species} ${s.pct}%`).join(', ');

  return (
    <div className="p-4 lg:p-6 max-w-5xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-6">
        <Link to="/owner/parcels" className="hover:text-[var(--text2)]">
          {t('nav.parcels')}
        </Link>
        <ChevronRight size={12} />
        <span className="text-[var(--text)]">{parcel.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--green)]/10 border border-[var(--border)] flex items-center justify-center">
            <TreePine size={20} className="text-[var(--green)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-serif font-bold text-[var(--text)]">{parcel.name}</h1>
              {statusBadge(parcel.status, t)}
            </div>
            <div className="flex items-center gap-3 mt-1 text-[11px] text-[var(--text3)]">
              <span className="flex items-center gap-1">
                <MapPin size={10} />
                {parcel.municipality}
              </span>
              <span className="font-mono">
                {parcel.area_hectares.toFixed(1)} {t('owner.parcels.hectares')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <InfoCard
          icon={<Layers size={14} className="text-[var(--green)]" />}
          label="Area"
          value={`${parcel.area_hectares.toFixed(1)} ha`}
        />
        <InfoCard
          icon={<Mountain size={14} className="text-[var(--green)]" />}
          label="Elevation"
          value={`${parcel.elevation_m} m`}
        />
        <InfoCard
          icon={<Layers size={14} className="text-[var(--green)]" />}
          label="Soil Type"
          value={parcel.soil_type}
        />
        <InfoCard
          icon={<TreePine size={14} className="text-[var(--green)]" />}
          label="Species Mix"
          value={speciesStr}
          small
        />
        <InfoCard
          icon={<Calendar size={14} className="text-[var(--green)]" />}
          label="Registered"
          value={parcel.registered_at}
        />
      </div>

      {/* Health Status */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5 mb-6">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-3">Health Status</h2>
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${STATUS_DOT[parcel.status] ?? STATUS_DOT.unknown}`}
          />
          <span className="text-sm text-[var(--text2)]">
            {statusLabel(parcel.status, t)}
          </span>
          {parcel.last_survey && (
            <span className="text-[11px] text-[var(--text3)] ml-auto">
              Last surveyed: {parcel.last_survey}
            </span>
          )}
        </div>
        {parcel.status === 'infested' && (
          <p className="text-xs text-red-400 mt-2">
            Active infestation detected. Immediate action recommended.
          </p>
        )}
        {parcel.status === 'at_risk' && (
          <p className="text-xs text-[var(--amber)] mt-2">
            Elevated risk indicators observed. Schedule a follow-up survey.
          </p>
        )}
        {parcel.status === 'unknown' && (
          <p className="text-xs text-[var(--text3)] mt-2">
            No survey data available. Request a survey to assess health.
          </p>
        )}
      </div>

      {/* Survey History */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
            <ClipboardList size={14} className="text-[var(--green)]" />
            Survey History
          </h2>
          <Link
            to="/owner/surveys"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--green)] text-[var(--bg)] text-xs font-semibold hover:bg-[var(--green2)] transition-colors"
          >
            <Plus size={12} />
            Request New Survey
          </Link>
        </div>

        {surveys.length === 0 ? (
          <div className="text-center py-8">
            <ClipboardList size={24} className="mx-auto text-[var(--text3)] mb-2" />
            <p className="text-sm text-[var(--text2)]">No surveys yet for this parcel.</p>
            <p className="text-xs text-[var(--text3)] mt-1">
              Request a survey to start monitoring.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {surveys.map((survey) => (
              <div
                key={survey.id}
                className="flex items-center gap-4 p-3 rounded-lg border border-[var(--border)] hover:border-[var(--border2)] bg-[var(--bg3)] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-[var(--text)] truncate">
                      {survey.name}
                    </p>
                    {surveyStatusBadge(survey.status)}
                    {survey.priority === 'priority' && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-[var(--amber)]/10 text-[var(--amber)] border border-[var(--amber)]/20">
                        Priority
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[var(--text3)]">
                    <span>
                      {survey.modules.length} module{survey.modules.length !== 1 ? 's' : ''}
                    </span>
                    <span>Created: {new Date(survey.created_at).toLocaleDateString()}</span>
                    {survey.updated_at !== survey.created_at && (
                      <span>Updated: {new Date(survey.updated_at).toLocaleDateString()}</span>
                    )}
                  </div>
                  {survey.results_summary && (
                    <p className="text-xs text-[var(--text2)] mt-1.5 line-clamp-2">
                      {survey.results_summary}
                    </p>
                  )}
                </div>
                <ChevronRight size={14} className="text-[var(--text3)] flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function InfoCard({
  icon,
  label,
  value,
  small,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] text-[var(--text3)] uppercase tracking-wide">{label}</span>
      </div>
      <p className={`font-medium text-[var(--text)] ${small ? 'text-[11px]' : 'text-sm'}`}>
        {value}
      </p>
    </div>
  );
}
