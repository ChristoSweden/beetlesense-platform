import { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

// ─── Types ───

interface ReportViewerProps {
  pdfUrl: string;
  title?: string;
}

type ZoomMode = 'fit-width' | 'fit-page' | 'custom';

// ─── Component ───

export function ReportViewer({ pdfUrl, title }: ReportViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, _setTotalPages] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [zoomMode, setZoomMode] = useState<ZoomMode>('fit-width');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Attempt to load PDF. Use iframe approach for simplicity.
  useEffect(() => {
    setLoading(true);
    setError(false);

    // Check if URL is accessible
    fetch(pdfUrl, { method: 'HEAD' })
      .then((res) => {
        if (!res.ok) throw new Error('PDF not accessible');
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [pdfUrl]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 300));
    setZoomMode('custom');
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 50));
    setZoomMode('custom');
  };

  const handleFitWidth = () => {
    setZoom(100);
    setZoomMode('fit-width');
  };

  const handleFitPage = () => {
    setZoom(75);
    setZoomMode('fit-page');
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = title ? `${title}.pdf` : 'report.pdf';
    a.click();
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] overflow-hidden">
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={24} className="animate-spin text-[var(--green)]" />
            <span className="text-xs text-[var(--text3)] font-mono uppercase tracking-wider">
              Loading PDF
            </span>
          </div>
        </div>
        {/* Skeleton */}
        <div className="p-4 space-y-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              key={i}
              className="h-3 rounded bg-[var(--bg3)] animate-pulse"
              style={{ width: `${60 + Math.random() * 40}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  // Error fallback
  if (error) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-8 text-center">
        <AlertTriangle size={24} className="mx-auto text-amber-400 mb-3" />
        <p className="text-sm text-[var(--text)] mb-1">Unable to display PDF</p>
        <p className="text-xs text-[var(--text3)] mb-4">
          The PDF viewer could not load this file. You can download it directly.
        </p>
        <button
          onClick={handleDownload}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--green)] text-[var(--bg)] hover:brightness-110 transition"
        >
          <Download size={14} />
          Download PDF
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] overflow-hidden">
      {/* ─── Toolbar ─── */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] bg-[var(--bg3)]">
        <div className="flex items-center gap-2">
          {/* Page Navigation */}
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-1.5 rounded hover:bg-[var(--bg2)] text-[var(--text3)] hover:text-[var(--text)] transition-colors disabled:opacity-30"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs font-mono text-[var(--text2)]">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded hover:bg-[var(--bg2)] text-[var(--text3)] hover:text-[var(--text)] transition-colors disabled:opacity-30"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="flex items-center gap-1">
          {/* Zoom Controls */}
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded hover:bg-[var(--bg2)] text-[var(--text3)] hover:text-[var(--text)] transition-colors"
            title="Zoom out"
          >
            <ZoomOut size={14} />
          </button>
          <span className="text-[10px] font-mono text-[var(--text3)] w-10 text-center">
            {zoom}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded hover:bg-[var(--bg2)] text-[var(--text3)] hover:text-[var(--text)] transition-colors"
            title="Zoom in"
          >
            <ZoomIn size={14} />
          </button>

          <div className="w-px h-4 bg-[var(--border)] mx-1" />

          <button
            onClick={handleFitWidth}
            className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
              zoomMode === 'fit-width'
                ? 'bg-[var(--green)]/10 text-[var(--green)]'
                : 'text-[var(--text3)] hover:text-[var(--text2)]'
            }`}
          >
            Width
          </button>
          <button
            onClick={handleFitPage}
            className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
              zoomMode === 'fit-page'
                ? 'bg-[var(--green)]/10 text-[var(--green)]'
                : 'text-[var(--text3)] hover:text-[var(--text2)]'
            }`}
          >
            Page
          </button>

          <div className="w-px h-4 bg-[var(--border)] mx-1" />

          <button
            onClick={handleDownload}
            className="p-1.5 rounded hover:bg-[var(--bg2)] text-[var(--text3)] hover:text-[var(--green)] transition-colors"
            title="Download PDF"
          >
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* ─── PDF Display ─── */}
      <div
        ref={containerRef}
        className="overflow-auto bg-[var(--bg)]"
        style={{ height: 'calc(100vh - 250px)', minHeight: 400 }}
      >
        <div
          className="mx-auto"
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
            transition: 'transform 0.2s ease',
          }}
        >
          <iframe
            ref={iframeRef}
            src={`${pdfUrl}#toolbar=0&page=${currentPage}`}
            title={title || 'Report PDF'}
            className="w-full border-0"
            style={{ height: 'calc(100vh - 250px)', minHeight: 400 }}
            onLoad={() => setLoading(false)}
            onError={() => setError(true)}
          />
        </div>
      </div>
    </div>
  );
}
