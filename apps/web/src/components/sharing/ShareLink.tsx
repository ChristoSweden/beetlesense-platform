import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link2, Copy, Check, Lock, Clock } from 'lucide-react';
import type { GeneratedLink } from '@/hooks/useParcelSharing';

const EXPIRY_OPTIONS = [
  { value: '24h', labelKey: 'sharing.expires24h' },
  { value: '7d', labelKey: 'sharing.expires7d' },
  { value: '30d', labelKey: 'sharing.expires30d' },
  { value: 'permanent', labelKey: 'sharing.expiresPermanent' },
];

interface ShareLinkProps {
  parcelId: string;
  onGenerateLink: (
    parcelId: string,
    expiresIn: string,
    password?: string,
  ) => Promise<GeneratedLink | null>;
  isLoading?: boolean;
}

export function ShareLink({ parcelId, onGenerateLink, isLoading }: ShareLinkProps) {
  const { t } = useTranslation();
  const [expiresIn, setExpiresIn] = useState('7d');
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await onGenerateLink(
        parcelId,
        expiresIn,
        usePassword ? password : undefined,
      );
      if (result) {
        const baseUrl = window.location.origin;
        const link = `${baseUrl}/share/${result.share_token}`;
        setGeneratedLink(link);
      }
    } catch {
      // Error handled by hook
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = generatedLink;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Link2 size={14} className="text-[var(--green)]" />
        <h3 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wide">
          {t('sharing.shareLink')}
        </h3>
      </div>

      {/* Expiry selector */}
      <div>
        <label className="text-[11px] text-[var(--text3)] block mb-1.5">
          <Clock size={10} className="inline mr-1" />
          {t('sharing.linkExpiry')}
        </label>
        <div className="flex gap-1.5">
          {EXPIRY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setExpiresIn(opt.value)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                expiresIn === opt.value
                  ? 'bg-[var(--green)] text-[var(--bg)]'
                  : 'border border-[var(--border)] text-[var(--text3)] hover:text-[var(--text2)] hover:border-[var(--border2)]'
              }`}
            >
              {t(opt.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Password protection */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={usePassword}
            onChange={(e) => setUsePassword(e.target.checked)}
            className="rounded border-[var(--border)] bg-[var(--bg3)] text-[var(--green)] focus:ring-[var(--green)]"
          />
          <span className="text-xs text-[var(--text2)] flex items-center gap-1">
            <Lock size={10} />
            {t('sharing.passwordProtection')}
          </span>
        </label>
        {usePassword && (
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('sharing.enterPassword')}
            className="mt-2 w-full px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]/50 focus:ring-1 focus:ring-[var(--green)]/20"
          />
        )}
      </div>

      {/* Generate button */}
      {!generatedLink ? (
        <button
          onClick={handleGenerate}
          disabled={generating || isLoading || (usePassword && !password)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg3)] border border-[var(--border)] text-xs font-semibold text-[var(--text2)] hover:text-[var(--green)] hover:border-[var(--green)]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Link2 size={14} />
          {generating ? t('common.loading') : t('sharing.generateLink')}
        </button>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={generatedLink}
              readOnly
              className="flex-1 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-xs text-[var(--text)] font-mono truncate focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                copied
                  ? 'bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20'
                  : 'bg-[var(--green)] text-[var(--bg)] hover:bg-[var(--green2)]'
              }`}
            >
              {copied ? (
                <>
                  <Check size={12} />
                  {t('sharing.linkCopied')}
                </>
              ) : (
                <>
                  <Copy size={12} />
                  {t('sharing.copyShareLink')}
                </>
              )}
            </button>
          </div>
          <button
            onClick={() => setGeneratedLink(null)}
            className="text-[11px] text-[var(--text3)] hover:text-[var(--text2)] transition-colors"
          >
            {t('sharing.generateNewLink')}
          </button>
        </div>
      )}
    </div>
  );
}
