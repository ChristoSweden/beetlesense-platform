import { X, TreePine, Thermometer, Leaf, Scan, AlertTriangle, TrendingUp, Ruler } from 'lucide-react';

export interface TreeData {
  tree_id: string;
  tree_number: number;
  parcel_name: string;
  species: string;
  height_m: number;
  crown_diameter_m: number;
  ndvi: number;
  ndre: number;
  temp_anomaly: number;
  health_score: number;
  stress_flag: boolean;
  stress_type: string | null;
}

interface TreeDetailPopupProps {
  tree: TreeData;
  onClose: () => void;
}

function healthLabel(score: number): { text: string; textSv: string; color: string } {
  if (score >= 80) return { text: 'Healthy', textSv: 'Frisk', color: '#22c55e' };
  if (score >= 65) return { text: 'Good', textSv: 'Bra', color: '#84cc16' };
  if (score >= 50) return { text: 'Fair', textSv: 'Acceptabel', color: '#eab308' };
  if (score >= 30) return { text: 'Stressed', textSv: 'Stressad', color: '#f97316' };
  return { text: 'Critical', textSv: 'Kritisk', color: '#ef4444' };
}

function stressLabel(type: string | null): string {
  switch (type) {
    case 'beetle': return 'Barkborreangrepp';
    case 'drought': return 'Torka';
    case 'disease': return 'Sjukdom';
    case 'mechanical': return 'Mekanisk skada';
    default: return 'Okänd stress';
  }
}

function ndviBar(value: number): { width: string; color: string } {
  const pct = Math.max(0, Math.min(100, ((value + 1) / 2) * 100));
  const color = value > 0.7 ? '#22c55e' : value > 0.5 ? '#84cc16' : value > 0.3 ? '#eab308' : '#ef4444';
  return { width: `${pct}%`, color };
}

function tempColor(anomaly: number): string {
  if (anomaly > 2) return '#ef4444';
  if (anomaly > 1) return '#f97316';
  if (anomaly > 0.5) return '#eab308';
  if (anomaly < -1) return '#3b82f6';
  return '#22c55e';
}

/**
 * TreeDetailPopup — shows all sensor readings for a single tree.
 * Appears when clicking a tree crown on the CrownHealthLayer.
 *
 * Displays:
 * - LiDAR metrics: height, crown diameter, estimated DBH, volume
 * - Multispectral: NDVI, NDRE with color bars
 * - Thermal: crown temperature anomaly
 * - Composite health score with gauge
 * - Stress flag and type if detected
 */
export default function TreeDetailPopup({ tree, onClose }: TreeDetailPopupProps) {
  const health = healthLabel(tree.health_score);
  const ndvi = ndviBar(tree.ndvi);
  const ndre = ndviBar(tree.ndre);
  const estimatedDbh = Math.round(tree.height_m * 0.8 + tree.crown_diameter_m * 2);
  const estimatedVolume = (Math.PI * Math.pow(estimatedDbh / 200, 2) * tree.height_m * 0.45).toFixed(2);

  return (
    <div className="w-80 rounded-xl bg-[var(--bg2)] border border-[var(--border)] shadow-2xl overflow-hidden animate-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--green)]/10 flex items-center justify-center">
            <TreePine size={16} className="text-[var(--green)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">
              Träd #{tree.tree_number}
            </h3>
            <p className="text-xs text-[var(--text3)]">{tree.parcel_name} — {tree.species}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg3)] text-[var(--text3)]">
          <X size={14} />
        </button>
      </div>

      {/* Health score gauge */}
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[var(--text3)] uppercase tracking-wider">Hälsoindex</span>
          <span className="text-sm font-bold" style={{ color: health.color }}>
            {tree.health_score}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-[var(--bg3)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${tree.health_score}%`, backgroundColor: health.color }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs font-medium" style={{ color: health.color }}>{health.textSv}</span>
          {tree.stress_flag && (
            <span className="flex items-center gap-1 text-xs text-red-400">
              <AlertTriangle size={12} />
              {stressLabel(tree.stress_type)}
            </span>
          )}
        </div>
      </div>

      {/* Sensor readings grid */}
      <div className="px-4 py-3 space-y-3">
        {/* LiDAR section */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Ruler size={12} className="text-blue-400" />
            <span className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">LiDAR</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="px-2.5 py-2 rounded-lg bg-[var(--bg3)]">
              <div className="text-xs text-[var(--text3)]">Höjd</div>
              <div className="text-sm font-semibold text-[var(--text)]">{tree.height_m} m</div>
            </div>
            <div className="px-2.5 py-2 rounded-lg bg-[var(--bg3)]">
              <div className="text-xs text-[var(--text3)]">Krondiam.</div>
              <div className="text-sm font-semibold text-[var(--text)]">{tree.crown_diameter_m} m</div>
            </div>
            <div className="px-2.5 py-2 rounded-lg bg-[var(--bg3)]">
              <div className="text-xs text-[var(--text3)]">DBH (est.)</div>
              <div className="text-sm font-semibold text-[var(--text)]">{estimatedDbh} cm</div>
            </div>
            <div className="px-2.5 py-2 rounded-lg bg-[var(--bg3)]">
              <div className="text-xs text-[var(--text3)]">Volym (est.)</div>
              <div className="text-sm font-semibold text-[var(--text)]">{estimatedVolume} m³</div>
            </div>
          </div>
        </div>

        {/* Multispectral section */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Leaf size={12} className="text-green-400" />
            <span className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">Multispektral</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text3)] w-12">NDVI</span>
              <div className="flex-1 h-2 rounded-full bg-[var(--bg3)] overflow-hidden">
                <div className="h-full rounded-full" style={{ width: ndvi.width, backgroundColor: ndvi.color }} />
              </div>
              <span className="text-xs font-mono text-[var(--text2)] w-10 text-right">{tree.ndvi.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text3)] w-12">NDRE</span>
              <div className="flex-1 h-2 rounded-full bg-[var(--bg3)] overflow-hidden">
                <div className="h-full rounded-full" style={{ width: ndre.width, backgroundColor: ndre.color }} />
              </div>
              <span className="text-xs font-mono text-[var(--text2)] w-10 text-right">{tree.ndre.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Thermal section */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Thermometer size={12} className="text-red-400" />
            <span className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">Termisk</span>
          </div>
          <div className="flex items-center gap-3 px-2.5 py-2 rounded-lg bg-[var(--bg3)]">
            <div className="flex-1">
              <div className="text-xs text-[var(--text3)]">Temperaturavvikelse</div>
              <div className="text-sm font-semibold" style={{ color: tempColor(tree.temp_anomaly) }}>
                {tree.temp_anomaly > 0 ? '+' : ''}{tree.temp_anomaly.toFixed(1)} σ
              </div>
            </div>
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: tempColor(tree.temp_anomaly) }}
            >
              {tree.temp_anomaly > 0 ? '+' : ''}{tree.temp_anomaly.toFixed(1)}
            </div>
          </div>
          {tree.temp_anomaly > 1.5 && (
            <p className="text-xs text-red-400 mt-1 px-1">
              Förhöjd krontemperatur — kan indikera barkborreangrepp eller vattenstress
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-[var(--border)] bg-[var(--bg3)]">
        <div className="flex items-center gap-1 text-xs text-[var(--text3)]">
          <Scan size={12} />
          Multisensorfusion — 4 datakällor
        </div>
      </div>
    </div>
  );
}
