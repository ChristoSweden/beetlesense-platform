/**
 * ESA Biomass CCI — Global Above-Ground Biomass Maps
 *
 * The ESA Climate Change Initiative (CCI) Biomass project provides global
 * above-ground biomass (AGB) maps at 100m resolution for 2010, 2017, 2018,
 * 2019, 2020, and 2021. Essential for carbon stock validation, forest asset
 * valuation, and change detection.
 *
 * Data is publicly available but served as GeoTIFF rasters — this service
 * uses demo data modelled on real Swedish boreal forest values.
 *
 * Docs: https://climate.esa.int/en/projects/biomass/
 * DOI: 10.5285/af60720c1e404a9e9d2c145d2b2ead4e
 */

// ─── Types ───

export interface BiomassCCIData {
  year: number;
  agbTonnesPerHa: number;
  agbStdDev: number;
  agbChange: number;
}

export interface BiomassCCITimeSeries {
  lat: number;
  lng: number;
  data: BiomassCCIData[];
  meanAGB: number;
  totalChange: number;
  annualGrowthRate: number;
}

export interface BiomassValidation {
  localEstimateTonnesPerHa: number;
  cciEstimateTonnesPerHa: number;
  differencePercent: number;
  withinUncertainty: boolean;
  cciStdDev: number;
  assessment: string;
}

// ─── Constants ───

export const ESA_BIOMASS_CCI_SOURCE_INFO = {
  name: 'ESA Biomass CCI',
  provider: 'European Space Agency — Climate Change Initiative',
  doi: '10.5285/af60720c1e404a9e9d2c145d2b2ead4e',
  resolution: '100m',
  years: [2010, 2017, 2018, 2019, 2020, 2021],
  license: 'Open access (ESA CCI Open Data Policy)',
  unit: 'tonnes dry matter per hectare (t/ha)',
  coverage: 'Global',
  note: 'Demo values modelled on Swedish boreal forest. Real data requires GeoTIFF processing.',
};

// ─── Helpers ───

// Swedish boreal forest AGB reference values by latitude band
// Southern Sweden (~56-59N): higher biomass, mixed/deciduous
// Central Sweden (~59-63N): typical boreal, moderate biomass
// Northern Sweden (~63-69N): lower biomass, slower growth
function getBaseAGB(lat: number): number {
  if (lat >= 65) return 65;  // Northern boreal
  if (lat >= 63) return 75;  // Mid-northern boreal
  if (lat >= 60) return 95;  // Central boreal
  if (lat >= 58) return 110; // Southern boreal / hemiboreal
  return 120;                // Nemoral / mixed forest
}

// ─── Demo Data ───

function generateBiomassCCITimeSeries(lat: number, lng: number): BiomassCCIData[] {
  const baseAGB = getBaseAGB(lat);

  // Annual growth ~1-2% in managed Swedish forests, with 2018-2019 drought dip
  const yearData: { year: number; modifier: number }[] = [
    { year: 2010, modifier: 0.00 },
    { year: 2017, modifier: 0.09 },
    { year: 2018, modifier: 0.07 },  // Drought year — growth stalled
    { year: 2019, modifier: 0.06 },  // Post-drought recovery dip
    { year: 2020, modifier: 0.10 },
    { year: 2021, modifier: 0.13 },
  ];

  // Slight spatial variation based on longitude
  const lngOffset = ((lng - 15) / 10) * 5; // +/-5 t/ha variation across Sweden

  return yearData.map((yd, i) => {
    const agb = Math.round((baseAGB * (1 + yd.modifier) + lngOffset) * 10) / 10;
    const stdDev = Math.round(agb * 0.15 * 10) / 10; // ~15% uncertainty
    const prevAgb = i > 0
      ? Math.round((baseAGB * (1 + yearData[i - 1].modifier) + lngOffset) * 10) / 10
      : agb;
    const change = Math.round((agb - prevAgb) * 10) / 10;

    return {
      year: yd.year,
      agbTonnesPerHa: agb,
      agbStdDev: stdDev,
      agbChange: change,
    };
  });
}

// ─── API Functions ───

/**
 * Fetch a time series of above-ground biomass estimates from ESA Biomass CCI.
 * Returns demo data modelled on real Swedish boreal forest values.
 */
export async function fetchBiomassCCITimeSeries(
  lat: number,
  lng: number
): Promise<BiomassCCITimeSeries> {
  const data = generateBiomassCCITimeSeries(lat, lng);

  const meanAGB = Math.round(
    (data.reduce((sum, d) => sum + d.agbTonnesPerHa, 0) / data.length) * 10
  ) / 10;

  const first = data[0].agbTonnesPerHa;
  const last = data[data.length - 1].agbTonnesPerHa;
  const totalChange = Math.round((last - first) * 10) / 10;
  const years = data[data.length - 1].year - data[0].year;
  const annualGrowthRate = years > 0
    ? Math.round(((last / first) ** (1 / years) - 1) * 10000) / 100
    : 0;

  return {
    lat,
    lng,
    data,
    meanAGB,
    totalChange,
    annualGrowthRate,
  };
}

/**
 * Validate a local biomass estimate against ESA CCI data.
 * Useful for cross-checking field inventory or LiDAR-based estimates.
 */
export async function validateLocalBiomass(
  localEstimate: number,
  lat: number,
  lng: number
): Promise<BiomassValidation> {
  const timeSeries = await fetchBiomassCCITimeSeries(lat, lng);
  const latest = timeSeries.data[timeSeries.data.length - 1];

  const diff = localEstimate - latest.agbTonnesPerHa;
  const diffPercent = Math.round((diff / latest.agbTonnesPerHa) * 1000) / 10;
  const withinUncertainty = Math.abs(diff) <= latest.agbStdDev * 1.96; // 95% CI

  let assessment: string;
  if (withinUncertainty) {
    assessment = 'Local estimate is within the 95% confidence interval of ESA CCI data. Good agreement.';
  } else if (Math.abs(diffPercent) <= 30) {
    assessment = `Local estimate differs by ${Math.abs(diffPercent)}% from CCI. This is outside uncertainty bounds but within typical variation for managed forests.`;
  } else if (localEstimate > latest.agbTonnesPerHa) {
    assessment = `Local estimate is ${Math.abs(diffPercent)}% higher than CCI. Possible causes: recent growth not captured, CCI underestimate in dense stands, or local measurement bias.`;
  } else {
    assessment = `Local estimate is ${Math.abs(diffPercent)}% lower than CCI. Possible causes: recent harvest, storm damage, or CCI overestimate in fragmented stands.`;
  }

  return {
    localEstimateTonnesPerHa: localEstimate,
    cciEstimateTonnesPerHa: latest.agbTonnesPerHa,
    differencePercent: diffPercent,
    withinUncertainty,
    cciStdDev: latest.agbStdDev,
    assessment,
  };
}

/**
 * Get a biomass trend summary — average annual growth, total change,
 * and whether the trend is positive or negative.
 */
export async function getBiomassCCITrend(
  lat: number,
  lng: number
): Promise<{
  trend: 'increasing' | 'stable' | 'decreasing';
  annualGrowthRate: number;
  totalChangeTonnesPerHa: number;
  droughtImpact: boolean;
  summary: string;
}> {
  const ts = await fetchBiomassCCITimeSeries(lat, lng);

  let trend: 'increasing' | 'stable' | 'decreasing';
  if (ts.annualGrowthRate > 0.5) trend = 'increasing';
  else if (ts.annualGrowthRate < -0.5) trend = 'decreasing';
  else trend = 'stable';

  // Check for drought impact (2018-2019 dip)
  const y2017 = ts.data.find((d) => d.year === 2017);
  const y2019 = ts.data.find((d) => d.year === 2019);
  const droughtImpact = !!(y2017 && y2019 && y2019.agbTonnesPerHa < y2017.agbTonnesPerHa);

  const latBand = lat >= 63 ? 'northern' : lat >= 59 ? 'central' : 'southern';
  const summary = `Biomass in ${latBand} Sweden shows a ${trend} trend at ${ts.annualGrowthRate}%/year. ` +
    `Total change 2010-2021: ${ts.totalChange > 0 ? '+' : ''}${ts.totalChange} t/ha. ` +
    (droughtImpact ? 'The 2018 drought caused a visible dip in biomass accumulation.' : 'No significant drought impact detected.');

  return {
    trend,
    annualGrowthRate: ts.annualGrowthRate,
    totalChangeTonnesPerHa: ts.totalChange,
    droughtImpact,
    summary,
  };
}
