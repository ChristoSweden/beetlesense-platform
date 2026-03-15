import { AlertTriangle, Bug, Leaf, Trees, PawPrint, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type {
  IdentificationResult as IdentificationResultType,
  IdentificationCandidate,
  DiseaseDetection,
} from '@/stores/visionStore';

// ─── Helpers ────────────────────────────────────────────────────────────────────

function confidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'text-[var(--green)]';
  if (confidence >= 0.5) return 'text-amber';
  return 'text-danger';
}

function confidenceBarColor(confidence: number): string {
  if (confidence >= 0.8) return 'bg-[var(--green)]';
  if (confidence >= 0.5) return 'bg-amber';
  return 'bg-danger';
}

function severityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'text-danger bg-danger/15';
    case 'severe': return 'text-danger bg-danger/10';
    case 'moderate': return 'text-amber bg-amber/10';
    case 'mild': return 'text-yellow-400 bg-yellow-400/10';
    default: return 'text-[var(--text3)] bg-[var(--bg3)]';
  }
}

function typeIcon(type: string) {
  switch (type) {
    case 'tree': return <Trees size={14} />;
    case 'plant': return <Leaf size={14} />;
    case 'animal': return <PawPrint size={14} />;
    default: return <Bug size={14} />;
  }
}

function conservationBadge(status: string): { label: string; className: string } | null {
  switch (status) {
    case 'CR': return { label: 'Critically Endangered', className: 'bg-danger/20 text-danger' };
    case 'EN': return { label: 'Endangered', className: 'bg-danger/15 text-danger' };
    case 'VU': return { label: 'Vulnerable', className: 'bg-amber/15 text-amber' };
    case 'NT': return { label: 'Near Threatened', className: 'bg-yellow-400/15 text-yellow-400' };
    default: return null;
  }
}

// ─── Sub-components ─────────────────────────────────────────────────────────────

function CandidateCard({
  candidate,
  isTop,
}: {
  candidate: IdentificationCandidate;
  isTop: boolean;
}) {
  const badge = conservationBadge(candidate.conservation_status);

  return (
    <div
      className={`rounded-xl border p-4 ${
        isTop
          ? 'border-[var(--green)]/40 bg-[var(--green)]/5'
          : 'border-[var(--border)] bg-[var(--bg2)]'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[var(--text3)]">{typeIcon(candidate.type)}</span>
            <h4 className="text-sm font-semibold text-[var(--text)] truncate">
              {candidate.common_name_sv}
            </h4>
            {isTop && (
              <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--green)]/20 text-[var(--green)]">
                Best match
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text2)] italic">{candidate.scientific_name}</p>
          <p className="text-[10px] text-[var(--text3)]">{candidate.common_name_en}</p>
        </div>
        <div className="text-right shrink-0">
          <span className={`text-lg font-mono font-bold ${confidenceColor(candidate.confidence)}`}>
            {Math.round(candidate.confidence * 100)}%
          </span>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="w-full h-1.5 rounded-full bg-[var(--bg3)] mb-3">
        <div
          className={`h-full rounded-full transition-all duration-500 ${confidenceBarColor(candidate.confidence)}`}
          style={{ width: `${candidate.confidence * 100}%` }}
        />
      </div>

      {/* Details */}
      {isTop && (
        <div className="space-y-2 text-[11px]">
          <p className="text-[var(--text2)]">{candidate.description}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[var(--text3)]">
            <span>Habitat: {candidate.habitat}</span>
            <span>Season: {candidate.season}</span>
          </div>
        </div>
      )}

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mt-2">
        {candidate.is_pest && (
          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-danger/15 text-danger">
            <AlertTriangle size={10} />
            Pest
          </span>
        )}
        {badge && (
          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badge.className}`}>
            {badge.label}
          </span>
        )}
      </div>
    </div>
  );
}

function DiseaseCard({ disease }: { disease: DiseaseDetection }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Bug size={14} className="text-danger shrink-0" />
            <h4 className="text-sm font-semibold text-[var(--text)]">{disease.name_sv}</h4>
          </div>
          <p className="text-xs text-[var(--text2)] italic">{disease.scientific_name}</p>
          <p className="text-[10px] text-[var(--text3)]">{disease.name_en}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-lg font-mono font-bold ${confidenceColor(disease.confidence)}`}>
            {Math.round(disease.confidence * 100)}%
          </span>
          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${severityColor(disease.severity)}`}>
            {disease.severity}
          </span>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="w-full h-1.5 rounded-full bg-[var(--bg3)] mb-3">
        <div
          className={`h-full rounded-full transition-all duration-500 ${confidenceBarColor(disease.confidence)}`}
          style={{ width: `${disease.confidence * 100}%` }}
        />
      </div>

      {/* Symptoms */}
      <div className="mb-2">
        <p className="text-[10px] uppercase tracking-wider text-[var(--text3)] mb-1">Symptoms detected</p>
        <div className="flex flex-wrap gap-1.5">
          {disease.symptoms_detected.map((symptom) => (
            <span
              key={symptom}
              className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg3)] text-[var(--text2)]"
            >
              {symptom}
            </span>
          ))}
        </div>
      </div>

      {/* Expandable treatment */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[11px] text-[var(--green)] hover:text-[var(--green2)] transition-colors mt-1"
      >
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        Treatment recommendations
      </button>

      {expanded && (
        <ul className="mt-2 space-y-1 pl-4">
          {disease.treatment.map((t, i) => (
            <li key={i} className="text-[11px] text-[var(--text2)] list-disc">
              {t}
            </li>
          ))}
        </ul>
      )}

      {/* Report button for regulated pests */}
      {disease.is_reportable && (
        <div className="mt-3 pt-3 border-t border-danger/20">
          <button className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-danger/15 text-danger text-xs font-semibold hover:bg-danger/25 transition-colors">
            <ExternalLink size={12} />
            Report to {disease.report_authority}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

interface IdentificationResultProps {
  result: IdentificationResultType;
  thumbnailUrl?: string | null;
  onLearnMore?: () => void;
  onSaveToCollection?: () => void;
  compact?: boolean;
}

export function IdentificationResult({
  result,
  thumbnailUrl,
  onLearnMore,
  onSaveToCollection,
  compact = false,
}: IdentificationResultProps) {
  const topCandidates = compact ? result.top_candidates.slice(0, 3) : result.top_candidates;

  return (
    <div className="space-y-4">
      {/* Pest / Disease warning banner */}
      {result.has_pest_warning && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-danger/10 border border-danger/30">
          <AlertTriangle size={18} className="text-danger shrink-0" />
          <div>
            <p className="text-xs font-semibold text-danger">Pest / Disease Warning</p>
            <p className="text-[10px] text-[var(--text2)]">
              A regulated pest or disease has been detected. Consider reporting to Skogsstyrelsen.
            </p>
          </div>
        </div>
      )}

      {/* Species candidates */}
      {topCandidates.length > 0 && (
        <div>
          <h3 className="text-[10px] uppercase tracking-wider text-[var(--text3)] mb-2">
            Species identification
          </h3>
          <div className="space-y-2">
            {topCandidates.map((candidate, idx) => (
              <CandidateCard
                key={candidate.species_id}
                candidate={candidate}
                isTop={idx === 0}
              />
            ))}
          </div>
        </div>
      )}

      {/* Disease detections */}
      {result.disease_detections.length > 0 && (
        <div>
          <h3 className="text-[10px] uppercase tracking-wider text-[var(--text3)] mb-2">
            Disease / Damage detected
          </h3>
          <div className="space-y-2">
            {result.disease_detections.map((disease) => (
              <DiseaseCard key={disease.disease_id} disease={disease} />
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {(onLearnMore || onSaveToCollection) && (
        <div className="flex gap-2 pt-2">
          {onLearnMore && (
            <button
              onClick={onLearnMore}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--green)] text-[var(--bg)] text-xs font-semibold hover:bg-[var(--green2)] transition-colors"
            >
              Learn More (AI Companion)
            </button>
          )}
          {onSaveToCollection && (
            <button
              onClick={onSaveToCollection}
              className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text2)] text-xs font-semibold hover:bg-[var(--bg3)] transition-colors"
            >
              Save to Collection
            </button>
          )}
        </div>
      )}
    </div>
  );
}
