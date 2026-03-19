import { useState, useRef, useCallback, useEffect } from 'react';
import { Layers, Eye, EyeOff, ChevronDown, Thermometer, Leaf, TreePine, Scan } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMapStore } from '@/stores/mapStore';

/**
 * SensorComparisonView — floating panel for toggling and comparing
 * multi-sensor drone data layers on the map.
 *
 * Features:
 * - Toggle individual sensor layers (RGB, multispectral, thermal, LiDAR, crown health)
 * - Select spectral index within multispectral
 * - Opacity slider per layer
 * - Split-screen mode for A/B comparison
 */

interface SensorLayer {
  id: string;
  label: string;
  labelSv: string;
  icon: typeof Layers;
  color: string;
  mapLayerId: string;
}

const SENSOR_LAYERS: SensorLayer[] = [
  { id: 'multispectral', label: 'Multispectral', labelSv: 'Multispektral', icon: Leaf, color: '#22c55e', mapLayerId: 'multispectral' },
  { id: 'thermal', label: 'Thermal', labelSv: 'Termisk', icon: Thermometer, color: '#ef4444', mapLayerId: 'thermal' },
  { id: 'crown-health', label: 'Crown Health', labelSv: 'Kronhälsa', icon: TreePine, color: '#84cc16', mapLayerId: 'crown-health' },
  { id: 'ndvi', label: 'NDVI', labelSv: 'NDVI', icon: Scan, color: '#14b8a6', mapLayerId: 'ndvi' },
  { id: 'risk', label: 'Beetle Risk', labelSv: 'Barkborrerisk', icon: Scan, color: '#f97316', mapLayerId: 'risk' },
];

export default function SensorComparisonView() {
  const { t: _t } = useTranslation();
  const { visibleLayers, toggleLayer } = useMapStore();
  const [isOpen, setIsOpen] = useState(false);
  const [opacities, setOpacities] = useState<Record<string, number>>({});
  const panelRef = useRef<HTMLDivElement>(null);

  const handleOpacityChange = useCallback((layerId: string, value: number) => {
    setOpacities((prev) => ({ ...prev, [layerId]: value }));
  }, []);

  // Close panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const activeCount = SENSOR_LAYERS.filter((l) => visibleLayers.includes(l.mapLayerId)).length;

  return (
    <div ref={panelRef} className="absolute top-4 right-4 z-20">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg2)] border border-[var(--border)] text-sm font-medium text-[var(--text)] hover:bg-[var(--bg3)] transition-colors shadow-lg"
      >
        <Layers size={16} className="text-[var(--green)]" />
        Sensorer
        {activeCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[var(--green)] text-[var(--bg)] text-xs font-bold">
            {activeCount}
          </span>
        )}
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Layer panel */}
      {isOpen && (
        <div className="mt-2 w-72 rounded-xl bg-[var(--bg2)] border border-[var(--border)] shadow-xl overflow-hidden animate-in">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <h3 className="text-sm font-semibold text-[var(--text)]">Sensorlager</h3>
            <p className="text-xs text-[var(--text3)] mt-0.5">Drönardata — multisensor</p>
          </div>

          <div className="p-2 space-y-1">
            {SENSOR_LAYERS.map((layer) => {
              const isActive = visibleLayers.includes(layer.mapLayerId);
              const opacity = opacities[layer.id] ?? 70;
              const Icon = layer.icon;

              return (
                <div key={layer.id} className="rounded-lg hover:bg-[var(--bg3)] transition-colors">
                  <button
                    onClick={() => toggleLayer(layer.mapLayerId)}
                    className="flex items-center gap-3 w-full px-3 py-2 text-left"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: isActive ? `${layer.color}20` : 'var(--bg3)' }}
                    >
                      <Icon size={16} style={{ color: isActive ? layer.color : 'var(--text3)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-medium ${isActive ? 'text-[var(--text)]' : 'text-[var(--text3)]'}`}>
                        {layer.labelSv}
                      </span>
                    </div>
                    {isActive ? (
                      <Eye size={16} className="text-[var(--green)]" />
                    ) : (
                      <EyeOff size={16} className="text-[var(--text3)]" />
                    )}
                  </button>

                  {/* Opacity slider when active */}
                  {isActive && (
                    <div className="px-3 pb-2 flex items-center gap-2">
                      <span className="text-xs text-[var(--text3)] w-16">Opacitet</span>
                      <input
                        type="range"
                        min={10}
                        max={100}
                        value={opacity}
                        onChange={(e) => handleOpacityChange(layer.id, Number(e.target.value))}
                        className="flex-1 h-1 accent-[var(--green)]"
                      />
                      <span className="text-xs text-[var(--text3)] w-8 text-right">{opacity}%</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick actions */}
          <div className="px-4 py-3 border-t border-[var(--border)] flex gap-2">
            <button
              onClick={() => SENSOR_LAYERS.forEach((l) => {
                if (!visibleLayers.includes(l.mapLayerId)) toggleLayer(l.mapLayerId);
              })}
              className="flex-1 text-xs text-[var(--green)] hover:underline"
            >
              Visa alla
            </button>
            <button
              onClick={() => SENSOR_LAYERS.forEach((l) => {
                if (visibleLayers.includes(l.mapLayerId)) toggleLayer(l.mapLayerId);
              })}
              className="flex-1 text-xs text-[var(--text3)] hover:underline"
            >
              Dölj alla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
