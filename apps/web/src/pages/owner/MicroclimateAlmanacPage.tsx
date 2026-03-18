import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Thermometer,
  PanelLeftClose,
  PanelLeftOpen,
  MapPin,
  Mountain,
  Calendar,
  Snowflake,
  Sun,
} from 'lucide-react';
import { MonthCard } from '@/components/microclimate/MonthCard';
import { GrowingSeasonChart } from '@/components/microclimate/GrowingSeasonChart';
import { FrostMap } from '@/components/microclimate/FrostMap';
import { SoilTemperature } from '@/components/microclimate/SoilTemperature';
import { PhenologyTimeline } from '@/components/microclimate/PhenologyTimeline';
import {
  getParcelClimate,
  getAvailableParcels,
  getCurrentMonthIndex,
  getGrowingSeasonProgress,
} from '@/services/microclimateService';

export default function MicroclimateAlmanacPage() {
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedParcelId, setSelectedParcelId] = useState('p1');

  const parcels = getAvailableParcels();
  const climate = useMemo(() => getParcelClimate(selectedParcelId), [selectedParcelId]);
  const currentMonthIdx = getCurrentMonthIndex();
  const currentMonth = climate.months[currentMonthIdx];
  const progress = getGrowingSeasonProgress(climate);

  // Growing season start/end as month numbers
  const gsStartMonth = parseInt(climate.growingSeason.startDate.split('/')[0], 10);
  const gsEndMonth = parseInt(climate.growingSeason.endDate.split('/')[0], 10);

  return (
    <div className="flex h-full relative">
      {/* Left sidebar */}
      <div
        className={`absolute top-0 left-0 bottom-0 z-20 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } w-80 xl:w-[28rem] border-r border-[var(--border)] overflow-y-auto`}
        style={{ background: 'var(--bg2)' }}
      >
        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Thermometer size={18} className="text-[var(--green)]" />
              <h1 className="text-lg font-serif font-bold text-[var(--text)]">
                {t('microclimate.page.title')}
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
            {t('microclimate.page.subtitle')}
          </p>

          {/* Parcel selector */}
          <div className="mb-5">
            <label className="text-[10px] font-semibold text-[var(--text2)] uppercase tracking-wider block mb-1.5">
              {t('microclimate.selectParcel')}
            </label>
            <select
              value={selectedParcelId}
              onChange={(e) => setSelectedParcelId(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] px-3 py-2 focus:outline-none focus:border-[var(--green)]"
            >
              {parcels.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.elevation}m)
                </option>
              ))}
            </select>
          </div>

          {/* Current conditions highlight */}
          <div className="rounded-xl border border-[var(--green)]/30 p-4 mb-5 bg-[var(--green)]/5">
            <div className="flex items-center gap-2 mb-3">
              <Sun size={16} className="text-[var(--green)]" />
              <h2 className="text-sm font-semibold text-[var(--text)]">
                {t('microclimate.currentConditions')}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <p className="text-[10px] text-[var(--text3)]">{t('microclimate.avgTemp')}</p>
                <p className="text-2xl font-mono font-bold text-[var(--text)]">{currentMonth.adjustedAvgTemp}°C</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text3)]">{t('microclimate.soilTemp')}</p>
                <p className="text-2xl font-mono font-bold text-[#a78bfa]">{currentMonth.soilTemp10cm}°C</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg p-2 bg-[var(--bg)]/60">
                <p className="text-[10px] text-[var(--text3)]">{t('microclimate.precip')}</p>
                <p className="text-xs font-mono font-semibold text-[var(--text)]">{currentMonth.precipitation} mm</p>
              </div>
              <div className="rounded-lg p-2 bg-[var(--bg)]/60">
                <p className="text-[10px] text-[var(--text3)]">{t('microclimate.daylight')}</p>
                <p className="text-xs font-mono font-semibold text-[var(--text)]">{currentMonth.daylightHours}h</p>
              </div>
              <div className="rounded-lg p-2 bg-[var(--bg)]/60">
                <p className="text-[10px] text-[var(--text3)]">{t('microclimate.gdd')}</p>
                <p className="text-xs font-mono font-semibold text-[var(--green)]">{currentMonth.gddAccumulated}</p>
              </div>
            </div>
          </div>

          {/* Parcel info */}
          <div className="rounded-xl border border-[var(--border)] p-4 mb-5" style={{ background: 'var(--bg)' }}>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin size={12} className="text-[var(--text3)]" />
                <span className="text-xs text-[var(--text2)]">{climate.countyName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mountain size={12} className="text-[var(--text3)]" />
                <span className="text-xs text-[var(--text2)]">{climate.elevation}m {t('microclimate.elevation')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={12} className="text-[var(--text3)]" />
                <span className="text-xs text-[var(--text2)]">
                  {t('microclimate.growingSeason')}: {climate.growingSeason.lengthDays} {t('microclimate.widget.days')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Snowflake size={12} className="text-[var(--text3)]" />
                <span className="text-xs text-[var(--text2)]">
                  {t('microclimate.lastSpringFrost')}: {climate.growingSeason.lastSpringFrost}
                </span>
              </div>
            </div>
          </div>

          {/* Growing season progress */}
          <div className="rounded-xl border border-[var(--border)] p-4 mb-5" style={{ background: 'var(--bg)' }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
                {t('microclimate.growingSeasonProgress')}
              </h3>
              <span className="text-xs font-mono text-[var(--green)]">
                {progress.percent}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-[var(--bg3)] overflow-hidden mb-2">
              <div
                className="h-full rounded-full bg-[var(--green)] transition-all"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[var(--text3)]">
              <span>{climate.growingSeason.startDate}</span>
              <span>{progress.elapsed} / {progress.total} {t('microclimate.widget.days')}</span>
              <span>{climate.growingSeason.endDate}</span>
            </div>
          </div>

          {/* Growing season chart */}
          <div className="mb-5">
            <GrowingSeasonChart
              months={climate.months}
              countyAverage={climate.countyAverageMonths}
              growingSeasonStart={gsStartMonth}
              growingSeasonEnd={gsEndMonth}
            />
          </div>

          {/* Soil temperature chart */}
          <div className="mb-5">
            <SoilTemperature months={climate.months} soilType={climate.soilType} />
          </div>

          {/* Phenology timeline */}
          <div className="mb-5">
            <PhenologyTimeline events={climate.phenology} />
          </div>

          {/* Frost pocket map */}
          <div className="mb-5">
            <FrostMap parcelId={selectedParcelId} frostPockets={climate.frostPockets} />
          </div>

          {/* Monthly almanac cards */}
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-[var(--text)] mb-3">
              {t('microclimate.monthlyAlmanac')}
            </h2>
            <div className="space-y-3">
              {climate.months.map((month) => (
                <MonthCard
                  key={month.month}
                  data={month}
                  isCurrentMonth={month.month === currentMonthIdx + 1}
                />
              ))}
            </div>
          </div>

          {/* Annual summary */}
          <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg)' }}>
            <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-3">
              {t('microclimate.annualSummary')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-[var(--text3)]">{t('microclimate.annualMean')}</p>
                <p className="text-lg font-mono font-bold text-[var(--text)]">
                  {(climate.months.reduce((s, m) => s + m.adjustedAvgTemp, 0) / 12).toFixed(1)}°C
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text3)]">{t('microclimate.totalGDD')}</p>
                <p className="text-lg font-mono font-bold text-[var(--green)]">
                  {climate.growingSeason.totalGDD}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text3)]">{t('microclimate.totalPrecip')}</p>
                <p className="text-lg font-mono font-bold text-[var(--text)]">
                  {climate.months.reduce((s, m) => s + m.precipitation, 0)} mm
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text3)]">{t('microclimate.totalFrostDays')}</p>
                <p className="text-lg font-mono font-bold text-[#60a5fa]">
                  {climate.months.reduce((s, m) => s + m.frostDays, 0)} d
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main area — frost map in full view */}
      <div className="flex-1 relative">
        {/* Placeholder for full-screen background or second map panel */}
        <div className="flex items-center justify-center h-full bg-[var(--bg)]">
          <div className="text-center max-w-md px-8">
            <Thermometer size={48} className="text-[var(--green)]/30 mx-auto mb-4" />
            <h2 className="text-lg font-serif font-bold text-[var(--text)] mb-2">
              {t('microclimate.page.mapPlaceholder')}
            </h2>
            <p className="text-xs text-[var(--text3)]">
              {t('microclimate.page.mapPlaceholderDesc')}
            </p>
          </div>
        </div>

        {/* Sidebar open button (when closed) */}
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
