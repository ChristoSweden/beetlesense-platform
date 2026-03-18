import { useTranslation } from 'react-i18next';
import {
  MapPin,
  Star,
  Clock,
  MessageCircle,
  CalendarCheck,
  TreePine,
  Wrench,
  Leaf,
  BookOpen,
} from 'lucide-react';
import type { MarketplaceListing, ListingCategory } from '@/hooks/useMarketplace';

const CATEGORY_CONFIG: Record<ListingCategory, { icon: typeof TreePine; colorClass: string }> = {
  services: { icon: TreePine, colorClass: 'text-[var(--green)] bg-[var(--green)]/10' },
  equipment: { icon: Wrench, colorClass: 'text-amber-400 bg-amber-400/10' },
  materials: { icon: Leaf, colorClass: 'text-emerald-400 bg-emerald-400/10' },
  knowledge: { icon: BookOpen, colorClass: 'text-sky-400 bg-sky-400/10' },
};

interface ListingCardProps {
  listing: MarketplaceListing;
  distance: number | null;
  onContact: (listing: MarketplaceListing) => void;
  onBook: (listing: MarketplaceListing) => void;
  onSellerClick: (listing: MarketplaceListing) => void;
}

export function ListingCard({ listing, distance, onContact, onBook, onSellerClick }: ListingCardProps) {
  const { t } = useTranslation();
  const config = CATEGORY_CONFIG[listing.category];
  const CategoryIcon = config.icon;

  const priceLabel = listing.price_type === 'free'
    ? t('marketplace.free')
    : listing.price_type === 'exchange'
      ? t('marketplace.exchange')
      : `${listing.price} kr${listing.price_unit ? ` ${listing.price_unit}` : ''}`;

  const createdDate = new Date(listing.created_at).toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <div
      className="rounded-xl border border-[var(--border)] overflow-hidden hover:border-[var(--border2)] transition-colors"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Photo strip or placeholder */}
      {listing.photos.length > 0 ? (
        <div className="h-32 bg-[var(--bg3)] flex gap-1 overflow-hidden">
          {listing.photos.slice(0, 3).map((p, i) => (
            <img key={i} src={p} alt="" className="h-full w-1/3 object-cover" />
          ))}
        </div>
      ) : (
        <div className="h-2 rounded-t-xl" style={{
          background: listing.category === 'services' ? 'var(--green)' :
            listing.category === 'equipment' ? '#fbbf24' :
            listing.category === 'materials' ? '#34d399' : '#38bdf8',
          opacity: 0.3,
        }} />
      )}

      <div className="p-4">
        {/* Category badge + date */}
        <div className="flex items-center justify-between mb-2">
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full ${config.colorClass}`}>
            <CategoryIcon size={11} />
            {t(`marketplace.tabs.${listing.category}`)}
          </span>
          <span className="text-[10px] text-[var(--text3)]">
            <Clock size={10} className="inline mr-1" />
            {createdDate}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-[var(--text)] mb-1.5 line-clamp-2">
          {listing.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-[var(--text3)] mb-3 line-clamp-2">
          {listing.description}
        </p>

        {/* Price */}
        <div className="mb-3">
          <span className={`text-sm font-semibold ${listing.price_type === 'free' ? 'text-[var(--green)]' : 'text-[var(--text)]'}`}>
            {priceLabel}
          </span>
          {listing.duration && (
            <span className="text-[10px] text-[var(--text3)] ml-2">
              {listing.duration}
            </span>
          )}
        </div>

        {/* Seller info */}
        <button
          onClick={() => onSellerClick(listing)}
          className="flex items-center gap-3 w-full p-2.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg3)] transition-colors mb-3 text-left"
        >
          <div className="w-8 h-8 rounded-full bg-[var(--bg3)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-[var(--green)]">
              {listing.seller.name.charAt(0)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[var(--text)] truncate">
                {listing.seller.name}
              </span>
              <span className="flex items-center gap-0.5 text-[10px] text-amber-400">
                <Star size={10} fill="currentColor" />
                {listing.seller.rating}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-[var(--text3)]">
              <span>{listing.seller.county}</span>
              <span>&middot;</span>
              <span>{listing.seller.experience_years} {t('marketplace.yearsExp')}</span>
              {distance !== null && (
                <>
                  <span>&middot;</span>
                  <span className="flex items-center gap-0.5">
                    <MapPin size={9} />
                    {distance} km
                  </span>
                </>
              )}
            </div>
          </div>
        </button>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onContact(listing)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
          >
            <MessageCircle size={13} />
            {t('marketplace.contact')}
          </button>
          <button
            onClick={() => onBook(listing)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-[var(--green)] text-[#030d05] hover:bg-[var(--green2)] transition-colors"
          >
            <CalendarCheck size={13} />
            {t('marketplace.book')}
          </button>
        </div>
      </div>
    </div>
  );
}
