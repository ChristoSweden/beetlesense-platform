/**
 * ContractorMarketplacePage — Open Contractor Marketplace.
 *
 * Unlike Södra which only uses their own contractors, this marketplace
 * lets ANY contractor bid on jobs. Three tabs:
 *   1. Hitta entreprenör — search/filter contractor listings
 *   2. Mina förfrågningar — manage posted jobs & incoming bids
 *   3. Pågående jobb — track active work
 */

import { useState, useCallback } from 'react';
import {
  Search,
  FileText,
  Briefcase,
  Plus,
  SlidersHorizontal,
  Star,
  Store,
} from 'lucide-react';
import { ContractorCard } from '@/components/contractors/ContractorCard';
import { JobPostForm } from '@/components/contractors/JobPostForm';
import { BidManager } from '@/components/contractors/BidManager';
import { ActiveJobs } from '@/components/contractors/ActiveJobs';
import {
  useContractorMarketplace,
  ALL_FORESTRY_SERVICES,
  SERVICE_LABELS,
  type PriceRange,
  type MarketplaceContractor,
  type JobPosting,
  type JobPostFormData,
} from '@/hooks/useContractorMarketplace';

type Tab = 'find' | 'requests' | 'active';

const PRICE_OPTIONS: Array<{ value: PriceRange | ''; label: string }> = [
  { value: '', label: 'Alla priskategorier' },
  { value: '€', label: 'Budget (€)' },
  { value: '€€', label: 'Medel (€€)' },
  { value: '€€€', label: 'Premium (€€€)' },
];

const RATING_OPTIONS = [
  { value: 0, label: 'Alla betyg' },
  { value: 4.0, label: '4.0+' },
  { value: 4.5, label: '4.5+' },
  { value: 4.8, label: '4.8+' },
];

export default function ContractorMarketplacePage() {
  const {
    filteredContractors,
    filters,
    setFilters,
    getDistance,
    jobs,
    activeJobs,
    postJob,
    acceptBid,
    rejectBid,
    advanceJobStatus,
    loading,
    error,
  } = useContractorMarketplace();

  const [tab, setTab] = useState<Tab>('find');
  const [showFilters, setShowFilters] = useState(false);
  const [showJobForm, setShowJobForm] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);

  const handleRequestQuote = useCallback((_contractor: MarketplaceContractor) => {
    setShowJobForm(true);
  }, []);

  const handlePostJob = useCallback(
    (data: JobPostFormData) => {
      postJob(data);
      setShowJobForm(false);
      setTab('requests');
    },
    [postJob],
  );

  const handleAcceptBid = useCallback(
    (jobId: string, bidId: string) => {
      acceptBid(jobId, bidId);
    },
    [acceptBid],
  );

  const handleRejectBid = useCallback(
    (jobId: string, bidId: string) => {
      rejectBid(jobId, bidId);
    },
    [rejectBid],
  );

  // Jobs with bids (for "Mina förfrågningar" tab)
  const myRequests = jobs.filter(
    (j) => j.status === 'posted' || j.status === 'bids_received',
  );

  // Count bids across all my requests
  const totalBids = myRequests.reduce((sum, j) => sum + j.bids.length, 0);

  // Next available month options
  const now = new Date();
  const monthOptions: { value: string; label: string }[] = [];
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthOptions.push({ value: key, label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` });
  }

  return (
    <div className="flex h-full">
      <div
        className="w-full lg:w-[480px] xl:w-[540px] flex-shrink-0 border-r border-[var(--border)] overflow-y-auto"
        style={{ background: 'var(--bg2)' }}
      >
        <div className="p-5">
          {/* Page header */}
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-lg bg-[var(--green)]/10 border border-[var(--border2)] flex items-center justify-center">
              <Store size={18} className="text-[var(--green)]" />
            </div>
            <div>
              <h1 className="text-lg font-serif font-bold text-[var(--text)]">
                Entreprenörsmarknaden
              </h1>
              <p className="text-xs text-[var(--text3)]">
                Hitta, jämför och anlita skogsentreprenörer direkt
              </p>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex border-b border-[var(--border)] mt-4 mb-4">
            <button
              onClick={() => { setTab('find'); setSelectedJob(null); }}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                tab === 'find'
                  ? 'border-[var(--green)] text-[var(--green)]'
                  : 'border-transparent text-[var(--text3)] hover:text-[var(--text2)]'
              }`}
            >
              <Search size={14} />
              Hitta entreprenör
            </button>
            <button
              onClick={() => { setTab('requests'); setSelectedJob(null); }}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors relative ${
                tab === 'requests'
                  ? 'border-[var(--green)] text-[var(--green)]'
                  : 'border-transparent text-[var(--text3)] hover:text-[var(--text2)]'
              }`}
            >
              <FileText size={14} />
              Mina förfrågningar
              {totalBids > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono bg-[var(--green)]/15 text-[var(--green)]">
                  {totalBids}
                </span>
              )}
            </button>
            <button
              onClick={() => { setTab('active'); setSelectedJob(null); }}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors relative ${
                tab === 'active'
                  ? 'border-[var(--green)] text-[var(--green)]'
                  : 'border-transparent text-[var(--text3)] hover:text-[var(--text2)]'
              }`}
            >
              <Briefcase size={14} />
              Pågående jobb
              {activeJobs.filter((j) => j.status !== 'posted' && j.status !== 'bids_received').length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-mono bg-amber-500/15 text-amber-400">
                  {activeJobs.filter((j) => j.status !== 'posted' && j.status !== 'bids_received').length}
                </span>
              )}
            </button>
          </div>

          {/* ─── TAB: Find Contractor ─── */}
          {tab === 'find' && (
            <>
              {/* Quick post job button */}
              <button
                onClick={() => setShowJobForm(true)}
                className="w-full flex items-center justify-center gap-2 py-3 mb-4 rounded-xl border-2 border-dashed border-[var(--green)]/30 bg-[var(--green)]/5 text-sm font-semibold text-[var(--green)] hover:bg-[var(--green)]/10 transition-colors"
              >
                <Plus size={16} />
                Publicera nytt jobb
              </button>

              {/* Search bar */}
              <div className="relative mb-3">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ search: e.target.value })}
                  placeholder="Sök entreprenör, ort, tjänst..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text)] bg-[var(--bg)] focus:outline-none focus:border-[var(--green)] placeholder:text-[var(--text3)]"
                />
              </div>

              {/* Filter toggle */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    showFilters
                      ? 'border-[var(--green)]/30 bg-[var(--green)]/10 text-[var(--green)]'
                      : 'border-[var(--border)] text-[var(--text3)] hover:text-[var(--text2)]'
                  }`}
                >
                  <SlidersHorizontal size={13} />
                  Filter
                </button>
                <span className="text-[11px] text-[var(--text3)]">
                  {filteredContractors.length} entreprenörer
                </span>
              </div>

              {/* Expanded filters */}
              {showFilters && (
                <div className="p-3 rounded-xl border border-[var(--border)] mb-4 space-y-3" style={{ background: 'var(--bg)' }}>
                  {/* Service type */}
                  <div>
                    <label className="text-[10px] font-mono text-[var(--text3)] uppercase mb-1.5 block">
                      Tjänst
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_FORESTRY_SERVICES.map((s) => {
                        const active = filters.services.includes(s);
                        return (
                          <button
                            key={s}
                            onClick={() =>
                              setFilters({
                                services: active
                                  ? filters.services.filter((x) => x !== s)
                                  : [...filters.services, s],
                              })
                            }
                            className={`px-2.5 py-1 rounded-md text-[10px] font-medium border transition-colors ${
                              active
                                ? 'bg-[var(--green)]/15 text-[var(--green)] border-[var(--green)]/30'
                                : 'bg-[var(--bg2)] text-[var(--text3)] border-[var(--border)] hover:text-[var(--text2)]'
                            }`}
                          >
                            {SERVICE_LABELS[s]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="text-[10px] font-mono text-[var(--text3)] uppercase mb-1.5 block">
                      Ort
                    </label>
                    <input
                      type="text"
                      value={filters.location}
                      onChange={(e) => setFilters({ location: e.target.value })}
                      placeholder="t.ex. Värnamo, Jönköping..."
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-xs text-[var(--text)] bg-[var(--bg2)] focus:outline-none focus:border-[var(--green)] placeholder:text-[var(--text3)]"
                    />
                  </div>

                  {/* Rating */}
                  <div>
                    <label className="text-[10px] font-mono text-[var(--text3)] uppercase mb-1.5 block">
                      Minsta betyg
                    </label>
                    <div className="flex gap-1.5">
                      {RATING_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setFilters({ minRating: opt.value })}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium border transition-colors ${
                            filters.minRating === opt.value
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              : 'bg-[var(--bg2)] text-[var(--text3)] border-[var(--border)] hover:text-[var(--text2)]'
                          }`}
                        >
                          {opt.value > 0 && <Star size={9} className="fill-current" />}
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price range */}
                  <div>
                    <label className="text-[10px] font-mono text-[var(--text3)] uppercase mb-1.5 block">
                      Priskategori
                    </label>
                    <select
                      value={filters.priceRange ?? ''}
                      onChange={(e) =>
                        setFilters({ priceRange: (e.target.value as PriceRange) || null })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-xs text-[var(--text)] bg-[var(--bg2)] focus:outline-none focus:border-[var(--green)]"
                    >
                      {PRICE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Available month */}
                  <div>
                    <label className="text-[10px] font-mono text-[var(--text3)] uppercase mb-1.5 block">
                      Ledig månad
                    </label>
                    <select
                      value={filters.availableMonth ?? ''}
                      onChange={(e) =>
                        setFilters({ availableMonth: e.target.value || null })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-xs text-[var(--text)] bg-[var(--bg2)] focus:outline-none focus:border-[var(--green)]"
                    >
                      <option value="">Alla månader</option>
                      {monthOptions.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sort */}
                  <div>
                    <label className="text-[10px] font-mono text-[var(--text3)] uppercase mb-1.5 block">
                      Sortera
                    </label>
                    <select
                      value={filters.sortBy}
                      onChange={(e) =>
                        setFilters({ sortBy: e.target.value as 'distance' | 'rating' | 'price' | 'name' })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-xs text-[var(--text)] bg-[var(--bg2)] focus:outline-none focus:border-[var(--green)]"
                    >
                      <option value="rating">Betyg (högst först)</option>
                      <option value="distance">Avstånd (närmast)</option>
                      <option value="price">Pris (lägst först)</option>
                      <option value="name">Namn (A-Ö)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Contractor list */}
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-52 rounded-xl bg-[var(--bg3)] animate-pulse" />
                  ))}
                </div>
              ) : error ? (
                <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-center">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              ) : filteredContractors.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <Search size={32} className="text-[var(--text3)] mb-3" />
                  <p className="text-sm text-[var(--text)] font-medium mb-1">Inga entreprenörer hittades</p>
                  <p className="text-xs text-[var(--text3)]">Prova att ändra dina filter</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredContractors.map((contractor) => (
                    <ContractorCard
                      key={contractor.id}
                      contractor={contractor}
                      distance={getDistance(contractor)}
                      onRequestQuote={handleRequestQuote}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* ─── TAB: My Requests ─── */}
          {tab === 'requests' && (
            <>
              {selectedJob ? (
                <BidManager
                  job={selectedJob}
                  onAcceptBid={(jobId, bidId) => {
                    handleAcceptBid(jobId, bidId);
                    // Refresh the selected job from state
                    const updated = jobs.find((j) => j.id === jobId);
                    if (updated) setSelectedJob({ ...updated, selected_bid_id: bidId, status: 'contractor_selected' });
                  }}
                  onRejectBid={(jobId, bidId) => {
                    handleRejectBid(jobId, bidId);
                    const updated = jobs.find((j) => j.id === jobId);
                    if (updated) setSelectedJob({ ...updated, bids: updated.bids.filter((b) => b.id !== bidId) });
                  }}
                  onBack={() => setSelectedJob(null)}
                />
              ) : (
                <>
                  {/* Post job CTA */}
                  <button
                    onClick={() => setShowJobForm(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 mb-4 rounded-xl border-2 border-dashed border-[var(--green)]/30 bg-[var(--green)]/5 text-sm font-semibold text-[var(--green)] hover:bg-[var(--green)]/10 transition-colors"
                  >
                    <Plus size={16} />
                    Ny förfrågan
                  </button>

                  {/* Job list */}
                  {myRequests.length === 0 ? (
                    <div className="flex flex-col items-center py-12 text-center">
                      <FileText size={32} className="text-[var(--text3)] mb-3" />
                      <p className="text-sm text-[var(--text)] font-medium mb-1">Inga förfrågningar</p>
                      <p className="text-xs text-[var(--text3)]">
                        Publicera ett jobb för att få offerter från entreprenörer
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {myRequests.map((job) => (
                        <button
                          key={job.id}
                          onClick={() => setSelectedJob(job)}
                          className="w-full text-left rounded-xl border border-[var(--border)] p-4 hover:border-[var(--border2)] transition-all duration-200"
                          style={{ background: 'var(--bg2)' }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-sm font-semibold text-[var(--text)]">
                                {job.parcel_name}
                              </h3>
                              <p className="text-[11px] text-[var(--text3)]">
                                {job.services.map((s) => SERVICE_LABELS[s]).join(', ')} &middot; {job.area_ha} ha
                              </p>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-[var(--green)]/10 text-[var(--green)]">
                              {job.bids.length} {job.bids.length === 1 ? 'offert' : 'offerter'}
                            </span>
                          </div>
                          {job.preferred_timeline && (
                            <p className="text-[10px] text-[var(--text3)] mb-2">
                              Önskad tid: {job.preferred_timeline}
                            </p>
                          )}
                          {job.bids.length > 0 && (
                            <div className="flex items-center gap-3 text-[10px]">
                              <span className="text-[var(--text3)]">
                                Lägsta pris:{' '}
                                <span className="font-mono text-[var(--text)]">
                                  {Math.min(...job.bids.map((b) => b.price_sek)).toLocaleString('sv-SE')} kr
                                </span>
                              </span>
                              <span className="text-[var(--text3)]">
                                Högsta betyg:{' '}
                                <span className="font-mono text-[var(--text)]">
                                  {Math.max(...job.bids.map((b) => b.contractor_rating)).toFixed(1)}
                                </span>
                              </span>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Jobs with selected contractors (pending start) */}
                  {jobs.filter((j) => j.status === 'contractor_selected').length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider mb-3">
                        Entreprenör vald
                      </h3>
                      <div className="space-y-3">
                        {jobs
                          .filter((j) => j.status === 'contractor_selected')
                          .map((job) => {
                            const bid = job.bids.find((b) => b.id === job.selected_bid_id);
                            return (
                              <button
                                key={job.id}
                                onClick={() => setSelectedJob(job)}
                                className="w-full text-left rounded-xl border border-[var(--green)]/20 p-4 hover:border-[var(--green)]/40 transition-all duration-200 bg-[var(--green)]/5"
                              >
                                <div className="flex items-start justify-between mb-1">
                                  <h3 className="text-sm font-semibold text-[var(--text)]">
                                    {job.parcel_name}
                                  </h3>
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-[var(--green)]/15 text-[var(--green)]">
                                    Entreprenör vald
                                  </span>
                                </div>
                                {bid && (
                                  <p className="text-[11px] text-[var(--text2)]">
                                    {bid.contractor_name} &middot; {bid.price_sek.toLocaleString('sv-SE')} kr &middot; {bid.timeline}
                                  </p>
                                )}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ─── TAB: Active Jobs ─── */}
          {tab === 'active' && (
            <>
              {selectedJob ? (
                <BidManager
                  job={selectedJob}
                  onAcceptBid={handleAcceptBid}
                  onRejectBid={handleRejectBid}
                  onBack={() => setSelectedJob(null)}
                />
              ) : (
                <ActiveJobs
                  jobs={jobs.filter(
                    (j) =>
                      j.status === 'contractor_selected' ||
                      j.status === 'work_started' ||
                      j.status === 'inspection' ||
                      j.status === 'complete',
                  )}
                  onSelectJob={setSelectedJob}
                  onAdvanceStatus={advanceJobStatus}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Right panel: Map placeholder / info area */}
      <div className="hidden lg:flex flex-1 items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center px-8 max-w-md">
          <Store size={48} className="text-[var(--green)]/30 mx-auto mb-4" />
          <h2 className="text-lg font-serif font-bold text-[var(--text)] mb-2">
            Öppen Entreprenörsmarknad
          </h2>
          <p className="text-sm text-[var(--text3)] leading-relaxed mb-4">
            Till skillnad från slutna system kan alla kvalificerade entreprenörer lägga bud
            på dina jobb. Du jämför offerter och väljer den bästa lösningen för din skog.
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 rounded-xl border border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
              <p className="text-xl font-mono font-bold text-[var(--green)]">
                {filteredContractors.length}
              </p>
              <p className="text-[10px] text-[var(--text3)] mt-1">Entreprenörer</p>
            </div>
            <div className="p-3 rounded-xl border border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
              <p className="text-xl font-mono font-bold text-[var(--green)]">
                {jobs.length}
              </p>
              <p className="text-[10px] text-[var(--text3)] mt-1">Jobb publicerade</p>
            </div>
            <div className="p-3 rounded-xl border border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
              <p className="text-xl font-mono font-bold text-[var(--green)]">
                {jobs.reduce((sum, j) => sum + j.bids.length, 0)}
              </p>
              <p className="text-[10px] text-[var(--text3)] mt-1">Offerter</p>
            </div>
          </div>
        </div>
      </div>

      {/* Job Post Modal */}
      {showJobForm && (
        <JobPostForm
          onSubmit={handlePostJob}
          onCancel={() => setShowJobForm(false)}
        />
      )}
    </div>
  );
}
