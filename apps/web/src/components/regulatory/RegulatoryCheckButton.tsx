import { useTranslation } from 'react-i18next';
import { Shield } from 'lucide-react';

interface RegulatoryCheckButtonProps {
  constraintCount: number;
  isLoading: boolean;
  onClick: () => void;
  className?: string;
}

export function RegulatoryCheckButton({
  constraintCount,
  isLoading,
  onClick,
  className = '',
}: RegulatoryCheckButtonProps) {
  const { t } = useTranslation();

  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors font-medium text-sm
        ${
          constraintCount > 0
            ? 'bg-[var(--amber)]/10 border-[var(--amber)]/20 text-[var(--amber)] hover:bg-[var(--amber)]/15'
            : 'bg-[var(--green)]/10 border-[var(--green)]/20 text-[var(--green)] hover:bg-[var(--green)]/15'
        } ${className}`}
    >
      <Shield size={16} />
      <span>{t('regulatory.checkButton')}</span>

      {/* Badge */}
      {!isLoading && constraintCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[var(--amber)] text-[var(--bg)] text-[10px] font-bold px-1">
          {constraintCount}
        </span>
      )}

      {/* Loading spinner */}
      {isLoading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
    </button>
  );
}
