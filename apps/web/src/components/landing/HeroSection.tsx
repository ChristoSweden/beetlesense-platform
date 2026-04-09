import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Shield, TreePine, Bell } from 'lucide-react';

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
    }, 35);
    return () => clearInterval(interval);
  }, [tagline]);

  return (
    <section className="relative overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* ─── Top: Hero content ─── */}
      <div className="max-w-6xl mx-auto px-5 sm:px-8 pt-20 sm:pt-28 pb-12 sm:pb-16">

        {/* Warm, human headline — not tech jargon */}
        <h1
          className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-bold leading-[1.15] tracking-tight max-w-3xl mb-5"
          style={{ color: 'var(--text)', fontFamily: "var(--font-sans)" }}
        >
          {t('landing.hero.titleLine1', 'Vet du hur din skog mår')}
          <br />
          <span style={{ color: 'var(--green)' }}>
            {t('landing.hero.titleLine2', 'just nu?')}
          </span>
        </h1>

        {/* Typed tagline */}
        <p
          className="text-lg sm:text-xl max-w-2xl mb-3 min-h-[1.5em]"
          style={{ color: 'var(--text2)', fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}
        >
          {typedText}
          {showCursor && <span style={{ color: 'var(--green)' }} className="animate-pulse">|</span>}
        </p>

        {/* Plain language description — Erik can understand this */}
        <p
          className="text-base sm:text-lg max-w-xl mb-8 leading-relaxed"
          style={{ color: 'var(--text3)' }}
        >
          {t('landing.hero.description', 'BeetleSense bevakar din skog dygnet runt med satellitdata, drönare och sensorer. Du får en enkel sammanfattning och varning innan skador syns.')}
        </p>

        {/* Single clear CTA — not two competing buttons */}
        <div className="flex flex-col sm:flex-row items-start gap-3 mb-12">
          <Link
            to="/signup"
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-base transition-all hover:brightness-110 hover:scale-[1.02] active:scale-95 shadow-md"
            style={{ background: 'var(--green)', color: 'var(--bg)' }}
          >
            {t('landing.hero.ctaPrimary', 'Kom igång gratis')}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <span className="text-sm" style={{ color: 'var(--text3)' }}>
            {t('landing.hero.ctaNote', 'Ingen kreditkort krävs. Fungerar på mobil.')}
          </span>
        </div>

        {/* Trust: names a forest owner recognizes */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-5 mb-4">
          <span className="text-xs font-mono uppercase tracking-wider" style={{ color: 'var(--text3)' }}>
            {t('landing.hero.trustedBy', 'Data från')}
          </span>
          {['Skogsstyrelsen', 'SLU', 'Lantmäteriet', 'SMHI', 'Sentinel-2'].map((name) => (
            <span
              key={name}
              className="text-xs sm:text-sm font-medium px-2.5 py-1 rounded-lg"
              style={{ color: 'var(--text2)', background: 'var(--bg3)', border: '1px solid var(--border)' }}
            >
              {name}
            </span>
          ))}
        </div>
      </div>

      {/* ─── Bottom: Product preview — shows what Erik will actually see ─── */}
      <div className="relative max-w-6xl mx-auto px-5 sm:px-8 pb-16 sm:pb-24">

        {/* Mock dashboard card — looks like the real app */}
        <div
          className="rounded-2xl overflow-hidden shadow-xl"
          style={{ border: '1px solid var(--border)', background: 'var(--bg2)' }}
        >
          {/* Forest image header with overlay status */}
          <div className="relative h-48 sm:h-64 overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=1200&q=80&auto=format&fit=crop"
              alt="Swedish forest aerial view"
              className="w-full h-full object-cover"
              fetchPriority="high"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

            {/* Status overlay — this is what Erik sees on his dashboard */}
            <div className="absolute bottom-4 left-4 right-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                style={{ background: 'rgba(255,255,255,0.95)', color: 'var(--text)' }}
              >
                <Shield size={16} style={{ color: 'var(--risk-low)' }} />
                <span className="font-semibold">{t('landing.hero.card1', 'Skadeläge: Lågt')}</span>
              </div>
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                style={{ background: 'rgba(255,255,255,0.95)', color: 'var(--text)' }}
              >
                <TreePine size={16} style={{ color: 'var(--green)' }} />
                <span className="font-semibold">{t('landing.hero.card2', 'Virkesvolym: 42 000 m³sk')}</span>
              </div>
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                style={{ background: 'rgba(255,255,255,0.95)', color: 'var(--text)' }}
              >
                <Bell size={16} style={{ color: 'var(--amber)' }} />
                <span className="font-semibold">{t('landing.hero.card3', 'Nästa kontroll: måndag')}</span>
              </div>
            </div>
          </div>

          {/* Bottom summary strip — reassurance, plain language */}
          <div className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm" style={{ color: 'var(--text2)' }}>
              {t('landing.hero.dashboardSummary', '"Din skog ser bra ut just nu. Inget kräver åtgärd."')}
            </p>
            <span
              className="text-xs font-mono px-3 py-1 rounded-full w-fit"
              style={{ background: 'var(--green-wash)', color: 'var(--green)' }}
            >
              {t('landing.hero.dashboardStatus', 'Senast uppdaterad: idag 06:00')}
            </span>
          </div>
        </div>

        {/* Scroll hint — gentle, not aggressive */}
        <div className="flex justify-center mt-10">
          <a href="#how-it-works" className="flex flex-col items-center gap-1 opacity-40 hover:opacity-70 transition-opacity">
            <span className="text-xs" style={{ color: 'var(--text3)' }}>{t('landing.hero.scroll', 'Läs mer')}</span>
            <svg className="w-4 h-4" style={{ color: 'var(--text3)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
