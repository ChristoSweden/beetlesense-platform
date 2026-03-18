/**
 * ReportPage — Report builder page for generating PDF reports.
 *
 * Users can select report type, parcels, language, coordinate system,
 * preview in new tab, and download as PDF via browser print.
 * Stores recent reports in localStorage.
 *
 * Self-contained with inline demo data — no external project imports required
 * beyond React and the pdfReportService + PrintableReport.
 */

import { useState, useMemo, useCallback } from 'react';
import {
  previewReport,
  downloadReportAsPdf,
  estimatePageCount,
  saveRecentReport,
  getRecentReports,
  clearRecentReports,
  type ReportType,
  type ReportLanguage,
  type CoordinateSystem,
  type ParcelData,
  type ReportConfig,
  type RecentReport,
} from '@/services/pdfReportService';

// ─── Demo Data ───

const DEMO_PARCELS: ParcelData[] = [
  {
    id: 'p1',
    name: 'Granudden',
    municipality: 'Varnamo',
    areaHectares: 45.2,
    speciesMix: [
      { species: 'Gran', pct: 65 },
      { species: 'Tall', pct: 20 },
      { species: 'Bjork', pct: 15 },
    ],
    healthScore: 78,
    healthTrend: 'stable',
    beetleRisk: 'medium',
    lastSurveyDate: '2026-02-15',
    treesScanned: 5424,
    infectedTrees: 162,
    deadTrees: 23,
    timberVolumeM3: 8136,
    timberValueSEK: 4474800,
    carbonTonsCO2: 565.0,
    ndviAvg: 0.71,
    recommendations: [
      'Fortsatt overvakning med kvartalsvis droninventering.',
      'Inspektera grandominerade omraden for tidiga barkborretecken fore majsvarmningen.',
      'Overvag sanitetsavverkning av bekraftade infekterade trad inom 4 veckor.',
      'Installera feromonfallar langs sydliga kanter av granbestand.',
    ],
    riskFactors: [
      'Gran-dominans (>60%) okar sarbarheten for barkborre.',
      'Angransande kalavverkningar upptackta inom 2 km kan driva barkborremigration.',
      'Torrt vader prognos for april-maj okar svarmningssannolikheten.',
    ],
    historicalScores: Array.from({ length: 12 }, (_, i) => ({
      month: new Date(2025, 3 + i).toLocaleDateString('sv-SE', { month: 'short' }),
      score: Math.round(72 + Math.sin(i / 2) * 8 + (i % 3)),
    })),
    coordinates: { lat: 57.1857, lng: 14.0422 },
    standAge: 65,
    soilType: 'Moranmark',
    elevation: 185,
  },
  {
    id: 'p2',
    name: 'Tallbacken',
    municipality: 'Ljungby',
    areaHectares: 32.8,
    speciesMix: [
      { species: 'Tall', pct: 70 },
      { species: 'Gran', pct: 20 },
      { species: 'Bjork', pct: 10 },
    ],
    healthScore: 85,
    healthTrend: 'improving',
    beetleRisk: 'low',
    lastSurveyDate: '2026-02-20',
    treesScanned: 3936,
    infectedTrees: 47,
    deadTrees: 8,
    timberVolumeM3: 5904,
    timberValueSEK: 3660480,
    carbonTonsCO2: 410.0,
    ndviAvg: 0.76,
    recommendations: [
      'Bra halsa. Fortsatt arlig overvakning ar tillracklig.',
      'Planera for gallring i nordvastra sektionen (hog stamtathet).',
    ],
    riskFactors: [
      'Liten risk. Talldominans ger naturligt skydd mot granbarkborre.',
    ],
    historicalScores: Array.from({ length: 12 }, (_, i) => ({
      month: new Date(2025, 3 + i).toLocaleDateString('sv-SE', { month: 'short' }),
      score: Math.round(80 + i * 0.5 + Math.sin(i / 3) * 3),
    })),
    coordinates: { lat: 56.8333, lng: 13.9333 },
    standAge: 48,
    soilType: 'Sandig moranmark',
    elevation: 162,
  },
  {
    id: 'p3',
    name: 'Bjorklund',
    municipality: 'Vaxjo',
    areaHectares: 18.5,
    speciesMix: [
      { species: 'Bjork', pct: 55 },
      { species: 'Gran', pct: 30 },
      { species: 'Asp', pct: 15 },
    ],
    healthScore: 91,
    healthTrend: 'stable',
    beetleRisk: 'low',
    lastSurveyDate: '2026-01-28',
    treesScanned: 2220,
    infectedTrees: 11,
    deadTrees: 3,
    timberVolumeM3: 3330,
    timberValueSEK: 1265400,
    carbonTonsCO2: 231.3,
    ndviAvg: 0.82,
    recommendations: [
      'Utmarkt halsa. Inga atgarder behovs.',
      'Overvag att utoka lovskogsdelen for biodiversitet.',
    ],
    riskFactors: [
      'Minimal risk. Lovskog ar inte primar vard for granbarkborre.',
    ],
    historicalScores: Array.from({ length: 12 }, (_, i) => ({
      month: new Date(2025, 3 + i).toLocaleDateString('sv-SE', { month: 'short' }),
      score: Math.round(88 + Math.sin(i / 4) * 4),
    })),
    coordinates: { lat: 56.8790, lng: 14.8094 },
    standAge: 35,
  },
  {
    id: 'p4',
    name: 'Ekskogen',
    municipality: 'Alvesta',
    areaHectares: 12.3,
    speciesMix: [
      { species: 'Ek', pct: 60 },
      { species: 'Bjork', pct: 25 },
      { species: 'Asp', pct: 15 },
    ],
    healthScore: 88,
    healthTrend: 'stable',
    beetleRisk: 'low',
    lastSurveyDate: '2026-02-10',
    treesScanned: 1476,
    infectedTrees: 7,
    deadTrees: 2,
    timberVolumeM3: 2214,
    timberValueSEK: 2656800,
    carbonTonsCO2: 153.8,
    ndviAvg: 0.79,
    recommendations: [
      'Skydda ekbestandet som nyckelbiotop.',
      'Planera naturvardsgallring for att gynna aldre ekar.',
    ],
    riskFactors: [
      'Eksjukdom (Phytophthora) bor overvakas.',
    ],
    historicalScores: Array.from({ length: 12 }, (_, i) => ({
      month: new Date(2025, 3 + i).toLocaleDateString('sv-SE', { month: 'short' }),
      score: Math.round(85 + Math.sin(i / 3) * 4),
    })),
    coordinates: { lat: 56.8990, lng: 14.5560 },
    standAge: 120,
  },
  {
    id: 'p5',
    name: 'Furudal',
    municipality: 'Smalandsstenar',
    areaHectares: 67.1,
    speciesMix: [
      { species: 'Gran', pct: 75 },
      { species: 'Tall', pct: 15 },
      { species: 'Bjork', pct: 10 },
    ],
    healthScore: 42,
    healthTrend: 'declining',
    beetleRisk: 'high',
    lastSurveyDate: '2026-03-01',
    treesScanned: 8052,
    infectedTrees: 1450,
    deadTrees: 312,
    timberVolumeM3: 12078,
    timberValueSEK: 6642900,
    carbonTonsCO2: 838.8,
    ndviAvg: 0.48,
    recommendations: [
      'BRADSKAENDE: Paborja sanitetsavverkning omedelbart.',
      'Kontakta Skogsstyrelsen for radgivning om avverkningsanmalan.',
      'Isolera infekterade omraden med feromonfallar.',
      'Planera for aterplantering med blandad artsammansattning.',
    ],
    riskFactors: [
      'Hog granandel (75%) med aktiv barkborreinfestation.',
      'Sjunkande NDVI indikerar snabb halsoforsamring.',
      'Stora angransande kalavverkningar okar exponering.',
      'Bestandsalder (55 ar) ar i primarzonen for barkborreangrepp.',
    ],
    historicalScores: Array.from({ length: 12 }, (_, i) => ({
      month: new Date(2025, 3 + i).toLocaleDateString('sv-SE', { month: 'short' }),
      score: Math.round(65 - i * 2 + Math.sin(i / 2) * 3),
    })),
    coordinates: { lat: 57.1550, lng: 13.4200 },
    standAge: 55,
    soilType: 'Torvmark',
    elevation: 210,
  },
  {
    id: 'p6',
    name: 'Aspangen',
    municipality: 'Gislaved',
    areaHectares: 23.7,
    speciesMix: [
      { species: 'Asp', pct: 40 },
      { species: 'Gran', pct: 35 },
      { species: 'Bjork', pct: 25 },
    ],
    healthScore: 69,
    healthTrend: 'stable',
    beetleRisk: 'medium',
    lastSurveyDate: '2026-02-25',
    treesScanned: 2844,
    infectedTrees: 199,
    deadTrees: 34,
    timberVolumeM3: 4266,
    timberValueSEK: 1919700,
    carbonTonsCO2: 296.3,
    ndviAvg: 0.65,
    recommendations: [
      'Overvaka graninslaget noggrant under varen.',
      'Overvag att minska granandelen till fordel for asp och bjork.',
      'Installera feromonfallar i graninslaget.',
    ],
    riskFactors: [
      'Granandelen (35%) ar sarbar for barkborre.',
      'Medelrisk pa grund av blandad artsammansattning.',
    ],
    historicalScores: Array.from({ length: 12 }, (_, i) => ({
      month: new Date(2025, 3 + i).toLocaleDateString('sv-SE', { month: 'short' }),
      score: Math.round(66 + Math.sin(i / 3) * 5),
    })),
    coordinates: { lat: 57.3050, lng: 13.5400 },
    standAge: 42,
  },
];

// ─── Report Type Options ───

const REPORT_TYPES: { value: ReportType; labelSv: string; labelEn: string; descSv: string; descEn: string }[] = [
  {
    value: 'parcel-summary',
    labelSv: 'Skiftesammanfattning',
    labelEn: 'Parcel Summary',
    descSv: 'Overblick av ett enskilt skifte',
    descEn: 'Single parcel overview',
  },
  {
    value: 'portfolio-overview',
    labelSv: 'Portfoljsammanfattning',
    labelEn: 'Portfolio Overview',
    descSv: 'Sammanfattning av flera skiften',
    descEn: 'Multi-parcel portfolio summary',
  },
  {
    value: 'survey-report',
    labelSv: 'Droneinventeringsrapport',
    labelEn: 'Survey Report',
    descSv: 'Resultat fran droninventering',
    descEn: 'Drone survey results',
  },
  {
    value: 'timber-inventory',
    labelSv: 'Virkesforradsinventering',
    labelEn: 'Timber Inventory',
    descSv: 'Virkesforrad och vardering per tradslag',
    descEn: 'Timber stock and valuation by species',
  },
  {
    value: 'health-assessment',
    labelSv: 'Skogshalsobedoming',
    labelEn: 'Health Assessment',
    descSv: 'Halsobedoming med riskfaktorer',
    descEn: 'Forest health assessment with risk factors',
  },
];

// ─── Component ───

export default function ReportPage() {
  // State
  const [reportType, setReportType] = useState<ReportType>('parcel-summary');
  const [selectedParcels, setSelectedParcels] = useState<string[]>([]);
  const [language, setLanguage] = useState<ReportLanguage>('sv');
  const [coordSystem, setCoordSystem] = useState<CoordinateSystem>('SWEREF99');
  const [recentReports, setRecentReports] = useState<RecentReport[]>(() => getRecentReports());
  const [generating, setGenerating] = useState(false);

  // Derived
  const parcelsData = useMemo(
    () => DEMO_PARCELS.filter((p) => selectedParcels.includes(p.id)),
    [selectedParcels],
  );

  const pageCount = useMemo(
    () => estimatePageCount(reportType, Math.max(parcelsData.length, 1)),
    [reportType, parcelsData.length],
  );

  const canGenerate = parcelsData.length > 0;

  const buildConfig = useCallback((): ReportConfig => {
    return {
      type: reportType,
      language,
      coordinateSystem: coordSystem,
      parcels: parcelsData,
      userName: 'Demo User',
      generatedAt: new Date().toISOString(),
      surveyId: reportType === 'survey-report' ? `SRV-${Date.now().toString(36).toUpperCase()}` : undefined,
      surveyDate: reportType === 'survey-report' ? new Date().toISOString().slice(0, 10) : undefined,
      droneModel: reportType === 'survey-report' ? 'DJI Matrice 350 RTK' : undefined,
      flightAltitude: reportType === 'survey-report' ? 80 : undefined,
      imagesProcessed: reportType === 'survey-report' ? parcelsData.reduce((s, p) => s + p.treesScanned * 2, 0) : undefined,
    };
  }, [reportType, language, coordSystem, parcelsData]);

  const saveToRecent = useCallback((config: ReportConfig) => {
    const report: RecentReport = {
      id: `rpt-${Date.now()}`,
      type: config.type,
      title: REPORT_TYPES.find((rt) => rt.value === config.type)?.[config.language === 'sv' ? 'labelSv' : 'labelEn'] ?? config.type,
      parcelNames: config.parcels.map((p) => p.name),
      language: config.language,
      generatedAt: new Date().toISOString(),
      pageCount,
    };
    saveRecentReport(report);
    setRecentReports(getRecentReports());
  }, [pageCount]);

  // Handlers
  const handleToggleParcel = (id: string) => {
    setSelectedParcels((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    if (selectedParcels.length === DEMO_PARCELS.length) {
      setSelectedParcels([]);
    } else {
      setSelectedParcels(DEMO_PARCELS.map((p) => p.id));
    }
  };

  const handlePreview = () => {
    if (!canGenerate) return;
    const config = buildConfig();
    previewReport(config);
    saveToRecent(config);
  };

  const handleDownload = () => {
    if (!canGenerate) return;
    setGenerating(true);
    const config = buildConfig();
    // Small delay to show loading state
    setTimeout(() => {
      downloadReportAsPdf(config);
      saveToRecent(config);
      setGenerating(false);
    }, 300);
  };

  const handleClearRecent = () => {
    clearRecentReports();
    setRecentReports([]);
  };

  // Score color helper
  const sc = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-amber-600';
    return 'text-red-600';
  };

  const riskBg = (risk: string) => {
    if (risk === 'low') return 'bg-green-100 text-green-700';
    if (risk === 'medium') return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div className="p-4 lg:p-6 max-w-4xl">
      {/* ─── Header ─── */}
      <div className="mb-6">
        <h1 className="text-xl font-serif font-bold text-[var(--text)]">
          {language === 'sv' ? 'Rapportgenerator' : 'Report Generator'}
        </h1>
        <p className="text-xs text-[var(--text3)] mt-1">
          {language === 'sv'
            ? 'Generera PDF-rapporter for dina skogsbruksskiften'
            : 'Generate PDF reports for your forest parcels'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ═══ Left Column: Configuration ═══ */}
        <div className="lg:col-span-2 space-y-5">

          {/* Report Type */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
            <label className="text-[10px] text-[var(--text3)] uppercase tracking-wider block mb-2 font-semibold">
              {language === 'sv' ? 'Rapporttyp' : 'Report Type'}
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--green)] [color-scheme:dark]"
            >
              {REPORT_TYPES.map((rt) => (
                <option key={rt.value} value={rt.value}>
                  {language === 'sv' ? rt.labelSv : rt.labelEn}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-[var(--text3)] mt-1.5">
              {REPORT_TYPES.find((rt) => rt.value === reportType)?.[language === 'sv' ? 'descSv' : 'descEn']}
            </p>
          </div>

          {/* Parcel Selection */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] text-[var(--text3)] uppercase tracking-wider font-semibold">
                {language === 'sv' ? 'Valj skiften' : 'Select Parcels'}
              </label>
              <button
                onClick={handleSelectAll}
                className="text-[10px] font-medium text-[var(--green)] hover:underline"
              >
                {selectedParcels.length === DEMO_PARCELS.length
                  ? (language === 'sv' ? 'Avmarkera alla' : 'Deselect All')
                  : (language === 'sv' ? 'Valj alla' : 'Select All')}
              </button>
            </div>
            <div className="space-y-1.5">
              {DEMO_PARCELS.map((parcel) => {
                const isSelected = selectedParcels.includes(parcel.id);
                return (
                  <button
                    key={parcel.id}
                    onClick={() => handleToggleParcel(parcel.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-all text-xs ${
                      isSelected
                        ? 'border-[var(--green)]/40 bg-[var(--green)]/10'
                        : 'border-[var(--border)] bg-[var(--bg)] hover:border-[var(--text3)]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors ${
                        isSelected
                          ? 'bg-[var(--green)] border-[var(--green)]'
                          : 'border-[var(--text3)]'
                      }`}
                    >
                      {isSelected && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-[var(--bg)]">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`font-medium ${isSelected ? 'text-[var(--green)]' : 'text-[var(--text)]'}`}>
                        {parcel.name}
                      </span>
                      <span className="text-[var(--text3)] ml-2">
                        {parcel.municipality} &middot; {parcel.areaHectares} ha
                      </span>
                    </div>
                    <span className={`font-mono font-bold ${sc(parcel.healthScore)}`}>
                      {parcel.healthScore}
                    </span>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase ${riskBg(parcel.beetleRisk)}`}>
                      {parcel.beetleRisk}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Language & Coordinate System */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
              <label className="text-[10px] text-[var(--text3)] uppercase tracking-wider block mb-2 font-semibold">
                {language === 'sv' ? 'Sprak' : 'Language'}
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setLanguage('sv')}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                    language === 'sv'
                      ? 'bg-[var(--green)] text-[var(--bg)]'
                      : 'border border-[var(--border)] text-[var(--text2)] hover:border-[var(--text3)]'
                  }`}
                >
                  Svenska
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                    language === 'en'
                      ? 'bg-[var(--green)] text-[var(--bg)]'
                      : 'border border-[var(--border)] text-[var(--text2)] hover:border-[var(--text3)]'
                  }`}
                >
                  English
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
              <label className="text-[10px] text-[var(--text3)] uppercase tracking-wider block mb-2 font-semibold">
                {language === 'sv' ? 'Koordinatsystem' : 'Coordinate System'}
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setCoordSystem('SWEREF99')}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                    coordSystem === 'SWEREF99'
                      ? 'bg-[var(--green)] text-[var(--bg)]'
                      : 'border border-[var(--border)] text-[var(--text2)] hover:border-[var(--text3)]'
                  }`}
                >
                  SWEREF99 TM
                </button>
                <button
                  onClick={() => setCoordSystem('WGS84')}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                    coordSystem === 'WGS84'
                      ? 'bg-[var(--green)] text-[var(--bg)]'
                      : 'border border-[var(--border)] text-[var(--text2)] hover:border-[var(--text3)]'
                  }`}
                >
                  WGS84
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ Right Column: Actions & Recent ═══ */}
        <div className="space-y-5">

          {/* Report Summary */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
            <h3 className="text-xs font-semibold text-[var(--text2)] mb-3">
              {language === 'sv' ? 'Rapportsammanfattning' : 'Report Summary'}
            </h3>
            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between">
                <span className="text-[var(--text3)]">{language === 'sv' ? 'Typ' : 'Type'}</span>
                <span className="text-[var(--text)] font-medium">
                  {REPORT_TYPES.find((rt) => rt.value === reportType)?.[language === 'sv' ? 'labelSv' : 'labelEn']}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text3)]">{language === 'sv' ? 'Valda skiften' : 'Selected Parcels'}</span>
                <span className="text-[var(--text)] font-medium">{parcelsData.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text3)]">{language === 'sv' ? 'Sprak' : 'Language'}</span>
                <span className="text-[var(--text)] font-medium">{language === 'sv' ? 'Svenska' : 'English'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text3)]">{language === 'sv' ? 'Koordinater' : 'Coordinates'}</span>
                <span className="text-[var(--text)] font-medium">{coordSystem === 'SWEREF99' ? 'SWEREF99 TM' : 'WGS84'}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[var(--border)]">
                <span className="text-[var(--text3)]">{language === 'sv' ? 'Uppskattat sidantal' : 'Estimated Pages'}</span>
                <span className="text-[var(--green)] font-bold font-mono">{pageCount}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={handlePreview}
              disabled={!canGenerate}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border border-[var(--green)] text-[var(--green)] hover:bg-[var(--green)]/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {language === 'sv' ? 'Forhandsgranska' : 'Preview'}
            </button>

            <button
              onClick={handleDownload}
              disabled={!canGenerate || generating}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-[var(--green)] text-[var(--bg)] hover:brightness-110 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {generating ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin shrink-0">
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              )}
              {generating
                ? (language === 'sv' ? 'Genererar...' : 'Generating...')
                : (language === 'sv' ? 'Ladda ner PDF' : 'Download PDF')}
            </button>
          </div>

          {!canGenerate && (
            <p className="text-[10px] text-[var(--text3)] text-center">
              {language === 'sv'
                ? 'Valj minst ett skifte for att generera en rapport.'
                : 'Select at least one parcel to generate a report.'}
            </p>
          )}

          {/* Recent Reports */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-[var(--text2)]">
                {language === 'sv' ? 'Senaste rapporter' : 'Recent Reports'}
              </h3>
              {recentReports.length > 0 && (
                <button
                  onClick={handleClearRecent}
                  className="text-[9px] text-[var(--text3)] hover:text-[var(--text)] transition-colors"
                >
                  {language === 'sv' ? 'Rensa' : 'Clear'}
                </button>
              )}
            </div>

            {recentReports.length === 0 ? (
              <p className="text-[10px] text-[var(--text3)] py-2">
                {language === 'sv'
                  ? 'Inga senaste rapporter.'
                  : 'No recent reports.'}
              </p>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {recentReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-start gap-2 p-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[10px]"
                  >
                    <div className="w-6 h-6 rounded bg-[var(--green)]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--green)]">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[var(--text)] truncate">{report.title}</p>
                      <p className="text-[var(--text3)] truncate">
                        {report.parcelNames.join(', ')}
                      </p>
                      <p className="text-[var(--text3)]">
                        {new Date(report.generatedAt).toLocaleDateString(language === 'sv' ? 'sv-SE' : 'en-GB')}
                        {' '}&middot;{' '}{report.pageCount} {language === 'sv' ? 'sidor' : 'pages'}
                        {' '}&middot;{' '}{report.language.toUpperCase()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
