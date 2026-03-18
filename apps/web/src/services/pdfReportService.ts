/**
 * pdfReportService — Printable HTML-based PDF report generation.
 *
 * Generates styled HTML reports in a hidden iframe and triggers
 * the browser's print dialog (Save as PDF). No external PDF library needed.
 *
 * Supports Swedish & English, Swedish number formatting, multiple report types.
 */

// ─── Types ───

export type ReportType =
  | 'parcel-summary'
  | 'portfolio-overview'
  | 'survey-report'
  | 'timber-inventory'
  | 'health-assessment';

export type ReportLanguage = 'sv' | 'en';
export type CoordinateSystem = 'WGS84' | 'SWEREF99';

export interface SensorProductMeta {
  modelVersion: string;
  confidenceScore: number;
  processingDate: string;
}

export interface ParcelData {
  id: string;
  name: string;
  municipality: string;
  areaHectares: number;
  speciesMix: { species: string; pct: number }[];
  healthScore: number;
  healthTrend: 'improving' | 'stable' | 'declining';
  beetleRisk: 'low' | 'medium' | 'high' | 'critical';
  lastSurveyDate: string;
  treesScanned: number;
  infectedTrees: number;
  deadTrees: number;
  timberVolumeM3: number;
  timberValueSEK: number;
  carbonTonsCO2: number;
  ndviAvg: number;
  recommendations: string[];
  riskFactors: string[];
  historicalScores: { month: string; score: number }[];
  coordinates?: { lat: number; lng: number };
  standAge?: number;
  soilType?: string;
  elevation?: number;
  // Sensor data fields
  ndviMean?: number;
  ndreMean?: number;
  thermalHotspots?: number;
  treeCount?: number;
  avgTreeHeight?: number;
  totalVolume?: number;
  crownHealthScore?: number;
  beetleStressScore?: number;
  // Sensor product metadata
  sensorMeta?: SensorProductMeta;
  // Crown health distribution
  crownHealthDistribution?: { class: string; pct: number }[];
  // Beetle stress details
  beetleStressClass?: 'ingen' | 'lag' | 'medel' | 'hog' | 'kritisk';
  beetleAffectedAreaHa?: number;
}

export interface ReportConfig {
  type: ReportType;
  language: ReportLanguage;
  coordinateSystem: CoordinateSystem;
  parcels: ParcelData[];
  userName?: string;
  organizationName?: string;
  generatedAt?: string;
  surveyId?: string;
  surveyDate?: string;
  droneModel?: string;
  flightAltitude?: number;
  imagesProcessed?: number;
}

export interface RecentReport {
  id: string;
  type: ReportType;
  title: string;
  parcelNames: string[];
  language: ReportLanguage;
  generatedAt: string;
  pageCount: number;
}

// ─── Labels ───

const LABELS: Record<ReportLanguage, Record<string, string>> = {
  sv: {
    'report.parcelSummary': 'Skiftesammanfattning',
    'report.portfolioOverview': 'Portfoljsammanfattning',
    'report.surveyReport': 'Droneinventeringsrapport',
    'report.timberInventory': 'Virkesforradsinventering',
    'report.healthAssessment': 'Skogshalsobedoming',
    'report.generatedBy': 'Genererad av',
    'report.date': 'Datum',
    'report.page': 'Sida',
    'report.of': 'av',
    'report.tableOfContents': 'Innehallsforteckning',
    'report.parcelOverview': 'Skiftesoverblick',
    'report.area': 'Areal',
    'report.hectares': 'hektar',
    'report.municipality': 'Kommun',
    'report.healthScore': 'Halsoindex',
    'report.healthTrend': 'Halsotrend',
    'report.beetleRisk': 'Barkborrerisk',
    'report.speciesComposition': 'Tradeslagsfordelning',
    'report.lastSurvey': 'Senaste inventering',
    'report.treesScanned': 'Trad inventerade',
    'report.infectedTrees': 'Infekterade trad',
    'report.deadTrees': 'Doda trad',
    'report.timberVolume': 'Virkesforrad',
    'report.timberValue': 'Virkesvarде',
    'report.carbonSequestration': 'Kolbindning',
    'report.ndviAverage': 'Genomsnittligt NDVI',
    'report.recommendations': 'Rekommendationer',
    'report.riskFactors': 'Riskfaktorer',
    'report.scoreTrend': 'Halsoindexutveckling (12 manader)',
    'report.summaryStatistics': 'Sammanfattande statistik',
    'report.totalArea': 'Total areal',
    'report.avgHealthScore': 'Genomsnittligt halsoindex',
    'report.totalTimberVolume': 'Totalt virkesforrad',
    'report.totalTimberValue': 'Totalt virkesvarде',
    'report.totalCarbon': 'Total kolbindning',
    'report.parcelsIncluded': 'Antal skiften',
    'report.disclaimer':
      'Denna rapport ar automatiskt genererad och bor verifieras av en certifierad skoglig radgivare. BeetleSense.ai tar inget ansvar for beslut baserade pa denna rapport.',
    'report.confidential': 'Konfidentiellt',
    'report.coordinates': 'Koordinater',
    'report.coordinateSystem': 'Koordinatsystem',
    'report.surveyDetails': 'Inventeringsdetaljer',
    'report.surveyId': 'Inventerings-ID',
    'report.surveyDate': 'Inventeringsdatum',
    'report.droneModel': 'Dronemodell',
    'report.flightAltitude': 'Flyghojd',
    'report.imagesProcessed': 'Bilder bearbetade',
    'report.volumeBySpecies': 'Volym per tradslag',
    'report.priceEstimate': 'Prisskattning',
    'report.marketCondition': 'Marknadslage',
    'report.harvestRecommendation': 'Avverkningsrekommendation',
    'report.standAge': 'Bestandsalder',
    'report.soilType': 'Jordart',
    'report.elevation': 'Hojd over havet',
    'report.detectionSummary': 'Detektionssammanfattning',
    'report.infectionRate': 'Infektionsgrad',
    'report.sensorAnalysis': 'Sensoranalys',
    'report.ndviMean': 'NDVI medelvarde',
    'report.ndreMean': 'NDRE medelvarde',
    'report.thermalHotspots': 'Termiska hotspots',
    'report.treeInventory': 'Tradbestand',
    'report.treeCount': 'Antal trad',
    'report.avgTreeHeight': 'Medelhojd',
    'report.totalVolume': 'Total volym',
    'report.beetleStress': 'Barkborrerisk',
    'report.beetleStressScore': 'Stressindex (barkborre)',
    'report.beetleStressClass': 'Riskklassificering',
    'report.beetleAffectedArea': 'Paverkat omrade',
    'report.crownHealth': 'Kronhalsa',
    'report.crownHealthScore': 'Kronhalsoindex',
    'report.crownDistribution': 'Kronhalsofordelning',
    'report.sensorMeta': 'Sensorprodukt-metadata',
    'report.modelVersion': 'Modellversion',
    'report.confidenceScore': 'Konfidensgrad',
    'report.processingDate': 'Bearbetningsdatum',
    'stressClass.ingen': 'Ingen',
    'stressClass.lag': 'Lag',
    'stressClass.medel': 'Medel',
    'stressClass.hog': 'Hog',
    'stressClass.kritisk': 'Kritisk',
    'trend.improving': 'Forbattras',
    'trend.stable': 'Stabil',
    'trend.declining': 'Forsamras',
    'risk.low': 'Lag',
    'risk.medium': 'Medel',
    'risk.high': 'Hog',
    'risk.critical': 'Kritisk',
    'unit.m3': 'm\u00B3',
    'unit.m3fub': 'm\u00B3fub',
    'unit.tonnesCO2': 'ton CO\u2082',
    'unit.m': 'm',
    'unit.sek': 'SEK',
    'unit.years': 'ar',
  },
  en: {
    'report.parcelSummary': 'Parcel Summary',
    'report.portfolioOverview': 'Portfolio Overview',
    'report.surveyReport': 'Drone Survey Report',
    'report.timberInventory': 'Timber Inventory Report',
    'report.healthAssessment': 'Forest Health Assessment',
    'report.generatedBy': 'Generated by',
    'report.date': 'Date',
    'report.page': 'Page',
    'report.of': 'of',
    'report.tableOfContents': 'Table of Contents',
    'report.parcelOverview': 'Parcel Overview',
    'report.area': 'Area',
    'report.hectares': 'hectares',
    'report.municipality': 'Municipality',
    'report.healthScore': 'Health Score',
    'report.healthTrend': 'Health Trend',
    'report.beetleRisk': 'Beetle Risk',
    'report.speciesComposition': 'Species Composition',
    'report.lastSurvey': 'Last Survey',
    'report.treesScanned': 'Trees Scanned',
    'report.infectedTrees': 'Infected Trees',
    'report.deadTrees': 'Dead Trees',
    'report.timberVolume': 'Timber Volume',
    'report.timberValue': 'Timber Value',
    'report.carbonSequestration': 'Carbon Sequestration',
    'report.ndviAverage': 'Average NDVI',
    'report.recommendations': 'Recommendations',
    'report.riskFactors': 'Risk Factors',
    'report.scoreTrend': 'Health Score Trend (12 months)',
    'report.summaryStatistics': 'Summary Statistics',
    'report.totalArea': 'Total Area',
    'report.avgHealthScore': 'Average Health Score',
    'report.totalTimberVolume': 'Total Timber Volume',
    'report.totalTimberValue': 'Total Timber Value',
    'report.totalCarbon': 'Total Carbon Sequestration',
    'report.parcelsIncluded': 'Parcels Included',
    'report.disclaimer':
      'This report is auto-generated and should be verified by a certified forestry professional. BeetleSense.ai accepts no liability for decisions based on this report.',
    'report.confidential': 'Confidential',
    'report.coordinates': 'Coordinates',
    'report.coordinateSystem': 'Coordinate System',
    'report.surveyDetails': 'Survey Details',
    'report.surveyId': 'Survey ID',
    'report.surveyDate': 'Survey Date',
    'report.droneModel': 'Drone Model',
    'report.flightAltitude': 'Flight Altitude',
    'report.imagesProcessed': 'Images Processed',
    'report.volumeBySpecies': 'Volume by Species',
    'report.priceEstimate': 'Price Estimate',
    'report.marketCondition': 'Market Condition',
    'report.harvestRecommendation': 'Harvest Recommendation',
    'report.standAge': 'Stand Age',
    'report.soilType': 'Soil Type',
    'report.elevation': 'Elevation',
    'report.detectionSummary': 'Detection Summary',
    'report.infectionRate': 'Infection Rate',
    'report.sensorAnalysis': 'Sensor Analysis',
    'report.ndviMean': 'NDVI Mean',
    'report.ndreMean': 'NDRE Mean',
    'report.thermalHotspots': 'Thermal Hotspots',
    'report.treeInventory': 'Tree Inventory',
    'report.treeCount': 'Tree Count',
    'report.avgTreeHeight': 'Average Tree Height',
    'report.totalVolume': 'Total Volume',
    'report.beetleStress': 'Beetle Stress Risk',
    'report.beetleStressScore': 'Beetle Stress Index',
    'report.beetleStressClass': 'Risk Classification',
    'report.beetleAffectedArea': 'Affected Area',
    'report.crownHealth': 'Crown Health',
    'report.crownHealthScore': 'Crown Health Index',
    'report.crownDistribution': 'Crown Health Distribution',
    'report.sensorMeta': 'Sensor Product Metadata',
    'report.modelVersion': 'Model Version',
    'report.confidenceScore': 'Confidence Score',
    'report.processingDate': 'Processing Date',
    'stressClass.ingen': 'None',
    'stressClass.lag': 'Low',
    'stressClass.medel': 'Medium',
    'stressClass.hog': 'High',
    'stressClass.kritisk': 'Critical',
    'trend.improving': 'Improving',
    'trend.stable': 'Stable',
    'trend.declining': 'Declining',
    'risk.low': 'Low',
    'risk.medium': 'Medium',
    'risk.high': 'High',
    'risk.critical': 'Critical',
    'unit.m3': 'm\u00B3',
    'unit.m3fub': 'm\u00B3fub',
    'unit.tonnesCO2': 'tonnes CO\u2082',
    'unit.m': 'm',
    'unit.sek': 'SEK',
    'unit.years': 'years',
  },
};

// ─── Formatting Helpers ───

function t(key: string, lang: ReportLanguage): string {
  return LABELS[lang][key] ?? key;
}

/** Format number in Swedish style: comma for decimal, space for thousands */
export function formatNumberSv(value: number, decimals: number = 0): string {
  const parts = value.toFixed(decimals).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
  if (decimals > 0 && parts[1]) {
    return `${intPart},${parts[1]}`;
  }
  return intPart;
}

export function formatSEK(value: number, lang: ReportLanguage): string {
  if (lang === 'sv') {
    return `${formatNumberSv(value, 0)} kr`;
  }
  return `SEK ${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function formatDate(date: string | undefined, lang: ReportLanguage): string {
  if (!date) return new Date().toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-GB');
  try {
    return new Date(date).toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-GB');
  } catch {
    return date;
  }
}

function formatCoordinate(
  lat: number,
  lng: number,
  system: CoordinateSystem,
): string {
  if (system === 'SWEREF99') {
    // Approximate WGS84 -> SWEREF99 TM (simplified)
    const N = lat * 111320;
    const E = lng * 111320 * Math.cos((lat * Math.PI) / 180) + 500000;
    return `N ${formatNumberSv(N, 0)}, E ${formatNumberSv(E, 0)}`;
  }
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function riskColor(risk: string): string {
  switch (risk) {
    case 'low':
      return '#22c55e';
    case 'medium':
      return '#fbbf24';
    case 'high':
      return '#ef4444';
    case 'critical':
      return '#dc2626';
    default:
      return '#9caa9e';
  }
}

function scoreColor(score: number): string {
  if (score >= 70) return '#22c55e';
  if (score >= 40) return '#fbbf24';
  return '#ef4444';
}

// ─── Report Title by Type ───

function reportTitle(type: ReportType, lang: ReportLanguage): string {
  const map: Record<ReportType, string> = {
    'parcel-summary': t('report.parcelSummary', lang),
    'portfolio-overview': t('report.portfolioOverview', lang),
    'survey-report': t('report.surveyReport', lang),
    'timber-inventory': t('report.timberInventory', lang),
    'health-assessment': t('report.healthAssessment', lang),
  };
  return map[type];
}

// ─── Page Count Estimator ───

export function estimatePageCount(type: ReportType, parcelCount: number): number {
  switch (type) {
    case 'parcel-summary':
      return 2;
    case 'portfolio-overview':
      return 1 + Math.ceil(parcelCount / 3) + 1; // cover + parcel pages + summary
    case 'survey-report':
      return 2 + parcelCount;
    case 'timber-inventory':
      return 1 + parcelCount;
    case 'health-assessment':
      return 2 + parcelCount;
    default:
      return 2;
  }
}

// ─── CSS Styles ───

const PRINT_CSS = `
  @page {
    size: A4;
    margin: 15mm 18mm;
  }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page-break { page-break-after: always; }
    .page-break:last-child { page-break-after: auto; }
    .no-print { display: none !important; }
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    font-size: 11px;
    line-height: 1.5;
    color: #1a1a1a;
    background: #ffffff;
  }

  .report-page {
    max-width: 210mm;
    min-height: 270mm;
    margin: 0 auto;
    padding: 0;
    position: relative;
  }

  .report-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 12px;
    margin-bottom: 16px;
    border-bottom: 3px solid #166534;
  }

  .report-header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .report-logo {
    width: 40px;
    height: 40px;
    background: #166534;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font-weight: bold;
    font-size: 18px;
    font-family: Georgia, serif;
  }

  .report-brand h1 {
    font-family: Georgia, serif;
    font-size: 16px;
    font-weight: bold;
    color: #166534;
    margin: 0;
  }

  .report-brand p {
    font-size: 9px;
    color: #6b7280;
    margin: 0;
  }

  .report-header-right {
    text-align: right;
    font-size: 9px;
    color: #6b7280;
  }

  .report-title {
    font-family: Georgia, serif;
    font-size: 20px;
    font-weight: bold;
    color: #166534;
    margin-bottom: 4px;
  }

  .report-subtitle {
    font-size: 11px;
    color: #6b7280;
    margin-bottom: 20px;
  }

  .green-stripe {
    height: 4px;
    background: linear-gradient(90deg, #166534, #22c55e);
    border-radius: 2px;
    margin-bottom: 20px;
  }

  .section-title {
    font-family: Georgia, serif;
    font-size: 13px;
    font-weight: bold;
    color: #166534;
    border-bottom: 1px solid #d1d5db;
    padding-bottom: 4px;
    margin: 20px 0 10px;
  }

  .kv-row {
    display: flex;
    padding: 3px 0;
    font-size: 10.5px;
  }

  .kv-label {
    width: 180px;
    color: #6b7280;
    flex-shrink: 0;
  }

  .kv-value {
    color: #1a1a1a;
    font-weight: 500;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin: 12px 0;
  }

  .stat-card {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 12px;
    text-align: center;
  }

  .stat-value {
    font-size: 22px;
    font-weight: bold;
    font-family: 'Courier New', monospace;
  }

  .stat-label {
    font-size: 9px;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 2px;
  }

  .species-bar {
    display: flex;
    height: 24px;
    border-radius: 6px;
    overflow: hidden;
    margin: 8px 0;
  }

  .species-bar-segment {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8px;
    font-weight: 600;
    color: #ffffff;
    min-width: 20px;
  }

  .species-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 6px;
    font-size: 9px;
  }

  .species-legend-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .species-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .health-gauge {
    position: relative;
    width: 80px;
    height: 40px;
    margin: 8px auto;
  }

  .health-gauge-bg {
    width: 80px;
    height: 40px;
    border-radius: 40px 40px 0 0;
    background: #e5e7eb;
    overflow: hidden;
    position: relative;
  }

  .health-gauge-fill {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    border-radius: 40px 40px 0 0;
    transform-origin: bottom center;
  }

  .health-gauge-value {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 16px;
    font-weight: bold;
    font-family: 'Courier New', monospace;
  }

  .risk-badge {
    display: inline-block;
    padding: 2px 10px;
    border-radius: 10px;
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .bullet-list {
    list-style: none;
    padding: 0;
    margin: 6px 0;
  }

  .bullet-list li {
    padding: 3px 0 3px 16px;
    position: relative;
    font-size: 10.5px;
    line-height: 1.5;
  }

  .bullet-list li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 9px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .bullet-green li::before { background: #22c55e; }
  .bullet-amber li::before { background: #fbbf24; }
  .bullet-red li::before { background: #ef4444; }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0;
    font-size: 10px;
  }

  .data-table th {
    background: #f3f4f6;
    text-align: left;
    padding: 6px 8px;
    font-weight: 600;
    color: #374151;
    border-bottom: 2px solid #d1d5db;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .data-table td {
    padding: 5px 8px;
    border-bottom: 1px solid #e5e7eb;
    color: #1a1a1a;
  }

  .data-table tr:last-child td {
    border-bottom: 2px solid #d1d5db;
  }

  .data-table .num {
    font-family: 'Courier New', monospace;
    text-align: right;
  }

  .toc-item {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    border-bottom: 1px dotted #d1d5db;
    font-size: 11px;
  }

  .toc-item-name { color: #166534; font-weight: 500; }
  .toc-item-page { color: #6b7280; font-family: 'Courier New', monospace; font-size: 10px; }

  .report-footer {
    position: relative;
    margin-top: 24px;
    padding-top: 8px;
    border-top: 1px solid #d1d5db;
    display: flex;
    justify-content: space-between;
    font-size: 8px;
    color: #9ca3af;
  }

  .report-disclaimer {
    margin-top: 8px;
    font-size: 7.5px;
    color: #9ca3af;
    font-style: italic;
    max-width: 480px;
  }

  .score-trend-chart {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 60px;
    margin: 8px 0;
    padding: 4px 0;
  }

  .score-trend-bar {
    flex: 1;
    border-radius: 2px 2px 0 0;
    min-width: 8px;
    position: relative;
  }

  .score-trend-label {
    position: absolute;
    bottom: -14px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 6px;
    color: #9ca3af;
    white-space: nowrap;
  }
`;

// ─── Species Colors ───

const SPECIES_COLORS: Record<string, string> = {
  Gran: '#166534',
  Spruce: '#166534',
  Tall: '#854d0e',
  Pine: '#854d0e',
  Bjork: '#2563eb',
  Birch: '#2563eb',
  Ek: '#7c3aed',
  Oak: '#7c3aed',
  Asp: '#0891b2',
  Aspen: '#0891b2',
  Bok: '#be185d',
  Beech: '#be185d',
  Lark: '#ea580c',
  Larch: '#ea580c',
  Other: '#6b7280',
  Ovrigt: '#6b7280',
};

function speciesColor(species: string): string {
  return SPECIES_COLORS[species] ?? '#6b7280';
}

// ─── HTML Section Generators ───

function headerHtml(config: ReportConfig): string {
  const lang = config.language;
  const dateStr = formatDate(config.generatedAt ?? new Date().toISOString(), lang);
  return `
    <div class="report-header">
      <div class="report-header-left">
        <div class="report-logo">B</div>
        <div class="report-brand">
          <h1>BeetleSense.ai</h1>
          <p>Forest Intelligence Platform</p>
        </div>
      </div>
      <div class="report-header-right">
        <div>${t('report.date', lang)}: ${dateStr}</div>
        ${config.userName ? `<div>${t('report.generatedBy', lang)}: ${config.userName}</div>` : ''}
        ${config.organizationName ? `<div>${config.organizationName}</div>` : ''}
      </div>
    </div>
  `;
}

function footerHtml(pageNum: number, totalPages: number, config: ReportConfig): string {
  const lang = config.language;
  const dateStr = formatDate(config.generatedAt ?? new Date().toISOString(), lang);
  return `
    <div class="report-footer">
      <div>BeetleSense.ai &mdash; ${t('report.confidential', lang)}</div>
      <div>${dateStr}</div>
      <div>${t('report.page', lang)} ${pageNum} ${t('report.of', lang)} ${totalPages}</div>
    </div>
    <div class="report-disclaimer">${t('report.disclaimer', lang)}</div>
  `;
}

function speciesBarHtml(speciesMix: { species: string; pct: number }[], lang: ReportLanguage): string {
  const segments = speciesMix
    .map(
      (s) =>
        `<div class="species-bar-segment" style="width:${s.pct}%; background:${speciesColor(s.species)}">${s.pct > 10 ? `${s.pct}%` : ''}</div>`,
    )
    .join('');
  const legend = speciesMix
    .map(
      (s) =>
        `<div class="species-legend-item"><span class="species-dot" style="background:${speciesColor(s.species)}"></span>${s.species} ${s.pct}%</div>`,
    )
    .join('');
  return `
    <div class="section-title">${t('report.speciesComposition', lang)}</div>
    <div class="species-bar">${segments}</div>
    <div class="species-legend">${legend}</div>
  `;
}

function healthGaugeHtml(score: number): string {
  const color = scoreColor(score);
  const _rotation = (score / 100) * 180;
  return `
    <div class="stat-card">
      <div class="health-gauge">
        <div class="health-gauge-bg">
          <div class="health-gauge-fill" style="height:${score}%; background:${color}; opacity:0.3;"></div>
        </div>
        <div class="health-gauge-value" style="color:${color}">${score}</div>
      </div>
      <div class="stat-label">Health Score</div>
    </div>
  `;
}

function scoreTrendHtml(scores: { month: string; score: number }[], lang: ReportLanguage): string {
  if (scores.length === 0) return '';
  const maxScore = Math.max(...scores.map((s) => s.score), 100);
  const bars = scores
    .map((s) => {
      const h = (s.score / maxScore) * 100;
      const color = scoreColor(s.score);
      return `<div class="score-trend-bar" style="height:${h}%; background:${color}; opacity:0.8;"><span class="score-trend-label">${s.month}</span></div>`;
    })
    .join('');
  return `
    <div class="section-title">${t('report.scoreTrend', lang)}</div>
    <div class="score-trend-chart">${bars}</div>
  `;
}

function sensorAnalysisHtml(parcel: ParcelData, lang: ReportLanguage): string {
  if (parcel.ndviMean == null && parcel.ndreMean == null && parcel.thermalHotspots == null) return '';
  const fmt = (v: number, d: number = 0) => (lang === 'sv' ? formatNumberSv(v, d) : v.toFixed(d));
  return `
    <div class="section-title">${t('report.sensorAnalysis', lang)}</div>
    <div class="stats-grid">
      ${parcel.ndviMean != null ? `
        <div class="stat-card">
          <div class="stat-value" style="color:${parcel.ndviMean >= 0.6 ? '#22c55e' : parcel.ndviMean >= 0.4 ? '#fbbf24' : '#ef4444'}">${fmt(parcel.ndviMean, 2)}</div>
          <div class="stat-label">${t('report.ndviMean', lang)}</div>
        </div>` : ''}
      ${parcel.ndreMean != null ? `
        <div class="stat-card">
          <div class="stat-value" style="color:${parcel.ndreMean >= 0.4 ? '#22c55e' : parcel.ndreMean >= 0.25 ? '#fbbf24' : '#ef4444'}">${fmt(parcel.ndreMean, 2)}</div>
          <div class="stat-label">${t('report.ndreMean', lang)}</div>
        </div>` : ''}
      ${parcel.thermalHotspots != null ? `
        <div class="stat-card">
          <div class="stat-value" style="color:${parcel.thermalHotspots === 0 ? '#22c55e' : parcel.thermalHotspots <= 3 ? '#fbbf24' : '#ef4444'}">${parcel.thermalHotspots}</div>
          <div class="stat-label">${t('report.thermalHotspots', lang)}</div>
        </div>` : ''}
    </div>
  `;
}

function treeInventoryHtml(parcel: ParcelData, lang: ReportLanguage): string {
  if (parcel.treeCount == null && parcel.avgTreeHeight == null && parcel.totalVolume == null) return '';
  const fmt = (v: number, d: number = 0) => (lang === 'sv' ? formatNumberSv(v, d) : v.toFixed(d));
  return `
    <div class="section-title">${t('report.treeInventory', lang)}</div>
    <div class="stats-grid">
      ${parcel.treeCount != null ? `
        <div class="stat-card">
          <div class="stat-value" style="color:#166534">${fmt(parcel.treeCount)}</div>
          <div class="stat-label">${t('report.treeCount', lang)}</div>
        </div>` : ''}
      ${parcel.avgTreeHeight != null ? `
        <div class="stat-card">
          <div class="stat-value" style="color:#166534">${fmt(parcel.avgTreeHeight, 1)}</div>
          <div class="stat-label">${t('report.avgTreeHeight', lang)} (${t('unit.m', lang)})</div>
        </div>` : ''}
      ${parcel.totalVolume != null ? `
        <div class="stat-card">
          <div class="stat-value" style="color:#166534">${fmt(parcel.totalVolume)}</div>
          <div class="stat-label">${t('report.totalVolume', lang)} (${t('unit.m3fub', lang)})</div>
        </div>` : ''}
    </div>
  `;
}

function beetleStressHtml(parcel: ParcelData, lang: ReportLanguage): string {
  if (parcel.beetleStressScore == null) return '';
  const fmt = (v: number, d: number = 0) => (lang === 'sv' ? formatNumberSv(v, d) : v.toFixed(d));
  const stressColor = parcel.beetleStressScore >= 70 ? '#dc2626' : parcel.beetleStressScore >= 40 ? '#ef4444' : parcel.beetleStressScore >= 20 ? '#fbbf24' : '#22c55e';
  const classLabel = parcel.beetleStressClass ? t(`stressClass.${parcel.beetleStressClass}`, lang) : '—';
  return `
    <div class="section-title">${t('report.beetleStress', lang)}</div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value" style="color:${stressColor}">${fmt(parcel.beetleStressScore, 1)}</div>
        <div class="stat-label">${t('report.beetleStressScore', lang)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-value"><span class="risk-badge" style="background:${stressColor}20; color:${stressColor}">${classLabel}</span></div>
        <div class="stat-label">${t('report.beetleStressClass', lang)}</div>
      </div>
      ${parcel.beetleAffectedAreaHa != null ? `
        <div class="stat-card">
          <div class="stat-value" style="color:${stressColor}">${fmt(parcel.beetleAffectedAreaHa, 2)}</div>
          <div class="stat-label">${t('report.beetleAffectedArea', lang)} (ha)</div>
        </div>` : ''}
    </div>
  `;
}

function crownHealthHtml(parcel: ParcelData, lang: ReportLanguage): string {
  if (parcel.crownHealthScore == null) return '';
  const fmt = (v: number, d: number = 0) => (lang === 'sv' ? formatNumberSv(v, d) : v.toFixed(d));
  const distributionHtml = parcel.crownHealthDistribution?.length
    ? `
      <div style="margin-top:10px">
        <div style="font-size:10px;color:#6b7280;margin-bottom:6px">${t('report.crownDistribution', lang)}</div>
        <div class="species-bar">
          ${parcel.crownHealthDistribution.map((d) => {
            const color = d.class === 'Frisk' || d.class === 'Healthy' ? '#22c55e'
              : d.class === 'Stressad' || d.class === 'Stressed' ? '#fbbf24'
              : d.class === 'Skadad' || d.class === 'Damaged' ? '#ef4444'
              : '#6b7280';
            return `<div class="species-bar-segment" style="width:${d.pct}%; background:${color}">${d.pct > 10 ? `${d.pct}%` : ''}</div>`;
          }).join('')}
        </div>
        <div class="species-legend">
          ${parcel.crownHealthDistribution.map((d) => {
            const color = d.class === 'Frisk' || d.class === 'Healthy' ? '#22c55e'
              : d.class === 'Stressad' || d.class === 'Stressed' ? '#fbbf24'
              : d.class === 'Skadad' || d.class === 'Damaged' ? '#ef4444'
              : '#6b7280';
            return `<div class="species-legend-item"><span class="species-dot" style="background:${color}"></span>${d.class} ${d.pct}%</div>`;
          }).join('')}
        </div>
      </div>`
    : '';

  return `
    <div class="section-title">${t('report.crownHealth', lang)}</div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="health-gauge">
          <div class="health-gauge-bg">
            <div class="health-gauge-fill" style="height:${parcel.crownHealthScore}%; background:${scoreColor(parcel.crownHealthScore)}; opacity:0.3;"></div>
          </div>
          <div class="health-gauge-value" style="color:${scoreColor(parcel.crownHealthScore)}">${fmt(parcel.crownHealthScore)}</div>
        </div>
        <div class="stat-label">${t('report.crownHealthScore', lang)}</div>
      </div>
    </div>
    ${distributionHtml}
  `;
}

function sensorMetaHtml(parcel: ParcelData, lang: ReportLanguage): string {
  if (!parcel.sensorMeta) return '';
  return `
    <div class="section-title">${t('report.sensorMeta', lang)}</div>
    <div class="kv-row"><span class="kv-label">${t('report.modelVersion', lang)}</span><span class="kv-value">${parcel.sensorMeta.modelVersion}</span></div>
    <div class="kv-row"><span class="kv-label">${t('report.confidenceScore', lang)}</span><span class="kv-value">${(parcel.sensorMeta.confidenceScore * 100).toFixed(1)}%</span></div>
    <div class="kv-row"><span class="kv-label">${t('report.processingDate', lang)}</span><span class="kv-value">${formatDate(parcel.sensorMeta.processingDate, lang)}</span></div>
  `;
}

function parcelSectionHtml(parcel: ParcelData, config: ReportConfig): string {
  const lang = config.language;
  const infectionRate =
    parcel.treesScanned > 0
      ? ((parcel.infectedTrees / parcel.treesScanned) * 100).toFixed(1)
      : '0';

  const coordStr =
    parcel.coordinates
      ? formatCoordinate(parcel.coordinates.lat, parcel.coordinates.lng, config.coordinateSystem)
      : '—';

  return `
    <div class="section-title">${t('report.parcelOverview', lang)}: ${parcel.name}</div>

    <div class="kv-row"><span class="kv-label">${t('report.municipality', lang)}</span><span class="kv-value">${parcel.municipality}</span></div>
    <div class="kv-row"><span class="kv-label">${t('report.area', lang)}</span><span class="kv-value">${lang === 'sv' ? formatNumberSv(parcel.areaHectares, 1) : parcel.areaHectares.toFixed(1)} ${t('report.hectares', lang)}</span></div>
    <div class="kv-row"><span class="kv-label">${t('report.lastSurvey', lang)}</span><span class="kv-value">${formatDate(parcel.lastSurveyDate, lang)}</span></div>
    <div class="kv-row"><span class="kv-label">${t('report.coordinates', lang)}</span><span class="kv-value">${coordStr} (${config.coordinateSystem})</span></div>
    ${parcel.standAge ? `<div class="kv-row"><span class="kv-label">${t('report.standAge', lang)}</span><span class="kv-value">${parcel.standAge} ${t('unit.years', lang)}</span></div>` : ''}
    ${parcel.soilType ? `<div class="kv-row"><span class="kv-label">${t('report.soilType', lang)}</span><span class="kv-value">${parcel.soilType}</span></div>` : ''}
    ${parcel.elevation ? `<div class="kv-row"><span class="kv-label">${t('report.elevation', lang)}</span><span class="kv-value">${lang === 'sv' ? formatNumberSv(parcel.elevation, 0) : parcel.elevation} ${t('unit.m', lang)}</span></div>` : ''}

    <div class="stats-grid">
      ${healthGaugeHtml(parcel.healthScore)}
      <div class="stat-card">
        <div class="stat-value" style="color:${scoreColor(parcel.healthScore)}">${t(`trend.${parcel.healthTrend}`, lang)}</div>
        <div class="stat-label">${t('report.healthTrend', lang)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-value"><span class="risk-badge" style="background:${riskColor(parcel.beetleRisk)}20; color:${riskColor(parcel.beetleRisk)}">${t(`risk.${parcel.beetleRisk}`, lang)}</span></div>
        <div class="stat-label">${t('report.beetleRisk', lang)}</div>
      </div>
    </div>

    ${speciesBarHtml(parcel.speciesMix, lang)}

    <div class="section-title">${t('report.detectionSummary', lang)}</div>
    <div class="kv-row"><span class="kv-label">${t('report.treesScanned', lang)}</span><span class="kv-value">${lang === 'sv' ? formatNumberSv(parcel.treesScanned) : parcel.treesScanned.toLocaleString()}</span></div>
    <div class="kv-row"><span class="kv-label">${t('report.infectedTrees', lang)}</span><span class="kv-value">${parcel.infectedTrees} (${infectionRate}%)</span></div>
    <div class="kv-row"><span class="kv-label">${t('report.deadTrees', lang)}</span><span class="kv-value">${parcel.deadTrees}</span></div>
    <div class="kv-row"><span class="kv-label">${t('report.ndviAverage', lang)}</span><span class="kv-value">${lang === 'sv' ? formatNumberSv(parcel.ndviAvg, 2) : parcel.ndviAvg.toFixed(2)}</span></div>
    <div class="kv-row"><span class="kv-label">${t('report.timberVolume', lang)}</span><span class="kv-value">${lang === 'sv' ? formatNumberSv(parcel.timberVolumeM3) : parcel.timberVolumeM3.toLocaleString()} ${t('unit.m3fub', lang)}</span></div>
    <div class="kv-row"><span class="kv-label">${t('report.timberValue', lang)}</span><span class="kv-value">${formatSEK(parcel.timberValueSEK, lang)}</span></div>
    <div class="kv-row"><span class="kv-label">${t('report.carbonSequestration', lang)}</span><span class="kv-value">${lang === 'sv' ? formatNumberSv(parcel.carbonTonsCO2, 1) : parcel.carbonTonsCO2.toFixed(1)} ${t('unit.tonnesCO2', lang)}</span></div>

    ${sensorAnalysisHtml(parcel, lang)}
    ${treeInventoryHtml(parcel, lang)}
    ${beetleStressHtml(parcel, lang)}
    ${crownHealthHtml(parcel, lang)}
    ${sensorMetaHtml(parcel, lang)}

    ${scoreTrendHtml(parcel.historicalScores, lang)}

    ${parcel.riskFactors.length > 0 ? `
      <div class="section-title">${t('report.riskFactors', lang)}</div>
      <ul class="bullet-list bullet-amber">
        ${parcel.riskFactors.map((r) => `<li>${r}</li>`).join('')}
      </ul>
    ` : ''}

    ${parcel.recommendations.length > 0 ? `
      <div class="section-title">${t('report.recommendations', lang)}</div>
      <ul class="bullet-list bullet-green">
        ${parcel.recommendations.map((r) => `<li>${r}</li>`).join('')}
      </ul>
    ` : ''}
  `;
}

function portfolioSummaryHtml(parcels: ParcelData[], config: ReportConfig): string {
  const lang = config.language;
  const totalArea = parcels.reduce((s, p) => s + p.areaHectares, 0);
  const avgHealth = Math.round(parcels.reduce((s, p) => s + p.healthScore, 0) / parcels.length);
  const totalVolume = parcels.reduce((s, p) => s + p.timberVolumeM3, 0);
  const totalValue = parcels.reduce((s, p) => s + p.timberValueSEK, 0);
  const totalCarbon = parcels.reduce((s, p) => s + p.carbonTonsCO2, 0);
  const fmt = (v: number, d: number = 0) => (lang === 'sv' ? formatNumberSv(v, d) : v.toFixed(d));

  return `
    <div class="section-title">${t('report.summaryStatistics', lang)}</div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value" style="color:#166534">${parcels.length}</div>
        <div class="stat-label">${t('report.parcelsIncluded', lang)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:#166534">${fmt(totalArea, 1)}</div>
        <div class="stat-label">${t('report.totalArea', lang)} (ha)</div>
      </div>
      ${healthGaugeHtml(avgHealth)}
    </div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value" style="font-size:14px">${fmt(totalVolume)}</div>
        <div class="stat-label">${t('report.totalTimberVolume', lang)} (${t('unit.m3fub', lang)})</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="font-size:14px">${formatSEK(totalValue, lang)}</div>
        <div class="stat-label">${t('report.totalTimberValue', lang)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="font-size:14px">${fmt(totalCarbon, 1)}</div>
        <div class="stat-label">${t('report.totalCarbon', lang)} (${t('unit.tonnesCO2', lang)})</div>
      </div>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>${lang === 'sv' ? 'Skifte' : 'Parcel'}</th>
          <th class="num">${t('report.area', lang)} (ha)</th>
          <th class="num">${t('report.healthScore', lang)}</th>
          <th class="num">${t('report.timberVolume', lang)}</th>
          <th class="num">${t('report.timberValue', lang)}</th>
          <th>${t('report.beetleRisk', lang)}</th>
        </tr>
      </thead>
      <tbody>
        ${parcels
          .map(
            (p) => `
          <tr>
            <td><strong>${p.name}</strong><br/><span style="font-size:8px;color:#6b7280">${p.municipality}</span></td>
            <td class="num">${fmt(p.areaHectares, 1)}</td>
            <td class="num" style="color:${scoreColor(p.healthScore)};font-weight:bold">${p.healthScore}</td>
            <td class="num">${fmt(p.timberVolumeM3)}</td>
            <td class="num">${formatSEK(p.timberValueSEK, lang)}</td>
            <td><span class="risk-badge" style="background:${riskColor(p.beetleRisk)}20;color:${riskColor(p.beetleRisk)}">${t(`risk.${p.beetleRisk}`, lang)}</span></td>
          </tr>
        `,
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function tocHtml(parcels: ParcelData[], config: ReportConfig): string {
  const lang = config.language;
  if (parcels.length <= 1) return '';
  const pageNum = 2; // first parcel starts on page 2
  const items = parcels.map((p, i) => {
    const pn = pageNum + i;
    return `<div class="toc-item"><span class="toc-item-name">${p.name} &mdash; ${p.municipality}</span><span class="toc-item-page">${pn}</span></div>`;
  });
  return `
    <div class="section-title">${t('report.tableOfContents', lang)}</div>
    ${items.join('')}
  `;
}

function surveyDetailsHtml(config: ReportConfig): string {
  const lang = config.language;
  if (!config.surveyId && !config.droneModel) return '';
  return `
    <div class="section-title">${t('report.surveyDetails', lang)}</div>
    ${config.surveyId ? `<div class="kv-row"><span class="kv-label">${t('report.surveyId', lang)}</span><span class="kv-value">${config.surveyId}</span></div>` : ''}
    ${config.surveyDate ? `<div class="kv-row"><span class="kv-label">${t('report.surveyDate', lang)}</span><span class="kv-value">${formatDate(config.surveyDate, lang)}</span></div>` : ''}
    ${config.droneModel ? `<div class="kv-row"><span class="kv-label">${t('report.droneModel', lang)}</span><span class="kv-value">${config.droneModel}</span></div>` : ''}
    ${config.flightAltitude ? `<div class="kv-row"><span class="kv-label">${t('report.flightAltitude', lang)}</span><span class="kv-value">${config.flightAltitude} ${t('unit.m', lang)}</span></div>` : ''}
    ${config.imagesProcessed ? `<div class="kv-row"><span class="kv-label">${t('report.imagesProcessed', lang)}</span><span class="kv-value">${lang === 'sv' ? formatNumberSv(config.imagesProcessed) : config.imagesProcessed.toLocaleString()}</span></div>` : ''}
  `;
}

function timberTableHtml(parcels: ParcelData[], config: ReportConfig): string {
  const lang = config.language;
  const fmt = (v: number, d: number = 0) => (lang === 'sv' ? formatNumberSv(v, d) : v.toFixed(d));
  return `
    <div class="section-title">${t('report.volumeBySpecies', lang)}</div>
    <table class="data-table">
      <thead>
        <tr>
          <th>${lang === 'sv' ? 'Skifte' : 'Parcel'}</th>
          <th>${lang === 'sv' ? 'Tradslag' : 'Species'}</th>
          <th class="num">${lang === 'sv' ? 'Andel' : 'Share'} %</th>
          <th class="num">${t('report.timberVolume', lang)} (${t('unit.m3fub', lang)})</th>
          <th class="num">${t('report.priceEstimate', lang)} (${t('unit.sek', lang)})</th>
        </tr>
      </thead>
      <tbody>
        ${parcels
          .flatMap((p) =>
            p.speciesMix.map((s, i) => {
              const vol = Math.round((p.timberVolumeM3 * s.pct) / 100);
              const pricePerM3 = s.species === 'Gran' || s.species === 'Spruce' ? 580 : s.species === 'Tall' || s.species === 'Pine' ? 620 : s.species === 'Ek' || s.species === 'Oak' ? 1200 : 380;
              return `
              <tr>
                ${i === 0 ? `<td rowspan="${p.speciesMix.length}"><strong>${p.name}</strong></td>` : ''}
                <td><span class="species-dot" style="background:${speciesColor(s.species)};display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px;vertical-align:middle"></span>${s.species}</td>
                <td class="num">${s.pct}%</td>
                <td class="num">${fmt(vol)}</td>
                <td class="num">${formatSEK(vol * pricePerM3, lang)}</td>
              </tr>`;
            }),
          )
          .join('')}
      </tbody>
    </table>
  `;
}

// ─── Full Report HTML Builders ───

function buildParcelSummaryHtml(config: ReportConfig): string {
  const parcel = config.parcels[0];
  if (!parcel) return '';
  const totalPages = 2;
  return `
    <div class="report-page page-break">
      ${headerHtml(config)}
      <div class="green-stripe"></div>
      <div class="report-title">${reportTitle(config.type, config.language)}</div>
      <div class="report-subtitle">${parcel.name} &mdash; ${parcel.municipality}</div>
      ${parcelSectionHtml(parcel, config)}
      ${footerHtml(1, totalPages, config)}
    </div>
    <div class="report-page">
      ${headerHtml(config)}
      ${scoreTrendHtml(parcel.historicalScores, config.language)}
      ${parcel.riskFactors.length > 0 ? `
        <div class="section-title">${t('report.riskFactors', config.language)}</div>
        <ul class="bullet-list bullet-amber">
          ${parcel.riskFactors.map((r) => `<li>${r}</li>`).join('')}
        </ul>
      ` : ''}
      ${parcel.recommendations.length > 0 ? `
        <div class="section-title">${t('report.recommendations', config.language)}</div>
        <ul class="bullet-list bullet-green">
          ${parcel.recommendations.map((r) => `<li>${r}</li>`).join('')}
        </ul>
      ` : ''}
      ${footerHtml(2, totalPages, config)}
    </div>
  `;
}

function buildPortfolioOverviewHtml(config: ReportConfig): string {
  const parcels = config.parcels;
  const totalPages = estimatePageCount(config.type, parcels.length);
  const pages: string[] = [];

  // Cover page with summary
  pages.push(`
    <div class="report-page page-break">
      ${headerHtml(config)}
      <div class="green-stripe"></div>
      <div class="report-title">${reportTitle(config.type, config.language)}</div>
      <div class="report-subtitle">${config.userName ?? ''} &mdash; ${parcels.length} ${config.language === 'sv' ? 'skiften' : 'parcels'}</div>
      ${tocHtml(parcels, config)}
      ${portfolioSummaryHtml(parcels, config)}
      ${footerHtml(1, totalPages, config)}
    </div>
  `);

  // Per-parcel pages
  parcels.forEach((parcel, i) => {
    const isLast = i === parcels.length - 1;
    pages.push(`
      <div class="report-page ${isLast ? '' : 'page-break'}">
        ${headerHtml(config)}
        ${parcelSectionHtml(parcel, config)}
        ${footerHtml(i + 2, totalPages, config)}
      </div>
    `);
  });

  return pages.join('\n');
}

function buildSurveyReportHtml(config: ReportConfig): string {
  const parcels = config.parcels;
  const totalPages = estimatePageCount(config.type, parcels.length);
  const pages: string[] = [];

  // Cover page
  pages.push(`
    <div class="report-page page-break">
      ${headerHtml(config)}
      <div class="green-stripe"></div>
      <div class="report-title">${reportTitle(config.type, config.language)}</div>
      <div class="report-subtitle">${config.surveyId ? `${t('report.surveyId', config.language)}: ${config.surveyId}` : ''}</div>
      ${surveyDetailsHtml(config)}
      ${tocHtml(parcels, config)}
      ${portfolioSummaryHtml(parcels, config)}
      ${footerHtml(1, totalPages, config)}
    </div>
  `);

  // Detection pages
  parcels.forEach((parcel, i) => {
    const isLast = i === parcels.length - 1;
    pages.push(`
      <div class="report-page ${isLast ? '' : 'page-break'}">
        ${headerHtml(config)}
        ${parcelSectionHtml(parcel, config)}
        ${footerHtml(i + 2, totalPages, config)}
      </div>
    `);
  });

  return pages.join('\n');
}

function buildTimberInventoryHtml(config: ReportConfig): string {
  const parcels = config.parcels;
  const totalPages = estimatePageCount(config.type, parcels.length);
  const lang = config.language;
  const fmt = (v: number, d: number = 0) => (lang === 'sv' ? formatNumberSv(v, d) : v.toFixed(d));
  const totalVolume = parcels.reduce((s, p) => s + p.timberVolumeM3, 0);
  const totalValue = parcels.reduce((s, p) => s + p.timberValueSEK, 0);
  const pages: string[] = [];

  // Cover page with timber summary
  pages.push(`
    <div class="report-page page-break">
      ${headerHtml(config)}
      <div class="green-stripe"></div>
      <div class="report-title">${reportTitle(config.type, config.language)}</div>
      <div class="report-subtitle">${lang === 'sv' ? 'Virkesforradsinventering' : 'Timber Stock Inventory'} &mdash; ${parcels.length} ${lang === 'sv' ? 'skiften' : 'parcels'}</div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value" style="font-size:16px;color:#166534">${fmt(totalVolume)}</div>
          <div class="stat-label">${t('report.totalTimberVolume', lang)} (${t('unit.m3fub', lang)})</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="font-size:14px;color:#166534">${formatSEK(totalValue, lang)}</div>
          <div class="stat-label">${t('report.totalTimberValue', lang)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-value" style="font-size:16px;color:#166534">${parcels.length}</div>
          <div class="stat-label">${t('report.parcelsIncluded', lang)}</div>
        </div>
      </div>

      ${timberTableHtml(parcels, config)}
      ${footerHtml(1, totalPages, config)}
    </div>
  `);

  // Per-parcel detail pages
  parcels.forEach((parcel, i) => {
    const isLast = i === parcels.length - 1;
    pages.push(`
      <div class="report-page ${isLast ? '' : 'page-break'}">
        ${headerHtml(config)}
        <div class="section-title">${parcel.name} &mdash; ${parcel.municipality}</div>
        <div class="kv-row"><span class="kv-label">${t('report.area', lang)}</span><span class="kv-value">${fmt(parcel.areaHectares, 1)} ${t('report.hectares', lang)}</span></div>
        <div class="kv-row"><span class="kv-label">${t('report.timberVolume', lang)}</span><span class="kv-value">${fmt(parcel.timberVolumeM3)} ${t('unit.m3fub', lang)}</span></div>
        <div class="kv-row"><span class="kv-label">${t('report.timberValue', lang)}</span><span class="kv-value">${formatSEK(parcel.timberValueSEK, lang)}</span></div>
        ${speciesBarHtml(parcel.speciesMix, lang)}
        ${parcel.recommendations.length > 0 ? `
          <div class="section-title">${t('report.harvestRecommendation', lang)}</div>
          <ul class="bullet-list bullet-green">
            ${parcel.recommendations.map((r) => `<li>${r}</li>`).join('')}
          </ul>
        ` : ''}
        ${footerHtml(i + 2, totalPages, config)}
      </div>
    `);
  });

  return pages.join('\n');
}

function buildHealthAssessmentHtml(config: ReportConfig): string {
  const parcels = config.parcels;
  const totalPages = estimatePageCount(config.type, parcels.length);
  const lang = config.language;
  const pages: string[] = [];

  // Cover page
  pages.push(`
    <div class="report-page page-break">
      ${headerHtml(config)}
      <div class="green-stripe"></div>
      <div class="report-title">${reportTitle(config.type, config.language)}</div>
      <div class="report-subtitle">${lang === 'sv' ? 'Skogshalsobedoming med riskanalys' : 'Forest Health Assessment with Risk Analysis'}</div>
      ${tocHtml(parcels, config)}
      ${portfolioSummaryHtml(parcels, config)}
      ${footerHtml(1, totalPages, config)}
    </div>
  `);

  // Risk overview page
  pages.push(`
    <div class="report-page page-break">
      ${headerHtml(config)}
      <div class="section-title">${lang === 'sv' ? 'Riskoverblick' : 'Risk Overview'}</div>
      <table class="data-table">
        <thead>
          <tr>
            <th>${lang === 'sv' ? 'Skifte' : 'Parcel'}</th>
            <th class="num">${t('report.healthScore', lang)}</th>
            <th>${t('report.beetleRisk', lang)}</th>
            <th class="num">${t('report.infectedTrees', lang)}</th>
            <th class="num">${t('report.infectionRate', lang)}</th>
            <th>${t('report.healthTrend', lang)}</th>
          </tr>
        </thead>
        <tbody>
          ${parcels
            .map((p) => {
              const rate = p.treesScanned > 0 ? ((p.infectedTrees / p.treesScanned) * 100).toFixed(1) : '0';
              return `
              <tr>
                <td><strong>${p.name}</strong></td>
                <td class="num" style="color:${scoreColor(p.healthScore)};font-weight:bold">${p.healthScore}</td>
                <td><span class="risk-badge" style="background:${riskColor(p.beetleRisk)}20;color:${riskColor(p.beetleRisk)}">${t(`risk.${p.beetleRisk}`, lang)}</span></td>
                <td class="num">${p.infectedTrees}</td>
                <td class="num">${rate}%</td>
                <td>${t(`trend.${p.healthTrend}`, lang)}</td>
              </tr>`;
            })
            .join('')}
        </tbody>
      </table>
      ${footerHtml(2, totalPages, config)}
    </div>
  `);

  // Per-parcel detail pages
  parcels.forEach((parcel, i) => {
    const isLast = i === parcels.length - 1;
    pages.push(`
      <div class="report-page ${isLast ? '' : 'page-break'}">
        ${headerHtml(config)}
        ${parcelSectionHtml(parcel, config)}
        ${footerHtml(i + 3, totalPages, config)}
      </div>
    `);
  });

  return pages.join('\n');
}

// ─── Build Full HTML Document ───

function buildReportHtml(config: ReportConfig): string {
  let body = '';
  switch (config.type) {
    case 'parcel-summary':
      body = buildParcelSummaryHtml(config);
      break;
    case 'portfolio-overview':
      body = buildPortfolioOverviewHtml(config);
      break;
    case 'survey-report':
      body = buildSurveyReportHtml(config);
      break;
    case 'timber-inventory':
      body = buildTimberInventoryHtml(config);
      break;
    case 'health-assessment':
      body = buildHealthAssessmentHtml(config);
      break;
  }

  return `<!DOCTYPE html>
<html lang="${config.language}">
<head>
  <meta charset="utf-8">
  <title>BeetleSense.ai &mdash; ${reportTitle(config.type, config.language)}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
${body}
</body>
</html>`;
}

// ─── Public API ───

/**
 * Opens a printable report preview in a new browser tab.
 */
export function previewReport(config: ReportConfig): void {
  const html = buildReportHtml(config);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

/**
 * Triggers the browser print dialog (Save as PDF) via a hidden iframe.
 */
export function downloadReportAsPdf(config: ReportConfig): void {
  const html = buildReportHtml(config);

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '-10000px';
  iframe.style.left = '-10000px';
  iframe.style.width = '210mm';
  iframe.style.height = '297mm';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!iframeDoc) {
    document.body.removeChild(iframe);
    // Fallback: open in new tab
    previewReport(config);
    return;
  }

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  // Wait for content to render, then trigger print
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      // Fallback for cross-origin restrictions
      previewReport(config);
    }
    // Clean up after print dialog closes
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 500);
}

/**
 * Returns the full HTML string for the report (useful for PrintableReport component).
 */
export function getReportHtml(config: ReportConfig): string {
  return buildReportHtml(config);
}

// ─── Recent Reports (localStorage) ───

const STORAGE_KEY = 'beetlesense_recent_reports';

export function saveRecentReport(report: RecentReport): void {
  const existing = getRecentReports();
  const updated = [report, ...existing.filter((r) => r.id !== report.id)].slice(0, 20);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage full or unavailable
  }
}

export function getRecentReports(): RecentReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearRecentReports(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
