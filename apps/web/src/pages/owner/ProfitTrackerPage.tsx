import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  Plus,
  Download,
  FileText,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  X,
  ArrowUpDown,
} from 'lucide-react';
import { useToast } from '@/components/common/Toast';
import { DEMO_PARCELS } from '@/lib/demoData';
import {
  fetchEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  computeSummary,
  exportCSV,
  exportPDF,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  CATEGORY_ICONS,
  type FinancialEntry,
  type EntryType,
  type Category,
  type CreateEntryInput,
  type FinancialSummary,
} from '@/services/financialService';

// ─── Helpers ───

function formatSEK(value: number): string {
  return value.toLocaleString('sv-SE') + ' kr';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Sort types ───
type SortField = 'date' | 'amount' | 'category';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 20;

// ─── Bar Chart (pure CSS) ───

function MonthlyBarChart({ data }: { data: FinancialSummary['monthlyData'] }) {
  const max = Math.max(...data.flatMap((d) => [d.income, d.expense]), 1);

  return (
    <div className="flex items-end gap-2 h-32 mt-4">
      {data.map((d) => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
          <div className="flex gap-0.5 items-end w-full justify-center h-24">
            <div
              className="w-3 rounded-t bg-[var(--green)] transition-all duration-500"
              style={{ height: `${(d.income / max) * 100}%`, minHeight: d.income > 0 ? '4px' : '0' }}
              title={`Income: ${formatSEK(d.income)}`}
            />
            <div
              className="w-3 rounded-t bg-red-400 transition-all duration-500"
              style={{ height: `${(d.expense / max) * 100}%`, minHeight: d.expense > 0 ? '4px' : '0' }}
              title={`Expense: ${formatSEK(d.expense)}`}
            />
          </div>
          <span className="text-[10px] text-[var(--text3)] font-medium">{d.month}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Add / Edit Form ───

interface EntryFormProps {
  initial?: FinancialEntry;
  onSubmit: (input: CreateEntryInput) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
}

function EntryForm({ initial, onSubmit, onCancel, submitting }: EntryFormProps) {
  const [type, setType] = useState<EntryType>(initial?.type ?? 'income');
  const [category, setCategory] = useState<Category>(initial?.category ?? 'Timber sale');
  const [amount, setAmount] = useState<string>(initial?.amount?.toString() ?? '');
  const [date, setDate] = useState<string>(initial?.date ?? new Date().toISOString().slice(0, 10));
  const [parcelId, setParcelId] = useState<string>(initial?.parcel_id ?? '');
  const [description, setDescription] = useState<string>(initial?.description ?? '');
  const [tagsStr, setTagsStr] = useState<string>(initial?.tags?.join(', ') ?? '');

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  // Reset category when type switches
  useEffect(() => {
    if (!initial) {
      setCategory(type === 'income' ? 'Timber sale' : 'Harvesting');
    }
  }, [type, initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) return;

    await onSubmit({
      type,
      category,
      amount: parsed,
      date,
      description: description.trim() || undefined,
      parcel_id: parcelId || undefined,
      tags: tagsStr
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-[var(--border2)] bg-[var(--bg2)] p-5 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-[var(--text)]">
          {initial ? 'Edit Entry' : 'Add Entry'}
        </h3>
        <button type="button" onClick={onCancel} className="p-1 rounded hover:bg-[var(--bg)] transition">
          <X size={16} className="text-[var(--text3)]" />
        </button>
      </div>

      {/* Type toggle */}
      <div className="flex rounded-lg border border-[var(--border2)] overflow-hidden">
        <button
          type="button"
          onClick={() => setType('income')}
          className={`flex-1 py-2 text-sm font-medium transition ${
            type === 'income'
              ? 'bg-[var(--green)] text-white'
              : 'bg-[var(--bg)] text-[var(--text2)] hover:bg-[var(--bg2)]'
          }`}
        >
          Income
        </button>
        <button
          type="button"
          onClick={() => setType('expense')}
          className={`flex-1 py-2 text-sm font-medium transition ${
            type === 'expense'
              ? 'bg-red-500 text-white'
              : 'bg-[var(--bg)] text-[var(--text2)] hover:bg-[var(--bg2)]'
          }`}
        >
          Expense
        </button>
      </div>

      {/* Category */}
      <div>
        <label className="block text-xs font-medium text-[var(--text2)] mb-1">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
          className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--green)]/40"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_ICONS[c]} {c}
            </option>
          ))}
        </select>
      </div>

      {/* Amount + Date row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-[var(--text2)] mb-1">Amount (SEK)</label>
          <input
            type="number"
            min="0"
            step="100"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            placeholder="0"
            className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--green)]/40"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text2)] mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--green)]/40"
          />
        </div>
      </div>

      {/* Parcel */}
      <div>
        <label className="block text-xs font-medium text-[var(--text2)] mb-1">Parcel (optional)</label>
        <select
          value={parcelId}
          onChange={(e) => setParcelId(e.target.value)}
          className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--green)]/40"
        >
          <option value="">-- None --</option>
          {DEMO_PARCELS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-[var(--text2)] mb-1">Description (optional)</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short note..."
          className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--green)]/40"
        />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-xs font-medium text-[var(--text2)] mb-1">Tags (comma-separated)</label>
        <input
          type="text"
          value={tagsStr}
          onChange={(e) => setTagsStr(e.target.value)}
          placeholder="e.g. spruce, thinning"
          className="w-full rounded-lg border border-[var(--border2)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--green)]/40"
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting || !amount}
        className="w-full rounded-lg bg-[var(--green)] py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
      >
        {submitting ? 'Saving...' : initial ? 'Save Changes' : 'Add Entry'}
      </button>
    </form>
  );
}

// ─── Main Page ───

export default function ProfitTrackerPage() {
  const { t } = useTranslation();
  const toast = useToast();

  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FinancialEntry | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [filterType, setFilterType] = useState<'all' | EntryType>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Sort
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Pagination
  const [page, setPage] = useState(0);

  // Load entries
  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchEntries();
      setEntries(data);
    } catch (err) {
      toast('Failed to load financial entries', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Summary
  const summary = useMemo(() => computeSummary(entries), [entries]);

  // Filtered + sorted entries
  const processed = useMemo(() => {
    let result = [...entries];

    if (filterType !== 'all') result = result.filter((e) => e.type === filterType);
    if (filterDateFrom) result = result.filter((e) => e.date >= filterDateFrom);
    if (filterDateTo) result = result.filter((e) => e.date <= filterDateTo);

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') cmp = a.date.localeCompare(b.date);
      else if (sortField === 'amount') cmp = a.amount - b.amount;
      else if (sortField === 'category') cmp = a.category.localeCompare(b.category);
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [entries, filterType, filterDateFrom, filterDateTo, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const pageEntries = processed.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [filterType, filterDateFrom, filterDateTo, sortField, sortDir]);

  // Handlers
  const handleAdd = async (input: CreateEntryInput) => {
    setSubmitting(true);
    try {
      await createEntry(input);
      await loadEntries();
      setShowForm(false);
      toast('Entry added', 'success');
    } catch {
      toast('Failed to add entry', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (input: CreateEntryInput) => {
    if (!editingEntry) return;
    setSubmitting(true);
    try {
      await updateEntry(editingEntry.id, input);
      await loadEntries();
      setEditingEntry(null);
      toast('Entry updated', 'success');
    } catch {
      toast('Failed to update entry', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteEntry(id);
      await loadEntries();
      toast('Entry deleted', 'success');
    } catch {
      toast('Failed to delete entry', 'error');
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="text-[var(--text3)]" />;
    return sortDir === 'desc' ? (
      <ChevronDown size={12} className="text-[var(--green)]" />
    ) : (
      <ChevronUp size={12} className="text-[var(--green)]" />
    );
  };

  if (loading) {
    return (
      <div className="p-4 max-w-3xl mx-auto space-y-4">
        <div className="h-8 w-48 rounded bg-[var(--border2)] animate-pulse" />
        <div className="h-32 rounded-xl bg-[var(--border2)] animate-pulse" />
        <div className="h-64 rounded-xl bg-[var(--border2)] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-3xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link to="/owner/dashboard" className="p-1.5 rounded-lg hover:bg-[var(--bg2)] transition">
          <ChevronLeft size={20} className="text-[var(--text2)]" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-[var(--text)]">Profit Tracker</h1>
          <p className="text-xs text-[var(--text3)]">Track your forest income and expenses</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingEntry(null); }}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--green)] px-3 py-2 text-sm font-medium text-white transition hover:brightness-110"
        >
          <Plus size={16} />
          Add
        </button>
      </div>

      {/* ═══ Summary Section ═══ */}
      <div className="rounded-xl border border-[var(--border2)] bg-[var(--bg2)] p-5 mb-5">
        <h2 className="text-xs font-semibold text-[var(--text3)] uppercase tracking-wider mb-3">
          Year-to-Date Summary
        </h2>

        <div className="grid grid-cols-3 gap-3 mb-2">
          <div>
            <p className="text-xs text-[var(--text3)]">Income</p>
            <p className="text-lg font-bold text-[var(--green)]">{formatSEK(summary.totalIncome)}</p>
            <div className="flex items-center gap-1 mt-0.5">
              {summary.incomeTrend >= 0 ? (
                <TrendingUp size={12} className="text-[var(--green)]" />
              ) : (
                <TrendingDown size={12} className="text-red-500" />
              )}
              <span className={`text-[10px] font-medium ${summary.incomeTrend >= 0 ? 'text-[var(--green)]' : 'text-red-500'}`}>
                {summary.incomeTrend >= 0 ? '+' : ''}{summary.incomeTrend}% vs last year
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-[var(--text3)]">Expenses</p>
            <p className="text-lg font-bold text-red-500">{formatSEK(summary.totalExpenses)}</p>
            <div className="flex items-center gap-1 mt-0.5">
              {summary.expenseTrend <= 0 ? (
                <TrendingDown size={12} className="text-[var(--green)]" />
              ) : (
                <TrendingUp size={12} className="text-red-500" />
              )}
              <span className={`text-[10px] font-medium ${summary.expenseTrend <= 0 ? 'text-[var(--green)]' : 'text-red-500'}`}>
                {summary.expenseTrend >= 0 ? '+' : ''}{summary.expenseTrend}% vs last year
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-[var(--text3)]">Net Profit</p>
            <p className={`text-lg font-bold ${summary.netProfit >= 0 ? 'text-[var(--green)]' : 'text-red-500'}`}>
              {formatSEK(summary.netProfit)}
            </p>
          </div>
        </div>

        {/* Monthly bar chart */}
        <div className="mt-2">
          <div className="flex items-center gap-3 text-[10px] text-[var(--text3)]">
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-[var(--green)]" /> Income</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-red-400" /> Expenses</span>
          </div>
          <MonthlyBarChart data={summary.monthlyData} />
        </div>
      </div>

      {/* ═══ Add / Edit Form ═══ */}
      {(showForm || editingEntry) && (
        <div className="mb-5">
          <EntryForm
            initial={editingEntry ?? undefined}
            onSubmit={editingEntry ? handleEdit : handleAdd}
            onCancel={() => {
              setShowForm(false);
              setEditingEntry(null);
            }}
            submitting={submitting}
          />
        </div>
      )}

      {/* ═══ Filters ═══ */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex rounded-lg border border-[var(--border2)] overflow-hidden text-xs">
          {(['all', 'income', 'expense'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={`px-3 py-1.5 font-medium transition ${
                filterType === f
                  ? 'bg-[var(--green)] text-white'
                  : 'bg-[var(--bg2)] text-[var(--text2)] hover:bg-[var(--bg)]'
              }`}
            >
              {f === 'all' ? 'All' : f === 'income' ? 'Income' : 'Expenses'}
            </button>
          ))}
        </div>
        <input
          type="date"
          value={filterDateFrom}
          onChange={(e) => setFilterDateFrom(e.target.value)}
          className="rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-2 py-1 text-xs text-[var(--text)]"
          placeholder="From"
        />
        <span className="text-xs text-[var(--text3)]">to</span>
        <input
          type="date"
          value={filterDateTo}
          onChange={(e) => setFilterDateTo(e.target.value)}
          className="rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-2 py-1 text-xs text-[var(--text)]"
          placeholder="To"
        />
      </div>

      {/* ═══ Export Buttons ═══ */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => exportCSV(processed)}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-1.5 text-xs font-medium text-[var(--text2)] transition hover:bg-[var(--bg)]"
        >
          <Download size={14} />
          Export CSV
        </button>
        <button
          onClick={() => exportPDF(processed, summary)}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--border2)] bg-[var(--bg2)] px-3 py-1.5 text-xs font-medium text-[var(--text2)] transition hover:bg-[var(--bg)]"
        >
          <FileText size={14} />
          Export PDF
        </button>
      </div>

      {/* ═══ Entries Table ═══ */}
      <div className="rounded-xl border border-[var(--border2)] bg-[var(--bg2)] overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[100px_1fr_1fr_100px_60px] gap-2 px-4 py-2.5 border-b border-[var(--border2)] text-[11px] font-semibold text-[var(--text3)] uppercase tracking-wider">
          <button onClick={() => toggleSort('date')} className="flex items-center gap-1 text-left">
            Date <SortIcon field="date" />
          </button>
          <button onClick={() => toggleSort('category')} className="flex items-center gap-1 text-left">
            Category <SortIcon field="category" />
          </button>
          <span>Description</span>
          <button onClick={() => toggleSort('amount')} className="flex items-center gap-1 justify-end">
            Amount <SortIcon field="amount" />
          </button>
          <span />
        </div>

        {pageEntries.length === 0 ? (
          <div className="p-8 text-center text-sm text-[var(--text3)]">
            No entries found. Add your first income or expense above.
          </div>
        ) : (
          pageEntries.map((entry) => (
            <div
              key={entry.id}
              className="grid grid-cols-[100px_1fr_1fr_100px_60px] gap-2 px-4 py-3 border-b border-[var(--border2)]/50 items-center hover:bg-[var(--bg)] transition text-sm"
            >
              <span className="text-xs text-[var(--text2)]">{formatDate(entry.date)}</span>
              <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--text)]">
                <span>{CATEGORY_ICONS[entry.category] ?? '📌'}</span>
                <span className="truncate">{entry.category}</span>
                {entry.parcel_name && (
                  <span className="text-[10px] text-[var(--text3)] bg-[var(--bg)] rounded px-1 py-0.5 ml-1 hidden sm:inline">
                    {entry.parcel_name}
                  </span>
                )}
              </span>
              <span className="text-xs text-[var(--text2)] truncate">{entry.description ?? ''}</span>
              <span
                className={`text-xs font-semibold text-right ${
                  entry.type === 'income' ? 'text-[var(--green)]' : 'text-red-500'
                }`}
              >
                {entry.type === 'income' ? '+' : '-'}{formatSEK(entry.amount)}
              </span>
              <div className="flex items-center gap-1 justify-end">
                <button
                  onClick={() => {
                    setEditingEntry(entry);
                    setShowForm(false);
                  }}
                  className="p-1 rounded hover:bg-[var(--bg2)] transition"
                  title="Edit"
                >
                  <Pencil size={13} className="text-[var(--text3)]" />
                </button>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="p-1 rounded hover:bg-red-50 transition"
                  title="Delete"
                >
                  <Trash2 size={13} className="text-red-400" />
                </button>
              </div>
            </div>
          ))
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 text-xs text-[var(--text3)]">
            <span>
              {processed.length} entries, page {page + 1} of {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                className="px-2 py-1 rounded border border-[var(--border2)] disabled:opacity-30 hover:bg-[var(--bg)] transition"
              >
                Prev
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="px-2 py-1 rounded border border-[var(--border2)] disabled:opacity-30 hover:bg-[var(--bg)] transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
