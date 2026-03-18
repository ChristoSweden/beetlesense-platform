import { useExpertise, type ExpertiseLevel } from '@/contexts/ExpertiseContext';

/* ─── Types ─── */
interface ExpertiseLevelSelectorProps {
  /** Show as onboarding card with question text */
  variant?: 'inline' | 'onboarding';
  className?: string;
}

const OPTIONS: { level: ExpertiseLevel; label: string; description: string }[] = [
  {
    level: 'beginner',
    label: 'Enkel',
    description: 'Tydliga forklaringar utan facktermer',
  },
  {
    level: 'intermediate',
    label: 'Standard',
    description: 'Branschtermer med korta forklaringar',
  },
  {
    level: 'expert',
    label: 'Detaljerad',
    description: 'Fullstandig teknisk data och kalkoder',
  },
];

export function ExpertiseLevelSelector({
  variant = 'inline',
  className = '',
}: ExpertiseLevelSelectorProps) {
  const { level, setLevel } = useExpertise();

  if (variant === 'onboarding') {
    return (
      <div className={`flex flex-col gap-4 ${className}`}>
        <h3 className="text-base font-semibold text-[var(--text)]">
          Hur erfaren ar du med skogsdata?
        </h3>
        <p className="text-sm text-[var(--text3)]">
          Vi anpassar forklaringar och detaljer efter din erfarenhetsniva.
          Du kan andra detta nar som helst i installningar.
        </p>
        <div className="flex flex-col gap-2">
          {OPTIONS.map((opt) => (
            <button
              key={opt.level}
              onClick={() => setLevel(opt.level)}
              className={`flex flex-col gap-0.5 rounded-lg border px-4 py-3 text-left transition-all ${
                level === opt.level
                  ? 'border-[var(--green)] bg-[var(--green)]/10 shadow-[0_0_12px_rgba(74,222,128,0.15)]'
                  : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border2)]'
              }`}
            >
              <span
                className={`text-sm font-medium ${
                  level === opt.level ? 'text-[var(--green)]' : 'text-[var(--text)]'
                }`}
              >
                {opt.label}
              </span>
              <span className="text-xs text-[var(--text3)]">{opt.description}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Inline 3-position toggle
  return (
    <div
      className={`inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-0.5 ${className}`}
      role="radiogroup"
      aria-label="Detaljniva"
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.level}
          role="radio"
          aria-checked={level === opt.level}
          title={opt.description}
          onClick={() => setLevel(opt.level)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
            level === opt.level
              ? 'bg-[var(--green)]/15 text-[var(--green)] shadow-sm'
              : 'text-[var(--text3)] hover:text-[var(--text2)]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
