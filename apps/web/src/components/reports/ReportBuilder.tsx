import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Eye,
  Loader2,
  Calendar as CalendarIcon,
  TreePine,
  Check,
} from 'lucide-react';
import {
  ReportTemplateSelector,
  SectionSelector,
  REPORT_TEMPLATES,
  type ReportTemplateId,
} from './ReportTemplates';
import { ReportPreview, buildHealthPreviewPages, type ReportPage } from './ReportPreview';
import {
  generateForestHealthReport,
  generateTimberValueReport,
  generateComplianceReport,
  generateAnnualSummary,
  downloadBlob,
  type ParcelReportData,
  type TimberReportData,
  type ComplianceReportData,
  type AnnualSummaryData,
} from '@/services/reportGenerator';
import { DEMO_PARCELS, isDemo } from '@/lib/demoData';

// ─── Types ───

type BuilderStep = 'template' | 'parcels' | 'sections' | 'dates' | 'preview';

const STEPS: BuilderStep[] = ['template', 'parcels', 'sections', 'dates', 'preview'];

interface ParcelOption {
  id: string;
  name: string;
  areaHectares: number;
  municipality: string;
  healthScore: number;
  speciesMix: { species: string; pct: number }[];
}

interface ReportBuilderProps {
  onClose?: () => void;
}

// ─── Component ───

export function ReportBuilder({ onClose }: ReportBuilderProps) {
  const { t } = useTranslation();

  // State
  const [step, setStep] = useState<BuilderStep>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplateId | null>(null);
  const [selectedParcels, setSelectedParcels] = useState<string[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewPages, setPreviewPages] = useState<ReportPage[]>([]);

  // Demo parcels as options
  const parcels: ParcelOption[] = useMemo(() => {
    if (isDemo()) {
      return DEMO_PARCELS.map((p) => ({
        id: p.id,
        name: p.name,
        areaHectares: p.area_hectares,
        municipality: p.municipality,
        healthScore: p.status === 'healthy' ? 82 : p.status === 'at_risk' ? 55 : p.status === 'infested' ? 28 : 50,
        speciesMix: p.species_mix,
      }));
    }
    return DEMO_PARCELS.map((p) => ({
      id: p.id,
      name: p.name,
      areaHectares: p.area_hectares,
      municipality: p.municipality,
      healthScore: 70,
      speciesMix: p.species_mix,
    }));
  }, []);

  const currentStepIdx = STEPS.indexOf(step);
  const canGoBack = currentStepIdx > 0;
  const canGoNext = useMemo(() => {
    switch (step) {
      case 'template': return selectedTemplate !== null;
      case 'parcels': return selectedParcels.length > 0;
      case 'sections': return selectedSections.length > 0;
      case 'dates': return dateFrom && dateTo;
      case 'preview': return true;
      default: return false;
    }
  }, [step, selectedTemplate, selectedParcels, selectedSections, dateFrom, dateTo]);

  // Initialize sections when template changes
  const handleSelectTemplate = useCallback((id: ReportTemplateId) => {
    setSelectedTemplate(id);
    const template = REPORT_TEMPLATES.find((t) => t.id === id);
    if (template) {
      setSelectedSections(template.sections.map((s) => s.id));
    }
  }, []);

  const handleToggleParcel = useCallback((id: string) => {
    setSelectedParcels((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }, []);

  const handleToggleSection = useCallback((id: string) => {
    setSelectedSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }, []);

  const handleNext = useCallback(() => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) {
      const nextStep = STEPS[idx + 1];
      setStep(nextStep);

      // Build preview when entering preview step
      if (nextStep === 'preview') {
        const parcel = parcels.find((p) => selectedParcels.includes(p.id));
        if (parcel) {
          setPreviewPages(buildHealthPreviewPages(parcel.name, parcel.healthScore, parcel.speciesMix));
        }
      }
    }
  }, [step, parcels, selectedParcels]);

  const handleBack = useCallback(() => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  }, [step]);

  // ─── Generate Report ───
  const handleGenerate = useCallback(async () => {
    if (!selectedTemplate || selectedParcels.length === 0) return;

    setGenerating(true);
    setProgress(0);
    setError(null);

    try {
      const parcel = parcels.find((p) => selectedParcels.includes(p.id));
      if (!parcel) throw new Error('No parcel selected');

      let blob: Blob;
      const filename = `beetlesense_${selectedTemplate}_${parcel.name.toLowerCase().replace(/\s+/g, '_')}_${dateTo}.html`;

      const onProgress = (pct: number) => setProgress(pct);

      switch (selectedTemplate) {
        case 'forest-health': {
          const data: ParcelReportData = {
            parcelId: parcel.id,
            parcelName: parcel.name,
            municipality: parcel.municipality,
            areaHectares: parcel.areaHectares,
            speciesMix: parcel.speciesMix,
            healthScore: parcel.healthScore,
            healthTrend: 'stable',
            beetleRisk: parcel.healthScore >= 70 ? 'low' : parcel.healthScore >= 40 ? 'medium' : 'high',
            lastSurveyDate: dateTo,
            treesScanned: Math.round(parcel.areaHectares * 120),
            infectedTrees: Math.round(parcel.areaHectares * 120 * (1 - parcel.healthScore / 100) * 0.3),
            deadTrees: Math.round(parcel.areaHectares * 2),
            timberVolumeM3: Math.round(parcel.areaHectares * 180),
            timberValueSEK: Math.round(parcel.areaHectares * 180 * 550),
            carbonTonsCO2: Math.round(parcel.areaHectares * 12.5),
            ndviAvg: 0.62 + (parcel.healthScore / 100) * 0.25,
            recommendations: [
              'Continue regular monitoring with quarterly drone surveys.',
              'Inspect spruce-dominant areas for early beetle signs before May swarming.',
              'Consider sanitary felling of confirmed infested trees within 4 weeks.',
              'Install pheromone traps along southern edges of spruce stands.',
            ],
            riskFactors: [
              'Spruce dominance (>60%) increases bark beetle vulnerability.',
              'Adjacent clear-cuts detected within 2 km may drive beetle migration.',
              'Dry weather forecast for April-May increases swarming probability.',
            ],
            historicalScores: Array.from({ length: 12 }, (_, i) => ({
              month: new Date(2025, 3 + i).toLocaleDateString('sv-SE', { month: 'short' }),
              score: Math.round(65 + Math.random() * 20 + Math.sin(i / 3) * 8),
            })),
          };
          blob = await generateForestHealthReport(data, onProgress);
          break;
        }
        case 'timber-valuation': {
          const data: TimberReportData = {
            parcelId: parcel.id,
            parcelName: parcel.name,
            municipality: parcel.municipality,
            areaHectares: parcel.areaHectares,
            speciesMix: parcel.speciesMix,
            volumeBySpecies: parcel.speciesMix.map((s) => ({
              species: s.species,
              m3: Math.round(parcel.areaHectares * 180 * s.pct / 100),
              pricePerM3: s.species === 'Spruce' ? 580 : s.species === 'Pine' ? 620 : s.species === 'Oak' ? 1200 : 380,
            })),
            totalVolume: Math.round(parcel.areaHectares * 180),
            totalValue: Math.round(parcel.areaHectares * 180 * 550),
            marketTrend: 'stable',
            harvestRecommendation: 'Market conditions are stable. Spruce timber prices show slight upward pressure due to reduced supply from storm-damaged areas. Consider a selective harvest in Q3 2026 when demand typically peaks for construction-grade timber.',
            priceHistory: Array.from({ length: 12 }, (_, i) => ({
              month: new Date(2025, 3 + i).toLocaleDateString('sv-SE', { month: 'short' }),
              price: Math.round(520 + Math.random() * 80 + i * 3),
            })),
          };
          blob = await generateTimberValueReport(data, onProgress);
          break;
        }
        case 'compliance': {
          const data: ComplianceReportData = {
            permitId: `SK-${parcel.municipality.substring(0, 3).toUpperCase()}-2026-${Math.floor(1000 + Math.random() * 9000)}`,
            permitType: 'Avverkningsanmälan (Felling Notification)',
            parcelName: parcel.name,
            municipality: parcel.municipality,
            issuedDate: dateFrom,
            expiryDate: new Date(new Date(dateTo).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            status: 'active',
            requirements: [
              { requirement: 'Notify Skogsstyrelsen 6 weeks before felling', met: true },
              { requirement: 'Retain at least 10 seed trees per hectare', met: true },
              { requirement: 'Buffer zone of 10 m along watercourses', met: true },
              { requirement: 'Mark key biotope boundaries', met: false },
              { requirement: 'Complete regeneration within 3 years', met: false },
            ],
            inspections: [
              { date: dateFrom, result: 'Approved with conditions', inspector: 'K. Lindqvist' },
            ],
            notes: 'The parcel includes a registered key biotope (nyckelbiotop) in the northeastern corner. This area must be excluded from any harvesting activity. Regeneration plan required before felling commences.',
          };
          blob = await generateComplianceReport(data, onProgress);
          break;
        }
        case 'annual-summary': {
          const selectedParcelData = parcels.filter((p) => selectedParcels.includes(p.id));
          const data: AnnualSummaryData = {
            year: new Date(dateTo).getFullYear(),
            ownerName: 'Forest Owner',
            parcels: selectedParcelData.map((p) => ({
              name: p.name,
              areaHectares: p.areaHectares,
              healthScore: p.healthScore,
              timberValueSEK: Math.round(p.areaHectares * 180 * 550),
              surveysCompleted: Math.floor(1 + Math.random() * 4),
            })),
            totalArea: selectedParcelData.reduce((s, p) => s + p.areaHectares, 0),
            avgHealthScore: Math.round(selectedParcelData.reduce((s, p) => s + p.healthScore, 0) / selectedParcelData.length),
            totalTimberValue: selectedParcelData.reduce((s, p) => s + Math.round(p.areaHectares * 180 * 550), 0),
            totalSurveys: selectedParcelData.length * 3,
            carbonOffset: selectedParcelData.reduce((s, p) => s + p.areaHectares * 12.5, 0),
            keyEvents: [
              { date: `${new Date(dateTo).getFullYear()}-04-15`, description: 'Spring beetle assessment completed across all parcels' },
              { date: `${new Date(dateTo).getFullYear()}-07-22`, description: 'Summer drone survey detected bark beetle activity in Granudden' },
              { date: `${new Date(dateTo).getFullYear()}-09-10`, description: 'Sanitary felling completed in affected areas' },
              { date: `${new Date(dateTo).getFullYear()}-11-30`, description: 'Annual compliance review passed' },
            ],
            monthlyScores: Array.from({ length: 12 }, (_, i) => ({
              month: new Date(new Date(dateTo).getFullYear(), i).toLocaleDateString('sv-SE', { month: 'short' }),
              score: Math.round(60 + Math.random() * 25 + Math.sin(i / 2) * 5),
            })),
          };
          blob = await generateAnnualSummary(data, onProgress);
          break;
        }
        case 'before-after': {
          // Use forest health generator with comparison note
          const data: ParcelReportData = {
            parcelId: parcel.id,
            parcelName: `${parcel.name} (Comparison)`,
            municipality: parcel.municipality,
            areaHectares: parcel.areaHectares,
            speciesMix: parcel.speciesMix,
            healthScore: parcel.healthScore,
            healthTrend: 'improving',
            beetleRisk: 'medium',
            lastSurveyDate: dateTo,
            treesScanned: Math.round(parcel.areaHectares * 120),
            infectedTrees: Math.round(parcel.areaHectares * 5),
            deadTrees: Math.round(parcel.areaHectares * 1),
            timberVolumeM3: Math.round(parcel.areaHectares * 180),
            timberValueSEK: Math.round(parcel.areaHectares * 180 * 550),
            carbonTonsCO2: Math.round(parcel.areaHectares * 12.5),
            ndviAvg: 0.72,
            recommendations: [
              'Health improvement trend confirmed after sanitary measures.',
              'Continue monitoring previously affected zones for re-infestation.',
            ],
            riskFactors: [
              'Some residual beetle population in adjacent stands.',
            ],
            historicalScores: Array.from({ length: 12 }, (_, i) => ({
              month: new Date(2025, 3 + i).toLocaleDateString('sv-SE', { month: 'short' }),
              score: Math.round(45 + i * 3 + Math.random() * 5),
            })),
          };
          blob = await generateForestHealthReport(data, onProgress);
          break;
        }
        default:
          throw new Error('Unknown template');
      }

      downloadBlob(blob, filename);
    } catch (err: any) {
      setError(err.message ?? 'Report generation failed');
    } finally {
      setGenerating(false);
    }
  }, [selectedTemplate, selectedParcels, parcels, dateFrom, dateTo]);

  // ─── Render ───

  return (
    <div className="space-y-6">
      {/* ─── Step Indicator ─── */}
      <div className="flex items-center gap-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <button
              onClick={() => i <= currentStepIdx && setStep(s)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${
                s === step
                  ? 'bg-[var(--green)]/10 text-[var(--green)]'
                  : i < currentStepIdx
                  ? 'text-[var(--text2)] hover:text-[var(--text)]'
                  : 'text-[var(--text3)]'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                  i < currentStepIdx
                    ? 'bg-[var(--green)] text-[var(--bg)]'
                    : s === step
                    ? 'bg-[var(--green)]/20 text-[var(--green)]'
                    : 'bg-[var(--bg3)] text-[var(--text3)]'
                }`}
              >
                {i < currentStepIdx ? <Check size={10} /> : i + 1}
              </span>
              <span className="hidden sm:inline capitalize">{s}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`w-6 h-px mx-1 ${i < currentStepIdx ? 'bg-[var(--green)]' : 'bg-[var(--border)]'}`} />
            )}
          </div>
        ))}
      </div>

      {/* ─── Step Content ─── */}
      <div className="min-h-[300px]">
        {step === 'template' && (
          <ReportTemplateSelector selected={selectedTemplate} onSelect={handleSelectTemplate} />
        )}

        {step === 'parcels' && (
          <div>
            <span className="text-[10px] text-[var(--text3)] uppercase tracking-wider block mb-2">
              {t('reports.builder.selectParcels')}
            </span>
            <div className="space-y-2">
              {parcels.map((parcel) => {
                const isSelected = selectedParcels.includes(parcel.id);
                return (
                  <button
                    key={parcel.id}
                    onClick={() => handleToggleParcel(parcel.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-[var(--green)]/40 bg-[var(--green)]/10'
                        : 'border-[var(--border)] bg-[var(--bg2)] hover:border-[var(--text3)]'
                    }`}
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
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--green)]/10 flex-shrink-0">
                      <TreePine size={14} className="text-[var(--green)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isSelected ? 'text-[var(--green)]' : 'text-[var(--text)]'}`}>
                        {parcel.name}
                      </p>
                      <p className="text-[10px] text-[var(--text3)]">
                        {parcel.municipality} &middot; {parcel.areaHectares} ha
                      </p>
                    </div>
                    <span className={`text-xs font-mono ${parcel.healthScore >= 70 ? 'text-[var(--green)]' : parcel.healthScore >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                      {parcel.healthScore}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 'sections' && selectedTemplate && (
          <SectionSelector
            templateId={selectedTemplate}
            selectedSections={selectedSections}
            onToggle={handleToggleSection}
          />
        )}

        {step === 'dates' && (
          <div>
            <span className="text-[10px] text-[var(--text3)] uppercase tracking-wider block mb-3">
              {t('reports.builder.dateRange')}
            </span>
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <div>
                <label className="text-[10px] text-[var(--text3)] block mb-1">From</label>
                <div className="relative">
                  <CalendarIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg2)] text-xs text-[var(--text)] focus:outline-none focus:border-[var(--green)] [color-scheme:dark]"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-[var(--text3)] block mb-1">To</label>
                <div className="relative">
                  <CalendarIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg2)] text-xs text-[var(--text)] focus:outline-none focus:border-[var(--green)] [color-scheme:dark]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <ReportPreview
              pages={previewPages}
              title={selectedTemplate ? `BeetleSense ${selectedTemplate} Report` : undefined}
            />
          </div>
        )}
      </div>

      {/* ─── Error ─── */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* ─── Navigation ─── */}
      <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--text3)] hover:text-[var(--text)] transition-colors"
            >
              {t('common.cancel')}
            </button>
          )}
          {canGoBack && (
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-[var(--text2)] hover:text-[var(--text)] border border-[var(--border)] hover:border-[var(--text3)] transition-colors"
            >
              <ArrowLeft size={12} />
              {t('common.back')}
            </button>
          )}
        </div>

        <div>
          {step === 'preview' ? (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[var(--green)] text-[var(--bg)] hover:brightness-110 transition disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{t('reports.builder.generating')} {progress}%</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  {t('reports.builder.generatePdf')}
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!canGoNext}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[var(--green)] text-[var(--bg)] hover:brightness-110 transition disabled:opacity-30"
            >
              {step === 'dates' ? (
                <>
                  <Eye size={14} />
                  {t('reports.builder.previewReport')}
                </>
              ) : (
                <>
                  {t('common.next')}
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
