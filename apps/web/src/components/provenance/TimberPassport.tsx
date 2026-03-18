import {
  X,
  TreePine,
  MapPin,
  Satellite,
  Shield,
  Leaf,
  Truck,
  Award,
  Download,
} from 'lucide-react';
import type { TimberBatch, QRVerificationData } from '@/hooks/useProvenance';
import { ChainOfCustody } from './ChainOfCustody';

// ─── Simple QR Code SVG generator ───
// Generates a decorative QR-like SVG pattern for visual representation

function QRCodeSVG({ data, size = 120 }: { data: string; size?: number }) {
  // Generate a deterministic pattern from the data string
  const cells = 21;
  const cellSize = size / cells;
  const hash = Array.from(data).reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 0);

  const grid: boolean[][] = [];
  for (let r = 0; r < cells; r++) {
    grid[r] = [];
    for (let c = 0; c < cells; c++) {
      // Finder patterns (top-left, top-right, bottom-left)
      const inFinderTL = r < 7 && c < 7;
      const inFinderTR = r < 7 && c >= cells - 7;
      const inFinderBL = r >= cells - 7 && c < 7;
      if (inFinderTL || inFinderTR || inFinderBL) {
        const lr = inFinderTL ? r : inFinderBL ? r - (cells - 7) : r;
        const lc = inFinderTL ? c : inFinderTR ? c - (cells - 7) : c;
        const border = lr === 0 || lr === 6 || lc === 0 || lc === 6;
        const inner = lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4;
        grid[r][c] = border || inner;
      } else {
        grid[r][c] = ((hash * (r * cells + c + 1) * 7 + r * 13 + c * 17) % 100) < 45;
      }
    }
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded-lg">
      <rect width={size} height={size} fill="white" rx={4} />
      {grid.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize}
              height={cellSize}
              fill="#111"
            />
          ) : null,
        ),
      )}
    </svg>
  );
}

// ─── Status badge ───

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  standing: { label: 'Planerad', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' },
  harvested: { label: 'Avverkad', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
  in_transport: { label: 'Under transport', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
  at_mill: { label: 'Levererad', color: '#4ade80', bg: 'rgba(74,222,128,0.15)' },
};

interface TimberPassportProps {
  batch: TimberBatch;
  qrData: QRVerificationData;
  onClose: () => void;
}

export function TimberPassport({ batch, qrData, onClose }: TimberPassportProps) {
  const statusCfg = STATUS_CONFIG[batch.status];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div
        className="w-full max-w-2xl rounded-2xl border border-[var(--border)] shadow-2xl"
        style={{ background: 'var(--bg2)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-serif font-bold text-[var(--text)]">
                Digitalt Timmerpass
              </h2>
              <span
                className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                style={{ color: statusCfg.color, background: statusCfg.bg }}
              >
                {statusCfg.label}
              </span>
            </div>
            <p className="text-xs text-[var(--text3)] mt-0.5 font-mono">{batch.id}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg3)] transition-colors"
            aria-label="Stäng"
          >
            <X size={18} className="text-[var(--text3)]" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Top row: QR + basic info */}
          <div className="flex gap-5">
            {/* QR Code */}
            <div className="flex-shrink-0">
              <QRCodeSVG data={qrData.verifyUrl} size={130} />
              <p className="text-[9px] text-[var(--text3)] text-center mt-1.5 font-mono">
                Skanna för verifiering
              </p>
            </div>

            {/* Basic info */}
            <div className="flex-1 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <InfoField icon={<TreePine size={13} />} label="Art" value={batch.species_sv} />
                <InfoField icon={<TreePine size={13} />} label="Volym" value={`${batch.volume_m3} m³`} />
                <InfoField icon={<Award size={13} />} label="Kvalitet" value={batch.qualityGrade} />
                <InfoField icon={<MapPin size={13} />} label="Areal" value={`${batch.areaHarvested_ha} ha`} />
              </div>
            </div>
          </div>

          {/* Origin section */}
          <Section title="Ursprung" icon={<MapPin size={14} />}>
            <div className="grid grid-cols-2 gap-3">
              <InfoField label="Skifte" value={batch.parcelName} />
              <InfoField label="Koordinater (SWEREF99 TM)" value={`N ${batch.parcelCoords.n}, E ${batch.parcelCoords.e}`} />
              <InfoField label="Destination" value={batch.destinationMill} />
              <InfoField label="Transportavstånd" value={`${batch.transportDistance_km} km`} />
            </div>
          </Section>

          {/* Satellite verification */}
          <Section title="Satellitverifiering" icon={<Satellite size={14} />}>
            <div className="grid grid-cols-2 gap-3">
              <InfoField label="Före avverkning" value={batch.satelliteVerification.beforeDate || 'Ej tillgänglig'} />
              <InfoField label="Efter avverkning" value={batch.satelliteVerification.afterDate || 'Inväntar'} />
              <InfoField label="Datakälla" value={batch.satelliteVerification.sentinel2 ? 'Sentinel-2 (Copernicus)' : 'Ej verifierad'} />
              <div className="flex items-center gap-1.5">
                {batch.satelliteVerification.deforestationFree ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#4ade80] bg-[#4ade80]/10 px-2 py-1 rounded-full">
                    <Shield size={11} />
                    Avskogningsfri
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#fbbf24] bg-[#fbbf24]/10 px-2 py-1 rounded-full">
                    Verifiering pågår
                  </span>
                )}
              </div>
            </div>
          </Section>

          {/* Certifications */}
          <Section title="Certifieringar" icon={<Award size={14} />}>
            <div className="grid grid-cols-2 gap-3">
              <InfoField label="FSC CoC" value={batch.fsc_coc} />
              <InfoField label="PEFC CoC" value={batch.pefc_coc} />
            </div>
          </Section>

          {/* Chain of Custody */}
          <Section title="Spårbarhetskedja" icon={<Truck size={14} />}>
            <ChainOfCustody chain={batch.custodyChain} transportDistance={batch.transportDistance_km} carbonFootprint={batch.carbonFootprint_kg} anomalies={batch.anomalies} compact />
          </Section>

          {/* Carbon footprint */}
          <Section title="Klimatavtryck" icon={<Leaf size={14} />}>
            <div className="grid grid-cols-2 gap-3">
              <InfoField label="CO₂ (avverkning + transport)" value={batch.carbonFootprint_kg > 0 ? `${batch.carbonFootprint_kg} kg CO₂` : 'Ej beräknat'} />
              <InfoField label="Per m³" value={batch.carbonFootprint_kg > 0 ? `${(batch.carbonFootprint_kg / batch.volume_m3).toFixed(1)} kg CO₂/m³` : '—'} />
            </div>
          </Section>

          {/* EUDR compliance badge */}
          <div
            className="rounded-xl p-4 border"
            style={{
              borderColor: batch.eudrCompliance === 100 ? 'rgba(74,222,128,0.3)' : 'rgba(251,191,36,0.3)',
              background: batch.eudrCompliance === 100 ? 'rgba(74,222,128,0.05)' : 'rgba(251,191,36,0.05)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield size={16} style={{ color: batch.eudrCompliance === 100 ? '#4ade80' : '#fbbf24' }} />
                <span className="text-sm font-semibold text-[var(--text)]">
                  EUDR Compliance: {batch.eudrCompliance}%
                </span>
              </div>
              <button className="flex items-center gap-1.5 text-xs text-[var(--green)] hover:text-[var(--text)] transition-colors">
                <Download size={13} />
                Ladda ner rapport
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helper components ───

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[var(--green)]">{icon}</span>
        <h3 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider">{title}</h3>
      </div>
      <div className="rounded-lg border border-[var(--border)] p-3" style={{ background: 'var(--bg)' }}>
        {children}
      </div>
    </div>
  );
}

function InfoField({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-[var(--text3)] mb-0.5 flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className="text-xs font-medium text-[var(--text)] font-mono">{value}</p>
    </div>
  );
}
