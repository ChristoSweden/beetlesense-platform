/**
 * CrossBorderAlertPage — European beetle intelligence: cross-border outbreak monitoring,
 * propagation forecasting, and preparedness planning.
 * Route: /owner/cross-border
 */

import { useState } from 'react';
import {
  Globe,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCrossBorderAlert } from '@/hooks/useCrossBorderAlert';
import { EuropeMap } from '@/components/crossborder/EuropeMap';
import { PropagationForecast } from '@/components/crossborder/PropagationForecast';
import { CountryStatus } from '@/components/crossborder/CountryStatus';
import { PreparednessChecklist } from '@/components/crossborder/PreparednessChecklist';

type Tab = 'map' | 'countries' | 'forecast' | 'preparedness';

export default function CrossBorderAlertPage() {
  const data = useCrossBorderAlert();
  const [activeTab, setActiveTab] = useState<Tab>('map');
  const [sidebarOpen, _setSidebarOpen] = useState(true);

  const tabs: { id: Tab; label: string; shortLabel: string }[] = [
    { id: 'map', label: 'Europakarta', shortLabel: 'Karta' },
    { id: 'countries', label: 'Länderstatus', shortLabel: 'Länder' },
    { id: 'forecast', label: 'Ankomstprognos', shortLabel: 'Prognos' },
    { id: 'preparedness', label: 'Beredskap', shortLabel: 'Beredskap' },
  ];

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] flex-shrink-0"
        style={{ background: 'var(--bg2)' }}
      >
        <div className="flex items-center gap-3">
          <Link
            to="/owner/dashboard"
            className="p-1.5 rounded-lg hover:bg-[var(--bg3)] transition-colors text-[var(--text3)]"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.12)' }}
            >
              <Globe size={18} className="text-red-400" />
            </div>
            <div>
              <h1 className="text-sm font-serif font-bold text-[var(--text)]">
                Europeiskt varningssystem
              </h1>
              <p className="text-[10px] text-[var(--text3)]">
                Gränsöverskridande barkborrespridning i Nordeuropa
              </p>
            </div>
          </div>
        </div>

        {/* Risk badge */}
        <div className="flex items-center gap-3">
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border"
            style={{
              background: 'rgba(239,68,68,0.08)',
              borderColor: 'rgba(239,68,68,0.25)',
            }}
          >
            <AlertTriangle size={14} className="text-red-400" />
            <div>
              <div className="text-[10px] text-red-300 uppercase font-semibold">
                Front: {data.beetleFrontDistanceKm} km
              </div>
              <div className="text-[10px] text-red-300/70">
                Ankomst: {data.estimatedArrival}
              </div>
            </div>
          </div>
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border"
            style={{
              background:
                data.overallSwedishRisk >= 75
                  ? 'rgba(239,68,68,0.12)'
                  : data.overallSwedishRisk >= 50
                    ? 'rgba(249,115,22,0.12)'
                    : 'rgba(234,179,8,0.12)',
              borderColor:
                data.overallSwedishRisk >= 75
                  ? 'rgba(239,68,68,0.3)'
                  : data.overallSwedishRisk >= 50
                    ? 'rgba(249,115,22,0.3)'
                    : 'rgba(234,179,8,0.3)',
            }}
          >
            <span
              className="text-lg font-mono font-bold"
              style={{
                color:
                  data.overallSwedishRisk >= 75
                    ? '#ef4444'
                    : data.overallSwedishRisk >= 50
                      ? '#f97316'
                      : '#eab308',
              }}
            >
              {data.overallSwedishRisk}
            </span>
            <span className="text-[10px] text-[var(--text3)]">/100 risk</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex items-center gap-1 px-4 py-2 border-b border-[var(--border)] flex-shrink-0 overflow-x-auto"
        style={{ background: 'var(--bg2)' }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/30'
                : 'text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)]'
            }`}
          >
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.shortLabel}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'map' && (
          <div className="flex h-full">
            {/* Map - takes most of the space */}
            <div className="flex-1 relative">
              <EuropeMap
                countries={data.countries}
                propagationFronts={data.propagationFronts}
                windCorridors={data.windCorridors}
                swedishRegionRisks={data.swedishRegionRisks}
                timeline={data.timeline}
                selectedYear={data.selectedYear}
                onSelectYear={data.setSelectedYear}
                className="h-full"
              />
            </div>

            {/* Side panel */}
            <div
              className={`${
                sidebarOpen ? 'w-80 xl:w-96' : 'w-0'
              } transition-all duration-300 border-l border-[var(--border)] overflow-y-auto overflow-x-hidden flex-shrink-0 hidden lg:block`}
              style={{ background: 'var(--bg2)' }}
            >
              {sidebarOpen && (
                <div className="p-4 space-y-4">
                  {/* Quick stats */}
                  <div className="grid grid-cols-2 gap-2">
                    <QuickStat
                      label="Länder drabbade"
                      value={String(data.countries.length)}
                      color="#ef4444"
                    />
                    <QuickStat
                      label="Total förlust"
                      value={`${Math.round(data.countries.reduce((s, c) => s + c.cubicMetersLost, 0) / 1000000)}M m3`}
                      color="#f97316"
                    />
                    <QuickStat
                      label="Barkborrefront"
                      value={`${data.beetleFrontDistanceKm} km`}
                      color="#eab308"
                    />
                    <QuickStat
                      label="Ankomst"
                      value={data.estimatedArrival}
                      color="#ef4444"
                    />
                  </div>

                  {/* Timeline snapshot */}
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--text)] mb-2">
                      {data.selectedYear} — {data.timeline.find((t) => t.year === data.selectedYear)?.label}
                    </h4>
                    <div className="space-y-1.5">
                      {data.timeline
                        .find((t) => t.year === data.selectedYear)
                        ?.countries.map((c) => (
                          <div
                            key={c.country}
                            className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]"
                          >
                            <span className="text-[11px] text-[var(--text)]">{c.country}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-[var(--text3)]">
                                {(c.affectedHa / 1000).toFixed(0)}k ha
                              </span>
                              <SeverityDot severity={c.severity} />
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Swedish region risks */}
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--text)] mb-2">
                      Svenska regioners risk
                    </h4>
                    <div className="space-y-1.5">
                      {data.swedishRegionRisks.map((sr) => (
                        <div
                          key={sr.region}
                          className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]"
                        >
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{
                              background:
                                sr.riskScore >= 75
                                  ? '#ef4444'
                                  : sr.riskScore >= 50
                                    ? '#f97316'
                                    : sr.riskScore >= 30
                                      ? '#eab308'
                                      : '#4ade80',
                            }}
                          />
                          <span className="text-[11px] text-[var(--text)] flex-1">{sr.region}</span>
                          <span
                            className="text-[11px] font-mono font-bold"
                            style={{
                              color:
                                sr.riskScore >= 75
                                  ? '#ef4444'
                                  : sr.riskScore >= 50
                                    ? '#f97316'
                                    : sr.riskScore >= 30
                                      ? '#eab308'
                                      : '#4ade80',
                            }}
                          >
                            {sr.riskScore}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'countries' && (
          <div className="p-4 overflow-y-auto h-full">
            <CountryStatus countries={data.countries} />
          </div>
        )}

        {activeTab === 'forecast' && (
          <div className="p-4 overflow-y-auto h-full max-w-3xl mx-auto">
            <PropagationForecast
              beetleFrontDistanceKm={data.beetleFrontDistanceKm}
              estimatedArrival={data.estimatedArrival}
              propagationSpeedKmYear={data.propagationSpeedKmYear}
              overallRisk={data.overallSwedishRisk}
              propagationFronts={data.propagationFronts}
              windCorridors={data.windCorridors}
            />
          </div>
        )}

        {activeTab === 'preparedness' && (
          <div className="p-4 overflow-y-auto h-full max-w-3xl mx-auto">
            <PreparednessChecklist items={data.preparednessChecklist} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───

function QuickStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] p-2.5" style={{ background: 'var(--bg)' }}>
      <div className="text-[10px] text-[var(--text3)]">{label}</div>
      <div className="text-sm font-mono font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function SeverityDot({ severity }: { severity: string }) {
  const color =
    severity === 'critical'
      ? '#ef4444'
      : severity === 'severe'
        ? '#f97316'
        : severity === 'moderate'
          ? '#eab308'
          : severity === 'low'
            ? '#4ade80'
            : '#6b7280';
  return <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />;
}
