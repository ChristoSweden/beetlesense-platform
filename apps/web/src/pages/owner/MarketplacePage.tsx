import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import {
  Store,
  Search,
  Plus,
  SlidersHorizontal,
  TreePine,
  Wrench,
  Leaf,
  BookOpen,
  Map,
  LayoutGrid,
  X,
} from 'lucide-react';
import { useMarketplace, type ListingCategory, type MarketplaceListing } from '@/hooks/useMarketplace';
import { ListingCard } from '@/components/marketplace/ListingCard';
import { CreateListingModal } from '@/components/marketplace/CreateListingModal';
import { SellerProfile } from '@/components/marketplace/SellerProfile';
import { BookingFlow } from '@/components/marketplace/BookingFlow';
import { MarketplaceMap } from '@/components/marketplace/MarketplaceMap';

const TABS: { id: ListingCategory; icon: typeof TreePine }[] = [
  { id: 'services', icon: TreePine },
  { id: 'equipment', icon: Wrench },
  { id: 'materials', icon: Leaf },
  { id: 'knowledge', icon: BookOpen },
];

const COUNTIES = ['Kronoberg', 'Jönköping', 'Kalmar', 'Östergötland', 'Småland', 'Halland'];

export default function MarketplacePage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const {
    filteredListings,
    loading,
    error,
    filters,
    setFilters,
    getDistance,
    getSellerListings,
    getSellerReviews,
    createListing,
    createBooking,
  } = useMarketplace();

  // View mode
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [showCreate, setShowCreate] = useState(searchParams.get('create') === 'true');
  const [sellerListing, setSellerListing] = useState<MarketplaceListing | null>(null);
  const [bookingListing, setBookingListing] = useState<MarketplaceListing | null>(null);
  const [contactListing, setContactListing] = useState<MarketplaceListing | null>(null);

  const handleSellerClick = useCallback((listing: MarketplaceListing) => {
    setSellerListing(listing);
  }, []);

  const handleListingFromMap = useCallback((listing: MarketplaceListing) => {
    setBookingListing(listing);
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-5">
        {/* Page header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Store size={20} className="text-[var(--green)]" />
              <h1 className="text-lg font-serif font-bold text-[var(--text)]">
                {t('marketplace.pageTitle')}
              </h1>
            </div>
            <p className="text-xs text-[var(--text3)]">
              {t('marketplace.pageSubtitle')}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-[var(--green)] text-[#030d05] hover:bg-[var(--green2)] transition-colors"
          >
            <Plus size={14} />
            {t('marketplace.createListing')}
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          <button
            onClick={() => setFilters({ category: null })}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              !filters.category
                ? 'bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/30'
                : 'border border-[var(--border)] text-[var(--text3)] hover:bg-[var(--bg3)]'
            }`}
          >
            {t('marketplace.allCategories')}
          </button>
          {TABS.map(({ id, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setFilters({ category: filters.category === id ? null : id })}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                filters.category === id
                  ? 'bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/30'
                  : 'border border-[var(--border)] text-[var(--text3)] hover:bg-[var(--bg3)]'
              }`}
            >
              <Icon size={14} />
              {t(`marketplace.tabs.${id}`)}
            </button>
          ))}
        </div>

        {/* Search + filter bar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
              placeholder={t('marketplace.searchPlaceholder')}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]"
            />
          </div>

          {/* Sort */}
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters({ sortBy: e.target.value as any })}
            className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
          >
            <option value="newest">{t('marketplace.sort.newest')}</option>
            <option value="price_asc">{t('marketplace.sort.priceAsc')}</option>
            <option value="price_desc">{t('marketplace.sort.priceDesc')}</option>
            <option value="distance">{t('marketplace.sort.distance')}</option>
            <option value="rating">{t('marketplace.sort.rating')}</option>
          </select>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg border transition-colors ${
              showFilters
                ? 'border-[var(--green)] bg-[var(--green)]/10 text-[var(--green)]'
                : 'border-[var(--border)] text-[var(--text3)] hover:bg-[var(--bg3)]'
            }`}
          >
            <SlidersHorizontal size={16} />
          </button>

          {/* View toggle */}
          <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-[var(--green)]/10 text-[var(--green)]' : 'text-[var(--text3)] hover:bg-[var(--bg3)]'}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`p-2 transition-colors ${viewMode === 'map' ? 'bg-[var(--green)]/10 text-[var(--green)]' : 'text-[var(--text3)] hover:bg-[var(--bg3)]'}`}
            >
              <Map size={16} />
            </button>
          </div>
        </div>

        {/* Extended filters */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-3 mb-4 p-4 rounded-xl border border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
            {/* County */}
            <div>
              <label className="block text-[10px] font-medium text-[var(--text3)] mb-1 uppercase tracking-wider">
                {t('marketplace.countyFilter')}
              </label>
              <select
                value={filters.county ?? ''}
                onChange={(e) => setFilters({ county: e.target.value || null })}
                className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
              >
                <option value="">{t('marketplace.allCounties')}</option>
                {COUNTIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Max distance */}
            <div>
              <label className="block text-[10px] font-medium text-[var(--text3)] mb-1 uppercase tracking-wider">
                {t('marketplace.maxDistance')}
              </label>
              <select
                value={filters.maxDistance ?? ''}
                onChange={(e) => setFilters({ maxDistance: e.target.value ? Number(e.target.value) : null })}
                className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
              >
                <option value="">{t('marketplace.anyDistance')}</option>
                <option value="25">25 km</option>
                <option value="50">50 km</option>
                <option value="100">100 km</option>
                <option value="200">200 km</option>
              </select>
            </div>

            {/* Price type */}
            <div>
              <label className="block text-[10px] font-medium text-[var(--text3)] mb-1 uppercase tracking-wider">
                {t('marketplace.priceFilter')}
              </label>
              <select
                value={filters.priceType ?? ''}
                onChange={(e) => setFilters({ priceType: (e.target.value || null) as any })}
                className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
              >
                <option value="">{t('marketplace.allPrices')}</option>
                <option value="free">{t('marketplace.free')}</option>
                <option value="fixed">{t('marketplace.paid')}</option>
                <option value="exchange">{t('marketplace.exchange')}</option>
              </select>
            </div>

            {/* Clear filters */}
            <button
              onClick={() => setFilters({ county: null, maxDistance: null, priceType: null, priceRange: null })}
              className="flex items-center gap-1 px-3 py-1.5 mt-4 rounded-lg text-[10px] font-medium text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
            >
              <X size={12} />
              {t('marketplace.clearFilters')}
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Results count */}
        <p className="text-xs text-[var(--text3)] mb-4">
          {filteredListings.length} {t('marketplace.listingsFound')}
        </p>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 rounded-xl bg-[var(--bg2)] border border-[var(--border)] animate-pulse" />
            ))}
          </div>
        ) : viewMode === 'map' ? (
          <div className="h-[600px] rounded-xl overflow-hidden">
            <MarketplaceMap
              listings={filteredListings}
              onListingClick={handleListingFromMap}
            />
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-16">
            <Store size={32} className="mx-auto text-[var(--text3)] mb-3 opacity-40" />
            <p className="text-sm text-[var(--text3)] mb-2">{t('marketplace.noListings')}</p>
            <button
              onClick={() => setShowCreate(true)}
              className="text-xs text-[var(--green)] hover:underline"
            >
              {t('marketplace.beFirst')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                distance={getDistance(listing)}
                onContact={(l) => setContactListing(l)}
                onBook={(l) => setBookingListing(l)}
                onSellerClick={handleSellerClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Listing Modal */}
      <CreateListingModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={createListing}
      />

      {/* Seller Profile Modal */}
      <SellerProfile
        isOpen={!!sellerListing}
        onClose={() => setSellerListing(null)}
        listing={sellerListing}
        sellerListings={sellerListing ? getSellerListings(sellerListing.seller.id) : []}
        reviews={sellerListing ? getSellerReviews(sellerListing.seller.id) : []}
        onListingClick={(l) => setBookingListing(l)}
      />

      {/* Booking Flow Modal */}
      <BookingFlow
        isOpen={!!bookingListing}
        onClose={() => setBookingListing(null)}
        listing={bookingListing}
        onBook={createBooking}
      />

      {/* Contact Modal (simple) */}
      {contactListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setContactListing(null)} />
          <div
            className="relative w-full max-w-sm rounded-2xl border border-[var(--border)] shadow-2xl mx-4 p-5"
            style={{ background: 'var(--bg2)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-serif font-bold text-[var(--text)]">
                {t('marketplace.contactSeller')}
              </h2>
              <button
                onClick={() => setContactListing(null)}
                className="p-1.5 rounded-lg hover:bg-[var(--bg3)] transition-colors"
              >
                <X size={18} className="text-[var(--text3)]" />
              </button>
            </div>
            <div className="p-4 rounded-lg border border-[var(--border)] space-y-3" style={{ background: 'var(--bg)' }}>
              <p className="text-xs font-medium text-[var(--text)]">{contactListing.seller.name}</p>
              <p className="text-xs text-[var(--text3)]">{contactListing.seller.county}</p>
              <p className="text-xs text-[var(--text2)]">
                {contactListing.seller.name.split(' ')[0].toLowerCase()}@skog.se
              </p>
              <p className="text-xs text-[var(--text2)]">+46 70 123 4567</p>
            </div>
            <p className="text-[10px] text-[var(--text3)] mt-3 text-center">
              {t('marketplace.contactNote')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
