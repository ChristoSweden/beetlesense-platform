import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, Image, TreePine, Wrench, Leaf, BookOpen } from 'lucide-react';
import type { ListingCategory, PriceType, CreateListingData } from '@/hooks/useMarketplace';

const CATEGORY_OPTIONS: { id: ListingCategory; icon: typeof TreePine }[] = [
  { id: 'services', icon: TreePine },
  { id: 'equipment', icon: Wrench },
  { id: 'materials', icon: Leaf },
  { id: 'knowledge', icon: BookOpen },
];

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: CreateListingData) => void;
}

export function CreateListingModal({ isOpen, onClose, onCreate }: CreateListingModalProps) {
  const { t } = useTranslation();
  const [category, setCategory] = useState<ListingCategory>('services');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceType, setPriceType] = useState<PriceType>('fixed');
  const [price, setPrice] = useState('');
  const [priceUnit, setPriceUnit] = useState('per dag');
  const [duration, setDuration] = useState('');
  const [availStart, setAvailStart] = useState('');
  const [availEnd, setAvailEnd] = useState('');
  const [location, setLocation] = useState('');
  const [qualNotes, setQualNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      category,
      title,
      description,
      price_type: priceType,
      price: priceType === 'fixed' ? Number(price) : null,
      price_unit: priceType === 'fixed' ? priceUnit : null,
      duration: duration || null,
      availability_start: availStart || null,
      availability_end: availEnd || null,
      location,
      photos: [],
      qualification_notes: qualNotes || null,
    });
    onClose();
    // Reset
    setTitle('');
    setDescription('');
    setPrice('');
    setDuration('');
    setAvailStart('');
    setAvailEnd('');
    setLocation('');
    setQualNotes('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--border)] shadow-2xl mx-4"
        style={{ background: 'var(--bg2)' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
          <h2 className="text-base font-serif font-bold text-[var(--text)]">
            {t('marketplace.createListing')}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg3)] transition-colors"
            aria-label={t('common.close')}
          >
            <X size={18} className="text-[var(--text3)]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Category selector */}
          <div>
            <label className="block text-xs font-medium text-[var(--text2)] mb-2">
              {t('marketplace.category')}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORY_OPTIONS.map(({ id, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCategory(id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-colors ${
                    category === id
                      ? 'border-[var(--green)] bg-[var(--green)]/10 text-[var(--green)]'
                      : 'border-[var(--border)] text-[var(--text3)] hover:bg-[var(--bg3)]'
                  }`}
                >
                  <Icon size={18} />
                  {t(`marketplace.tabs.${id}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-[var(--text2)] mb-1.5">
              {t('marketplace.titleLabel')}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder={t('marketplace.titlePlaceholder')}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-[var(--text2)] mb-1.5">
              {t('marketplace.descriptionLabel')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              placeholder={t('marketplace.descriptionPlaceholder')}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)] resize-none"
            />
          </div>

          {/* Price type toggle */}
          <div>
            <label className="block text-xs font-medium text-[var(--text2)] mb-2">
              {t('marketplace.priceLabel')}
            </label>
            <div className="flex gap-2 mb-3">
              {(['fixed', 'free', 'exchange'] as PriceType[]).map((pt) => (
                <button
                  key={pt}
                  type="button"
                  onClick={() => setPriceType(pt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    priceType === pt
                      ? 'border-[var(--green)] bg-[var(--green)]/10 text-[var(--green)]'
                      : 'border-[var(--border)] text-[var(--text3)] hover:bg-[var(--bg3)]'
                  }`}
                >
                  {t(`marketplace.priceType.${pt}`)}
                </button>
              ))}
            </div>
            {priceType === 'fixed' && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    min={0}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
                  />
                </div>
                <select
                  value={priceUnit}
                  onChange={(e) => setPriceUnit(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
                >
                  <option value="per timme">{t('marketplace.perHour')}</option>
                  <option value="per dag">{t('marketplace.perDay')}</option>
                  <option value="per halvdag">{t('marketplace.perHalfDay')}</option>
                  <option value="per styck">{t('marketplace.perPiece')}</option>
                  <option value="per planta">{t('marketplace.perPlant')}</option>
                  <option value="per uppdrag">{t('marketplace.perJob')}</option>
                </select>
              </div>
            )}
          </div>

          {/* Duration (for services) */}
          {(category === 'services' || category === 'knowledge') && (
            <div>
              <label className="block text-xs font-medium text-[var(--text2)] mb-1.5">
                {t('marketplace.durationLabel')}
              </label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder={t('marketplace.durationPlaceholder')}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]"
              />
            </div>
          )}

          {/* Availability dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text2)] mb-1.5">
                {t('marketplace.availFrom')}
              </label>
              <input
                type="date"
                value={availStart}
                onChange={(e) => setAvailStart(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text2)] mb-1.5">
                {t('marketplace.availTo')}
              </label>
              <input
                type="date"
                value={availEnd}
                onChange={(e) => setAvailEnd(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-medium text-[var(--text2)] mb-1.5">
              {t('marketplace.locationLabel')}
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              placeholder={t('marketplace.locationPlaceholder')}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]"
            />
          </div>

          {/* Photo upload area */}
          <div>
            <label className="block text-xs font-medium text-[var(--text2)] mb-1.5">
              {t('marketplace.photos')} ({t('marketplace.photosMax')})
            </label>
            <div className="flex gap-2">
              {[0, 1, 2, 3].map((i) => (
                <button
                  key={i}
                  type="button"
                  className="w-16 h-16 rounded-lg border border-dashed border-[var(--border)] flex items-center justify-center text-[var(--text3)] hover:bg-[var(--bg3)] transition-colors"
                >
                  {i === 0 ? <Plus size={16} /> : <Image size={14} />}
                </button>
              ))}
            </div>
          </div>

          {/* Qualification notes */}
          <div>
            <label className="block text-xs font-medium text-[var(--text2)] mb-1.5">
              {t('marketplace.qualNotes')}
            </label>
            <textarea
              value={qualNotes}
              onChange={(e) => setQualNotes(e.target.value)}
              rows={2}
              placeholder={t('marketplace.qualNotesPlaceholder')}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)] resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!title || !description || !location}
            className="w-full py-2.5 rounded-lg text-sm font-medium bg-[var(--green)] text-[#030d05] hover:bg-[var(--green2)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={14} className="inline mr-1.5" />
            {t('marketplace.publishListing')}
          </button>
        </form>
      </div>
    </div>
  );
}
