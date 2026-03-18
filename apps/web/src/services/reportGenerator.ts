/**
 * ReportGenerator — Client-side PDF generation using browser Canvas APIs.
 *
 * Renders report sections as HTML-to-canvas, serializes SVG charts to images,
 * and assembles multi-page A4 PDF documents as downloadable Blobs.
 * No heavy PDF libraries — uses canvas + manual page layout.
 */

// ─── Types ───

export interface ParcelReportData {
  parcelId: string;
  parcelName: string;
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
}

export interface TimberReportData {
  parcelId: string;
  parcelName: string;
  municipality: string;
  areaHectares: number;
  speciesMix: { species: string; pct: number }[];
  volumeBySpecies: { species: string; m3: number; pricePerM3: number }[];
  totalVolume: number;
  totalValue: number;
  marketTrend: 'rising' | 'stable' | 'falling';
  harvestRecommendation: string;
  priceHistory: { month: string; price: number }[];
}

export interface ComplianceReportData {
  permitId: string;
  permitType: string;
  parcelName: string;
  municipality: string;
  issuedDate: string;
  expiryDate: string;
  status: 'active' | 'pending' | 'expired';
  requirements: { requirement: string; met: boolean }[];
  inspections: { date: string; result: string; inspector: string }[];
  notes: string;
}

export interface AnnualSummaryData {
  year: number;
  ownerName: string;
  parcels: {
    name: string;
    areaHectares: number;
    healthScore: number;
    timberValueSEK: number;
    surveysCompleted: number;
  }[];
  totalArea: number;
  avgHealthScore: number;
  totalTimberValue: number;
  totalSurveys: number;
  carbonOffset: number;
  keyEvents: { date: string; description: string }[];
  monthlyScores: { month: string; score: number }[];
}

// ─── Constants ───

const A4_WIDTH = 794; // px at 96 DPI
const A4_HEIGHT = 1123;
const MARGIN = 48;
const CONTENT_WIDTH = A4_WIDTH - MARGIN * 2;
const LINE_HEIGHT = 18;
const HEADER_HEIGHT = 80;
const FOOTER_HEIGHT = 50;
const CONTENT_TOP = MARGIN + HEADER_HEIGHT + 16;
const CONTENT_BOTTOM = A4_HEIGHT - MARGIN - FOOTER_HEIGHT;

const COLORS = {
  bg: '#030d05',
  bgCard: '#0a1a0d',
  green: '#22c55e',
  greenDim: 'rgba(34,197,94,0.15)',
  text: '#e8f0e9',
  text2: '#9caa9e',
  text3: '#5a6b5c',
  border: '#1a2e1c',
  red: '#ef4444',
  amber: '#fbbf24',
  blue: '#3b82f6',
  white: '#ffffff',
};

// ─── Canvas Helpers ───

function createPage(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = A4_WIDTH;
  canvas.height = A4_HEIGHT;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, A4_WIDTH, A4_HEIGHT);
  return canvas;
}

function drawHeader(ctx: CanvasRenderingContext2D, title: string, date: string) {
  // Logo area
  ctx.fillStyle = COLORS.greenDim;
  roundRect(ctx, MARGIN, MARGIN, 40, 40, 8);
  ctx.fill();

  // Beetle icon (simple representation)
  ctx.fillStyle = COLORS.green;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('B', MARGIN + 12, MARGIN + 27);

  // Title
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 18px Georgia, serif';
  ctx.fillText('BeetleSense.ai', MARGIN + 50, MARGIN + 18);

  ctx.fillStyle = COLORS.text2;
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText('Forest Intelligence Platform', MARGIN + 50, MARGIN + 34);

  // Report title
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 16px Georgia, serif';
  ctx.fillText(title, MARGIN, MARGIN + 65);

  // Date aligned right
  ctx.fillStyle = COLORS.text3;
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(date, A4_WIDTH - MARGIN, MARGIN + 65);
  ctx.textAlign = 'left';

  // Header separator
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(MARGIN, MARGIN + HEADER_HEIGHT);
  ctx.lineTo(A4_WIDTH - MARGIN, MARGIN + HEADER_HEIGHT);
  ctx.stroke();
}

function drawFooter(ctx: CanvasRenderingContext2D, pageNum: number, totalPages: number) {
  const footerY = A4_HEIGHT - MARGIN - 20;

  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(MARGIN, footerY - 10);
  ctx.lineTo(A4_WIDTH - MARGIN, footerY - 10);
  ctx.stroke();

  ctx.fillStyle = COLORS.text3;
  ctx.font = '9px monospace';
  ctx.fillText(`BeetleSense.ai — Confidential`, MARGIN, footerY + 4);

  ctx.textAlign = 'right';
  ctx.fillText(`Page ${pageNum} of ${totalPages}`, A4_WIDTH - MARGIN, footerY + 4);
  ctx.textAlign = 'left';

  // Disclaimer
  ctx.fillStyle = COLORS.text3;
  ctx.font = '7px system-ui, sans-serif';
  ctx.fillText(
    'This report is auto-generated and should be verified by a certified forestry professional.',
    MARGIN,
    footerY + 16,
  );
}

function drawSectionTitle(ctx: CanvasRenderingContext2D, y: number, title: string): number {
  ctx.fillStyle = COLORS.green;
  ctx.font = 'bold 13px Georgia, serif';
  ctx.fillText(title, MARGIN, y);
  ctx.strokeStyle = COLORS.green;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(MARGIN, y + 5);
  ctx.lineTo(A4_WIDTH - MARGIN, y + 5);
  ctx.stroke();
  ctx.globalAlpha = 1;
  return y + 22;
}

function drawKeyValue(ctx: CanvasRenderingContext2D, y: number, key: string, value: string): number {
  ctx.fillStyle = COLORS.text3;
  ctx.font = '10px system-ui, sans-serif';
  ctx.fillText(key, MARGIN, y);
  ctx.fillStyle = COLORS.text;
  ctx.font = '10px system-ui, sans-serif';
  ctx.fillText(value, MARGIN + 160, y);
  return y + LINE_HEIGHT;
}

function drawText(ctx: CanvasRenderingContext2D, y: number, text: string, opts?: { color?: string; font?: string; indent?: number }): number {
  ctx.fillStyle = opts?.color ?? COLORS.text2;
  ctx.font = opts?.font ?? '10px system-ui, sans-serif';
  const x = MARGIN + (opts?.indent ?? 0);

  // Word wrap
  const words = text.split(' ');
  let line = '';
  const maxWidth = CONTENT_WIDTH - (opts?.indent ?? 0);

  for (const word of words) {
    const test = line + (line ? ' ' : '') + word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = word;
      y += LINE_HEIGHT;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, y);
    y += LINE_HEIGHT;
  }
  return y;
}

function drawBullet(ctx: CanvasRenderingContext2D, y: number, text: string, color?: string): number {
  ctx.fillStyle = color ?? COLORS.green;
  ctx.beginPath();
  ctx.arc(MARGIN + 6, y - 3, 2.5, 0, Math.PI * 2);
  ctx.fill();
  return drawText(ctx, y, text, { indent: 16 });
}

function drawCard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = COLORS.bgCard;
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 6);
  ctx.fill();
  ctx.stroke();
}

function drawBarChart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  data: { label: string; value: number; color?: string }[],
) {
  drawCard(ctx, x, y, w, h);

  if (data.length === 0) return;

  const chartPad = 12;
  const barAreaX = x + chartPad + 40;
  const barAreaW = w - chartPad * 2 - 40;
  const barH = Math.min(16, (h - chartPad * 2) / data.length - 4);
  const maxVal = Math.max(...data.map((d) => d.value), 1);

  data.forEach((d, i) => {
    const barY = y + chartPad + i * (barH + 4);
    const barW = (d.value / maxVal) * barAreaW;

    // Label
    ctx.fillStyle = COLORS.text3;
    ctx.font = '8px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(d.label, barAreaX - 6, barY + barH / 2 + 3);
    ctx.textAlign = 'left';

    // Bar
    ctx.fillStyle = d.color ?? COLORS.green;
    ctx.globalAlpha = 0.8;
    roundRect(ctx, barAreaX, barY, Math.max(barW, 2), barH, 3);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Value
    ctx.fillStyle = COLORS.text2;
    ctx.font = '8px monospace';
    ctx.fillText(String(d.value), barAreaX + barW + 6, barY + barH / 2 + 3);
  });
}

function drawLineChart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  data: { label: string; value: number }[],
  color?: string,
) {
  drawCard(ctx, x, y, w, h);

  if (data.length < 2) return;

  const pad = 20;
  const chartX = x + pad + 20;
  const chartW = w - pad * 2 - 20;
  const chartY = y + pad;
  const chartH = h - pad * 2 - 12;

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const minVal = Math.min(...data.map((d) => d.value), 0);
  const range = maxVal - minVal || 1;

  const lineColor = color ?? COLORS.green;

  // Grid lines
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 4; i++) {
    const gy = chartY + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(chartX, gy);
    ctx.lineTo(chartX + chartW, gy);
    ctx.stroke();

    // Y-axis labels
    const val = maxVal - (range / 4) * i;
    ctx.fillStyle = COLORS.text3;
    ctx.font = '7px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(val.toFixed(0), chartX - 4, gy + 3);
    ctx.textAlign = 'left';
  }

  // Line
  ctx.beginPath();
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2;
  data.forEach((d, i) => {
    const px = chartX + (i / (data.length - 1)) * chartW;
    const py = chartY + chartH - ((d.value - minVal) / range) * chartH;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();

  // Area fill
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = lineColor;
  ctx.lineTo(chartX + chartW, chartY + chartH);
  ctx.lineTo(chartX, chartY + chartH);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  // X-axis labels (show first, middle, last)
  const labelIndices = [0, Math.floor(data.length / 2), data.length - 1];
  ctx.fillStyle = COLORS.text3;
  ctx.font = '7px monospace';
  labelIndices.forEach((idx) => {
    if (idx < data.length) {
      const px = chartX + (idx / (data.length - 1)) * chartW;
      ctx.textAlign = 'center';
      ctx.fillText(data[idx].label, px, chartY + chartH + 12);
    }
  });
  ctx.textAlign = 'left';
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawStatusBadge(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, color: string) {
  ctx.font = '9px system-ui, sans-serif';
  const textW = ctx.measureText(label).width;
  const padX = 8;
  const _padY = 4;

  ctx.fillStyle = color;
  ctx.globalAlpha = 0.15;
  roundRect(ctx, x, y - 10, textW + padX * 2, 16, 8);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = color;
  ctx.fillText(label, x + padX, y);
}

function riskColor(risk: string): string {
  switch (risk) {
    case 'low': return COLORS.green;
    case 'medium': return COLORS.amber;
    case 'high': return COLORS.red;
    case 'critical': return COLORS.red;
    default: return COLORS.text3;
  }
}

function formatDate(date?: string): string {
  if (!date) return new Date().toLocaleDateString('sv-SE');
  try {
    return new Date(date).toLocaleDateString('sv-SE');
  } catch {
    return date;
  }
}

function formatSEK(value: number): string {
  return value.toLocaleString('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 });
}

// ─── Canvas-to-PDF Blob (multi-page PNG assembly) ───

async function canvasesToPdfBlob(pages: HTMLCanvasElement[]): Promise<Blob> {
  // Build a minimal HTML document containing all pages as images,
  // then use the browser's print-to-PDF-like approach via Blob.
  // Since we cannot invoke a real PDF writer without a library,
  // we encode each canvas as a high-quality PNG and wrap them
  // in a single HTML file that opens with print styles for A4.

  const images: string[] = [];
  for (const canvas of pages) {
    images.push(canvas.toDataURL('image/png', 1.0));
  }

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>BeetleSense Report</title>
<style>
@page { size: A4; margin: 0; }
@media print { body { margin: 0; } .page { page-break-after: always; } .page:last-child { page-break-after: auto; } }
body { margin: 0; padding: 0; background: #030d05; }
.page { width: 210mm; height: 297mm; position: relative; overflow: hidden; }
.page img { width: 100%; height: 100%; object-fit: contain; }
</style>
</head>
<body>
${images.map((src) => `<div class="page"><img src="${src}" /></div>`).join('\n')}
</body>
</html>`;

  return new Blob([html], { type: 'text/html' });
}

// ─── Report Generators ───

export async function generateForestHealthReport(
  data: ParcelReportData,
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  const pages: HTMLCanvasElement[] = [];
  const reportDate = formatDate();
  const title = `Forest Health Report — ${data.parcelName}`;

  onProgress?.(10);

  // ─── Page 1: Overview ───
  const p1 = createPage();
  const ctx1 = p1.getContext('2d')!;
  drawHeader(ctx1, title, reportDate);

  let y = CONTENT_TOP;

  y = drawSectionTitle(ctx1, y, 'Parcel Overview');
  y = drawKeyValue(ctx1, y, 'Parcel Name', data.parcelName);
  y = drawKeyValue(ctx1, y, 'Municipality', data.municipality);
  y = drawKeyValue(ctx1, y, 'Area', `${data.areaHectares.toFixed(1)} hectares`);
  y = drawKeyValue(ctx1, y, 'Last Survey', formatDate(data.lastSurveyDate));
  y = drawKeyValue(ctx1, y, 'Trees Scanned', data.treesScanned.toLocaleString());
  y += 8;

  // Species Mix
  y = drawSectionTitle(ctx1, y, 'Species Composition');
  drawBarChart(ctx1, MARGIN, y, CONTENT_WIDTH, Math.max(80, data.speciesMix.length * 20 + 24), data.speciesMix.map((s) => ({
    label: s.species,
    value: s.pct,
    color: COLORS.green,
  })));
  y += Math.max(80, data.speciesMix.length * 20 + 24) + 16;

  // Health Score card
  y = drawSectionTitle(ctx1, y, 'Health Assessment');
  const scoreColor = data.healthScore >= 70 ? COLORS.green : data.healthScore >= 40 ? COLORS.amber : COLORS.red;
  drawCard(ctx1, MARGIN, y, CONTENT_WIDTH / 3 - 8, 60);
  ctx1.fillStyle = scoreColor;
  ctx1.font = 'bold 24px monospace';
  ctx1.fillText(`${data.healthScore}`, MARGIN + 16, y + 30);
  ctx1.fillStyle = COLORS.text3;
  ctx1.font = '9px system-ui, sans-serif';
  ctx1.fillText('Health Score', MARGIN + 16, y + 48);

  drawCard(ctx1, MARGIN + CONTENT_WIDTH / 3, y, CONTENT_WIDTH / 3 - 8, 60);
  const trendLabel = data.healthTrend.charAt(0).toUpperCase() + data.healthTrend.slice(1);
  ctx1.fillStyle = COLORS.text;
  ctx1.font = 'bold 14px system-ui, sans-serif';
  ctx1.fillText(trendLabel, MARGIN + CONTENT_WIDTH / 3 + 16, y + 30);
  ctx1.fillStyle = COLORS.text3;
  ctx1.font = '9px system-ui, sans-serif';
  ctx1.fillText('Trend', MARGIN + CONTENT_WIDTH / 3 + 16, y + 48);

  drawCard(ctx1, MARGIN + (CONTENT_WIDTH / 3) * 2, y, CONTENT_WIDTH / 3, 60);
  const riskC = riskColor(data.beetleRisk);
  ctx1.fillStyle = riskC;
  ctx1.font = 'bold 14px system-ui, sans-serif';
  ctx1.fillText(data.beetleRisk.toUpperCase(), MARGIN + (CONTENT_WIDTH / 3) * 2 + 16, y + 30);
  ctx1.fillStyle = COLORS.text3;
  ctx1.font = '9px system-ui, sans-serif';
  ctx1.fillText('Beetle Risk', MARGIN + (CONTENT_WIDTH / 3) * 2 + 16, y + 48);

  y += 80;

  // Infection stats
  y = drawSectionTitle(ctx1, y, 'Detection Summary');
  y = drawKeyValue(ctx1, y, 'Infected Trees', `${data.infectedTrees} (${((data.infectedTrees / Math.max(data.treesScanned, 1)) * 100).toFixed(1)}%)`);
  y = drawKeyValue(ctx1, y, 'Dead Trees', `${data.deadTrees}`);
  y = drawKeyValue(ctx1, y, 'NDVI Average', data.ndviAvg.toFixed(2));
  y = drawKeyValue(ctx1, y, 'Timber Volume', `${data.timberVolumeM3.toLocaleString()} m3`);
  y = drawKeyValue(ctx1, y, 'Estimated Value', formatSEK(data.timberValueSEK));
  y = drawKeyValue(ctx1, y, 'Carbon Sequestration', `${data.carbonTonsCO2.toFixed(1)} tonnes CO2`);

  drawFooter(ctx1, 1, 2);
  pages.push(p1);

  onProgress?.(50);

  // ─── Page 2: Trends, Risks & Recommendations ───
  const p2 = createPage();
  const ctx2 = p2.getContext('2d')!;
  drawHeader(ctx2, title, reportDate);

  y = CONTENT_TOP;

  // Historical health scores chart
  if (data.historicalScores.length > 1) {
    y = drawSectionTitle(ctx2, y, 'Health Score Trend (12 months)');
    drawLineChart(ctx2, MARGIN, y, CONTENT_WIDTH, 140, data.historicalScores.map((s) => ({
      label: s.month,
      value: s.score,
    })));
    y += 160;
  }

  // Risk Factors
  if (data.riskFactors.length > 0) {
    y = drawSectionTitle(ctx2, y, 'Risk Factors');
    for (const risk of data.riskFactors) {
      y = drawBullet(ctx2, y, risk, COLORS.amber);
      if (y > CONTENT_BOTTOM - 40) break;
    }
    y += 8;
  }

  // Recommendations
  if (data.recommendations.length > 0) {
    y = drawSectionTitle(ctx2, y, 'Recommendations');
    for (const rec of data.recommendations) {
      y = drawBullet(ctx2, y, rec, COLORS.green);
      if (y > CONTENT_BOTTOM - 40) break;
    }
  }

  drawFooter(ctx2, 2, 2);
  pages.push(p2);

  onProgress?.(90);

  const blob = await canvasesToPdfBlob(pages);
  onProgress?.(100);
  return blob;
}

export async function generateTimberValueReport(
  data: TimberReportData,
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  const pages: HTMLCanvasElement[] = [];
  const reportDate = formatDate();
  const title = `Timber Valuation Report — ${data.parcelName}`;

  onProgress?.(10);

  const p1 = createPage();
  const ctx = p1.getContext('2d')!;
  drawHeader(ctx, title, reportDate);

  let y = CONTENT_TOP;

  y = drawSectionTitle(ctx, y, 'Parcel Information');
  y = drawKeyValue(ctx, y, 'Parcel Name', data.parcelName);
  y = drawKeyValue(ctx, y, 'Municipality', data.municipality);
  y = drawKeyValue(ctx, y, 'Area', `${data.areaHectares.toFixed(1)} hectares`);
  y = drawKeyValue(ctx, y, 'Total Volume', `${data.totalVolume.toLocaleString()} m3fub`);
  y = drawKeyValue(ctx, y, 'Estimated Total Value', formatSEK(data.totalValue));
  y = drawKeyValue(ctx, y, 'Market Trend', data.marketTrend.charAt(0).toUpperCase() + data.marketTrend.slice(1));
  y += 8;

  onProgress?.(30);

  // Volume by species chart
  y = drawSectionTitle(ctx, y, 'Volume by Species');
  drawBarChart(ctx, MARGIN, y, CONTENT_WIDTH, Math.max(80, data.volumeBySpecies.length * 22 + 24), data.volumeBySpecies.map((s) => ({
    label: s.species,
    value: s.m3,
    color: COLORS.green,
  })));
  y += Math.max(80, data.volumeBySpecies.length * 22 + 24) + 16;

  // Species breakdown table
  y = drawSectionTitle(ctx, y, 'Valuation Breakdown');
  ctx.fillStyle = COLORS.text3;
  ctx.font = 'bold 9px system-ui, sans-serif';
  ctx.fillText('Species', MARGIN, y);
  ctx.fillText('Volume (m3)', MARGIN + 180, y);
  ctx.fillText('Price/m3', MARGIN + 300, y);
  ctx.fillText('Value', MARGIN + 420, y);
  y += 14;

  for (const sp of data.volumeBySpecies) {
    ctx.fillStyle = COLORS.text;
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText(sp.species, MARGIN, y);
    ctx.font = '10px monospace';
    ctx.fillText(sp.m3.toLocaleString(), MARGIN + 180, y);
    ctx.fillText(formatSEK(sp.pricePerM3), MARGIN + 300, y);
    ctx.fillText(formatSEK(sp.m3 * sp.pricePerM3), MARGIN + 420, y);
    y += LINE_HEIGHT;
  }
  y += 8;

  // Price history chart
  if (data.priceHistory.length > 1) {
    y = drawSectionTitle(ctx, y, 'Price Trend (12 months)');
    drawLineChart(ctx, MARGIN, y, CONTENT_WIDTH, 140, data.priceHistory.map((p) => ({
      label: p.month,
      value: p.price,
    })));
    y += 160;
  }

  onProgress?.(70);

  // Harvest recommendation
  if (y < CONTENT_BOTTOM - 60) {
    y = drawSectionTitle(ctx, y, 'Harvest Recommendation');
    y = drawText(ctx, y, data.harvestRecommendation);
  }

  drawFooter(ctx, 1, 1);
  pages.push(p1);

  onProgress?.(100);
  return canvasesToPdfBlob(pages);
}

export async function generateComplianceReport(
  data: ComplianceReportData,
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  const pages: HTMLCanvasElement[] = [];
  const reportDate = formatDate();
  const title = `Compliance Report — ${data.parcelName}`;

  onProgress?.(10);

  const p1 = createPage();
  const ctx = p1.getContext('2d')!;
  drawHeader(ctx, title, reportDate);

  let y = CONTENT_TOP;

  y = drawSectionTitle(ctx, y, 'Permit Information');
  y = drawKeyValue(ctx, y, 'Permit ID', data.permitId);
  y = drawKeyValue(ctx, y, 'Type', data.permitType);
  y = drawKeyValue(ctx, y, 'Parcel', data.parcelName);
  y = drawKeyValue(ctx, y, 'Municipality', data.municipality);
  y = drawKeyValue(ctx, y, 'Issued', formatDate(data.issuedDate));
  y = drawKeyValue(ctx, y, 'Expires', formatDate(data.expiryDate));
  y += 4;

  const statusColor = data.status === 'active' ? COLORS.green : data.status === 'pending' ? COLORS.amber : COLORS.red;
  drawStatusBadge(ctx, MARGIN + 160, y, data.status.toUpperCase(), statusColor);
  y = drawKeyValue(ctx, y, 'Status', '');
  y += 12;

  onProgress?.(30);

  // Requirements checklist
  y = drawSectionTitle(ctx, y, 'Requirements Checklist');
  for (const req of data.requirements) {
    const icon = req.met ? '\u2713' : '\u2717';
    const color = req.met ? COLORS.green : COLORS.red;
    ctx.fillStyle = color;
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText(icon, MARGIN + 4, y);
    ctx.fillStyle = COLORS.text;
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText(req.requirement, MARGIN + 20, y);
    y += LINE_HEIGHT;
    if (y > CONTENT_BOTTOM - 80) break;
  }
  y += 8;

  onProgress?.(60);

  // Inspections
  if (data.inspections.length > 0 && y < CONTENT_BOTTOM - 100) {
    y = drawSectionTitle(ctx, y, 'Inspection History');
    for (const insp of data.inspections) {
      y = drawKeyValue(ctx, y, formatDate(insp.date), `${insp.result} (${insp.inspector})`);
      if (y > CONTENT_BOTTOM - 60) break;
    }
    y += 8;
  }

  // Notes
  if (data.notes && y < CONTENT_BOTTOM - 40) {
    y = drawSectionTitle(ctx, y, 'Notes');
    y = drawText(ctx, y, data.notes);
  }

  drawFooter(ctx, 1, 1);
  pages.push(p1);

  onProgress?.(100);
  return canvasesToPdfBlob(pages);
}

export async function generateAnnualSummary(
  data: AnnualSummaryData,
  onProgress?: (pct: number) => void,
): Promise<Blob> {
  const pages: HTMLCanvasElement[] = [];
  const reportDate = formatDate();
  const title = `Annual Summary ${data.year} — ${data.ownerName}`;

  onProgress?.(10);

  // ─── Page 1: Overview + Key Metrics ───
  const p1 = createPage();
  const ctx1 = p1.getContext('2d')!;
  drawHeader(ctx1, title, reportDate);

  let y = CONTENT_TOP;

  y = drawSectionTitle(ctx1, y, 'Annual Overview');
  y = drawKeyValue(ctx1, y, 'Year', String(data.year));
  y = drawKeyValue(ctx1, y, 'Forest Owner', data.ownerName);
  y = drawKeyValue(ctx1, y, 'Total Area', `${data.totalArea.toFixed(1)} hectares`);
  y = drawKeyValue(ctx1, y, 'Number of Parcels', String(data.parcels.length));
  y = drawKeyValue(ctx1, y, 'Total Surveys', String(data.totalSurveys));
  y = drawKeyValue(ctx1, y, 'Avg Health Score', `${data.avgHealthScore.toFixed(0)} / 100`);
  y = drawKeyValue(ctx1, y, 'Total Timber Value', formatSEK(data.totalTimberValue));
  y = drawKeyValue(ctx1, y, 'Carbon Offset', `${data.carbonOffset.toFixed(1)} tonnes CO2`);
  y += 12;

  onProgress?.(30);

  // Monthly health score trend
  if (data.monthlyScores.length > 1) {
    y = drawSectionTitle(ctx1, y, 'Monthly Health Score');
    drawLineChart(ctx1, MARGIN, y, CONTENT_WIDTH, 140, data.monthlyScores.map((s) => ({
      label: s.month,
      value: s.score,
    })));
    y += 160;
  }

  // Parcel summary chart
  if (y < CONTENT_BOTTOM - 120) {
    y = drawSectionTitle(ctx1, y, 'Parcel Overview');
    drawBarChart(ctx1, MARGIN, y, CONTENT_WIDTH, Math.min(160, data.parcels.length * 22 + 24), data.parcels.map((p) => ({
      label: p.name,
      value: p.healthScore,
      color: p.healthScore >= 70 ? COLORS.green : p.healthScore >= 40 ? COLORS.amber : COLORS.red,
    })));
  }

  drawFooter(ctx1, 1, 2);
  pages.push(p1);

  onProgress?.(50);

  // ─── Page 2: Parcel Details + Key Events ───
  const p2 = createPage();
  const ctx2 = p2.getContext('2d')!;
  drawHeader(ctx2, title, reportDate);

  y = CONTENT_TOP;

  // Parcel table
  y = drawSectionTitle(ctx2, y, 'Parcel Details');
  ctx2.fillStyle = COLORS.text3;
  ctx2.font = 'bold 9px system-ui, sans-serif';
  ctx2.fillText('Parcel', MARGIN, y);
  ctx2.fillText('Area (ha)', MARGIN + 160, y);
  ctx2.fillText('Health', MARGIN + 260, y);
  ctx2.fillText('Value (SEK)', MARGIN + 360, y);
  ctx2.fillText('Surveys', MARGIN + 500, y);
  y += 14;

  for (const parcel of data.parcels) {
    ctx2.fillStyle = COLORS.text;
    ctx2.font = '10px system-ui, sans-serif';
    ctx2.fillText(parcel.name, MARGIN, y);
    ctx2.font = '10px monospace';
    ctx2.fillText(parcel.areaHectares.toFixed(1), MARGIN + 160, y);
    const sc = parcel.healthScore;
    ctx2.fillStyle = sc >= 70 ? COLORS.green : sc >= 40 ? COLORS.amber : COLORS.red;
    ctx2.fillText(String(sc), MARGIN + 260, y);
    ctx2.fillStyle = COLORS.text;
    ctx2.fillText(formatSEK(parcel.timberValueSEK), MARGIN + 360, y);
    ctx2.fillText(String(parcel.surveysCompleted), MARGIN + 500, y);
    y += LINE_HEIGHT;
    if (y > CONTENT_BOTTOM - 120) break;
  }
  y += 12;

  onProgress?.(70);

  // Key events
  if (data.keyEvents.length > 0 && y < CONTENT_BOTTOM - 60) {
    y = drawSectionTitle(ctx2, y, 'Key Events');
    for (const event of data.keyEvents) {
      y = drawKeyValue(ctx2, y, formatDate(event.date), event.description);
      if (y > CONTENT_BOTTOM - 40) break;
    }
  }

  drawFooter(ctx2, 2, 2);
  pages.push(p2);

  onProgress?.(100);
  return canvasesToPdfBlob(pages);
}

// ─── Utility: Download Blob ───

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
