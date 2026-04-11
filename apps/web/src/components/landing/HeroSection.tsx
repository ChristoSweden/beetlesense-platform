import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/**
 * HeroSection — simple, bulletproof, no MapLibre, no Cesium, no Three.js.
 * Uses a static Esri satellite image with detection annotations.
 * CANNOT crash.
 */
export function HeroSection() {
  const { t } = useTranslation();

  return (
    <section style={{ background: '#060e08' }}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-20 pb-16">
        {/* Status bar */}
        <div className="flex items-center gap-3 mb-8 font-mono text-xs text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="tracking-wider uppercase">
            {t('landing.hero.statusLive', 'Live Data')} | {t('landing.hero.statusAgent', 'AI Agent Active')} | {t('landing.hero.statusScan', 'Last Scan: 2 min ago')}
          </span>
        </div>

        {/* Satellite map with data overlay — STATIC IMAGE, cannot crash */}
        <div className="relative rounded-xl overflow-hidden mb-10" style={{ border: '1px solid rgba(16,185,129,0.15)' }}>
          <img
            src="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=16,63,17,64&bboxSR=4326&size=1400,600&imageSR=4326&format=jpg&f=image"
            alt="Satellite view of Swedish forest — Ångermanland region with data fusion overlay"
            className="w-full h-[300px] sm:h-[400px] lg:h-[500px] object-cover"
            width={1400}
            height={600}
            style={{ filter: 'saturate(0.9) brightness(0.85)' }}
            fetchPriority="high"
          />

          {/* Detection annotations overlaid on the image */}
          <div className="absolute top-[20%] left-[25%] flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-lg shadow-red-500/50" />
            <span className="text-[10px] font-mono text-red-300 px-2 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.7)' }}>
              IPS TYPOGRAPHUS — 63.5°N
            </span>
          </div>
          <div className="absolute top-[45%] left-[55%] flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500 animate-pulse shadow-lg shadow-orange-500/50" />
            <span className="text-[10px] font-mono text-orange-300 px-2 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.7)' }}>
              CANOPY LOSS -12%
            </span>
          </div>
          <div className="absolute top-[65%] left-[35%] flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-400 animate-pulse shadow-lg shadow-orange-400/50" />
            <span className="text-[10px] font-mono text-orange-200 px-2 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.7)' }}>
              THERMAL +3.2°C
            </span>
          </div>
          <div className="absolute top-[30%] left-[70%] flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse shadow-lg shadow-yellow-500/50" />
            <span className="text-[10px] font-mono text-yellow-200 px-2 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.7)' }}>
              DROUGHT INDEX: HIGH
            </span>
          </div>

          {/* Layer tags */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            {[
              { label: 'SATELLITE', color: '#4ade80' },
              { label: 'TREE LOSS', color: '#ef4444' },
              { label: 'THERMAL IR', color: '#f97316' },
              { label: 'BEETLE RISK', color: '#ef4444' },
            ].map((l) => (
              <span key={l.label} className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded"
                style={{ color: l.color, border: `1px solid ${l.color}40`, background: `${l.color}10` }}>
                {l.label}
              </span>
            ))}
          </div>

          {/* Bottom readout */}
          <div className="absolute bottom-0 left-0 right-0 px-3 py-2 flex items-center justify-between"
            style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.85))' }}>
            <span className="text-[9px] font-mono text-emerald-300/70">63.5°N 16.5°E — ÅNGERMANLAND</span>
            <span className="text-[9px] font-mono text-emerald-300/70">MULTI-LAYER FUSION</span>
            <span className="text-[9px] font-mono text-emerald-300/70">RES: 10m/px</span>
          </div>
        </div>

        {/* Headline */}
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight mb-5">
            <span className="text-white">{t('landing.hero.titleLine1', 'Do you know how your forest is doing')} </span>
            <span style={{ background: 'linear-gradient(135deg, #fff 0%, #4ade80 50%, #22c55e 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {t('landing.hero.titleLine2', 'right now?')}
            </span>
          </h1>

          <p className="text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed" style={{ color: 'rgba(209,213,219,0.7)' }}>
            {t('landing.hero.description', 'BeetleSense monitors your forest around the clock using satellite, drone, and sensor data. Get a simple summary and early warnings — before damage becomes visible.')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <Link to="/demo"
              className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl font-semibold text-lg transition-all hover:scale-[1.03] active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', boxShadow: '0 0 30px rgba(34,197,94,0.35)' }}>
              {t('landing.hero.ctaPrimary', 'Try Demo')}
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-semibold text-base transition-all hover:bg-white/[0.06]"
              style={{ color: '#86efac', border: '1px solid rgba(74,222,128,0.25)' }}>
              {t('landing.hero.ctaSecondary', 'Get Started Free')}
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl mx-auto mb-10">
            {[
              { value: '30+', label: 'Data Sources' },
              { value: '94%', label: 'Detection Accuracy' },
              { value: '3 wk', label: 'Early Warning' },
              { value: '24/7', label: 'Monitoring' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white">{s.value}</div>
                <div className="text-[11px] text-emerald-300/50 font-mono uppercase tracking-wider mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Trust */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'rgba(156,163,175,0.4)' }}>Powered by</span>
            {['Skogsstyrelsen', 'SLU', 'Lantmäteriet', 'SMHI', 'Sentinel-2'].map((n) => (
              <span key={n} className="text-[11px] font-medium px-3 py-1.5 rounded-lg"
                style={{ color: 'rgba(156,163,175,0.5)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {n}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Gradient to page bg */}
      <div className="h-32" style={{ background: 'linear-gradient(to bottom, #060e08, var(--bg))' }} />
    </section>
  );
}
