import { useTranslation } from 'react-i18next';
import {
  Heart,
  TreePine,
  Calendar,
  ClipboardCheck,
  GitCompareArrows,
  Check,
} from 'lucide-react';
import type { ReactNode } from 'react';

// ─── Types ───

export type ReportTemplateId =
  | 'forest-health'
  | 'timber-valuation'
  | 'annual-summary'
  | 'compliance'
  | 'before-after';

export interface ReportSection {
  id: string;
  label: string;
  required?: boolean;
}

export interface ReportTemplate {
  id: ReportTemplateId;
  labelKey: string;
  descKey: string;
  icon: ReactNode;
  color: string;
  sections: ReportSection[];
  frequency?: string;
}

// ─── Template Definitions ───

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'forest-health',
    labelKey: 'reports.templates.forestHealth',
    descKey: 'reports.templates.forestHealthDesc',
    icon: <Heart size={16} />,
    color: '#22c55e',
    frequency: 'monthly / quarterly',
    sections: [
      { id: 'overview', label: 'Parcel Overview', required: true },
      { id: 'health-score', label: 'Health Score & Trend', required: true },
      { id: 'beetle-risk', label: 'Beetle Risk Assessment' },
      { id: 'species-mix', label: 'Species Composition' },
      { id: 'ndvi', label: 'NDVI Analysis' },
      { id: 'detection-summary', label: 'Detection Summary' },
      { id: 'recommendations', label: 'Recommendations', required: true },
      { id: 'risk-factors', label: 'Risk Factors' },
      { id: 'trend-chart', label: 'Historical Trend Chart' },
    ],
  },
  {
    id: 'timber-valuation',
    labelKey: 'reports.templates.timberValuation',
    descKey: 'reports.templates.timberValuationDesc',
    icon: <TreePine size={16} />,
    color: '#fbbf24',
    sections: [
      { id: 'overview', label: 'Parcel Overview', required: true },
      { id: 'volume-species', label: 'Volume by Species', required: true },
      { id: 'price-breakdown', label: 'Price Breakdown', required: true },
      { id: 'market-trend', label: 'Market Trend' },
      { id: 'price-history', label: 'Price History Chart' },
      { id: 'harvest-rec', label: 'Harvest Recommendation' },
    ],
  },
  {
    id: 'annual-summary',
    labelKey: 'reports.templates.annualSummary',
    descKey: 'reports.templates.annualSummaryDesc',
    icon: <Calendar size={16} />,
    color: '#3b82f6',
    frequency: 'yearly',
    sections: [
      { id: 'overview', label: 'Year Overview', required: true },
      { id: 'parcel-summary', label: 'Parcel Summary', required: true },
      { id: 'health-trend', label: 'Monthly Health Trend' },
      { id: 'timber-value', label: 'Timber Valuation' },
      { id: 'carbon', label: 'Carbon Offset' },
      { id: 'key-events', label: 'Key Events', required: true },
      { id: 'survey-count', label: 'Survey Activity' },
    ],
  },
  {
    id: 'compliance',
    labelKey: 'reports.templates.compliance',
    descKey: 'reports.templates.complianceDesc',
    icon: <ClipboardCheck size={16} />,
    color: '#a78bfa',
    sections: [
      { id: 'permit-info', label: 'Permit Information', required: true },
      { id: 'requirements', label: 'Requirements Checklist', required: true },
      { id: 'inspections', label: 'Inspection History' },
      { id: 'notes', label: 'Notes & Observations' },
    ],
  },
  {
    id: 'before-after',
    labelKey: 'reports.templates.beforeAfter',
    descKey: 'reports.templates.beforeAfterDesc',
    icon: <GitCompareArrows size={16} />,
    color: '#f97316',
    sections: [
      { id: 'overview', label: 'Comparison Overview', required: true },
      { id: 'health-compare', label: 'Health Score Comparison', required: true },
      { id: 'visual-compare', label: 'Visual Comparison' },
      { id: 'detection-diff', label: 'Detection Differences' },
      { id: 'recommendations', label: 'Updated Recommendations' },
    ],
  },
];

// ─── Template Selector Component ───

interface ReportTemplateSelectorProps {
  selected: ReportTemplateId | null;
  onSelect: (id: ReportTemplateId) => void;
}

export function ReportTemplateSelector({ selected, onSelect }: ReportTemplateSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <span className="text-[10px] text-[var(--text3)] uppercase tracking-wider block mb-2">
        {t('reports.builder.selectTemplate')}
      </span>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {REPORT_TEMPLATES.map((template) => {
          const isSelected = selected === template.id;
          return (
            <button
              key={template.id}
              onClick={() => onSelect(template.id)}
              className={`text-left p-4 rounded-xl border transition-all ${
                isSelected
                  ? 'border-[var(--green)]/40 bg-[var(--green)]/10'
                  : 'border-[var(--border)] bg-[var(--bg2)] hover:border-[var(--text3)]'
              }`}
            >
              <div className="flex items-start justify-between">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `${template.color}15`,
                    color: template.color,
                  }}
                >
                  {template.icon}
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-[var(--green)] flex items-center justify-center">
                    <Check size={12} className="text-[var(--bg)]" />
                  </div>
                )}
              </div>

              <h3 className={`text-sm font-medium mt-3 ${isSelected ? 'text-[var(--green)]' : 'text-[var(--text)]'}`}>
                {t(template.labelKey)}
              </h3>
              <p className="text-[11px] text-[var(--text3)] mt-1 line-clamp-2">
                {t(template.descKey)}
              </p>

              {template.frequency && (
                <span className="inline-block mt-2 text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--bg3)] text-[var(--text3)]">
                  {template.frequency}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Section Selector Component ───

interface SectionSelectorProps {
  templateId: ReportTemplateId;
  selectedSections: string[];
  onToggle: (sectionId: string) => void;
}

export function SectionSelector({ templateId, selectedSections, onToggle }: SectionSelectorProps) {
  const template = REPORT_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return null;

  return (
    <div>
      <span className="text-[10px] text-[var(--text3)] uppercase tracking-wider block mb-2">
        Sections to Include
      </span>
      <div className="space-y-1.5">
        {template.sections.map((section) => {
          const isSelected = selectedSections.includes(section.id);
          const isRequired = section.required;

          return (
            <button
              key={section.id}
              onClick={() => !isRequired && onToggle(section.id)}
              disabled={isRequired}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-all text-xs ${
                isSelected
                  ? 'border-[var(--green)]/30 bg-[var(--green)]/5'
                  : 'border-[var(--border)] hover:border-[var(--text3)]'
              } ${isRequired ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <div
                className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${
                  isSelected
                    ? 'bg-[var(--green)] border-[var(--green)]'
                    : 'border-[var(--text3)]'
                }`}
              >
                {isSelected && <Check size={10} className="text-[var(--bg)]" />}
              </div>
              <span className={isSelected ? 'text-[var(--text)]' : 'text-[var(--text3)]'}>
                {section.label}
              </span>
              {isRequired && (
                <span className="ml-auto text-[9px] font-mono uppercase text-[var(--text3)]">
                  required
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
