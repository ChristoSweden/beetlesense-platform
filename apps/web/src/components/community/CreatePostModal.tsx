import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  AlertTriangle,
  Lightbulb,
  HelpCircle,
  Package,
  MessagesSquare,
  MapPin,
  Eye,
  EyeOff,
  Send,
} from 'lucide-react';
import type { PostType, NewPostPayload, SwedishCounty } from '@/hooks/useCommunityFeed';

// ─── Post type options ───

interface PostTypeOption {
  type: PostType;
  icon: React.ReactNode;
  colorClass: string;
}

const POST_TYPE_OPTIONS: PostTypeOption[] = [
  { type: 'alert', icon: <AlertTriangle size={16} />, colorClass: 'text-amber-400 border-amber-400/30 bg-amber-400/10' },
  { type: 'tip', icon: <Lightbulb size={16} />, colorClass: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' },
  { type: 'request', icon: <HelpCircle size={16} />, colorClass: 'text-blue-400 border-blue-400/30 bg-blue-400/10' },
  { type: 'offer', icon: <Package size={16} />, colorClass: 'text-purple-400 border-purple-400/30 bg-purple-400/10' },
  { type: 'discussion', icon: <MessagesSquare size={16} />, colorClass: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10' },
];

// ─── Props ───

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: NewPostPayload) => void;
  county: SwedishCounty | string;
}

export function CreatePostModal({ isOpen, onClose, onSubmit, county }: CreatePostModalProps) {
  const { t } = useTranslation();
  const [type, setType] = useState<PostType>('discussion');
  const [content, setContent] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  if (!isOpen) return null;

  const canSubmit = content.trim().length >= 10;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      type,
      content: content.trim(),
      municipality: municipality.trim() || undefined,
      county,
      is_anonymous: isAnonymous,
    });
    // Reset
    setContent('');
    setMunicipality('');
    setType('discussion');
    setIsAnonymous(true);
    setShowPreview(false);
    onClose();
  };

  const selectedConfig = POST_TYPE_OPTIONS.find((o) => o.type === type)!;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden"
        style={{ background: 'var(--bg2)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--text)]">
            {t('community.createPost')}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Post type selector */}
          <div>
            <label className="text-xs font-medium text-[var(--text2)] mb-2 block">
              {t('community.postType')}
            </label>
            <div className="flex flex-wrap gap-2">
              {POST_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.type}
                  onClick={() => setType(option.type)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                    type === option.type
                      ? option.colorClass
                      : 'text-[var(--text3)] border-[var(--border)] hover:border-[var(--border2)]'
                  }`}
                >
                  {option.icon}
                  {t(`community.types.${option.type}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          {!showPreview ? (
            <div>
              <label className="text-xs font-medium text-[var(--text2)] mb-2 block">
                {t('community.content')}
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t('community.contentPlaceholder')}
                rows={5}
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]/40 resize-none"
              />
              <p className="text-[10px] text-[var(--text3)] mt-1">
                {content.length} / {t('community.minChars')}
              </p>
            </div>
          ) : (
            /* Preview */
            <div className="rounded-lg border border-[var(--border)] p-4" style={{ background: 'var(--bg)' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${selectedConfig.colorClass}`}>
                  {selectedConfig.icon}
                  {t(`community.types.${type}`)}
                </span>
              </div>
              <p className="text-xs text-[var(--text2)] mb-2">
                {isAnonymous
                  ? t('community.authorAnonymous', { county })
                  : 'You'}
              </p>
              <p className="text-sm text-[var(--text)] whitespace-pre-wrap leading-relaxed">
                {content || t('community.previewEmpty')}
              </p>
              {municipality && (
                <div className="flex items-center gap-1 mt-2">
                  <MapPin size={10} className="text-[var(--text3)]" />
                  <span className="text-[10px] text-[var(--text3)]">{municipality}, {county}</span>
                </div>
              )}
            </div>
          )}

          {/* Location (optional) */}
          {!showPreview && (
            <div>
              <label className="text-xs font-medium text-[var(--text2)] mb-2 block">
                <MapPin size={12} className="inline mr-1" />
                {t('community.location')} <span className="text-[var(--text3)]">({t('community.optional')})</span>
              </label>
              <input
                type="text"
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
                placeholder={t('community.locationPlaceholder')}
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]/40"
              />
            </div>
          )}

          {/* Anonymous toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isAnonymous ? (
                <EyeOff size={14} className="text-[var(--text3)]" />
              ) : (
                <Eye size={14} className="text-[var(--green)]" />
              )}
              <span className="text-xs text-[var(--text2)]">
                {t('community.anonymous')}
              </span>
            </div>
            <button
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                isAnonymous ? 'bg-[var(--green)]' : 'bg-[var(--bg3)]'
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  isAnonymous ? 'left-5.5 translate-x-0' : 'left-0.5'
                }`}
                style={{ left: isAnonymous ? '22px' : '2px' }}
              />
            </button>
          </div>
          <p className="text-[10px] text-[var(--text3)] -mt-2">
            {isAnonymous
              ? t('community.anonymousHint', { county })
              : t('community.visibleHint')}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--border)]">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="text-xs font-medium text-[var(--text3)] hover:text-[var(--text2)] transition-colors"
          >
            {showPreview ? t('community.editPost') : t('community.preview')}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--green)] text-[#030d05] hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send size={13} />
              {t('community.publish')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
