import { useState } from 'react';
import {
  BrainCircuit,
  BookOpen,
  Activity,
  FileText,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Database,
  Cpu,
  Info,
} from 'lucide-react';

import {
  getDemoPapers,
  getKnowledgeBaseStats,
  type PaperAnalysis,
} from '@/services/ai/knowledgeCuratorService';

import { generateCalibrationReport } from '@/services/ai/modelValidatorService';

import { getRecentBriefs, type IntelligenceBrief } from '@/services/ai/intelligenceWriterService';

// ─── Data ─────────────────────────────────────────────────────────────────

const papers = getDemoPapers();
const kbStats = getKnowledgeBaseStats();
const calibration = generateCalibrationReport();
const recentBriefs = getRecentBriefs(undefined, 5);

// ─── Topic tag colors ─────────────────────────────────────────────────────

const TAG_COLORS: Record<string, string> = {
  bark_beetle: '#dc2626',
  climate_change: '#d97706',
  remote_sensing: '#2563eb',
  fire_risk: '#ea580c',
  growth_model: '#059669',
  biodiversity: '#7c3aed',
  phenology: '#0891b2',
  compliance: '#6366f1',
  general: '#6b7280',
};

function tagColor(tag: string): string {
  return TAG_COLORS[tag] ?? TAG_COLORS.general;
}

// ─── Urgency colors ───────────────────────────────────────────────────────

const URGENCY_COLORS: Record<string, string> = {
  immediate: 'var(--risk-high)',
  this_week: 'var(--risk-moderate)',
  this_month: 'var(--risk-info)',
  informational: 'var(--text3)',
};

// ─── Type badge colors ────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  status_update: '#2563eb',
  threat_brief: '#dc2626',
  weekly_summary: '#7c3aed',
  parcel_report: '#059669',
  community_digest: '#d97706',
};

const TYPE_LABELS: Record<string, string> = {
  status_update: 'Status',
  threat_brief: 'Threat',
  weekly_summary: 'Weekly',
  parcel_report: 'Parcel',
  community_digest: 'Community',
};

// ─── Novelty badge colors ─────────────────────────────────────────────────

const NOVELTY_COLORS: Record<string, string> = {
  high: 'var(--risk-high)',
  medium: 'var(--risk-moderate)',
  low: 'var(--text3)',
};

// ─── Hero Section ─────────────────────────────────────────────────────────

function HeroSection() {
  const modelsWithinTolerance = Object.values(calibration.models).filter(
    (m) => m.significance === 'within_tolerance'
  ).length;

  const stats = [
    {
      icon: <Database size={18} />,
      label: 'Knowledge Base',
      value: `${kbStats.total.toLocaleString()} sources`,
      sub: `Last curated: ${Math.round((Date.now() - new Date(kbStats.lastUpdated).getTime()) / 86400000)} days ago`,
      color: '#059669',
    },
    {
      icon: <Cpu size={18} />,
      label: 'Model Health',
      value: `${modelsWithinTolerance}/6 within tolerance`,
      sub: calibration.overallHealth === 'good' ? 'Good — 2 suggest recalibration' : calibration.summary.slice(0, 40),
      color: modelsWithinTolerance >= 5 ? '#059669' : '#d97706',
    },
    {
      icon: <FileText size={18} />,
      label: 'Intelligence Briefs',
      value: `${recentBriefs.length + 7} generated this week`,
      sub: `${recentBriefs.filter((b) => b.urgency === 'immediate').length} immediate priority`,
      color: '#2563eb',
    },
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-lg"
          style={{ background: 'color-mix(in srgb, var(--green) 12%, transparent)' }}
        >
          <BrainCircuit size={22} className="text-[var(--green)]" />
        </div>
        <div>
          <h1
            className="text-xl sm:text-2xl font-bold text-[var(--text)]"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            AI Intelligence Lab
          </h1>
          <p className="text-sm text-[var(--text3)]">
            Powered by Claude &middot; Automated research curation, model validation, and intelligence writing
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-4"
            style={{ background: 'var(--bg2)', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span style={{ color: s.color }}>{s.icon}</span>
              <span className="text-xs font-semibold text-[var(--text2)]">{s.label}</span>
            </div>
            <p className="text-sm font-bold text-[var(--text)]" style={{ fontFamily: 'var(--font-mono)' }}>
              {s.value}
            </p>
            <p className="text-[10px] text-[var(--text3)] mt-1">{s.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Knowledge Curator Section ────────────────────────────────────────────

function PaperCard({ paper }: { paper: PaperAnalysis }) {
  return (
    <div
      className="rounded-xl p-4 mb-3"
      style={{ background: 'var(--bg2)', boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-[var(--text)] leading-snug">{paper.title}</h4>
          <p className="text-[11px] text-[var(--text3)] mt-0.5">
            {paper.authors} ({paper.year}) &middot; {paper.journal}
          </p>
        </div>
        <span
          className="shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white"
          style={{ background: NOVELTY_COLORS[paper.novelty] }}
        >
          {paper.novelty}
        </span>
      </div>

      {/* Topic tags */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {paper.topicTags.map((tag) => (
          <span
            key={tag}
            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{
              background: `color-mix(in srgb, ${tagColor(tag)} 12%, transparent)`,
              color: tagColor(tag),
            }}
          >
            {tag.replace(/_/g, ' ')}
          </span>
        ))}
      </div>

      {/* Key finding excerpt */}
      <div
        className="rounded-lg p-2.5 text-xs text-[var(--text2)] leading-relaxed"
        style={{ background: 'var(--bg3)' }}
      >
        <span className="font-medium text-[var(--text)]">Key finding: </span>
        {paper.ragEntry.excerpt}
      </div>

      {/* Contradiction flag */}
      {paper.contradictions.length > 0 && (
        <div
          className="mt-2 rounded-lg p-2.5 flex items-start gap-2"
          style={{ background: 'color-mix(in srgb, var(--risk-moderate) 8%, transparent)' }}
        >
          <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--risk-moderate)' }} />
          <p className="text-[11px] text-[var(--text2)]">{paper.contradictions[0]}</p>
        </div>
      )}
    </div>
  );
}

function KnowledgeCuratorSection() {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen size={18} className="text-[var(--green)]" />
        <h2 className="text-base font-semibold text-[var(--text)]">Recent Paper Analyses</h2>
      </div>

      {papers.map((paper) => (
        <PaperCard key={paper.id} paper={paper} />
      ))}

      {/* Knowledge Base Growth */}
      <div
        className="rounded-xl p-4 mt-4"
        style={{ background: 'var(--bg2)', boxShadow: 'var(--shadow-card)' }}
      >
        <h3 className="text-xs font-semibold text-[var(--text2)] mb-2">Knowledge Base Growth</h3>
        <p className="text-sm text-[var(--text)]" style={{ fontFamily: 'var(--font-mono)' }}>
          Q1 2026: 1,800 &rarr; Q2 2026: 2,004 (+11.3%)
        </p>
        <p className="text-[10px] text-[var(--text3)] mt-1">
          {kbStats.contradictions} contradictions flagged for review
        </p>
      </div>
    </div>
  );
}

// ─── Model Validation Section ─────────────────────────────────────────────

function ModelValidationSection() {
  const models = [
    { key: 'gddBeetleForecast', data: calibration.models.gddBeetleForecast },
    { key: 'chapmanRichardsGrowth', data: calibration.models.chapmanRichardsGrowth },
    { key: 'fwiFireRisk', data: calibration.models.fwiFireRisk },
    { key: 'marklundBiomass', data: calibration.models.marklundBiomass },
    { key: 'canopyHeightML', data: calibration.models.canopyHeightML },
    { key: 'shannonBiodiversity', data: calibration.models.shannonBiodiversity },
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-[var(--green)]" />
          <h2 className="text-base font-semibold text-[var(--text)]">Calibration Report</h2>
        </div>
        <span
          className="text-[10px] font-medium px-2 py-1 rounded-full"
          style={{
            background: 'color-mix(in srgb, var(--green) 10%, transparent)',
            color: 'var(--green)',
          }}
        >
          Last run: {new Date(calibration.generatedAt).toLocaleDateString('en-SE')}
        </span>
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--bg2)', boxShadow: 'var(--shadow-card)' }}
      >
        {/* Table header */}
        <div
          className="grid grid-cols-6 gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-[var(--text3)]"
          style={{ background: 'var(--bg3)', fontFamily: 'var(--font-mono)' }}
        >
          <span className="col-span-2">Model</span>
          <span className="text-right">Predicted</span>
          <span className="text-right">Actual</span>
          <span className="text-right">Deviation</span>
          <span className="text-center">Status</span>
        </div>

        {/* Table rows */}
        {models.map(({ key, data }) => {
          const isOk = data.significance === 'within_tolerance';
          const isMarginal = data.significance === 'marginal';

          return (
            <div
              key={key}
              className="grid grid-cols-6 gap-2 px-4 py-3 items-center border-t border-[var(--border)]"
            >
              <span className="col-span-2 text-xs font-medium text-[var(--text)]">{data.modelName}</span>
              <span className="text-xs text-right text-[var(--text2)]" style={{ fontFamily: 'var(--font-mono)' }}>
                {typeof data.predicted === 'number' && data.predicted < 1
                  ? `R\u00B2=${data.predicted}`
                  : data.predicted}
              </span>
              <span className="text-xs text-right text-[var(--text2)]" style={{ fontFamily: 'var(--font-mono)' }}>
                {typeof data.actual === 'number' && data.actual < 1
                  ? `R\u00B2=${data.actual}`
                  : data.actual}
              </span>
              <span
                className="text-xs text-right font-medium"
                style={{
                  fontFamily: 'var(--font-mono)',
                  color: isOk ? 'var(--risk-low)' : isMarginal ? 'var(--risk-moderate)' : 'var(--risk-high)',
                }}
              >
                {data.deviationPercent > 0 ? '+' : ''}{data.deviationPercent}%
              </span>
              <span className="flex justify-center">
                {isOk ? (
                  <CheckCircle size={16} style={{ color: 'var(--risk-low)' }} />
                ) : (
                  <AlertTriangle size={16} style={{ color: isMarginal ? 'var(--risk-moderate)' : 'var(--risk-high)' }} />
                )}
              </span>
            </div>
          );
        })}

        {/* Overall */}
        <div className="px-4 py-3 border-t border-[var(--border)]" style={{ background: 'var(--bg3)' }}>
          <p className="text-xs text-[var(--text2)]">
            <span className="font-semibold text-[var(--text)]">Overall: </span>
            {calibration.summary}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Intelligence Writer Section ──────────────────────────────────────────

function BriefCard({ brief }: { brief: IntelligenceBrief }) {
  const [expanded, setExpanded] = useState(false);
  const typeColor = TYPE_COLORS[brief.type] ?? '#6b7280';
  const urgencyColor = URGENCY_COLORS[brief.urgency] ?? 'var(--text3)';

  const timeAgo = (() => {
    const diff = Date.now() - brief.generatedAt;
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  })();

  return (
    <div
      className="rounded-xl overflow-hidden mb-2"
      style={{
        background: 'var(--bg2)',
        boxShadow: 'var(--shadow-card)',
        borderLeft: `3px solid ${typeColor}`,
      }}
    >
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full text-left p-3 flex items-center gap-3"
      >
        {/* Type badge */}
        <span
          className="text-[10px] font-bold uppercase px-2 py-0.5 rounded text-white shrink-0"
          style={{ background: typeColor }}
        >
          {TYPE_LABELS[brief.type] ?? brief.type}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-[var(--text)] truncate">{brief.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: urgencyColor }}
            />
            <span className="text-[10px] text-[var(--text3)]" style={{ fontFamily: 'var(--font-mono)' }}>
              {brief.sources.length} sources &middot; {timeAgo}
            </span>
          </div>
        </div>

        <span className="shrink-0 text-[var(--text3)]">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--text2)] leading-relaxed mt-2 whitespace-pre-line">
            {brief.content.slice(0, 400)}{brief.content.length > 400 ? '...' : ''}
          </p>
          {brief.actions.length > 0 && (
            <div className="mt-2">
              <p className="text-[10px] font-semibold text-[var(--text3)] uppercase mb-1">Actions</p>
              {brief.actions.map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] text-[var(--text2)] py-0.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{
                      background:
                        a.priority === 'high'
                          ? 'var(--risk-high)'
                          : a.priority === 'medium'
                            ? 'var(--risk-moderate)'
                            : 'var(--text3)',
                    }}
                  />
                  <span>{a.action}</span>
                  <span className="text-[var(--text3)] ml-auto shrink-0" style={{ fontFamily: 'var(--font-mono)' }}>
                    {a.deadline}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IntelligenceWriterSection() {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <FileText size={18} className="text-[var(--green)]" />
        <h2 className="text-base font-semibold text-[var(--text)]">Recent AI-Generated Briefs</h2>
      </div>

      {recentBriefs.slice(0, 5).map((brief) => (
        <BriefCard key={brief.id} brief={brief} />
      ))}
    </div>
  );
}

// ─── Operon Banner ────────────────────────────────────────────────────────

function OperonBanner() {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: 'var(--bg2)',
        boxShadow: 'var(--shadow-card)',
        border: '1px solid color-mix(in srgb, var(--risk-info) 40%, transparent)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
          style={{ background: 'color-mix(in srgb, var(--risk-info) 12%, transparent)' }}
        >
          <Sparkles size={18} style={{ color: 'var(--risk-info)' }} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[var(--text)]">Claude Operon Integration</h3>
          <p className="text-xs text-[var(--text2)] mt-1 leading-relaxed">
            When Anthropic releases Claude Operon, these automated workflows will upgrade to
            persistent research projects with file access, plan mode, and life sciences agent skills.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <Info size={12} className="text-[var(--text3)]" />
            <p className="text-[10px] text-[var(--text3)]" style={{ fontFamily: 'var(--font-mono)' }}>
              Current: Claude API (Edge Functions) &rarr; Future: Claude Operon (persistent workspace)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function AILabPage() {
  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <HeroSection />
      <KnowledgeCuratorSection />
      <ModelValidationSection />
      <IntelligenceWriterSection />
      <OperonBanner />
    </div>
  );
}
