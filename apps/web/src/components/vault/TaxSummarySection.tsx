import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calculator,
  ChevronDown,
  Download,
  AlertTriangle,
  TrendingUp,
  Minus,
  Info,
} from 'lucide-react';
import { type VaultDocument } from '@/hooks/useDocumentVault';

interface TaxSummarySectionProps {
  documents: VaultDocument[];
}

interface TaxYear {
  year: number;
  timberIncome: number;
  contractorExpenses: number;
  plantingCosts: number;
  otherDeductible: number;
  skogskontoSuggestion: number;
  estimatedTax: number;
}

// Demo tax data by year
function getDemoTaxData(year: number): TaxYear {
  switch (year) {
    case 2024:
      return {
        year: 2024,
        timberIncome: 285_000,
        contractorExpenses: 68_000,
        plantingCosts: 22_000,
        otherDeductible: 15_000,
        skogskontoSuggestion: 45_000,
        estimatedTax: 40_500,
      };
    case 2025:
      return {
        year: 2025,
        timberIncome: 342_000,
        contractorExpenses: 95_000,
        plantingCosts: 35_000,
        otherDeductible: 18_000,
        skogskontoSuggestion: 55_000,
        estimatedTax: 41_700,
      };
    case 2026:
      return {
        year: 2026,
        timberIncome: 125_000,
        contractorExpenses: 45_000,
        plantingCosts: 0,
        otherDeductible: 8_000,
        skogskontoSuggestion: 20_000,
        estimatedTax: 15_600,
      };
    default:
      return {
        year,
        timberIncome: 0,
        contractorExpenses: 0,
        plantingCosts: 0,
        otherDeductible: 0,
        skogskontoSuggestion: 0,
        estimatedTax: 0,
      };
  }
}

function formatSEK(amount: number): string {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function TaxSummarySection({ documents }: TaxSummarySectionProps) {
  const { t } = useTranslation();
  const [selectedYear, setSelectedYear] = useState(2025);
  const [expanded, setExpanded] = useState(true);

  const years = [2024, 2025, 2026];

  const taxData = useMemo(() => getDemoTaxData(selectedYear), [selectedYear]);

  const totalDeductions =
    taxData.contractorExpenses + taxData.plantingCosts + taxData.otherDeductible;
  const netIncome = taxData.timberIncome - totalDeductions;
  const taxableAfterSkogskonto = netIncome - taxData.skogskontoSuggestion;

  // Count invoices for selected year
  const invoiceCount = useMemo(() => {
    return documents.filter(
      (d) =>
        d.folder === 'fakturor' &&
        new Date(d.uploadedAt).getFullYear() === selectedYear,
    ).length;
  }, [documents, selectedYear]);

  const handleExportPdf = () => {
    // In production, this would generate a PDF via a server-side function
    alert(t('vault.tax.exportNotice'));
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--green)]/10 flex items-center justify-center">
            <Calculator size={18} className="text-[var(--green)]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">
              {t('vault.tax.title')}
            </h3>
            <p className="text-[10px] text-[var(--text3)] mt-0.5">
              {t('vault.tax.subtitle')}
            </p>
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`text-[var(--text3)] transition-transform duration-200 ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          {/* Year selector */}
          <div className="flex items-center gap-2">
            {years.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                  selectedYear === year
                    ? 'bg-[var(--green)] text-[var(--bg)]'
                    : 'bg-[var(--bg3)] text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)]/80'
                }`}
              >
                {year}
              </button>
            ))}
          </div>

          {/* Income */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-[var(--green)]" />
                <span className="text-xs font-medium text-[var(--text)]">
                  {t('vault.tax.timberIncome')}
                </span>
              </div>
              <span className="text-sm font-mono font-semibold text-[var(--green)]">
                {formatSEK(taxData.timberIncome)}
              </span>
            </div>
          </div>

          {/* Deductions */}
          <div className="space-y-2 border-t border-[var(--border)] pt-3">
            <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider">
              {t('vault.tax.deductions')}
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text2)]">
                  {t('vault.tax.contractorExpenses')}
                </span>
                <span className="text-xs font-mono text-red-400">
                  -{formatSEK(taxData.contractorExpenses)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text2)]">
                  {t('vault.tax.plantingCosts')}
                </span>
                <span className="text-xs font-mono text-red-400">
                  -{formatSEK(taxData.plantingCosts)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text2)]">
                  {t('vault.tax.otherDeductible')}
                </span>
                <span className="text-xs font-mono text-red-400">
                  -{formatSEK(taxData.otherDeductible)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-dashed border-[var(--border)]">
                <span className="text-xs font-medium text-[var(--text)]">
                  {t('vault.tax.netIncome')}
                </span>
                <span className="text-xs font-mono font-semibold text-[var(--text)]">
                  {formatSEK(netIncome)}
                </span>
              </div>
            </div>
          </div>

          {/* Skogskonto suggestion */}
          <div className="rounded-lg bg-[var(--green)]/5 border border-[var(--green)]/20 p-3">
            <div className="flex items-start gap-2">
              <Info size={14} className="text-[var(--green)] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-[var(--green)]">
                  {t('vault.tax.skogskontoTitle')}
                </p>
                <p className="text-[11px] text-[var(--text2)] mt-1">
                  {t('vault.tax.skogskontoDesc', {
                    amount: formatSEK(taxData.skogskontoSuggestion),
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Tax estimate */}
          <div className="rounded-lg bg-[var(--bg)] border border-[var(--border)] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider">
                  {t('vault.tax.estimatedTax')}
                </p>
                <p className="text-[10px] text-[var(--text3)] mt-0.5">
                  {t('vault.tax.afterSkogskonto')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-mono font-bold text-[var(--text)]">
                  {formatSEK(taxData.estimatedTax)}
                </p>
                <p className="text-[10px] text-[var(--text3)] font-mono">
                  {t('vault.tax.taxableIncome')}: {formatSEK(taxableAfterSkogskonto)}
                </p>
              </div>
            </div>
          </div>

          {/* Invoice count */}
          <div className="flex items-center gap-2 text-[11px] text-[var(--text3)]">
            <Minus size={12} />
            <span>
              {t('vault.tax.basedOnInvoices', { count: invoiceCount, year: selectedYear })}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPdf}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--bg3)] text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)]/80 transition-colors border border-[var(--border)]"
            >
              <Download size={13} />
              {t('vault.tax.exportPdf')}
            </button>
          </div>

          {/* Disclaimer */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <AlertTriangle size={13} className="text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-amber-400/80 leading-relaxed">
              {t('vault.tax.disclaimer')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
