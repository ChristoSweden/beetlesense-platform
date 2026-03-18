import { useTranslation } from 'react-i18next';
import { LayoutDashboard } from 'lucide-react';
import { usePortfolio } from '@/hooks/usePortfolio';
import { PortfolioSummary } from '@/components/portfolio/PortfolioSummary';
import { PortfolioMap } from '@/components/portfolio/PortfolioMap';
import { PortfolioTable } from '@/components/portfolio/PortfolioTable';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { ExportButton } from '@/components/export/ExportButton';

export default function PortfolioPage() {
  const { t } = useTranslation();
  const {
    parcels,
    filteredParcels,
    summary,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    sortField,
    sortDirection,
    setSortField,
    toggleSortDirection,
    exportCsv,
    refetch,
  } = usePortfolio();

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--green)]/10 border border-[var(--border2)] flex items-center justify-center">
              <LayoutDashboard size={20} className="text-[var(--green)]" />
            </div>
            <div>
              <h1 className="text-lg font-serif font-bold text-[var(--text)]">
                {t('portfolio.title')}
              </h1>
              <p className="text-xs text-[var(--text3)]">
                {t('portfolio.subtitle')}
              </p>
            </div>
          </div>
          <ExportButton
            parcels={filteredParcels}
            filenamePrefix="beetlesense-portfolio"
          />
        </div>

        {/* Error banner */}
        {error && (
          <ErrorBanner message={error} onRetry={refetch} />
        )}

        {/* Summary cards */}
        <PortfolioSummary summary={summary} isLoading={isLoading} />

        {/* Map */}
        <PortfolioMap parcels={parcels} />

        {/* Table */}
        <PortfolioTable
          parcels={filteredParcels}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortField={sortField}
          sortDirection={sortDirection}
          onSortFieldChange={setSortField}
          onToggleSortDirection={toggleSortDirection}
          onExportCsv={exportCsv}
        />
      </div>
    </div>
  );
}
