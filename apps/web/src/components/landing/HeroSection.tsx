import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Shield, TreePine, Bell, Satellite, Target, Clock, BarChart3, ArrowRight } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  CSS-only animations injected once via <style>                      */
/* ------------------------------------------------------------------ */

const heroStyles = `
@keyframes hero-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes hero-float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

@keyframes hero-float-slow {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-6px) rotate(0.5deg); }
}

@keyframes hero-glow-pulse {
  0%, 100% { box-shadow: 0 0 20px rgba(34, 197, 94, 0.3), 0 0 60px rgba(34, 197, 94, 0.1); }
  50% { box-shadow: 0 0 40px rgba(34, 197, 94, 0.5), 0 0 80px rgba(34, 197, 94, 0.2); }
}

@keyframes hero-firefly {
  0% { opacity: 0; transform: translate(0, 0) scale(0.5); }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { opacity: 0; transform: translate(var(--fx), var(--fy)) scale(1); }
}

@keyframes hero-drift {
  0% { transform: translateX(0) translateY(0); }
  25% { transform: translateX(10px) translateY(-5px); }
  50% { transform: translateX(-5px) translateY(-10px); }
  75% { transform: translateX(-10px) translateY(5px); }
  100% { transform: translateX(0) translateY(0); }
}

@keyframes hero-fade-in-up {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes hero-border-glow {
  0%, 100% { border-color: rgba(74, 222, 128, 0.15); }
  50% { border-color: rgba(74, 222, 128, 0.35); }
}

@keyframes hero-scan-line {
  0% { top: -2px; opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { top: 100%; opacity: 0; }
}

@keyframes hero-gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.hero-shimmer-btn {
  position: relative;
  overflow: hidden;
}

.hero-shimmer-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 30%,
    rgba(255, 255, 255, 0.2) 45%,
    rgba(255, 255, 255, 0.3) 50%,
    rgba(255, 255, 255, 0.2) 55%,
    transparent 70%
  );
  background-size: 200% 100%;
  animation: hero-shimmer 3s ease-in-out infinite;
  pointer-events: none;
  border-radius: inherit;
}

.hero-reveal {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}

.hero-reveal.is-visible {
  opacity: 1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .hero-shimmer-btn::before { animation: none; }
  .hero-reveal {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
}
`;

/* ------------------------------------------------------------------ */
/*  Firefly particle system (CSS-only, no libraries)                   */
/* ------------------------------------------------------------------ */

interface Firefly {
  id: number;
  left: string;
  top: string;
  size: number;
  delay: string;
  duration: string;
  fx: string;
  fy: string;
  color: string;
}

function generateFireflies(count: number): Firefly[] {
  const flies: Firefly[] = [];
  const colors = [
    'rgba(74, 222, 128, 0.6)',
    'rgba(34, 197, 94, 0.5)',
    'rgba(134, 239, 172, 0.4)',
    'rgba(187, 247, 208, 0.3)',
    'rgba(255, 255, 255, 0.2)',
  ];
  for (let i = 0; i < count; i++) {
    flies.push({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 80}%`,
      size: 1.5 + Math.random() * 3,
      delay: `${Math.random() * 8}s`,
      duration: `${4 + Math.random() * 6}s`,
      fx: `${(Math.random() - 0.5) * 60}px`,
      fy: `${(Math.random() - 0.5) * 60}px`,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
  return flies;
}

/* ------------------------------------------------------------------ */
/*  Stats data                                                         */
/* ------------------------------------------------------------------ */

const STATS = [
  { icon: Satellite, value: '30+', labelKey: 'landing.hero.stat1', fallback: 'Data Sources' },
  { icon: Target, value: '94%', labelKey: 'landing.hero.stat2', fallback: 'Detection Accuracy' },
  { icon: Clock, value: '3 wk', labelKey: 'landing.hero.stat3', fallback: 'Early Warning' },
  { icon: BarChart3, value: '12k+', labelKey: 'landing.hero.stat4', fallback: 'Hectares Monitored' },
] as const;

const TRUST_NAMES = ['Skogsstyrelsen', 'SLU', 'Lantmäteriet', 'SMHI', 'Sentinel-2'] as const;

/* ------------------------------------------------------------------ */
/*  Hook: IntersectionObserver for scroll-reveal                       */
/* ------------------------------------------------------------------ */

function useRevealOnScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function HeroSection() {
  const { t } = useTranslation();

  // Typing animation
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

  // Fireflies (generated once)
  const [fireflies] = useState(() => generateFireflies(28));

  // Scroll-reveal refs
  const statsReveal = useRevealOnScroll();
  const cardReveal = useRevealOnScroll();
  const trustReveal = useRevealOnScroll();

  // Inject styles once
  const stylesInjected = useRef(false);
  useEffect(() => {
    if (stylesInjected.current) return;
    stylesInjected.current = true;
    const style = document.createElement('style');
    style.setAttribute('data-hero-styles', '');
    style.textContent = heroStyles;
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, []);

  // Parallax-lite: subtle mouse tracking on the product card
  const cardRef = useRef<HTMLDivElement>(null);
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `perspective(1200px) rotateY(${x * 4}deg) rotateX(${-y * 4}deg) translateY(-8px)`;
  }, []);
  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (card) {
      card.style.transform = 'perspective(1200px) rotateY(-2deg) rotateX(2deg) translateY(0px)';
    }
  }, []);

  return (
    <section className="relative overflow-hidden">
      {/* ============================================================ */}
      {/*  DARK SECTION — deep forest gradient                         */}
      {/* ============================================================ */}
      <div
        className="relative"
        style={{
          background: 'linear-gradient(180deg, #060e08 0%, #0a1a0d 20%, #0d2a12 50%, #122e16 75%, #1a3d1f 100%)',
        }}
      >
        {/* --- Ambient glow orbs --- */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          {/* Large emerald glow — top right */}
          <div
            className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-20"
            style={{
              background: 'radial-gradient(circle, rgba(34,197,94,0.4) 0%, transparent 70%)',
              animation: 'hero-drift 20s ease-in-out infinite',
            }}
          />
          {/* Smaller glow — bottom left */}
          <div
            className="absolute -bottom-20 -left-20 w-[350px] h-[350px] rounded-full opacity-15"
            style={{
              background: 'radial-gradient(circle, rgba(74,222,128,0.35) 0%, transparent 70%)',
              animation: 'hero-drift 15s ease-in-out infinite reverse',
            }}
          />
          {/* Subtle warm accent — center */}
          <div
            className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[200px] rounded-full opacity-10"
            style={{
              background: 'radial-gradient(ellipse, rgba(251,191,36,0.2) 0%, transparent 70%)',
            }}
          />
        </div>

        {/* --- Firefly particles --- */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          {fireflies.map((f) => (
            <div
              key={f.id}
              className="absolute rounded-full"
              style={{
                left: f.left,
                top: f.top,
                width: f.size,
                height: f.size,
                background: f.color,
                boxShadow: `0 0 ${f.size * 3}px ${f.color}`,
                animation: `hero-firefly ${f.duration} ${f.delay} ease-in-out infinite`,
                '--fx': f.fx,
                '--fy': f.fy,
              } as React.CSSProperties}
            />
          ))}
        </div>

        {/* --- Noise texture overlay for depth --- */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          aria-hidden="true"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '128px 128px',
          }}
        />

        {/* ─── Hero content ─── */}
        <div className="relative z-10 max-w-6xl mx-auto px-5 sm:px-8 pt-24 sm:pt-32 lg:pt-40 pb-32 sm:pb-40 lg:pb-52">

          {/* Badge */}
          <div
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full mb-8"
            style={{
              background: 'rgba(34, 197, 94, 0.08)',
              border: '1px solid rgba(74, 222, 128, 0.2)',
              animation: 'hero-fade-in-up 0.6s ease-out both',
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{
                background: '#22c55e',
                boxShadow: '0 0 8px rgba(34, 197, 94, 0.6)',
                animation: 'hero-glow-pulse 2s ease-in-out infinite',
              }}
            />
            <span className="text-xs font-medium tracking-wide" style={{ color: '#86efac' }}>
              {t('landing.hero.badge', 'AI-Powered Forest Intelligence')}
            </span>
          </div>

          {/* Headline with gradient text */}
          <h1
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight max-w-4xl mb-6"
            style={{
              fontFamily: 'var(--font-sans)',
              animation: 'hero-fade-in-up 0.7s 0.1s ease-out both',
            }}
          >
            <span className="block text-white">
              {t('landing.hero.titleLine1', 'Do you know how your forest')}
            </span>
            <span className="block text-white">
              {t('landing.hero.titleLine1b', 'is doing')}{' '}
              <span
                className="inline-block"
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #4ade80 50%, #22c55e 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {t('landing.hero.titleLine2', 'right now?')}
              </span>
            </span>
          </h1>

          {/* Typed tagline */}
          <p
            className="text-lg sm:text-xl max-w-2xl mb-4 min-h-[1.5em]"
            style={{
              color: 'rgba(187, 247, 208, 0.8)',
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              animation: 'hero-fade-in-up 0.7s 0.2s ease-out both',
            }}
          >
            {typedText}
            {showCursor && (
              <span className="animate-pulse" style={{ color: '#4ade80' }}>|</span>
            )}
          </p>

          {/* Description */}
          <p
            className="text-base sm:text-lg max-w-xl mb-10 leading-relaxed"
            style={{
              color: 'rgba(209, 213, 219, 0.7)',
              animation: 'hero-fade-in-up 0.7s 0.3s ease-out both',
            }}
          >
            {t('landing.hero.description', 'BeetleSense monitors your forest around the clock using satellite, drone, and sensor data. Get a simple summary and early warnings — before damage becomes visible.')}
          </p>

          {/* CTA buttons */}
          <div
            className="flex flex-col sm:flex-row items-start gap-4 mb-12"
            style={{ animation: 'hero-fade-in-up 0.7s 0.4s ease-out both' }}
          >
            {/* Primary CTA with shimmer + glow */}
            <Link
              to="/signup"
              className="hero-shimmer-btn group inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl font-semibold text-base sm:text-lg transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: '#ffffff',
                boxShadow: '0 0 30px rgba(34, 197, 94, 0.35), 0 4px 20px rgba(0, 0, 0, 0.3)',
                animation: 'hero-glow-pulse 3s ease-in-out infinite',
              }}
            >
              {t('landing.hero.ctaPrimary', 'Get Started Free')}
              <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>

            {/* Ghost CTA */}
            <Link
              to="/demo"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-semibold text-base transition-all duration-300 hover:bg-white/[0.06]"
              style={{
                color: '#86efac',
                border: '1px solid rgba(74, 222, 128, 0.25)',
              }}
            >
              {t('landing.hero.ctaSecondary', 'Watch Demo')}
            </Link>
          </div>

          {/* Note */}
          <p
            className="text-sm mb-0"
            style={{
              color: 'rgba(156, 163, 175, 0.6)',
              animation: 'hero-fade-in-up 0.7s 0.5s ease-out both',
            }}
          >
            {t('landing.hero.ctaNote', 'No credit card required. Works on mobile.')}
          </p>
        </div>

        {/* ─── Gradient transition zone: dark to light ─── */}
        <div
          className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, transparent, var(--bg))',
          }}
        />
      </div>

      {/* ============================================================ */}
      {/*  LIGHT SECTION — stats, product card, trust logos             */}
      {/* ============================================================ */}
      <div style={{ background: 'var(--bg)' }}>

        {/* ─── Stats bar ─── */}
        <div
          ref={statsReveal.ref}
          className={`hero-reveal ${statsReveal.isVisible ? 'is-visible' : ''}`}
          style={{ transitionDelay: '0s' }}
        >
          <div className="max-w-5xl mx-auto px-5 sm:px-8 -mt-12 mb-16 relative z-20">
            <div
              className="grid grid-cols-2 md:grid-cols-4 gap-1 rounded-2xl overflow-hidden"
              style={{
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
                boxShadow: '0 20px 60px -12px rgba(0, 0, 0, 0.08)',
              }}
            >
              {STATS.map(({ icon: Icon, value, labelKey, fallback }, idx) => (
                <div
                  key={labelKey}
                  className="flex flex-col items-center gap-2 py-6 px-4 text-center"
                  style={{
                    borderRight: idx < 3 ? '1px solid var(--border)' : 'none',
                    animation: statsReveal.isVisible
                      ? `hero-fade-in-up 0.5s ${0.1 * idx}s ease-out both`
                      : 'none',
                  }}
                >
                  <Icon size={20} style={{ color: 'var(--green)' }} strokeWidth={1.5} />
                  <span
                    className="text-2xl sm:text-3xl font-bold tabular-nums"
                    style={{ color: 'var(--text)' }}
                  >
                    {value}
                  </span>
                  <span className="text-xs sm:text-sm font-medium" style={{ color: 'var(--text3)' }}>
                    {t(labelKey, fallback)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Product mockup card ─── */}
        <div
          ref={cardReveal.ref}
          className={`hero-reveal ${cardReveal.isVisible ? 'is-visible' : ''}`}
          style={{ transitionDelay: '0.15s' }}
        >
          <div className="max-w-5xl mx-auto px-5 sm:px-8 pb-16 sm:pb-20">
            <div
              ref={cardRef}
              className="rounded-3xl overflow-hidden"
              style={{
                border: '1px solid rgba(74, 222, 128, 0.12)',
                background: 'var(--bg2)',
                boxShadow: `
                  0 0 0 1px rgba(74, 222, 128, 0.06),
                  0 4px 6px -1px rgba(0, 0, 0, 0.05),
                  0 25px 50px -12px rgba(0, 0, 0, 0.12),
                  0 0 80px -20px rgba(34, 197, 94, 0.08)
                `,
                transform: 'perspective(1200px) rotateY(-2deg) rotateX(2deg)',
                transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease',
                animation: cardReveal.isVisible ? 'hero-float-slow 8s ease-in-out infinite' : 'none',
              }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {/* Forest image header with scan line effect */}
              <div className="relative h-52 sm:h-72 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=1200&q=80&auto=format&fit=crop"
                  alt="Swedish forest aerial view"
                  className="w-full h-full object-cover"
                  style={{ animation: 'ken-burns 30s ease-in-out infinite alternate' }}
                  fetchPriority="high"
                  decoding="async"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

                {/* Scan line effect */}
                <div
                  className="absolute left-0 right-0 h-[2px] pointer-events-none"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(34, 197, 94, 0.6), transparent)',
                    boxShadow: '0 0 20px rgba(34, 197, 94, 0.3)',
                    animation: 'hero-scan-line 6s ease-in-out infinite',
                  }}
                />

                {/* Status badges overlay */}
                <div className="absolute bottom-4 left-4 right-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <div
                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm backdrop-blur-md"
                    style={{
                      background: 'rgba(255,255,255,0.92)',
                      color: 'var(--text)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    }}
                  >
                    <Shield size={16} style={{ color: 'var(--risk-low)' }} />
                    <span className="font-semibold">{t('landing.hero.card1', 'Damage Risk: Low')}</span>
                  </div>
                  <div
                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm backdrop-blur-md"
                    style={{
                      background: 'rgba(255,255,255,0.92)',
                      color: 'var(--text)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    }}
                  >
                    <TreePine size={16} style={{ color: 'var(--green)' }} />
                    <span className="font-semibold">{t('landing.hero.card2', 'Timber Volume: 42,000 m\u00B3')}</span>
                  </div>
                  <div
                    className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm backdrop-blur-md"
                    style={{
                      background: 'rgba(255,255,255,0.92)',
                      color: 'var(--text)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    }}
                  >
                    <Bell size={16} style={{ color: 'var(--amber, #fbbf24)' }} />
                    <span className="font-semibold">{t('landing.hero.card3', 'Next scan: Monday')}</span>
                  </div>
                </div>
              </div>

              {/* Bottom summary strip */}
              <div
                className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                style={{ borderTop: '1px solid var(--border)' }}
              >
                <p className="text-sm" style={{ color: 'var(--text2)' }}>
                  {t('landing.hero.dashboardSummary', '"Your forest looks healthy. No action needed right now."')}
                </p>
                <span
                  className="text-xs font-mono px-3 py-1.5 rounded-full w-fit whitespace-nowrap"
                  style={{
                    background: 'rgba(34, 197, 94, 0.08)',
                    color: 'var(--green)',
                    border: '1px solid rgba(34, 197, 94, 0.15)',
                  }}
                >
                  {t('landing.hero.dashboardStatus', 'Last updated: today 06:00')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Trust logos ─── */}
        <div
          ref={trustReveal.ref}
          className={`hero-reveal ${trustReveal.isVisible ? 'is-visible' : ''}`}
          style={{ transitionDelay: '0.25s' }}
        >
          <div className="max-w-5xl mx-auto px-5 sm:px-8 pb-16 sm:pb-24">
            <div className="flex flex-col items-center gap-5">
              <span className="text-xs font-mono uppercase tracking-[0.2em]" style={{ color: 'var(--text3)' }}>
                {t('landing.hero.trustedBy', 'Powered by')}
              </span>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {TRUST_NAMES.map((name) => (
                  <span
                    key={name}
                    className="text-xs sm:text-sm font-medium px-4 py-2 rounded-xl transition-colors duration-200"
                    style={{
                      color: 'var(--text3)',
                      background: 'var(--bg3)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="flex justify-center pb-8">
          <a
            href="#how-it-works"
            className="flex flex-col items-center gap-1.5 opacity-40 hover:opacity-70 transition-opacity duration-300"
          >
            <span className="text-xs font-medium" style={{ color: 'var(--text3)' }}>
              {t('landing.hero.scroll', 'Learn more')}
            </span>
            <svg
              className="w-4 h-4 animate-bounce"
              style={{ color: 'var(--text3)' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
