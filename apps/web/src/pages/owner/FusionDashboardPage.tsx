import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ArrowRight, Satellite, Thermometer, Bug, BarChart3, Sparkles, FileText, GitCompareArrows } from 'lucide-react';
import { ForestFusionView } from '@/components/fusion/ForestFusionView';
import type { ParcelData } from '@/components/fusion/ForestFusionView';

/* ═══════════════════════════════════════════════════════════════
   FusionDashboardPage — The hero page that replaces widget soup.
   Medical-scan-style view: one display, all data layers fused.
   ═══════════════════════════════════════════════════════════════ */

// ─── Demo Parcels ───

const DEMO_PARCELS: ParcelData[] = [
  {
    id: 'norra',
    name: 'Norra Skiftet',
    healthPercent: 92,
    timberValueKr: '12.4M kr',
    hotspots: [
      {
        id: 'ns-1',
        cx: 150,
        cy: 310,
        riskLevel: 'high',
        label: 'Beetle risk: High',
        locationName: 'SW Corner',
        riskType: 'Bark beetle (Ips typographus)',
        severity: 'High — active boring detected',
        financialImpact: '520,000 kr at risk',
        action: 'Schedule drone survey within 48h',
      },
    ],
    healthProfile: 'healthy',
    fusionSentence: 'Your forest is **92% healthy**. Beetle risk is concentrated in the **southwest corner** near Ekbacken. Timber value: **12.4M kr**. **No action needed this week.**',
    actionState: 'healthy',
  },
  {
    id: 'ekbacken',
    name: 'Ekbacken',
    healthPercent: 71,
    timberValueKr: '8.2M kr',
    hotspots: [
      {
        id: 'ek-1',
        cx: 170,
        cy: 290,
        riskLevel: 'high',
        label: 'Beetle risk: High',
        locationName: 'South Ridge',
        riskType: 'Bark beetle (Ips typographus)',
        severity: 'High — confirmed infestation',
        financialImpact: '840,000 kr at risk',
        action: 'Immediate sanitation harvest recommended',
      },
      {
        id: 'ek-2',
        cx: 310,
        cy: 180,
        riskLevel: 'moderate',
        label: 'Beetle risk: Moderate',
        locationName: 'East Slope',
        riskType: 'Bark beetle (early stress)',
        severity: 'Moderate — NDVI decline detected',
        financialImpact: '320,000 kr at risk',
        action: 'Monitor weekly; drone verification advised',
      },
    ],
    healthProfile: 'moderate',
    fusionSentence: 'Ekbacken shows **71% health** with **two active hotspots**. The south ridge has confirmed beetle activity — **840,000 kr at risk**. **Book a drone survey this week.**',
    actionState: 'at-risk',
  },
  {
    id: 'tallmon',
    name: 'Tallmon',
    healthPercent: 97,
    timberValueKr: '15.1M kr',
    hotspots: [],
    healthProfile: 'healthy',
    fusionSentence: 'Tallmon is in **excellent condition** at **97% health**. No beetle activity detected. High-value mature timber: **15.1M kr**. **No action needed.**',
    actionState: 'healthy',
  },
];

// ─── Helpers ───

function renderFusionSentence(raw: string) {
  // Convert **bold** markdown to styled spans
  const parts = raw.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="text-[var(--green)] font-semibold">{part}</strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

// ─── Component ───

export default function FusionDashboardPage() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const parcel = DEMO_PARCELS[selectedIdx];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      {/* ─── Header Row ─── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Forest Fusion
          </h1>
          <p className="text-xs text-[var(--text3)] mt-0.5">All data sources, one view</p>
        </div>

        {/* Parcel Selector */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[var(--text)] border border-[var(--border)] bg-[var(--bg2)] hover:border-[var(--green)] transition-colors press-effect"
          >
            <span>{parcel.name}</span>
            <ChevronDown size={14} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-[var(--border)] bg-[var(--bg2)] shadow-xl z-30 overflow-hidden animate-fade-in">
              {DEMO_PARCELS.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedIdx(idx); setDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    idx === selectedIdx
                      ? 'bg-[var(--green)]/10 text-[var(--green)] font-medium'
                      : 'text-[var(--text2)] hover:bg-[var(--bg3)]'
                  }`}
                >
                  <span className="block">{p.name}</span>
                  <span className="text-[10px] text-[var(--text3)]">{p.healthPercent}% healthy</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── The Fusion View (the hero visual) ─── */}
      <ForestFusionView parcel={parcel} />

      {/* ─── Fusion Summary Panel ─── */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-5 space-y-4">
        {/* The Fusion Sentence */}
        <p
          className="text-base leading-relaxed text-[var(--text)]"
          style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.15rem', lineHeight: 1.7 }}
        >
          {renderFusionSentence(parcel.fusionSentence)}
        </p>

        {/* Source Attribution */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text3)]">Sources</span>
          <SourceBadge icon={<Satellite size={12} />} label="Sentinel-2" />
          <SourceBadge icon={<Thermometer size={12} />} label="SMHI" />
          <SourceBadge icon={<Bug size={12} />} label="Skogsstyrelsen" />
          <SourceBadge icon={<BarChart3 size={12} />} label="BeetleSense AI" />
          <span className="text-[10px] text-[var(--text3)] ml-auto">Updated 2 hours ago</span>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
          {parcel.actionState === 'healthy' ? (
            <>
              <ActionButton to="/owner/reports" icon={<FileText size={14} />} label="Export Report" />
              <ActionButton to="/owner/timber-market" icon={<BarChart3 size={14} />} label="Check Timber Prices" />
              <ActionButton to="/owner/wingman" icon={<Sparkles size={14} />} label="Ask Wingman" primary />
            </>
          ) : (
            <>
              <ActionButton to="/owner/surveys" icon={<Satellite size={14} />} label="Book Drone Survey" primary />
              <ActionButton to="/owner/microclimate" icon={<Bug size={14} />} label="View Beetle Forecast" />
              <ActionButton to="/owner/avverkningsanmalan" icon={<FileText size={14} />} label="Report to Skogsstyrelsen" />
            </>
          )}
        </div>
      </div>

      {/* ─── Compare Over Time Link ─── */}
      <div className="flex justify-end">
        <Link
          to="/owner/satellite-compare"
          className="flex items-center gap-1.5 text-xs text-[var(--text3)] hover:text-[var(--green)] transition-colors"
        >
          <GitCompareArrows size={13} />
          Compare over time
          <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}

// ─── Sub-components ───

function SourceBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1 text-[11px] text-[var(--text3)]">
      {icon}
      {label}
    </span>
  );
}

function ActionButton({ to, icon, label, primary }: { to: string; icon: React.ReactNode; label: string; primary?: boolean }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors press-effect ${
        primary
          ? 'bg-[var(--green)] text-white hover:brightness-110'
          : 'bg-[var(--bg3)] text-[var(--text2)] hover:bg-[var(--border)] hover:text-[var(--text)]'
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
