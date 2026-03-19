/**
 * DataExportPage — "Dina data, din kontroll"
 *
 * Full data export hub: category selection with format pickers,
 * one-click full backup, export history, import wizard, and
 * data portability trust messaging. Premium feel, no lock-in.
 */

import { useState, useCallback } from 'react';
import {
  Download,
  Shield,
  Upload,
  Clock,
  Package,
  ArrowDownToLine,
  Scan,
  Check,
  Loader2,
} from 'lucide-react';
import { useDataExport, formatFileSize } from '@/hooks/useDataExport';
import { useSensorProducts } from '@/hooks/useSensorProducts';
import type { SensorType } from '@/hooks/useSensorProducts';
import { ExportCategoryCard } from '@/components/export/ExportCategoryCard';
import { ExportProgress } from '@/components/export/ExportProgress';
import { DataPortabilityInfo } from '@/components/export/DataPortabilityInfo';
import { ImportWizard } from '@/components/export/ImportWizard';
import { ArcGISExportButton } from '@/components/export/ArcGISExportButton';

// ─── Tab type ───

type Tab = 'export' | 'import' | 'portability';

export default function DataExportPage() {
  const {
    categories,
    selectedCategories,
    totalSelectedSize,
    toggleCategory,
    selectAll,
    deselectAll,
    setCategoryFormat,
    setCategoryDateRange,
    exportJob,
    startExport,
    cancelExport,
    dismissExport,
    history,
  } = useDataExport();

  const [activeTab, setActiveTab] = useState<Tab>('export');
  const [importOpen, setImportOpen] = useState(false);

  // ─── Sensor products state ───
  const {
    bySensorType,
    fusionProducts,
    loading: sensorLoading,
    getDownloadUrl,
  } = useSensorProducts({});

  type SensorProductTypeKey = SensorType | 'fusion';
  const [selectedSensorTypes, setSelectedSensorTypes] = useState<Set<SensorProductTypeKey>>(new Set());
  const [sensorExportFormat, setSensorExportFormat] = useState<'geotiff' | 'geojson' | 'csv'>('geotiff');
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null);

  const SENSOR_PRODUCT_TYPES: { key: SensorProductTypeKey; label: string; description: string; count: number }[] = [
    { key: 'multispectral', label: 'Multispektral', description: 'NDVI, NDRE, EVI, klorofyllindex', count: bySensorType.multispectral.length },
    { key: 'thermal', label: 'Termisk', description: 'Temperaturkartor och anomalier', count: bySensorType.thermal.length },
    { key: 'rgb', label: 'RGB', description: 'Ortomosaik och ytmodeller', count: bySensorType.rgb.length },
    { key: 'lidar', label: 'LiDAR', description: 'Kronhöjdsmodell, DTM, punktmoln', count: bySensorType.lidar.length },
    { key: 'fusion', label: 'Fusionprodukter', description: 'Barkborre-stress, kronhälsa, fuktstress', count: fusionProducts.length },
  ];

  const toggleSensorType = useCallback((key: SensorProductTypeKey) => {
    setSelectedSensorTypes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleSensorDownload = useCallback(async (storagePath: string) => {
    setDownloadingPath(storagePath);
    try {
      const url = await getDownloadUrl(storagePath);
      if (url) {
        window.open(url, '_blank');
      }
    } finally {
      setDownloadingPath(null);
    }
  }, [getDownloadUrl]);

  const allSelected = categories.every((c) => c.selected);
  const _noneSelected = selectedCategories.length === 0;

  // ─── Render ───

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8" style={{ background: 'var(--bg)' }}>
      <div className="mx-auto max-w-4xl space-y-6">

        {/* ═══ Hero header ═══ */}
        <div className="relative rounded-2xl border border-[var(--green)]/20 bg-gradient-to-br from-[var(--green)]/8 via-[var(--bg2)] to-[var(--bg2)] p-6 overflow-hidden">
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(var(--green) 1px, transparent 1px), linear-gradient(90deg, var(--green) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }} />

          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-xl bg-[var(--green)]/15 border border-[var(--green)]/20 flex items-center justify-center">
                <Shield size={22} className="text-[var(--green)]" />
              </div>
              <div>
                <h1 className="text-xl font-serif font-bold text-[var(--text)]">
                  Dina data, din kontroll
                </h1>
                <p className="text-xs text-[var(--text3)]">
                  Full dataportabilitet — ingen inlasning, alla format, nar som helst
                </p>
              </div>
            </div>
            <p className="text-xs text-[var(--text2)] mt-3 max-w-xl leading-relaxed">
              Exportera all din skogsdata i oppna standardformat. Importera fran pcSKOG, Excel eller
              Shapefile. Dina data tillhor dig — vi gor det enkelt att ta med dem vart du vill.
            </p>
          </div>
        </div>

        {/* ═══ Tab bar ═══ */}
        <div className="flex items-center gap-1 border-b border-[var(--border)] pb-px">
          {[
            { id: 'export' as Tab, label: 'Exportera', icon: Download },
            { id: 'import' as Tab, label: 'Importera', icon: Upload },
            { id: 'portability' as Tab, label: 'Dataportabilitet', icon: Shield },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${
                activeTab === id
                  ? 'text-[var(--green)] border-[var(--green)] bg-[var(--green)]/5'
                  : 'text-[var(--text3)] border-transparent hover:text-[var(--text2)] hover:bg-[var(--bg3)]'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* ═══ EXPORT TAB ═══ */}
        {activeTab === 'export' && (
          <div className="space-y-6">

            {/* One-click full backup */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--green)]/10 flex items-center justify-center">
                    <ArrowDownToLine size={20} className="text-[var(--green)]" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--text)]">Exportera allt</h2>
                    <p className="text-[11px] text-[var(--text3)]">
                      En komplett sakerhets kopia av alla dina data — {formatFileSize(
                        categories.reduce((sum, c) => sum + c.estimatedSizeBytes, 0),
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    selectAll();
                    // Small delay to let state update, then start
                    setTimeout(() => startExport('Fullstandig sakerhets kopia'), 100);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--green)] text-white hover:brightness-110 transition-all shadow-lg shadow-[var(--green)]/20"
                >
                  <Download size={14} />
                  Exportera allt
                </button>
              </div>
            </div>

            {/* ArcGIS Online export */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Scan size={20} className="text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--text)]">ArcGIS Online</h2>
                    <p className="text-[11px] text-[var(--text3)]">
                      Exportera direkt till ArcGIS Map Viewer
                    </p>
                  </div>
                </div>
                <ArcGISExportButton
                  exportType="parcel"
                  resourceId="all"
                />
              </div>
            </div>

            {/* Select/deselect controls */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--text)]">Valj kategorier</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={allSelected ? deselectAll : selectAll}
                  className="text-[11px] text-[var(--green)] hover:text-[var(--green)]/80 transition-colors"
                >
                  {allSelected ? 'Avmarkera alla' : 'Markera alla'}
                </button>
                {selectedCategories.length > 0 && (
                  <span className="text-[10px] text-[var(--text3)] bg-[var(--bg3)] px-2 py-0.5 rounded-full font-mono">
                    {selectedCategories.length} valda &middot; {formatFileSize(totalSelectedSize)}
                  </span>
                )}
              </div>
            </div>

            {/* Category cards */}
            <div className="space-y-3">
              {categories.map((cat) => (
                <ExportCategoryCard
                  key={cat.id}
                  category={cat}
                  onToggle={toggleCategory}
                  onFormatChange={setCategoryFormat}
                  onDateChange={setCategoryDateRange}
                />
              ))}
            </div>

            {/* ═══ Sensor products detail panel ═══ */}
            {categories.find((c) => c.id === 'sensor_products')?.selected && (
              <div className="rounded-xl border border-[var(--green)]/20 bg-[var(--surface)] overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b border-[var(--border)]">
                  <div className="w-9 h-9 rounded-lg bg-[var(--green)]/15 flex items-center justify-center">
                    <Scan size={18} className="text-[var(--green)]" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-[var(--text)]">Sensorprodukter — välj produkttyper</h3>
                    <p className="text-[11px] text-[var(--text3)]">Välj vilka sensordata du vill exportera</p>
                  </div>
                  {sensorLoading && (
                    <Loader2 size={16} className="text-[var(--green)] animate-spin" />
                  )}
                </div>

                {/* Product type checkboxes */}
                <div className="p-4 space-y-2">
                  {SENSOR_PRODUCT_TYPES.map(({ key, label, description, count }) => (
                    <button
                      key={key}
                      onClick={() => toggleSensorType(key)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left ${
                        selectedSensorTypes.has(key)
                          ? 'border-[var(--green)]/40 bg-[var(--green)]/5'
                          : 'border-[var(--border)] bg-[var(--bg2)] hover:border-[var(--border2)]'
                      }`}
                    >
                      {/* Checkbox */}
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border flex-shrink-0 ${
                          selectedSensorTypes.has(key)
                            ? 'border-[var(--green)] bg-[var(--green)]'
                            : 'border-[var(--border2)] bg-transparent'
                        }`}
                      >
                        {selectedSensorTypes.has(key) && <Check size={10} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-[var(--text)]">{label}</span>
                        <p className="text-[10px] text-[var(--text3)]">{description}</p>
                      </div>
                      <span className="text-[10px] font-mono text-[var(--text3)] flex-shrink-0">
                        {count} {count === 1 ? 'produkt' : 'produkter'}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Export format selector */}
                <div className="px-4 pb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[11px] font-medium text-[var(--text3)] w-20 flex-shrink-0">Exportformat:</span>
                    <div className="flex gap-1.5">
                      {([
                        { value: 'geotiff' as const, label: 'GeoTIFF', desc: 'Original raster' },
                        { value: 'geojson' as const, label: 'GeoJSON', desc: 'Vektorprodukter' },
                        { value: 'csv' as const, label: 'CSV', desc: 'Enbart metadata' },
                      ]).map((fmt) => (
                        <button
                          key={fmt.value}
                          onClick={() => setSensorExportFormat(fmt.value)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-colors ${
                            sensorExportFormat === fmt.value
                              ? 'border-[var(--green)]/40 bg-[var(--green)]/10 text-[var(--green)]'
                              : 'border-[var(--border)] bg-[var(--bg2)] text-[var(--text3)] hover:text-[var(--text2)]'
                          }`}
                          title={fmt.desc}
                        >
                          {fmt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Individual product download list */}
                {selectedSensorTypes.size > 0 && (
                  <div className="border-t border-[var(--border)]">
                    <div className="p-4">
                      <p className="text-[11px] font-medium text-[var(--text3)] mb-2">Tillgängliga filer för nedladdning:</p>
                      <div className="space-y-1.5 max-h-60 overflow-y-auto">
                        {/* Sensor products */}
                        {(['multispectral', 'thermal', 'rgb', 'lidar'] as SensorType[])
                          .filter((st) => selectedSensorTypes.has(st))
                          .flatMap((st) => bySensorType[st])
                          .map((product) => (
                            <div
                              key={product.id}
                              className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--bg2)] border border-[var(--border)]"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-medium text-[var(--text)]">
                                  {product.product_name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                                </span>
                                <p className="text-[10px] text-[var(--text3)] truncate">
                                  {product.sensor_type} &middot; {product.storage_path.split('/').pop()}
                                </p>
                              </div>
                              <button
                                onClick={() => handleSensorDownload(product.storage_path)}
                                disabled={downloadingPath === product.storage_path}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium text-[var(--green)] hover:bg-[var(--green)]/10 transition-colors disabled:opacity-50"
                              >
                                {downloadingPath === product.storage_path ? (
                                  <Loader2 size={11} className="animate-spin" />
                                ) : (
                                  <Download size={11} />
                                )}
                                Ladda ner
                              </button>
                            </div>
                          ))}
                        {/* Fusion products */}
                        {selectedSensorTypes.has('fusion') &&
                          fusionProducts.map((product) => (
                            <div
                              key={product.id}
                              className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--bg2)] border border-[var(--green)]/10"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-medium text-[var(--text)]">
                                  {product.product_name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                                </span>
                                <p className="text-[10px] text-[var(--text3)] truncate">
                                  fusion &middot; {product.sensors_used.join(' + ')} &middot; {product.storage_path.split('/').pop()}
                                </p>
                              </div>
                              <button
                                onClick={() => handleSensorDownload(product.storage_path)}
                                disabled={downloadingPath === product.storage_path}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium text-[var(--green)] hover:bg-[var(--green)]/10 transition-colors disabled:opacity-50"
                              >
                                {downloadingPath === product.storage_path ? (
                                  <Loader2 size={11} className="animate-spin" />
                                ) : (
                                  <Download size={11} />
                                )}
                                Ladda ner
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Export selected button */}
            {selectedCategories.length > 0 && (
              <div className="sticky bottom-4 z-10">
                <div className="rounded-xl border border-[var(--green)]/30 bg-[var(--bg)]/95 backdrop-blur-sm p-4 shadow-2xl shadow-black/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-[var(--text)]">
                        {selectedCategories.length} {selectedCategories.length === 1 ? 'kategori' : 'kategorier'} valda
                      </p>
                      <p className="text-[10px] text-[var(--text3)] mt-0.5">
                        Totalt: {formatFileSize(totalSelectedSize)} &middot;{' '}
                        Format: {[...new Set(selectedCategories.map((c) => {
                          const labels: Record<string, string> = {
                            geojson: 'GeoJSON', shapefile: 'Shapefile', geopackage: 'GeoPackage',
                            csv: 'CSV', excel: 'Excel', json: 'JSON', pdf: 'PDF', original: 'Original',
                            geotiff: 'GeoTIFF',
                          };
                          return labels[c.selectedFormat] ?? c.selectedFormat;
                        }))].join(', ')}
                      </p>
                    </div>
                    <button
                      onClick={() => startExport()}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-[var(--green)] text-white hover:brightness-110 transition-all shadow-lg shadow-[var(--green)]/20"
                    >
                      <Download size={14} />
                      Exportera valda
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Export history */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-[var(--green)]" />
                  <h2 className="text-sm font-semibold text-[var(--text)]">Exporthistorik</h2>
                </div>
              </div>

              {history.length === 0 ? (
                <div className="p-8 text-center">
                  <Package size={32} className="mx-auto text-[var(--text3)] mb-3 opacity-40" />
                  <p className="text-xs text-[var(--text3)]">
                    Inga exporter an. Valj kategorier ovan och exportera dina data.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border)]">
                  {history.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-4 hover:bg-[var(--bg3)]/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--text)] truncate">{entry.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-[var(--text3)]">
                            {new Date(entry.createdAt).toLocaleDateString('sv-SE')}{' '}
                            {new Date(entry.createdAt).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-[10px] text-[var(--text3)]">&middot;</span>
                          <span className="text-[10px] text-[var(--text3)]">{entry.formats}</span>
                          <span className="text-[10px] text-[var(--text3)]">&middot;</span>
                          <span className="text-[10px] font-mono text-[var(--text3)]">
                            {formatFileSize(entry.sizeBytes)}
                          </span>
                        </div>
                      </div>
                      <button
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-[var(--green)] hover:bg-[var(--green)]/10 transition-colors"
                      >
                        <Download size={12} />
                        Ladda ner
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ IMPORT TAB ═══ */}
        {activeTab === 'import' && (
          <div className="space-y-6">
            {/* Import hero */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
              <Upload size={40} className="mx-auto text-[var(--green)] mb-3" />
              <h2 className="text-base font-serif font-bold text-[var(--text)]">
                Byt till BeetleSense
              </h2>
              <p className="text-xs text-[var(--text2)] mt-2 max-w-md mx-auto leading-relaxed">
                Importera befintlig skogsdata fran pcSKOG, Excel, Shapefile, GeoJSON eller CSV.
                Vi hjalper dig mappa kolumner, validerar data och importerar smidigt.
              </p>
              <button
                onClick={() => setImportOpen(true)}
                className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-semibold bg-[var(--green)] text-white hover:brightness-110 transition-all shadow-lg shadow-[var(--green)]/20"
              >
                <Upload size={14} />
                Starta importguiden
              </button>
            </div>

            {/* Supported sources */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Stodda kallformat</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { name: 'pcSKOG', desc: 'XML-export av skogsbruksplan', ext: '.xml, .csv' },
                  { name: 'Excel', desc: 'Kalkylblad med skogsdata', ext: '.xlsx, .xls' },
                  { name: 'Shapefile', desc: 'ESRI format med geometrier', ext: '.shp (.zip)' },
                  { name: 'GeoJSON', desc: 'Oppet GIS-format', ext: '.geojson' },
                  { name: 'CSV', desc: 'Kommaseparerad text', ext: '.csv' },
                  { name: 'Heureka', desc: 'SLU skogsanalys (kommer snart)', ext: '.xml' },
                ].map((src) => (
                  <div
                    key={src.name}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--bg2)]"
                  >
                    <div className="w-2 h-2 rounded-full bg-[var(--green)]" />
                    <div className="flex-1">
                      <span className="text-xs font-medium text-[var(--text)]">{src.name}</span>
                      <p className="text-[10px] text-[var(--text3)]">{src.desc}</p>
                    </div>
                    <span className="text-[10px] font-mono text-[var(--text3)]">{src.ext}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* How it works */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Sa fungerar det</h3>
              <div className="space-y-3">
                {[
                  { step: '1', title: 'Valj kalla', desc: 'Valj fran pcSKOG, Excel, Shapefile, GeoJSON eller CSV' },
                  { step: '2', title: 'Ladda upp filer', desc: 'Dra filer till uppladdningsytan eller blaadra i filsystemet' },
                  { step: '3', title: 'Koppla kolumner', desc: 'Vi forsoker automatmappa — du justerar vid behov' },
                  { step: '4', title: 'Granska & validera', desc: 'Se en sammanfattning av data, varningar och fel' },
                  { step: '5', title: 'Importera', desc: 'Starta importen — klart pa nagra sekunder' },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[var(--green)]/15 text-[var(--green)] flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                      {item.step}
                    </div>
                    <div>
                      <span className="text-xs font-medium text-[var(--text)]">{item.title}</span>
                      <p className="text-[11px] text-[var(--text3)]">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ PORTABILITY TAB ═══ */}
        {activeTab === 'portability' && <DataPortabilityInfo />}

      </div>

      {/* ═══ Export progress modal ═══ */}
      {exportJob && exportJob.status !== 'idle' && (
        <ExportProgress
          job={exportJob}
          selectedCategories={selectedCategories.length > 0 ? selectedCategories : categories}
          onCancel={cancelExport}
          onDismiss={dismissExport}
        />
      )}

      {/* ═══ Import wizard modal ═══ */}
      <ImportWizard isOpen={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
