/**
 * ConsultantMarketplacePage — Hire certified foresters for advisory sessions.
 *
 * Forest owners search/filter consultants, view profiles, and submit bookings.
 * BeetleSense earns 20% of advisory fee (platform fee handled at checkout).
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Star,
  MapPin,
  BadgeCheck,
  Clock,
  ChevronRight,
  X,
  Calendar,
  Send,
  Loader2,
  Users,
  GraduationCap,
  Filter,
} from 'lucide-react';

// ─── Types ───

interface Consultant {
  id: string;
  full_name: string;
  avatar_initials: string;
  avatar_color: string;
  certification_number: string;
  specialisations: string[];
  regions: string[];
  hourly_rate_sek: number;
  bio: string;
  years_experience: number;
  languages: string[];
  rating_avg: number;
  rating_count: number;
  is_verified: boolean;
  is_available: boolean;
}

// ─── Demo Data ───

const DEMO_CONSULTANTS: Consultant[] = [
  {
    id: 'c-001',
    full_name: 'Anna Lindström',
    avatar_initials: 'AL',
    avatar_color: '#1B5E20',
    certification_number: 'SKS-4821',
    specialisations: ['Bark beetle management', 'Spruce health assessment', 'Emergency harvest planning'],
    regions: ['Kronoberg', 'Jönköping', 'Kalmar'],
    hourly_rate_sek: 1200,
    bio: 'Senior forest pathologist with 18 years of experience specialising in Ips typographus management across southern Sweden. Certified by Skogsstyrelsen and member of the Swedish Forest Society. I provide rapid on-site and remote assessments to help owners stop infestations before they spread.',
    years_experience: 18,
    languages: ['Swedish', 'English'],
    rating_avg: 4.9,
    rating_count: 47,
    is_verified: true,
    is_available: true,
  },
  {
    id: 'c-002',
    full_name: 'Erik Bergström',
    avatar_initials: 'EB',
    avatar_color: '#2E7D32',
    certification_number: 'SKS-2934',
    specialisations: ['FSC certification', 'Carbon credit planning', 'Biodiversity assessment'],
    regions: ['Dalarna', 'Gävleborg', 'Uppsala'],
    hourly_rate_sek: 1450,
    bio: 'Certified FSC lead auditor and carbon project developer. I help forest owners achieve certification, unlock carbon revenue streams, and document biodiversity to maximise ecosystem service payments. 12 years in the industry, fluent in English and German.',
    years_experience: 12,
    languages: ['Swedish', 'English', 'German'],
    rating_avg: 4.8,
    rating_count: 31,
    is_verified: true,
    is_available: true,
  },
  {
    id: 'c-003',
    full_name: 'Maria Holmgren',
    avatar_initials: 'MH',
    avatar_color: '#388E3C',
    certification_number: 'SKS-7103',
    specialisations: ['Harvest planning', 'Thinning optimisation', 'Road network planning'],
    regions: ['Västra Götaland', 'Halland', 'Skåne'],
    hourly_rate_sek: 980,
    bio: 'Practical forestry consultant focused on harvest logistics and stand thinning. I work with small and medium-sized forest owners to maximise timber value while maintaining long-term forest health. Particularly experienced with mixed stands and challenging terrain in western Sweden.',
    years_experience: 9,
    languages: ['Swedish'],
    rating_avg: 4.7,
    rating_count: 22,
    is_verified: true,
    is_available: true,
  },
  {
    id: 'c-004',
    full_name: 'Johan Svensson',
    avatar_initials: 'JS',
    avatar_color: '#43A047',
    certification_number: 'SKS-5567',
    specialisations: ['Storm damage assessment', 'Insurance claims support', 'Regeneration planning'],
    regions: ['Östergötland', 'Södermanland', 'Stockholm'],
    hourly_rate_sek: 1100,
    bio: 'Expert in post-storm recovery and insurance documentation. After Gudrun and Per, I helped over 200 forest owners navigate damage assessment, emergency harvesting, and replanting. I also provide detailed reports suitable for insurance claims and financing applications.',
    years_experience: 15,
    languages: ['Swedish', 'English'],
    rating_avg: 4.6,
    rating_count: 58,
    is_verified: true,
    is_available: false,
  },
  {
    id: 'c-005',
    full_name: 'Karin Nilsson',
    avatar_initials: 'KN',
    avatar_color: '#558B2F',
    certification_number: 'SKS-8840',
    specialisations: ['Climate adaptation', 'Species diversification', 'Long-rotation forestry'],
    regions: ['Norrbotten', 'Västerbotten', 'Jämtland'],
    hourly_rate_sek: 1350,
    bio: 'Specialist in climate-resilient forestry for northern Sweden. I advise on transitioning from monoculture spruce to mixed stands, selecting climate-adapted seed provenance, and planning for longer rotation cycles to maximise carbon sequestration and resilience against future beetle outbreaks.',
    years_experience: 11,
    languages: ['Swedish', 'English', 'Finnish'],
    rating_avg: 4.9,
    rating_count: 19,
    is_verified: true,
    is_available: true,
  },
];

const ALL_SPECIALISATIONS = [
  'Bark beetle management',
  'FSC certification',
  'Carbon credit planning',
  'Harvest planning',
  'Storm damage assessment',
  'Climate adaptation',
  'Spruce health assessment',
  'Biodiversity assessment',
  'Thinning optimisation',
  'Insurance claims support',
];

const ALL_REGIONS = [
  'Kronoberg', 'Jönköping', 'Kalmar', 'Östergötland', 'Västra Götaland',
  'Halland', 'Skåne', 'Dalarna', 'Gävleborg', 'Uppsala', 'Södermanland',
  'Stockholm', 'Norrbotten', 'Västerbotten', 'Jämtland',
];

// ─── Star rating display ───

function StarRating({ value, count }: { value: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={11}
          className={s <= Math.round(value) ? 'text-amber-400 fill-amber-400' : 'text-[var(--border2)]'}
        />
      ))}
      <span className="text-[11px] font-semibold text-[var(--text2)] ml-0.5">{value.toFixed(1)}</span>
      <span className="text-[10px] text-[var(--text3)]">({count})</span>
    </div>
  );
}

// ─── Consultant card ───

function ConsultantCard({
  consultant,
  onBook,
}: {
  consultant: Consultant;
  onBook: (c: Consultant) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] overflow-hidden transition-all">
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ background: consultant.avatar_color }}
          >
            {consultant.avatar_initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[var(--text)]">{consultant.full_name}</h3>
                  {consultant.is_verified && (
                    <BadgeCheck size={15} className="text-[var(--green)] flex-shrink-0" />
                  )}
                  {!consultant.is_available && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg3)] text-[var(--text3)] border border-[var(--border)]">
                      Unavailable
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[var(--text3)] mt-0.5">
                  Cert. {consultant.certification_number} · {consultant.years_experience} yrs experience
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-[var(--text)]">
                  {consultant.hourly_rate_sek.toLocaleString('sv-SE')} kr
                </p>
                <p className="text-[10px] text-[var(--text3)]">per hour</p>
              </div>
            </div>

            <StarRating value={consultant.rating_avg} count={consultant.rating_count} />

            {/* Regions */}
            <div className="flex items-center gap-1 mt-2 flex-wrap">
              <MapPin size={11} className="text-[var(--text3)]" />
              <p className="text-[11px] text-[var(--text3)]">{consultant.regions.join(', ')}</p>
            </div>

            {/* Specialisations */}
            <div className="flex flex-wrap gap-1 mt-2">
              {consultant.specialisations.map((s) => (
                <span
                  key={s}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bio expand/collapse */}
        <div className="mt-3">
          <p className={`text-xs text-[var(--text2)] leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
            {consultant.bio}
          </p>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-[11px] text-[var(--green)] hover:underline mt-1"
          >
            {expanded ? 'Show less' : 'Read more'}
          </button>
        </div>

        {/* Languages */}
        <div className="flex items-center gap-2 mt-3">
          <Clock size={11} className="text-[var(--text3)]" />
          <p className="text-[11px] text-[var(--text3)]">Languages: {consultant.languages.join(', ')}</p>
        </div>
      </div>

      <div className="border-t border-[var(--border)] px-5 py-3 bg-[var(--bg)] flex items-center justify-between">
        <p className="text-[10px] text-[var(--text3)]">
          Platform fee 20% applies · Secure booking
        </p>
        <button
          onClick={() => onBook(consultant)}
          disabled={!consultant.is_available}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[var(--green)] text-white text-xs font-semibold hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Request consultation
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Booking form modal ───

function BookingModal({
  consultant,
  onClose,
}: {
  consultant: Consultant;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // Simulate API call (real: insert into consultant_bookings)
    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);
    setDone(true);
  };

  if (done) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-[var(--bg2)] rounded-2xl border border-[var(--border)] p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--green)]/10 border border-[var(--green)]/20 flex items-center justify-center mx-auto mb-4">
            <BadgeCheck size={24} className="text-[var(--green)]" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--text)] mb-2">Request sent!</h3>
          <p className="text-xs text-[var(--text3)] mb-6">
            {consultant.full_name} will be notified and should confirm within 24 hours. You will receive an email with booking details.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg bg-[var(--green)] text-white text-sm font-semibold hover:brightness-110 transition"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg2)] rounded-2xl border border-[var(--border)] w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text)]">
              Request consultation
            </h2>
            <p className="text-xs text-[var(--text3)] mt-0.5">with {consultant.full_name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Rate summary */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
            <div>
              <p className="text-xs font-medium text-[var(--text)]">Hourly rate</p>
              <p className="text-[10px] text-[var(--text3)]">20% platform fee applies</p>
            </div>
            <p className="text-sm font-bold text-[var(--text)]">
              {consultant.hourly_rate_sek.toLocaleString('sv-SE')} kr/hr
            </p>
          </div>

          {/* Preferred date */}
          <div>
            <label className="block text-xs font-medium text-[var(--text2)] mb-1.5">
              <Calendar size={12} className="inline mr-1" />
              Preferred date / time
            </label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] focus:outline-none focus:border-[var(--green)] transition-colors"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-[var(--text2)] mb-1.5">
              Describe your issue or question
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              required
              placeholder="e.g. I have a 12 ha spruce parcel in Kronoberg that I suspect has bark beetle activity. I need a remote assessment and advice on whether emergency harvesting is needed…"
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] placeholder-[var(--text3)] focus:outline-none focus:border-[var(--green)] transition-colors resize-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting || !notes.trim()}
              className="flex items-center gap-2 flex-1 justify-center py-2.5 rounded-lg bg-[var(--green)] text-white text-xs font-semibold hover:brightness-110 transition disabled:opacity-50"
            >
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
              {submitting ? 'Sending…' : 'Send request'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-xs font-medium text-[var(--text3)] border border-[var(--border)] hover:bg-[var(--bg3)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ───

export default function ConsultantMarketplacePage() {
  const [search, setSearch] = useState('');
  const [filterSpec, setFilterSpec] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [filterAvailable, setFilterAvailable] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [booking, setBooking] = useState<Consultant | null>(null);

  const filtered = useMemo(() => {
    return DEMO_CONSULTANTS.filter((c) => {
      if (
        search &&
        !c.full_name.toLowerCase().includes(search.toLowerCase()) &&
        !c.specialisations.some((s) => s.toLowerCase().includes(search.toLowerCase())) &&
        !c.regions.some((r) => r.toLowerCase().includes(search.toLowerCase()))
      )
        return false;
      if (filterSpec && !c.specialisations.some((s) => s.toLowerCase().includes(filterSpec.toLowerCase())))
        return false;
      if (filterRegion && !c.regions.includes(filterRegion)) return false;
      if (filterAvailable && !c.is_available) return false;
      if (minRating > 0 && c.rating_avg < minRating) return false;
      return true;
    });
  }, [search, filterSpec, filterRegion, filterAvailable, minRating]);

  return (
    <div className="p-4 lg:p-6 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-6">
        <Link to="/owner/dashboard" className="hover:text-[var(--text2)]">Dashboard</Link>
        <ChevronRight size={12} />
        <span className="text-[var(--text)]">Find a Forester</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-[var(--green)]/10 border border-[var(--green)]/20 flex items-center justify-center">
              <GraduationCap size={18} className="text-[var(--green)]" />
            </div>
            <h1 className="text-xl font-serif font-bold text-[var(--text)]">Find a Forester</h1>
          </div>
          <p className="text-xs text-[var(--text3)] ml-12">
            Book certified forestry consultants for expert advice. {filtered.length} consultants available.
          </p>
        </div>
        <Link
          to="/inspector/register"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
        >
          <Users size={13} />
          Are you a certified forester? Join the network →
        </Link>
      </div>

      {/* Search + filters */}
      <div className="space-y-3 mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, specialisation, or region…"
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg2)] text-xs text-[var(--text)] placeholder-[var(--text3)] focus:outline-none focus:border-[var(--green)] transition-colors"
            />
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
              showFilters
                ? 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/30'
                : 'text-[var(--text2)] border-[var(--border)] hover:bg-[var(--bg3)]'
            }`}
          >
            <Filter size={13} />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg2)] grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-1.5">
                Specialisation
              </label>
              <select
                value={filterSpec}
                onChange={(e) => setFilterSpec(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
              >
                <option value="">All specialisations</option>
                {ALL_SPECIALISATIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-1.5">
                Region
              </label>
              <select
                value={filterRegion}
                onChange={(e) => setFilterRegion(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
              >
                <option value="">All regions</option>
                {ALL_REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-1.5">
                Minimum rating
              </label>
              <select
                value={minRating}
                onChange={(e) => setMinRating(parseFloat(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
              >
                <option value={0}>Any rating</option>
                <option value={4.0}>4.0+</option>
                <option value={4.5}>4.5+</option>
                <option value={4.8}>4.8+</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterAvailable}
                  onChange={(e) => setFilterAvailable(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--border)] accent-[var(--green)]"
                />
                <span className="text-xs text-[var(--text2)]">Available now only</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <GraduationCap size={32} className="mx-auto mb-3 text-[var(--text3)] opacity-50" />
          <p className="text-sm text-[var(--text2)]">No consultants match your filters</p>
          <button
            onClick={() => {
              setSearch('');
              setFilterSpec('');
              setFilterRegion('');
              setFilterAvailable(false);
              setMinRating(0);
            }}
            className="mt-3 text-xs text-[var(--green)] hover:underline"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((c) => (
            <ConsultantCard key={c.id} consultant={c} onBook={setBooking} />
          ))}
        </div>
      )}

      {/* Booking modal */}
      {booking && (
        <BookingModal consultant={booking} onClose={() => setBooking(null)} />
      )}
    </div>
  );
}
