/**
 * Financial entries service — handles CRUD for income/expense tracking.
 * Falls back to demo data when Supabase is not configured.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isDemo, DEMO_PARCELS } from '@/lib/demoData';

// ─── Types ───

export type EntryType = 'income' | 'expense';

export const INCOME_CATEGORIES = [
  'Timber sale',
  'Carbon credits',
  'Hunting lease',
  'Subsidies',
  'Other',
] as const;

export const EXPENSE_CATEGORIES = [
  'Harvesting',
  'Planting',
  'Road maintenance',
  'Insurance',
  'Equipment',
  'Consulting',
  'Other',
] as const;

export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type Category = IncomeCategory | ExpenseCategory;

export interface FinancialEntry {
  id: string;
  user_id: string;
  type: EntryType;
  category: Category;
  amount: number;
  currency: string;
  description: string | null;
  parcel_id: string | null;
  parcel_name?: string;
  date: string; // ISO date string YYYY-MM-DD
  receipt_url: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateEntryInput {
  type: EntryType;
  category: Category;
  amount: number;
  description?: string;
  parcel_id?: string;
  date: string;
  tags?: string[];
}

// ─── Category icons (emoji shorthand) ───

export const CATEGORY_ICONS: Record<string, string> = {
  'Timber sale': '🪵',
  'Carbon credits': '🌿',
  'Hunting lease': '🦌',
  'Subsidies': '🏛️',
  'Harvesting': '🪓',
  'Planting': '🌱',
  'Road maintenance': '🛤️',
  'Insurance': '🛡️',
  'Equipment': '⚙️',
  'Consulting': '📋',
  'Other': '📌',
};

// ─── Demo data ───

function generateDemoEntries(): FinancialEntry[] {
  const now = new Date();
  const year = now.getFullYear();
  const parcels = DEMO_PARCELS;

  const entries: FinancialEntry[] = [
    // Income entries
    { id: 'fe-1', user_id: 'demo-user', type: 'income', category: 'Timber sale', amount: 185000, currency: 'SEK', description: 'Spring thinning — spruce logs to Södra', parcel_id: 'p1', parcel_name: parcels[0]?.name, date: `${year}-01-15`, receipt_url: null, tags: ['spruce', 'thinning'], created_at: `${year}-01-15T10:00:00Z`, updated_at: `${year}-01-15T10:00:00Z` },
    { id: 'fe-2', user_id: 'demo-user', type: 'income', category: 'Carbon credits', amount: 24500, currency: 'SEK', description: 'Voluntary carbon credits Q1', parcel_id: null, parcel_name: undefined, date: `${year}-02-01`, receipt_url: null, tags: ['carbon'], created_at: `${year}-02-01T10:00:00Z`, updated_at: `${year}-02-01T10:00:00Z` },
    { id: 'fe-3', user_id: 'demo-user', type: 'income', category: 'Hunting lease', amount: 12000, currency: 'SEK', description: 'Annual moose hunting lease', parcel_id: 'p1', parcel_name: parcels[0]?.name, date: `${year}-01-10`, receipt_url: null, tags: ['hunting'], created_at: `${year}-01-10T10:00:00Z`, updated_at: `${year}-01-10T10:00:00Z` },
    { id: 'fe-4', user_id: 'demo-user', type: 'income', category: 'Subsidies', amount: 35000, currency: 'SEK', description: 'Skogsstyrelsen replanting subsidy', parcel_id: 'p2', parcel_name: parcels[1]?.name, date: `${year}-03-20`, receipt_url: null, tags: ['subsidy', 'replanting'], created_at: `${year}-03-20T10:00:00Z`, updated_at: `${year}-03-20T10:00:00Z` },
    { id: 'fe-5', user_id: 'demo-user', type: 'income', category: 'Timber sale', amount: 92000, currency: 'SEK', description: 'Pine sawlogs — final felling block B', parcel_id: 'p2', parcel_name: parcels[1]?.name, date: `${year}-03-05`, receipt_url: null, tags: ['pine', 'final-felling'], created_at: `${year}-03-05T10:00:00Z`, updated_at: `${year}-03-05T10:00:00Z` },
    { id: 'fe-6', user_id: 'demo-user', type: 'income', category: 'Other', amount: 8500, currency: 'SEK', description: 'Christmas tree sales', parcel_id: null, parcel_name: undefined, date: `${year}-01-05`, receipt_url: null, tags: ['christmas'], created_at: `${year}-01-05T10:00:00Z`, updated_at: `${year}-01-05T10:00:00Z` },
    { id: 'fe-15', user_id: 'demo-user', type: 'income', category: 'Carbon credits', amount: 18000, currency: 'SEK', description: 'Q2 voluntary carbon batch', parcel_id: null, parcel_name: undefined, date: `${year}-04-02`, receipt_url: null, tags: ['carbon'], created_at: `${year}-04-02T10:00:00Z`, updated_at: `${year}-04-02T10:00:00Z` },

    // Expense entries
    { id: 'fe-7', user_id: 'demo-user', type: 'expense', category: 'Harvesting', amount: 45000, currency: 'SEK', description: 'Contractor — spring thinning', parcel_id: 'p1', parcel_name: parcels[0]?.name, date: `${year}-01-12`, receipt_url: null, tags: ['contractor'], created_at: `${year}-01-12T10:00:00Z`, updated_at: `${year}-01-12T10:00:00Z` },
    { id: 'fe-8', user_id: 'demo-user', type: 'expense', category: 'Planting', amount: 28000, currency: 'SEK', description: '4,000 spruce seedlings + planting', parcel_id: 'p2', parcel_name: parcels[1]?.name, date: `${year}-04-01`, receipt_url: null, tags: ['seedlings'], created_at: `${year}-04-01T10:00:00Z`, updated_at: `${year}-04-01T10:00:00Z` },
    { id: 'fe-9', user_id: 'demo-user', type: 'expense', category: 'Road maintenance', amount: 15000, currency: 'SEK', description: 'Gravel and grading — forest road', parcel_id: 'p1', parcel_name: parcels[0]?.name, date: `${year}-02-18`, receipt_url: null, tags: ['road'], created_at: `${year}-02-18T10:00:00Z`, updated_at: `${year}-02-18T10:00:00Z` },
    { id: 'fe-10', user_id: 'demo-user', type: 'expense', category: 'Insurance', amount: 8200, currency: 'SEK', description: 'Annual forest insurance premium', parcel_id: null, parcel_name: undefined, date: `${year}-01-02`, receipt_url: null, tags: ['insurance'], created_at: `${year}-01-02T10:00:00Z`, updated_at: `${year}-01-02T10:00:00Z` },
    { id: 'fe-11', user_id: 'demo-user', type: 'expense', category: 'Equipment', amount: 3500, currency: 'SEK', description: 'Chainsaw chain + bar oil', parcel_id: null, parcel_name: undefined, date: `${year}-02-10`, receipt_url: null, tags: ['equipment'], created_at: `${year}-02-10T10:00:00Z`, updated_at: `${year}-02-10T10:00:00Z` },
    { id: 'fe-12', user_id: 'demo-user', type: 'expense', category: 'Consulting', amount: 12000, currency: 'SEK', description: 'Forest management plan update', parcel_id: null, parcel_name: undefined, date: `${year}-03-10`, receipt_url: null, tags: ['consulting', 'plan'], created_at: `${year}-03-10T10:00:00Z`, updated_at: `${year}-03-10T10:00:00Z` },
    { id: 'fe-13', user_id: 'demo-user', type: 'expense', category: 'Harvesting', amount: 32000, currency: 'SEK', description: 'Final felling contractor block B', parcel_id: 'p2', parcel_name: parcels[1]?.name, date: `${year}-03-02`, receipt_url: null, tags: ['contractor'], created_at: `${year}-03-02T10:00:00Z`, updated_at: `${year}-03-02T10:00:00Z` },
    { id: 'fe-14', user_id: 'demo-user', type: 'expense', category: 'Other', amount: 2800, currency: 'SEK', description: 'Drone battery replacement', parcel_id: null, parcel_name: undefined, date: `${year}-02-25`, receipt_url: null, tags: ['drone'], created_at: `${year}-02-25T10:00:00Z`, updated_at: `${year}-02-25T10:00:00Z` },
  ];

  return entries;
}

let _demoEntries: FinancialEntry[] | null = null;
function getDemoEntries(): FinancialEntry[] {
  if (!_demoEntries) _demoEntries = generateDemoEntries();
  return [..._demoEntries];
}

// ─── Last year demo data (for trend comparison) ───

const LAST_YEAR_INCOME = 310000;
const LAST_YEAR_EXPENSE = 125000;

// ─── API ───

export async function fetchEntries(): Promise<FinancialEntry[]> {
  if (!isSupabaseConfigured || isDemo()) {
    return getDemoEntries();
  }

  const { data, error } = await supabase
    .from('financial_entries')
    .select('*, parcels(name)')
    .order('date', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    parcel_name: (row.parcels as { name: string } | null)?.name ?? null,
  })) as FinancialEntry[];
}

export async function createEntry(input: CreateEntryInput): Promise<FinancialEntry> {
  if (!isSupabaseConfigured || isDemo()) {
    const entry: FinancialEntry = {
      id: `fe-${Date.now()}`,
      user_id: 'demo-user',
      type: input.type,
      category: input.category,
      amount: input.amount,
      currency: 'SEK',
      description: input.description ?? null,
      parcel_id: input.parcel_id ?? null,
      parcel_name: input.parcel_id ? DEMO_PARCELS.find((p) => p.id === input.parcel_id)?.name : undefined,
      date: input.date,
      receipt_url: null,
      tags: input.tags ?? [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (_demoEntries) _demoEntries.unshift(entry);
    return entry;
  }

  const { data, error } = await supabase
    .from('financial_entries')
    .insert({
      type: input.type,
      category: input.category,
      amount: input.amount,
      description: input.description,
      parcel_id: input.parcel_id,
      date: input.date,
      tags: input.tags ?? [],
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as FinancialEntry;
}

export async function updateEntry(id: string, input: Partial<CreateEntryInput>): Promise<void> {
  if (!isSupabaseConfigured || isDemo()) {
    if (_demoEntries) {
      const idx = _demoEntries.findIndex((e) => e.id === id);
      if (idx >= 0) {
        _demoEntries[idx] = { ..._demoEntries[idx], ...input, updated_at: new Date().toISOString() } as FinancialEntry;
      }
    }
    return;
  }

  const { error } = await supabase
    .from('financial_entries')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function deleteEntry(id: string): Promise<void> {
  if (!isSupabaseConfigured || isDemo()) {
    if (_demoEntries) {
      _demoEntries = _demoEntries.filter((e) => e.id !== id);
    }
    return;
  }

  const { error } = await supabase.from('financial_entries').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ─── Aggregations ───

export interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  incomeTrend: number; // percentage vs last year
  expenseTrend: number;
  monthlyData: { month: string; income: number; expense: number }[];
}

export function computeSummary(entries: FinancialEntry[]): FinancialSummary {
  const now = new Date();
  const year = now.getFullYear();

  const ytdEntries = entries.filter((e) => e.date.startsWith(String(year)));

  const totalIncome = ytdEntries
    .filter((e) => e.type === 'income')
    .reduce((sum, e) => sum + e.amount, 0);
  const totalExpenses = ytdEntries
    .filter((e) => e.type === 'expense')
    .reduce((sum, e) => sum + e.amount, 0);

  const incomeTrend = LAST_YEAR_INCOME > 0 ? ((totalIncome - LAST_YEAR_INCOME) / LAST_YEAR_INCOME) * 100 : 0;
  const expenseTrend = LAST_YEAR_EXPENSE > 0 ? ((totalExpenses - LAST_YEAR_EXPENSE) / LAST_YEAR_EXPENSE) * 100 : 0;

  // Monthly aggregation (last 6 months)
  const months: { month: string; income: number; expense: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en', { month: 'short' });
    const monthEntries = entries.filter((e) => e.date.startsWith(key));
    months.push({
      month: label,
      income: monthEntries.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0),
      expense: monthEntries.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0),
    });
  }

  return {
    totalIncome,
    totalExpenses,
    netProfit: totalIncome - totalExpenses,
    incomeTrend: Math.round(incomeTrend),
    expenseTrend: Math.round(expenseTrend),
    monthlyData: months,
  };
}

// ─── CSV Export ───

export function exportCSV(entries: FinancialEntry[]): void {
  const header = 'Date,Type,Category,Amount (SEK),Description,Parcel,Tags';
  const rows = entries.map(
    (e) =>
      `${e.date},${e.type},${e.category},${e.amount},"${(e.description ?? '').replace(/"/g, '""')}","${e.parcel_name ?? ''}","${e.tags.join(', ')}"`,
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `beetlesense-finances-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── PDF Export (print-friendly HTML window) ───

export function exportPDF(entries: FinancialEntry[], summary: FinancialSummary): void {
  const formatSEK = (v: number) => v.toLocaleString('sv-SE') + ' kr';

  const rows = entries
    .map(
      (e) => `
    <tr>
      <td>${e.date}</td>
      <td>${e.type === 'income' ? 'Income' : 'Expense'}</td>
      <td>${e.category}</td>
      <td style="text-align:right;color:${e.type === 'income' ? '#1B5E20' : '#b91c1c'}">${e.type === 'income' ? '+' : '-'}${formatSEK(e.amount)}</td>
      <td>${e.description ?? ''}</td>
      <td>${e.parcel_name ?? ''}</td>
    </tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>BeetleSense Financial Report</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'DM Sans',sans-serif; color:#1a2e1a; background:#fff; padding:40px 32px; max-width:900px; margin:0 auto; }
    h1 { font-size:22px; margin-bottom:4px; }
    .subtitle { color:#666; font-size:13px; margin-bottom:24px; }
    .summary { display:flex; gap:24px; margin-bottom:32px; }
    .summary-card { flex:1; padding:16px; border:1px solid #e5e7eb; border-radius:8px; }
    .summary-card .label { font-size:12px; color:#666; }
    .summary-card .value { font-size:22px; font-weight:700; margin-top:4px; }
    table { width:100%; border-collapse:collapse; font-size:13px; }
    th { text-align:left; padding:8px; border-bottom:2px solid #e5e7eb; font-size:11px; color:#666; text-transform:uppercase; }
    td { padding:8px; border-bottom:1px solid #f3f4f6; }
    @media print { body { padding:20px; } }
  </style>
</head>
<body>
  <h1>BeetleSense Financial Report</h1>
  <p class="subtitle">Generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
  <div class="summary">
    <div class="summary-card"><div class="label">Total Income (YTD)</div><div class="value" style="color:#1B5E20">${formatSEK(summary.totalIncome)}</div></div>
    <div class="summary-card"><div class="label">Total Expenses (YTD)</div><div class="value" style="color:#b91c1c">${formatSEK(summary.totalExpenses)}</div></div>
    <div class="summary-card"><div class="label">Net Profit</div><div class="value" style="color:${summary.netProfit >= 0 ? '#1B5E20' : '#b91c1c'}">${formatSEK(summary.netProfit)}</div></div>
  </div>
  <table>
    <thead><tr><th>Date</th><th>Type</th><th>Category</th><th style="text-align:right">Amount</th><th>Description</th><th>Parcel</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <script>window.onload=()=>window.print();</script>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}
