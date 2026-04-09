import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Shield, TreePine, Zap, Users } from 'lucide-react';

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
    <section className="relative min-h-[100dvh] flex flex-col overflow-hidden">
      {/* Split layout: content left, image right */}
      <div className="flex-1 flex flex-col lg:flex-row">

        {/* LEFT: Content — dark, readable, high contrast */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-16 xl:px-24 py-16 lg:py-0 bg-[#0a1a0d]">

          {/* Live badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-800/60 bg-emerald-950/40 mb-6 w-fit">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest">
              {t('landing.hero.badge', 'Live Forest Monitoring')}
            </span>
          </div>

          {/* Main headline — big, bold, unmissable */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-[1.1] tracking-tight mb-6">
            <span className="text-white">{t('landing.hero.titleLine1', 'Protect Your Forest')}</span>
            <br />
            <span className="bg-gradient-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent">
              {t('landing.hero.titleLine2', 'Before It\'s Too Late')}
            </span>
          </h1>

          {/* Tagline with typing effect */}
          <p className="text-lg sm:text-xl text-emerald-200/80 font-light mb-3 min-h-[1.8em]">
            {typedText}
            {showCursor && <span className="text-emerald-400 animate-pulse">|</span>}
          </p>

          {/* Value prop — clear, scannable */}
          <p className="text-base sm:text-lg text-gray-400 max-w-xl mb-8 leading-relaxed">
            {t('landing.hero.description', 'AI-powered beetle detection using satellite, drone, and sensor data. Know exactly which trees need attention — weeks before visible damage.')}
          </p>

          {/* CTAs — prominent, contrasting */}
          <div className="flex flex-col sm:flex-row gap-3 mb-12">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-emerald-500 text-black font-bold text-lg transition-all hover:bg-emerald-400 hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-500/30"
            >
              {t('landing.hero.ctaPrimary', 'Start Free')}
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-gray-700 text-gray-300 font-semibold text-lg transition-all hover:bg-white/5 hover:border-gray-500 active:scale-95"
            >
              {t('landing.hero.ctaSecondary', 'See How It Works')}
            </a>
          </div>

          {/* Stats row — instant credibility */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 border-t border-gray-800 pt-8">
            <div className="flex flex-col">
              <span className="text-2xl sm:text-3xl font-bold text-white">30+</span>
              <span className="text-xs sm:text-sm text-gray-500">{t('landing.hero.statSources', 'Data Sources')}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl sm:text-3xl font-bold text-white">94%</span>
              <span className="text-xs sm:text-sm text-gray-500">{t('landing.hero.statAccuracy', 'Detection Accuracy')}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl sm:text-3xl font-bold text-white">3 {t('landing.hero.statWeeksUnit', 'wks')}</span>
              <span className="text-xs sm:text-sm text-gray-500">{t('landing.hero.statEarly', 'Early Warning')}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl sm:text-3xl font-bold text-white">24/7</span>
              <span className="text-xs sm:text-sm text-gray-500">{t('landing.hero.statMonitoring', 'Monitoring')}</span>
            </div>
          </div>

          {/* Trust logos */}
          <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-6">
            <span className="text-[10px] font-mono text-gray-600 uppercase tracking-wider">
              {t('landing.hero.trustedBy', 'Trusted by')}
            </span>
            {['Skogsstyrelsen', 'SLU', 'Lantmäteriet', 'SMHI'].map((name) => (
              <span key={name} className="text-xs sm:text-sm text-gray-500 font-medium px-3 py-1 rounded-md bg-white/5 border border-gray-800">
                {name}
              </span>
            ))}
          </div>
        </div>

        {/* RIGHT: Visual — immersive forest image */}
        <div className="hidden lg:block lg:w-[45%] xl:w-[50%] relative">
          <img
            src="https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=1920&q=85&auto=format&fit=crop"
            srcSet="https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=960&q=75&auto=format&fit=crop 960w, https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=1920&q=85&auto=format&fit=crop 1920w"
            sizes="50vw"
            alt="Swedish forest aerial view"
            className="absolute inset-0 w-full h-full object-cover"
            fetchPriority="high"
            decoding="async"
          />
          {/* Subtle left-edge gradient blend */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a1a0d] via-transparent to-transparent w-1/3" />

          {/* Floating feature cards on image */}
          <div className="absolute bottom-12 left-8 right-8 flex flex-col gap-3">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/10">
              <Shield size={20} className="text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white">{t('landing.hero.card1Title', 'Beetle Risk: Low')}</p>
                <p className="text-xs text-gray-400">{t('landing.hero.card1Sub', 'Your 230 ha in Småland — last scanned 2h ago')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/10">
              <TreePine size={20} className="text-green-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white">{t('landing.hero.card2Title', 'Timber Value: 4.2M SEK')}</p>
                <p className="text-xs text-gray-400">{t('landing.hero.card2Sub', 'Updated estimate based on latest satellite pass')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-black/60 backdrop-blur-md border border-emerald-500/30">
              <Zap size={20} className="text-yellow-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white">{t('landing.hero.card3Title', 'AI Alert: Storm damage detected')}</p>
                <p className="text-xs text-gray-400">{t('landing.hero.card3Sub', 'NW sector — drone survey recommended')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile forest image — shows on small screens */}
      <div className="lg:hidden relative h-64 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=960&q=75&auto=format&fit=crop"
          alt="Swedish forest"
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1a0d] to-transparent" />

        {/* Mobile feature cards */}
        <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/70 backdrop-blur-sm border border-white/10">
            <Shield size={16} className="text-emerald-400 shrink-0" />
            <p className="text-xs font-medium text-white">{t('landing.hero.card1Title', 'Beetle Risk: Low')}</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/70 backdrop-blur-sm border border-white/10">
            <Zap size={16} className="text-yellow-400 shrink-0" />
            <p className="text-xs font-medium text-white">{t('landing.hero.card3Title', 'AI Alert: Storm damage detected')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
