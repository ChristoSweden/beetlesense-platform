import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { SatelliteDataHero } from '../SatelliteDataHero';

export function HeroSection() {
  const { t } = useTranslation();
  const [typedText, setTypedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const tagline = t('landing.hero.tagline');
  const typingDone = useRef(false);

  useEffect(() => {
    if (typingDone.current) return;
    let i = 0;
    const interval = setInterval(() => {
      if (i < tagline.length) {
        setTypedText(tagline.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        typingDone.current = true;
        setTimeout(() => setShowCursor(false), 2000);
      }
    }, 45);
    return () => clearInterval(interval);
  }, [tagline]);

  return (
    <section className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden bg-[var(--bg)]">
      {/* Realistic forest background — no backgroundAttachment:fixed for mobile perf */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <img
          src="https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=1920&q=80&auto=format&fit=crop"
          srcSet="https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=640&q=70&auto=format&fit=crop 640w, https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=1280&q=75&auto=format&fit=crop 1280w, https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=1920&q=80&auto=format&fit=crop 1920w"
          sizes="100vw"
          alt=""
          width={1920}
          height={1080}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ animation: 'ken-burns 30s ease-in-out infinite alternate' }}
          fetchPriority="high"
          decoding="async"
        />
      </div>

      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/20 to-[var(--bg)]/40 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#1a3a1d] bg-[var(--bg2)] mb-8">
          <span className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse" />
          <span className="text-xs font-mono text-[var(--green)] uppercase tracking-widest">
            {t('landing.hero.badge')}
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
          <span className="text-gradient">{t('landing.hero.titleLine1')}</span>
          <br />
          <span className="text-[var(--text)]">{t('landing.hero.titleLine2')}</span>
        </h1>

        <p className="text-lg sm:text-xl md:text-2xl text-[var(--text2)] font-serif italic mb-2 min-h-[2em]">
          {typedText}
          {showCursor && <span className="landing-cursor">|</span>}
        </p>

        <p className="text-sm sm:text-base text-[var(--text3)] max-w-2xl mx-auto mb-10">
          {t('landing.hero.description')}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto px-0 sm:px-6">
          <Link
            to="/signup"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[var(--green)] text-[var(--bg)] font-semibold text-base sm:text-base transition-all hover:brightness-110 hover:scale-105 glow-green shadow-lg shadow-[var(--green)]/25 active:scale-95"
          >
            {t('landing.hero.ctaPrimary')}
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <a
            href="#how-it-works"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-[var(--border2)] text-[var(--green)] font-semibold text-base sm:text-base transition-all hover:bg-[var(--bg3)] hover:border-[var(--green)] active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('landing.hero.ctaSecondary')}
          </a>
        </div>

          {/* Live Satellite & Environmental Data */}
          <div className="mt-12 mb-8">
            <SatelliteDataHero />
          </div>

        {/* Trust badges */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-4 sm:gap-8 opacity-60 px-2">
          <span className="text-xs font-mono text-[var(--text3)] uppercase tracking-wider whitespace-nowrap">{t('landing.hero.trustedBy')}</span>
          <span className="text-xs sm:text-sm text-[var(--text3)]">Skogsstyrelsen</span>
          <span className="hidden sm:inline text-sm text-[var(--text3)]">•</span>
          <span className="text-xs sm:text-sm text-[var(--text3)]">SLU</span>
          <span className="hidden sm:inline text-sm text-[var(--text3)]">•</span>
          <span className="text-xs sm:text-sm text-[var(--text3)]">Lantmäteriet</span>
          <span className="hidden sm:inline text-sm text-[var(--text3)]">•</span>
          <span className="text-xs sm:text-sm text-[var(--text3)]">SMHI</span>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
        <span className="text-xs text-[var(--text3)] font-mono">{t('landing.hero.scroll')}</span>
        <svg className="w-5 h-5 text-[var(--green)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>
  );
}
