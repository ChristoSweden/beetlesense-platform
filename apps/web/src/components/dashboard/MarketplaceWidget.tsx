import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Store, ChevronRight, Plus, Star, MapPin } from 'lucide-react';
import { useMarketplace } from '@/hooks/useMarketplace';

export function MarketplaceWidget() {
  const { t } = useTranslation();
  const { nearbyCount, featuredListing, loading, getDistance } = useMarketplace();

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Store size={16} className="text-[var(--green)]" />
          <h3 className="text-sm font-semibold text-[var(--text)]">
            {t('marketplace.widget.title')}
          </h3>
        </div>
        {nearbyCount > 0 && (
          <span className="text-[10px] font-mono text-[var(--green)] bg-[var(--green)]/10 px-2 py-0.5 rounded-full">
            {nearbyCount} {t('marketplace.widget.nearby')}
          </span>
        )}
      </div>

      {loading ? (
        <div className="h-16 rounded-lg bg-[var(--bg3)] animate-pulse" />
      ) : featuredListing ? (
        <Link
          to="/owner/marketplace"
          className="block p-3 rounded-lg border border-[var(--border)] mb-3 hover:border-[var(--border2)] transition-colors"
          style={{ background: 'var(--bg)' }}
        >
          <p className="text-xs font-medium text-[var(--text)] mb-1 line-clamp-1">
            {featuredListing.title}
          </p>
          <div className="flex items-center gap-2 text-[10px] text-[var(--text3)]">
            <span>{featuredListing.seller.name}</span>
            <span>&middot;</span>
            <span className="flex items-center gap-0.5">
              <Star size={9} className="text-amber-400" fill="currentColor" />
              {featuredListing.seller.rating}
            </span>
            {getDistance(featuredListing) !== null && (
              <>
                <span>&middot;</span>
                <span className="flex items-center gap-0.5">
                  <MapPin size={9} />
                  {getDistance(featuredListing)} km
                </span>
              </>
            )}
          </div>
          <p className="text-xs font-semibold text-[var(--green)] mt-1">
            {featuredListing.price_type === 'free'
              ? t('marketplace.free')
              : `${featuredListing.price} kr`}
          </p>
        </Link>
      ) : (
        <div className="p-3 rounded-lg border border-[var(--border)] mb-3 text-center" style={{ background: 'var(--bg)' }}>
          <p className="text-xs text-[var(--text3)]">
            {t('marketplace.widget.noListings')}
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <Link
          to="/owner/marketplace"
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--green)] hover:bg-[var(--green)]/5 transition-colors"
        >
          {t('marketplace.widget.browse')}
          <ChevronRight size={14} />
        </Link>
        <Link
          to="/owner/marketplace?create=true"
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium bg-[var(--green)] text-[#030d05] hover:bg-[var(--green2)] transition-colors"
        >
          <Plus size={13} />
          {t('marketplace.widget.post')}
        </Link>
      </div>
    </div>
  );
}
