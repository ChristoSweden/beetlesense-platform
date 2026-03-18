import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const FAQ_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8'] as const;

export function FAQAccordion() {
  const { t } = useTranslation();
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-mono text-[var(--green)] uppercase tracking-widest">
            {t('landing.faq.badge')}
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text)] mt-3 mb-4">
            {t('landing.faq.title')}
          </h2>
        </div>

        <div className="space-y-3">
          {FAQ_KEYS.map((key, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={key}
                className={`rounded-xl border transition-colors ${
                  isOpen ? 'border-[var(--green)]/30 bg-[var(--bg3)]' : 'border-[var(--border)] bg-[var(--bg2)]/40'
                }`}
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm sm:text-base font-medium text-[var(--text)]">
                    {t(`landing.faq.${key}.question`)}
                  </span>
                  <svg
                    className={`w-5 h-5 text-[var(--green)] shrink-0 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-5 pb-5 text-sm text-[var(--text3)] leading-relaxed">
                    {t(`landing.faq.${key}.answer`)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
