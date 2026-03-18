import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Printer,
  Maximize2,
  Minimize2,
} from 'lucide-react';

// ─── Types ───

export interface ReportPage {
  /** Page number (1-indexed) */
  number: number;
  /** HTML content string for this page */
  html: string;
}

interface ReportPreviewProps {
  pages: ReportPage[];
  title?: string;
}

// ─── Component ───

export function ReportPreview({ pages, title }: ReportPreviewProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);

  const totalPages = pages.length;
  const page = pages.find((p) => p.number === currentPage);

  const handlePrint = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) return;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title ?? 'BeetleSense Report'}</title>
        <style>
          @page { size: A4; margin: 12mm; }
          @media print { .page { page-break-after: always; } .page:last-child { page-break-after: auto; } }
          body { margin: 0; padding: 0; background: #030d05; color: #e8f0e9; font-family: system-ui, sans-serif; }
          .page { width: 210mm; min-height: 297mm; padding: 20mm; box-sizing: border-box; position: relative; }
          .section-title { color: #22c55e; font-size: 14px; font-weight: bold; border-bottom: 1px solid rgba(34,197,94,0.3); padding-bottom: 4px; margin: 16px 0 8px; }
          .kv { display: flex; gap: 12px; font-size: 11px; line-height: 1.8; }
          .kv .key { color: #5a6b5c; min-width: 140px; }
          .kv .val { color: #e8f0e9; }
          .bullet { padding-left: 16px; position: relative; font-size: 11px; color: #9caa9e; line-height: 1.6; }
          .bullet::before { content: ''; position: absolute; left: 0; top: 7px; width: 5px; height: 5px; border-radius: 50%; background: #22c55e; }
        </style>
      </head>
      <body>
        ${pages.map((p) => `<div class="page">${p.html}</div>`).join('')}
      </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
      printWin.close();
    }, 500);
  };

  if (totalPages === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-8 text-center">
        <p className="text-sm text-[var(--text3)]">No preview available. Select a template and parcels to generate a preview.</p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-[var(--border)] bg-[var(--bg2)] overflow-hidden ${
        fullscreen ? 'fixed inset-4 z-50' : ''
      }`}
    >
      {/* ─── Toolbar ─── */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] bg-[var(--bg3)]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-1.5 rounded hover:bg-[var(--bg2)] text-[var(--text3)] hover:text-[var(--text)] transition-colors disabled:opacity-30"
            aria-label="Previous page"
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
            aria-label="Next page"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handlePrint}
            className="p-1.5 rounded hover:bg-[var(--bg2)] text-[var(--text3)] hover:text-[var(--text)] transition-colors"
            title="Print"
          >
            <Printer size={14} />
          </button>
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="p-1.5 rounded hover:bg-[var(--bg2)] text-[var(--text3)] hover:text-[var(--text)] transition-colors"
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* ─── Page Display ─── */}
      <div
        className="overflow-auto bg-[var(--bg)] flex justify-center p-6"
        style={{ height: fullscreen ? 'calc(100% - 44px)' : '600px' }}
      >
        <div
          className="bg-[var(--bg)] border border-[var(--border)] rounded-sm shadow-2xl"
          style={{
            width: '595px', // A4 width at ~72 DPI display
            minHeight: '842px',
            padding: '40px',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {page ? (
            <div
              className="report-page-content text-[var(--text2)] text-[11px] leading-relaxed"
              dangerouslySetInnerHTML={{ __html: page.html }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-[var(--text3)] text-xs">
              Page not found
            </div>
          )}
        </div>
      </div>

      {/* ─── Page Dots ─── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 py-2 border-t border-[var(--border)]">
          {pages.map((p) => (
            <button
              key={p.number}
              onClick={() => setCurrentPage(p.number)}
              className={`w-2 h-2 rounded-full transition-colors ${
                currentPage === p.number ? 'bg-[var(--green)]' : 'bg-[var(--text3)]/30 hover:bg-[var(--text3)]'
              }`}
              aria-label={`Go to page ${p.number}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Preview Builder Helpers ───

/**
 * Build preview pages from parcel data for the forest health template.
 * Returns HTML strings to render in the preview pane.
 */
export function buildHealthPreviewPages(parcelName: string, healthScore: number, speciesMix: { species: string; pct: number }[]): ReportPage[] {
  const dateStr = new Date().toLocaleDateString('sv-SE');

  const page1Html = `
    <div style="margin-bottom: 20px;">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
        <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(34,197,94,0.15); display: flex; align-items: center; justify-content: center;">
          <span style="color: #22c55e; font-weight: bold; font-size: 18px;">B</span>
        </div>
        <div>
          <div style="font-size: 15px; font-weight: bold; color: #e8f0e9; font-family: Georgia, serif;">BeetleSense.ai</div>
          <div style="font-size: 9px; color: #5a6b5c;">Forest Intelligence Platform</div>
        </div>
      </div>
      <div style="font-size: 14px; font-weight: bold; color: #e8f0e9; font-family: Georgia, serif;">
        Forest Health Report — ${parcelName}
      </div>
      <div style="font-size: 9px; color: #5a6b5c; font-family: monospace; margin-top: 2px;">${dateStr}</div>
      <hr style="border: none; border-top: 1px solid #1a2e1c; margin: 12px 0;" />
    </div>

    <div class="section-title">Parcel Overview</div>
    <div class="kv"><span class="key">Parcel Name</span><span class="val">${parcelName}</span></div>
    <div class="kv"><span class="key">Health Score</span><span class="val" style="color: ${healthScore >= 70 ? '#22c55e' : healthScore >= 40 ? '#fbbf24' : '#ef4444'}; font-weight: bold;">${healthScore} / 100</span></div>

    <div class="section-title">Species Composition</div>
    ${speciesMix.map((s) => `
      <div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
        <span style="font-size: 10px; color: #5a6b5c; min-width: 60px;">${s.species}</span>
        <div style="flex: 1; height: 8px; background: #1a2e1c; border-radius: 4px; overflow: hidden;">
          <div style="width: ${s.pct}%; height: 100%; background: #22c55e; border-radius: 4px;"></div>
        </div>
        <span style="font-size: 9px; font-family: monospace; color: #9caa9e;">${s.pct}%</span>
      </div>
    `).join('')}

    <div class="section-title">Recommendations</div>
    <div class="bullet">Continue regular monitoring with quarterly surveys.</div>
    <div class="bullet">Inspect spruce-dominant areas for early beetle signs before swarming season.</div>
  `;

  return [{ number: 1, html: page1Html }];
}
