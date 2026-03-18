import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const TESTIMONIALS = [
  { key: 'anna', initials: 'AE', color: 'bg-emerald-600' },
  { key: 'lars', initials: 'LN', color: 'bg-teal-600' },
  { key: 'maria', initials: 'MH', color: 'bg-green-700' },
] as const;

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${count} stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`w-4 h-4 ${i < count ? 'text-[var(--amber)]' : 'text-[var(--text3)]/30'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export function TestimonialCarousel() {
  const { t } = useTranslation();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => {
    setActive((prev) => (prev + 1) % TESTIMONIALS.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [paused, next]);

  return (
    <section id="testimonials" className="py-24 px-6 bg-[var(--bg2)]/40">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-mono text-[var(--green)] uppercase tracking-widest">
            {t('landing.testimonials.badge')}
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text)] mt-3 mb-4">
            {t('landing.testimonials.title')}
          </h2>
        </div>

        <div
          className="relative"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${active * 100}%)` }}
            >
              {TESTIMONIALS.map(({ key, initials, color }) => (
                <div key={key} className="w-full shrink-0 px-4">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg2)]/60 p-8 text-center">
                    <div className={`w-16 h-16 ${color} rounded-full flex items-center justify-center mx-auto mb-4`}>
                      <span className="text-xl font-bold text-white">{initials}</span>
                    </div>
                    <Stars count={5} />
                    <blockquote className="text-lg text-[var(--text)] font-serif italic leading-relaxed mt-4 mb-6">
                      &ldquo;{t(`landing.testimonials.${key}.quote`)}&rdquo;
                    </blockquote>
                    <div>
                      <p className="font-semibold text-[var(--text)]">
                        {t(`landing.testimonials.${key}.name`)}
                      </p>
                      <p className="text-sm text-[var(--text3)]">
                        {t(`landing.testimonials.${key}.role`)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dots */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {TESTIMONIALS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActive(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  idx === active ? 'bg-[var(--green)] w-8' : 'bg-[var(--text3)]/30 hover:bg-[var(--text3)]'
                }`}
                aria-label={`Go to testimonial ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
