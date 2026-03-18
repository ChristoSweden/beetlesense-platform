import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface Language {
  code: string;
  flag: string;
  name: string;
  nativeName: string;
  group: 'nordic' | 'other';
}

const languages: Language[] = [
  { code: 'sv', flag: '\ud83c\uddf8\ud83c\uddea', name: 'Swedish', nativeName: 'Svenska', group: 'nordic' },
  { code: 'fi', flag: '\ud83c\uddeb\ud83c\uddee', name: 'Finnish', nativeName: 'Suomi', group: 'nordic' },
  { code: 'no', flag: '\ud83c\uddf3\ud83c\uddf4', name: 'Norwegian', nativeName: 'Norsk', group: 'nordic' },
  { code: 'en', flag: '\ud83c\uddec\ud83c\udde7', name: 'English', nativeName: 'English', group: 'other' },
  { code: 'de', flag: '\ud83c\udde9\ud83c\uddea', name: 'German', nativeName: 'Deutsch', group: 'other' },
];

interface LanguageSelectorProps {
  compact?: boolean;
  className?: string;
}

export default function LanguageSelector({ compact = false, className = '' }: LanguageSelectorProps) {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = languages.find((l) => l.code === i18n.language) || languages[0];

  const nordicLangs = languages.filter((l) => l.group === 'nordic');
  const otherLangs = languages.filter((l) => l.group === 'other');

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(code: string) {
    i18n.changeLanguage(code);
    localStorage.setItem('beetlesense-lang', code);
    setIsOpen(false);
  }

  if (compact) {
    return (
      <div ref={dropdownRef} className={`relative inline-block ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-emerald-100 transition-colors hover:bg-emerald-900/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          aria-label={`Language: ${currentLang.nativeName}`}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span className="text-base leading-none">{currentLang.flag}</span>
          <svg
            className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div
            className="absolute right-0 z-50 mt-1 w-48 origin-top-right rounded-xl border border-emerald-800/50 bg-[#0a1f0d] shadow-xl shadow-black/40"
            role="listbox"
            aria-label="Select language"
          >
            <div className="p-1">
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-500/70">
                Nordic
              </div>
              {nordicLangs.map((lang) => (
                <LanguageOption
                  key={lang.code}
                  lang={lang}
                  isSelected={lang.code === currentLang.code}
                  onSelect={handleSelect}
                />
              ))}
              <div className="my-1 border-t border-emerald-800/30" />
              <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-500/70">
                Other
              </div>
              {otherLangs.map((lang) => (
                <LanguageOption
                  key={lang.code}
                  lang={lang}
                  isSelected={lang.code === currentLang.code}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-emerald-800/50 bg-emerald-900/20 px-3 py-2 text-sm text-emerald-100 transition-colors hover:bg-emerald-900/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
        aria-label={`Language: ${currentLang.nativeName}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="flex items-center gap-2">
          <span className="text-base leading-none">{currentLang.flag}</span>
          <span>{currentLang.nativeName}</span>
        </span>
        <svg
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute left-0 z-50 mt-1 w-full min-w-[200px] origin-top rounded-xl border border-emerald-800/50 bg-[#0a1f0d] shadow-xl shadow-black/40"
          role="listbox"
          aria-label="Select language"
        >
          <div className="p-1">
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-500/70">
              Nordic
            </div>
            {nordicLangs.map((lang) => (
              <LanguageOption
                key={lang.code}
                lang={lang}
                isSelected={lang.code === currentLang.code}
                onSelect={handleSelect}
              />
            ))}
            <div className="my-1 border-t border-emerald-800/30" />
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-500/70">
              Other
            </div>
            {otherLangs.map((lang) => (
              <LanguageOption
                key={lang.code}
                lang={lang}
                isSelected={lang.code === currentLang.code}
                onSelect={handleSelect}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LanguageOption({
  lang,
  isSelected,
  onSelect,
}: {
  lang: Language;
  isSelected: boolean;
  onSelect: (code: string) => void;
}) {
  return (
    <button
      role="option"
      aria-selected={isSelected}
      onClick={() => onSelect(lang.code)}
      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors ${
        isSelected
          ? 'bg-emerald-800/40 text-emerald-200'
          : 'text-emerald-300 hover:bg-emerald-900/50 hover:text-emerald-100'
      }`}
    >
      <span className="text-base leading-none">{lang.flag}</span>
      <span className="flex-1 text-left">{lang.nativeName}</span>
      {isSelected && (
        <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}
