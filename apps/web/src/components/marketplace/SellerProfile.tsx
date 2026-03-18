import { useTranslation } from 'react-i18next';
import {
  X,
  Star,
  MapPin,
  TreePine,
  Clock,
  MessageCircle,
  Award,
  ChevronRight,
} from 'lucide-react';
import type { MarketplaceListing, SellerReview } from '@/hooks/useMarketplace';

interface SellerProfileProps {
  isOpen: boolean;
  onClose: () => void;
  listing: MarketplaceListing | null;
  sellerListings: MarketplaceListing[];
  reviews: SellerReview[];
  onListingClick: (listing: MarketplaceListing) => void;
}

export function SellerProfile({
  isOpen,
  onClose,
  listing,
  sellerListings,
  reviews,
  onListingClick,
}: SellerProfileProps) {
  const { t } = useTranslation();

  if (!isOpen || !listing) return null;

  const seller = listing.seller;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-[var(--border)] shadow-2xl mx-4"
        style={{ background: 'var(--bg2)' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
          <h2 className="text-base font-serif font-bold text-[var(--text)]">
            {t('marketplace.sellerProfile')}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg3)] transition-colors"
            aria-label={t('common.close')}
          >
            <X size={18} className="text-[var(--text3)]" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Seller header */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[var(--bg3)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-semibold text-[var(--green)]">
                {seller.name.charAt(0)}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text)]">
                {seller.name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-[var(--text3)] mt-0.5">
                <MapPin size={11} />
                <span>{seller.county}</span>
                <span>&middot;</span>
                <Star size={11} className="text-amber-400" fill="currentColor" />
                <span>{seller.rating} ({seller.review_count})</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border border-[var(--border)] text-center" style={{ background: 'var(--bg)' }}>
              <p className="text-lg font-semibold font-mono text-[var(--green)]">
                {seller.experience_years}
              </p>
              <p className="text-[10px] text-[var(--text3)]">{t('marketplace.yearsExp')}</p>
            </div>
            <div className="p-3 rounded-lg border border-[var(--border)] text-center" style={{ background: 'var(--bg)' }}>
              <p className="text-lg font-semibold font-mono text-[var(--green)]">
                {seller.forest_ha}
              </p>
              <p className="text-[10px] text-[var(--text3)]">{t('marketplace.hectares')}</p>
            </div>
            <div className="p-3 rounded-lg border border-[var(--border)] text-center" style={{ background: 'var(--bg)' }}>
              <p className="text-lg font-semibold font-mono text-[var(--green)]">
                {seller.rating}
              </p>
              <p className="text-[10px] text-[var(--text3)]">{t('marketplace.rating')}</p>
            </div>
          </div>

          {/* Response time */}
          <div className="flex items-center gap-2 p-3 rounded-lg border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
            <Clock size={14} className="text-[var(--green)]" />
            <span className="text-xs text-[var(--text2)]">
              {t('marketplace.responseTime')}: <span className="font-medium text-[var(--text)]">{seller.response_time}</span>
            </span>
          </div>

          {/* Specialties */}
          <div>
            <h4 className="text-xs font-semibold text-[var(--text2)] mb-2 flex items-center gap-1.5">
              <Award size={13} />
              {t('marketplace.specialties')}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {seller.specialties.map((s) => (
                <span
                  key={s}
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Active listings */}
          {sellerListings.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[var(--text2)] mb-2 flex items-center gap-1.5">
                <TreePine size={13} />
                {t('marketplace.activeListings')} ({sellerListings.length})
              </h4>
              <div className="space-y-2">
                {sellerListings.map((sl) => (
                  <button
                    key={sl.id}
                    onClick={() => { onListingClick(sl); onClose(); }}
                    className="flex items-center justify-between w-full p-3 rounded-lg border border-[var(--border)] text-left hover:bg-[var(--bg3)] transition-colors"
                  >
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="text-xs font-medium text-[var(--text)] truncate">{sl.title}</p>
                      <p className="text-[10px] text-[var(--text3)]">
                        {sl.price_type === 'free' ? t('marketplace.free') : `${sl.price} kr`}
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-[var(--text3)] flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          {reviews.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[var(--text2)] mb-2 flex items-center gap-1.5">
                <Star size={13} />
                {t('marketplace.reviews')} ({reviews.length})
              </h4>
              <div className="space-y-2">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="p-3 rounded-lg border border-[var(--border)]"
                    style={{ background: 'var(--bg)' }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-[var(--text)]">
                        {review.author_name}
                      </span>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={10}
                            className={i < review.rating ? 'text-amber-400' : 'text-[var(--border)]'}
                            fill={i < review.rating ? 'currentColor' : 'none'}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-[var(--text3)] mb-1">{review.comment}</p>
                    <p className="text-[10px] text-[var(--text3)]">
                      {new Date(review.date).toLocaleDateString('sv-SE')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Message button */}
          <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[var(--green)] text-[#030d05] text-sm font-medium hover:bg-[var(--green2)] transition-colors">
            <MessageCircle size={15} />
            {t('marketplace.messageSeller')}
          </button>
        </div>
      </div>
    </div>
  );
}
