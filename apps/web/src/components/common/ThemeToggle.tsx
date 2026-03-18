import { useEffect } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useThemeStore, type Theme } from '@/stores/themeStore';

const THEME_META: Record<Theme, { icon: typeof Sun; label: string }> = {
  dark: { icon: Moon, label: 'Dark mode' },
  light: { icon: Sun, label: 'Light mode' },
  system: { icon: Monitor, label: 'System preference' },
};

interface ThemeToggleProps {
  /** Compact size for header bars (default), larger for settings pages */
  size?: 'compact' | 'large';
  className?: string;
}

export default function ThemeToggle({ size = 'compact', className = '' }: ThemeToggleProps) {
  const { theme, cycleTheme, initSystemListener } = useThemeStore();

  useEffect(() => {
    const cleanup = initSystemListener();
    return cleanup;
  }, [initSystemListener]);

  const { icon: Icon, label } = THEME_META[theme];
  const isLarge = size === 'large';
  const iconSize = isLarge ? 22 : 16;

  return (
    <button
      type="button"
      onClick={cycleTheme}
      title={label}
      aria-label={`Theme: ${label}. Click to cycle.`}
      className={[
        'relative inline-flex items-center justify-center rounded-lg',
        'transition-all duration-200 ease-in-out',
        'cursor-pointer select-none',
        'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
        'bg-[var(--bg-secondary)] hover:bg-[var(--bg-input)]',
        'border border-[var(--border)]',
        isLarge ? 'h-10 w-10 gap-2' : 'h-8 w-8',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Icon
        size={iconSize}
        className="transition-transform duration-200 ease-in-out"
      />
      {isLarge && (
        <span className="sr-only">{label}</span>
      )}
    </button>
  );
}
