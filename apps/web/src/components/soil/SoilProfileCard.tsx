import React from 'react';
import { Layers, Droplets, Mountain, TreePine, Calendar, Star } from 'lucide-react';
import { useSoilData } from '../../hooks/useSoilData';

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star key={i} size={10} fill={i < rating ? '#facc15' : 'transparent'} stroke={i < rating ? '#facc15' : 'var(--border)'} />
      ))}
    </div>
  );
}

function CapacityBar({ value, max = 10, label, color }: { value: number; max?: number; label: string; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: 'var(--text3)' }}>{label}</span>
        <span style={{ color }}>{value}/{max}</span>
      </div>
      <div className="h-2 rounded-full" style={{ background: 'var(--border)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${(value / max) * 100}%`, background: color }} />
      </div>
    </div>
  );
}

export default function SoilProfileCard() {
  const { soilProfile, soilMap, groundWater, speciesRecommendations, harvestAccessibility, growthPotential: _growthPotential, loading } = useSoilData();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: 'var(--green)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!soilProfile) return null;

  const moistureColors: Record<string, string> = { torr: '#DAA520', frisk: '#4ade80', fuktig: '#60a5fa', blöt: '#818cf8' };
  const moistureLabels: Record<string, string> = { torr: 'Torr', frisk: 'Frisk', fuktig: 'Fuktig', blöt: 'Blöt' };

  return (
    <div className="space-y-4">
      {/* Soil profile visual */}
      <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Layers size={18} style={{ color: soilProfile.color }} />
          <span className="font-semibold" style={{ color: 'var(--text)' }}>Markprofil</span>
        </div>

        <div className="flex gap-4">
          {/* Visual soil column */}
          <div className="w-20 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <div className="h-6 flex items-center justify-center text-xs" style={{ background: '#2d5a1e', color: '#a3e635' }}>
              Humus
            </div>
            <div className="h-24 flex items-center justify-center text-xs font-medium" style={{ background: soilProfile.color, color: 'white' }}>
              {soilProfile.typeSv.split(' ')[0]}
            </div>
            <div className="h-8 flex items-center justify-center text-xs" style={{ background: '#555', color: '#aaa' }}>
              {soilProfile.depth_m}m
            </div>
          </div>

          {/* Properties */}
          <div className="flex-1 space-y-3">
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>{soilProfile.typeSv}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text3)' }}>{soilProfile.description}</div>
            </div>

            <div className="flex items-center gap-2">
              <Droplets size={12} style={{ color: moistureColors[soilProfile.moisture_class] }} />
              <span className="text-xs px-2 py-0.5 rounded-full" style={{
                background: `${moistureColors[soilProfile.moisture_class]}20`,
                color: moistureColors[soilProfile.moisture_class],
              }}>
                {moistureLabels[soilProfile.moisture_class]}
              </span>
            </div>

            <CapacityBar value={soilProfile.bearing_capacity} label="Bärighet" color={soilProfile.bearing_capacity >= 6 ? '#4ade80' : soilProfile.bearing_capacity >= 4 ? '#facc15' : '#ef4444'} />
            <CapacityBar value={soilProfile.growth_potential} label="Tillväxtpotential" color={soilProfile.growth_potential >= 6 ? '#4ade80' : soilProfile.growth_potential >= 4 ? '#facc15' : '#ef4444'} />
          </div>
        </div>
      </div>

      {/* Species suitability */}
      <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <TreePine size={16} style={{ color: 'var(--green)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Artlämplighet</span>
        </div>
        <div className="space-y-2">
          {speciesRecommendations.map(s => (
            <div key={s.species} className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'rgba(4,28,8,0.5)' }}>
              <div>
                <div className="text-xs font-medium" style={{ color: 'var(--text2)' }}>{s.speciesSv}</div>
                <div className="text-xs italic" style={{ color: 'var(--text3)' }}>{s.species}</div>
              </div>
              <div className="text-right">
                <StarRating rating={s.rating} />
                <div className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>{s.notes}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Harvest accessibility calendar */}
      <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={16} style={{ color: 'var(--green)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Avverkningskalender</span>
        </div>
        <div className="grid grid-cols-6 gap-1">
          {harvestAccessibility.map(m => (
            <div key={m.month} className="text-center p-1.5 rounded-lg" style={{
              background: m.accessible ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${m.accessible ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)'}`,
            }}>
              <div className="text-xs font-medium" style={{ color: m.accessible ? '#4ade80' : '#ef4444' }}>{m.month}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>{m.accessible ? '✓' : '✗'}</div>
            </div>
          ))}
        </div>
        <div className="mt-2 text-xs" style={{ color: 'var(--text3)' }}>
          Baserat på {soilProfile.typeSv.toLowerCase()} med bärighet {soilProfile.bearing_capacity}/10
        </div>
      </div>

      {/* Ground water */}
      {groundWater && (
        <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Mountain size={16} style={{ color: '#60a5fa' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Grundvatten</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-lg font-bold" style={{ color: 'var(--text)' }}>{groundWater.depth_m}m</div>
              <div className="text-xs" style={{ color: 'var(--text3)' }}>Nuvarande djup</div>
            </div>
            <div>
              <div className="text-lg font-bold" style={{ color: 'var(--text)' }}>
                {groundWater.seasonal_range[0]}–{groundWater.seasonal_range[1]}m
              </div>
              <div className="text-xs" style={{ color: 'var(--text3)' }}>Säsongsvariation</div>
            </div>
            <div>
              <div className="text-sm font-medium" style={{
                color: groundWater.trend === 'rising' ? '#60a5fa' : groundWater.trend === 'falling' ? '#f97316' : '#4ade80',
              }}>
                {groundWater.trend === 'rising' ? '↑ Stigande' : groundWater.trend === 'falling' ? '↓ Sjunkande' : '→ Stabil'}
              </div>
              <div className="text-xs" style={{ color: 'var(--text3)' }}>Trend</div>
            </div>
          </div>
        </div>
      )}

      {/* Soil distribution */}
      {soilMap && (
        <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="text-sm font-medium mb-3" style={{ color: 'var(--text)' }}>Markfördelning</div>
          <div className="flex rounded-full overflow-hidden h-3 mb-2">
            {soilMap.features.map(f => (
              <div key={f.type} style={{ width: `${f.area_pct}%`, background: f.color }} title={`${f.typeSv}: ${f.area_pct}%`} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1">
            {soilMap.features.map(f => (
              <div key={f.type} className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 rounded-full" style={{ background: f.color }} />
                <span style={{ color: 'var(--text3)' }}>{f.typeSv} {f.area_pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
