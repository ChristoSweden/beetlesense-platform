/**
 * PhotoAnalysisResults — rich display for AI photo analysis output.
 *
 * Shows bounding-box overlay on the photo, confidence gauge, detection
 * summary cards, severity indicator, recommendations, and action buttons.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  AlertTriangle,
  Bug,
  TreePine,
  Heart,
  Sparkles,
  Share2,
  ClipboardPlus,
  FileDown,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react';
import type { AnalysisResult, Severity } from '@/services/photoAnalysisService';

// ── Severity config ─────────────────────────────────────────────────────────

const SEVERITY_CFG: Record<Severity, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  none:     { label: 'No damage detected',       color: 'text-[var(--green)]',  bg: 'bg-[var(--green)]/10', icon: CheckCircle },
  early:    { label: 'Early-stage damage',        color: 'text-amber-600',       bg: 'bg-amber-50',         icon: AlertTriangle },
  moderate: { label: 'Moderate damage',           color: 'text-orange-600',      bg: 'bg-orange-50',        icon: AlertTriangle },
  severe:   { label: 'Severe infestation',        color: 'text-red-600',         bg: 'bg-red-50',           icon: Bug },
};

// ── Confidence gauge ────────────────────────────────────────────────────────

function ConfidenceBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 85 ? 'bg-[var(--green)]' :
    pct >= 70 ? 'bg-amber-500' :
    'bg-orange-500';

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider text-[var(--text3)]">{label}</span>
        <span className="text-xs font-mono font-bold text-[var(--text)]">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Bounding box overlay ────────────────────────────────────────────────────

function BoundingBoxOverlay({ result }: { result: AnalysisResult }) {
  const [showBoxes, setShowBoxes] = useState(true);

  return (
    <div className="relative rounded-xl overflow-hidden border border-[var(--border)]">
      {/* Image */}
      <img
        src={result.photoUrl}
        alt="Analysed forest photo"
        className="w-full h-auto block"
        style={{ maxHeight: 400, objectFit: 'cover' }}
      />

      {/* Bounding boxes */}
      {showBoxes && result.boundingBoxes.map((box, i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{
            left: `${box.x}%`,
            top: `${box.y}%`,
            width: `${box.width}%`,
            height: `${box.height}%`,
            border: `2px solid ${box.color}`,
            borderRadius: 4,
          }}
        >
          <span
            className="absolute -top-5 left-0 px-1.5 py-0.5 rounded text-[9px] font-semibold text-white whitespace-nowrap"
            style={{ backgroundColor: box.color }}
          >
            {box.label} {Math.round(box.confidence * 100)}%
          </span>
        </div>
      ))}

      {/* Toggle */}
      <button
        onClick={() => setShowBoxes(!showBoxes)}
        className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/60 text-white text-[9px] font-medium hover:bg-black/80 transition-colors"
      >
        {showBoxes ? 'Hide labels' : 'Show labels'}
      </button>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

interface Props {
  result: AnalysisResult;
  onSendToWingman?: () => void;
  onShareCommunity?: () => void;
  onAddToSurvey?: () => void;
}

export function PhotoAnalysisResults({ result, onSendToWingman, onShareCommunity, onAddToSurvey }: Props) {
  const navigate = useNavigate();
  const [recsExpanded, setRecsExpanded] = useState(true);
  const sev = SEVERITY_CFG[result.severity];
  const SevIcon = sev.icon;

  // Export as PDF (print-based)
  const handleExportPDF = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const date = result.timestamp.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>BeetleSense Analysis Report</title>
<style>
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:700px;margin:0 auto;padding:32px 24px;color:#1e293b;}
h1{font-size:18px;color:#166534;margin:0 0 4px;}
.meta{font-size:11px;color:#6b7280;margin-bottom:24px;}
.card{border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:16px;}
.badge{display:inline-block;padding:4px 10px;border-radius:12px;font-size:12px;font-weight:600;}
.green{background:#dcfce7;color:#166534;} .amber{background:#fef3c7;color:#92400e;} .red{background:#fee2e2;color:#991b1b;}
ul{margin:8px 0;padding-left:20px;} li{margin-bottom:6px;font-size:13px;}
.footer{margin-top:32px;border-top:1px solid #e5e7eb;padding-top:12px;font-size:10px;color:#9ca3af;text-align:center;}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
</style></head><body>
<h1>BeetleSense AI Analysis Report</h1>
<p class="meta">Generated ${date} &middot; Model ${result.modelVersion} &middot; Processing ${result.processingTimeMs}ms</p>
<div class="card">
<strong>Severity:</strong> <span class="badge ${result.severity === 'none' ? 'green' : result.severity === 'early' ? 'amber' : 'red'}">${sev.label}</span><br/>
<strong>Confidence:</strong> ${Math.round(result.confidence * 100)}%<br/>
<strong>Species:</strong> ${result.treeSpecies} (${Math.round(result.speciesConfidence * 100)}%)
</div>
<div class="card"><strong>Detections</strong><ul>
${result.detections.map((d) => `<li>${d.label} — ${Math.round(d.confidence * 100)}% (${d.category})</li>`).join('')}
</ul></div>
<div class="card"><strong>Recommendations</strong><ul>
${result.recommendations.map((r) => `<li>${r}</li>`).join('')}
</ul></div>
<div class="footer">Generated by BeetleSense AI &mdash; beetlesense.ai</div>
</body></html>`;
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  return (
    <div className="space-y-4 mt-6">
      {/* Photo with bounding boxes */}
      <BoundingBoxOverlay result={result} />

      {/* Severity banner */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${sev.bg}`}>
        <SevIcon size={20} className={sev.color} />
        <div className="flex-1">
          <p className={`text-sm font-semibold ${sev.color}`}>{sev.label}</p>
          <p className="text-[10px] text-[var(--text3)]">
            {result.barkBeetleDetected
              ? 'Bark beetle (Ips typographus) activity detected'
              : 'No bark beetle activity found in this image'}
          </p>
        </div>
      </div>

      {/* Confidence + species + timing */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
          <ConfidenceBar value={result.confidence} label="Detection confidence" />
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
          <div className="flex items-center gap-2 mb-1">
            <TreePine size={14} className="text-[var(--green)]" />
            <span className="text-[10px] uppercase tracking-wider text-[var(--text3)]">Species</span>
          </div>
          <p className="text-xs font-semibold text-[var(--text)]">{result.treeSpecies}</p>
          <p className="text-[10px] text-[var(--text3)] font-mono">{Math.round(result.speciesConfidence * 100)}% confidence</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className="text-[var(--text3)]" />
            <span className="text-[10px] uppercase tracking-wider text-[var(--text3)]">Processing</span>
          </div>
          <p className="text-xs font-semibold text-[var(--text)]">{(result.processingTimeMs / 1000).toFixed(1)}s</p>
          <p className="text-[10px] text-[var(--text3)] font-mono">{result.modelVersion}</p>
        </div>
      </div>

      {/* Detections list */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
        <h3 className="text-xs font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
          <Heart size={14} className="text-[var(--green)]" />
          Detections ({result.detections.length})
        </h3>
        <div className="space-y-2">
          {result.detections.map((det, i) => {
            const catColor =
              det.category === 'pest' ? 'text-red-600 bg-red-50' :
              det.category === 'disease' ? 'text-orange-600 bg-orange-50' :
              det.category === 'damage' ? 'text-amber-600 bg-amber-50' :
              det.category === 'species' ? 'text-emerald-600 bg-emerald-50' :
              'text-blue-600 bg-blue-50';

            return (
              <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-[var(--bg3)] transition-colors">
                <div className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${catColor}`}>
                    {det.category}
                  </span>
                  <span className="text-xs text-[var(--text)]">{det.label}</span>
                </div>
                <span className="text-xs font-mono text-[var(--text3)]">{Math.round(det.confidence * 100)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendations */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
        <button
          onClick={() => setRecsExpanded(!recsExpanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <h3 className="text-xs font-semibold text-[var(--text)] flex items-center gap-2">
            <Sparkles size={14} className="text-[var(--green)]" />
            Recommendations ({result.recommendations.length})
          </h3>
          {recsExpanded ? <ChevronUp size={14} className="text-[var(--text3)]" /> : <ChevronDown size={14} className="text-[var(--text3)]" />}
        </button>
        {recsExpanded && (
          <ul className="mt-3 space-y-2">
            {result.recommendations.map((rec, i) => (
              <li key={i} className="flex gap-2 text-xs text-[var(--text2)] leading-relaxed">
                <span className="mt-0.5 text-[var(--green)]">&#x2022;</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onSendToWingman ?? (() => navigate('/owner/wingman'))}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--green)] text-[var(--bg)] text-xs font-semibold hover:bg-[var(--green2)] transition-colors"
        >
          <Sparkles size={14} />
          Send to Wingman
        </button>
        <button
          onClick={onShareCommunity ?? (() => navigate('/owner/community'))}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg2)] text-[var(--text)] text-xs font-semibold hover:bg-[var(--bg3)] transition-colors"
        >
          <Share2 size={14} />
          Share with community
        </button>
        <button
          onClick={onAddToSurvey ?? (() => navigate('/owner/surveys'))}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg2)] text-[var(--text)] text-xs font-semibold hover:bg-[var(--bg3)] transition-colors"
        >
          <ClipboardPlus size={14} />
          Add to survey
        </button>
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg2)] text-[var(--text)] text-xs font-semibold hover:bg-[var(--bg3)] transition-colors"
        >
          <FileDown size={14} />
          Export PDF
        </button>
      </div>
    </div>
  );
}
