import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { BaseMap } from '@/components/map/BaseMap';
import { RiskMap } from '@/components/storm/RiskMap';
import { RiskBreakdown } from '@/components/storm/RiskBreakdown';
import { WindForecast } from '@/components/storm/WindForecast';
import { StormHistory } from '@/components/storm/StormHistory';
import { MitigationPlan } from '@/components/storm/MitigationPlan';
import {
  PanelLeftClose,
  PanelLeftOpen,
  Wind,
} from 'lucide-react';
import {
  getStandRiskData,
  getOverallPropertyRisk,
  getRiskColor,
  type StandRiskResult,
} from '@/services/stormRiskService';
import type maplibregl from 'maplibre-gl';

export default function StormRiskPage() {
  const { t } = useTranslation();
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedStand, setSelectedStand] = useState<StandRiskResult | null>(null);

  const stands = getStandRiskData();
  const overall = getOverallPropertyRisk(stands);
  const overallColor = getRiskColor(overall.classification);

  const handleMapReady = useCallback((m: maplibregl.Map) => {
    setMap(m);
  }, []);

  const handleStandClick = useCallback((stand: StandRiskResult) => {
    setSelectedStand(stand);
    setSidebarOpen(true);
  }, []);

  return (
    <div className="flex h-full relative">
      {/* Left sidebar */}
      <div
        className={`absolute top-0 left-0 bottom-0 z-20 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } w-80 xl:w-96 border-r border-[var(--border)] overflow-y-auto`}
        style={{ background: 'var(--bg2)' }}
      >
        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Wind size={18} className="text-[var(--text2)]" />
              <h1 className="text-lg font-serif font-bold text-[var(--text)]">
                {t('storm.page.title')}
              </h1>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:flex hidden items-center justify-center w-7 h-7 rounded-lg hover:bg-[var(--bg3)] transition-colors"
              aria-label="Close sidebar"
            >
              <PanelLeftClose size={16} className="text-[var(--text3)]" />
            </button>
          </div>
          <p className="text-xs text-[var(--text3)] mb-5">
            {t('storm.page.subtitle')}
          </p>

          {/* Overall risk score */}
          <div className="rounded-xl border border-[var(--border)] p-4 mb-5" style={{ background: 'var(--bg)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider">
                  {t('storm.page.overallRisk')}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="text-3xl font-bold font-mono"
                    style={{ color: overallColor }}
                  >
                    {overall.score}
                  </span>
                  <span
                    className="text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase"
                    style={{ color: overallColor, background: `${overallColor}15` }}
                  >
                    {t(`storm.risk.${overall.classification}`)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-[var(--text3)]">{t('storm.page.standsAssessed')}</p>
                <p className="text-sm font-mono font-semibold text-[var(--text)]">{stands.length}</p>
              </div>
            </div>
          </div>

          {/* Stand risk list */}
          <div className="mb-5">
            <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-2">
              {t('storm.page.standRiskScores')}
            </p>
            <div className="space-y-1.5">
              {stands
                .sort((a, b) => b.overallScore - a.overallScore)
                .map((stand) => {
                  const color = getRiskColor(stand.classification);
                  const isSelected = selectedStand?.standId === stand.standId;
                  return (
                    <button
                      key={stand.standId}
                      onClick={() => setSelectedStand(stand)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-colors ${
                        isSelected
                          ? 'border-[var(--green)] bg-[var(--green)]/5'
                          : 'border-[var(--border)] bg-[var(--bg)] hover:border-[var(--border2)]'
                      }`}
                    >
                      <div
                        className="w-2 h-8 rounded-full flex-shrink-0"
                        style={{ background: color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--text)] truncate">
                          {stand.standName}
                        </p>
                        <p className="text-[10px] text-[var(--text3)]">{stand.parcelName}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="text-sm font-bold font-mono" style={{ color }}>
                          {stand.overallScore}
                        </span>
                        <p className="text-[9px] uppercase" style={{ color }}>
                          {t(`storm.risk.${stand.classification}`)}
                        </p>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Selected stand breakdown */}
          {selectedStand && (
            <div className="mb-5">
              <RiskBreakdown
                stand={selectedStand}
                onClose={() => setSelectedStand(null)}
              />
            </div>
          )}

          {/* Wind forecast */}
          <div className="mb-5">
            <WindForecast />
          </div>

          {/* Mitigation plan */}
          <div className="mb-5">
            <MitigationPlan stands={stands} />
          </div>

          {/* Storm history */}
          <div className="mb-5">
            <StormHistory />
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <BaseMap onMapReady={handleMapReady}>
          {map && (
            <RiskMap map={map} onStandClick={handleStandClick} />
          )}
        </BaseMap>

        {/* Sidebar toggle when closed */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 left-4 z-10 p-2 rounded-lg border border-[var(--border)] text-[var(--text2)] hover:text-[var(--green)] hover:bg-[var(--bg3)] transition-colors"
            style={{ background: 'var(--surface)' }}
            aria-label="Open sidebar"
          >
            <PanelLeftOpen size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
