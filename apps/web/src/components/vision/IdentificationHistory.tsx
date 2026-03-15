import { useState, useMemo, useCallback } from 'react';
import {
  Trees,
  Leaf,
  PawPrint,
  Bug,
  MapPin,
  Trash2,
  Download,
  Grid3X3,
  Map,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useVisionStore, type HistoryEntry, type IdentificationFilter } from '@/stores/visionStore';
import { IdentificationResult } from './IdentificationResult';

// ─── Filter tabs ────────────────────────────────────────────────────────────────

const FILTER_TABS: { key: IdentificationFilter; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: 'All', icon: <Grid3X3 size={12} /> },
  { key: 'tree', label: 'Trees', icon: <Trees size={12} /> },
  { key: 'plant', label: 'Plants', icon: <Leaf size={12} /> },
  { key: 'animal', label: 'Animals', icon: <PawPrint size={12} /> },
  { key: 'disease', label: 'Diseases', icon: <Bug size={12} /> },
];

// ─── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function typeIcon(type: string) {
  switch (type) {
    case 'tree': return <Trees size={12} className="text-[var(--green)]" />;
    case 'plant': return <Leaf size={12} className="text-emerald-400" />;
    case 'animal': return <PawPrint size={12} className="text-amber" />;
    default: return <Bug size={12} className="text-danger" />;
  }
}

function exportToCSV(history: HistoryEntry[]) {
  const headers = [
    'Date',
    'Species (Swedish)',
    'Species (English)',
    'Scientific Name',
    'Type',
    'Confidence',
    'Conservation Status',
    'Has Disease',
    'Latitude',
    'Longitude',
  ];

  const rows = history.map((entry) => {
    const top = entry.result.top_candidates[0];
    return [
      new Date(entry.timestamp).toISOString(),
      top?.common_name_sv ?? '',
      top?.common_name_en ?? '',
      top?.scientific_name ?? '',
      top?.type ?? '',
      top ? `${Math.round(top.confidence * 100)}%` : '',
      top?.conservation_status ?? '',
      entry.result.has_disease ? 'Yes' : 'No',
      entry.gps?.latitude?.toFixed(6) ?? '',
      entry.gps?.longitude?.toFixed(6) ?? '',
    ];
  });

  const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `beetlesense-identifications-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Component ─────────────────────────────────────────────────────────────

type ViewMode = 'grid' | 'map';

export function IdentificationHistory() {
  const {
    history,
    historyFilter,
    setHistoryFilter,
    removeFromHistory,
    clearHistory,
    filteredHistory,
  } = useVisionStore();

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);

  const displayedHistory = useMemo(() => filteredHistory(), [history, historyFilter]);

  const handleExportCSV = useCallback(() => {
    exportToCSV(displayedHistory);
  }, [displayedHistory]);

  const geoEntries = useMemo(
    () => displayedHistory.filter((e) => e.gps !== null),
    [displayedHistory],
  );

  // ── Detail modal ────────────────────────────────────────────────────────
  if (selectedEntry) {
    return (
      <div className="space-y-4">
        {/* Back header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedEntry(null)}
            className="flex items-center gap-2 text-xs text-[var(--text2)] hover:text-[var(--text)] transition-colors"
          >
            <X size={14} />
            Back to history
          </button>
          <button
            onClick={() => {
              removeFromHistory(selectedEntry.id);
              setSelectedEntry(null);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] text-danger hover:bg-danger/10 transition-colors"
          >
            <Trash2 size={11} />
            Delete
          </button>
        </div>

        {/* Image */}
        {selectedEntry.thumbnailUrl && (
          <div className="rounded-xl overflow-hidden border border-[var(--border)] h-48">
            <img
              src={selectedEntry.thumbnailUrl}
              alt="Identification"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Metadata */}
        <div className="flex items-center gap-4 text-[10px] text-[var(--text3)]">
          <span>{formatDate(selectedEntry.timestamp)}</span>
          {selectedEntry.gps && (
            <span className="flex items-center gap-1">
              <MapPin size={10} />
              {selectedEntry.gps.latitude.toFixed(4)}, {selectedEntry.gps.longitude.toFixed(4)}
            </span>
          )}
        </div>

        {/* Full result card */}
        <IdentificationResult result={selectedEntry.result} />
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--bg3)] flex items-center justify-center mb-4">
          <Trees size={28} className="text-[var(--text3)]" />
        </div>
        <h3 className="text-sm font-semibold text-[var(--text)] mb-1">No identifications yet</h3>
        <p className="text-xs text-[var(--text3)] max-w-xs">
          Use the Identify tab to point your camera at trees, plants, animals, or bark damage.
        </p>
      </div>
    );
  }

  // ── Main view ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2">
        {/* Filter tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setHistoryFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold whitespace-nowrap transition-colors ${
                historyFilter === tab.key
                  ? 'bg-[var(--green)]/20 text-[var(--green)]'
                  : 'text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* View mode + actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'map' : 'grid')}
            className="w-7 h-7 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text3)] hover:text-[var(--text2)] transition-colors"
            title={viewMode === 'grid' ? 'Map view' : 'Grid view'}
          >
            {viewMode === 'grid' ? <Map size={13} /> : <Grid3X3 size={13} />}
          </button>
          <button
            onClick={handleExportCSV}
            className="w-7 h-7 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--text3)] hover:text-[var(--text2)] transition-colors"
            title="Export CSV"
          >
            <Download size={13} />
          </button>
        </div>
      </div>

      {/* Count */}
      <p className="text-[10px] text-[var(--text3)] font-mono">
        {displayedHistory.length} identification{displayedHistory.length !== 1 ? 's' : ''}
      </p>

      {/* Map view (simplified — shows pins on a placeholder) */}
      {viewMode === 'map' && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] overflow-hidden">
          <div className="relative h-64 bg-forest-900 flex items-center justify-center">
            {geoEntries.length === 0 ? (
              <p className="text-xs text-[var(--text3)]">No GPS data available for map view</p>
            ) : (
              <div className="relative w-full h-full p-4">
                <p className="text-[10px] text-[var(--text3)] text-center mb-2">
                  {geoEntries.length} geo-tagged identification{geoEntries.length !== 1 ? 's' : ''}
                </p>
                {/* Pin list as fallback when MapLibre isn't available */}
                <div className="space-y-1 overflow-y-auto max-h-48">
                  {geoEntries.map((entry) => {
                    const top = entry.result.top_candidates[0];
                    return (
                      <button
                        key={entry.id}
                        onClick={() => setSelectedEntry(entry)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg3)] hover:bg-[var(--bg)] transition-colors text-left"
                      >
                        <MapPin size={12} className="text-[var(--green)] shrink-0" />
                        <span className="text-[11px] text-[var(--text)] truncate flex-1">
                          {top?.common_name_sv ?? 'Unknown'}
                        </span>
                        <span className="text-[9px] text-[var(--text3)] font-mono shrink-0">
                          {entry.gps!.latitude.toFixed(3)}, {entry.gps!.longitude.toFixed(3)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Grid view */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {displayedHistory.map((entry) => {
            const top = entry.result.top_candidates[0];
            const confidence = top?.confidence ?? 0;

            return (
              <button
                key={entry.id}
                onClick={() => setSelectedEntry(entry)}
                className="group relative rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--bg2)] hover:border-[var(--green)]/40 transition-colors text-left"
              >
                {/* Thumbnail */}
                <div className="aspect-square bg-forest-900 relative overflow-hidden">
                  {entry.thumbnailUrl && !entry.thumbnailUrl.startsWith('data:image') ? (
                    <img
                      src={entry.thumbnailUrl}
                      alt={top?.common_name_en ?? 'Identification'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {top ? typeIcon(top.type) : <Trees size={20} className="text-[var(--text3)]" />}
                    </div>
                  )}

                  {/* Badges overlay */}
                  <div className="absolute top-1.5 right-1.5 flex flex-col gap-1">
                    {entry.result.has_pest_warning && (
                      <span className="w-5 h-5 rounded-full bg-danger/80 flex items-center justify-center">
                        <AlertTriangle size={10} className="text-white" />
                      </span>
                    )}
                  </div>

                  {/* Confidence badge */}
                  <div className="absolute bottom-1.5 left-1.5">
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        confidence >= 0.8
                          ? 'bg-[var(--green)]/80 text-white'
                          : confidence >= 0.5
                            ? 'bg-amber/80 text-white'
                            : 'bg-forest-900/80 text-[var(--text3)]'
                      }`}
                    >
                      {Math.round(confidence * 100)}%
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-2">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {top && typeIcon(top.type)}
                    <p className="text-[11px] font-semibold text-[var(--text)] truncate">
                      {top?.common_name_sv ?? 'Unknown'}
                    </p>
                  </div>
                  <p className="text-[9px] text-[var(--text3)] italic truncate">
                    {top?.scientific_name ?? ''}
                  </p>
                  <p className="text-[8px] text-[var(--text3)] font-mono mt-1">
                    {formatDate(entry.timestamp)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Clear history */}
      {history.length > 0 && (
        <div className="pt-4 border-t border-[var(--border)]">
          <button
            onClick={clearHistory}
            className="flex items-center gap-1.5 text-[10px] text-danger hover:text-danger/80 transition-colors"
          >
            <Trash2 size={11} />
            Clear all history
          </button>
        </div>
      )}
    </div>
  );
}
