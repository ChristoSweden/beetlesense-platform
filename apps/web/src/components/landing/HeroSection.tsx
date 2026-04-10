import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  CSS animations — injected once via <style>                         */
/* ------------------------------------------------------------------ */

const heroStyles = `
@keyframes radar-sweep {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes count-ring {
  from { stroke-dashoffset: 314; }
  to { stroke-dashoffset: var(--target-offset); }
}

@keyframes pulse-red {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); transform: scale(1); }
  50% { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); transform: scale(1.1); }
}

@keyframes pulse-green {
  0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
}

@keyframes hero-fade-in-up {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes hero-glow-pulse {
  0%, 100% { box-shadow: 0 0 20px rgba(34, 197, 94, 0.3), 0 0 60px rgba(34, 197, 94, 0.1); }
  50% { box-shadow: 0 0 40px rgba(34, 197, 94, 0.5), 0 0 80px rgba(34, 197, 94, 0.2); }
}

@keyframes hero-scan-line {
  0% { top: -2px; opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { top: 100%; opacity: 0; }
}

@keyframes hero-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes hero-drift {
  0% { transform: translateX(0) translateY(0); }
  25% { transform: translateX(10px) translateY(-5px); }
  50% { transform: translateX(-5px) translateY(-10px); }
  75% { transform: translateX(-10px) translateY(5px); }
  100% { transform: translateX(0) translateY(0); }
}

@keyframes hero-firefly {
  0% { opacity: 0; transform: translate(0, 0) scale(0.5); }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { opacity: 0; transform: translate(var(--fx), var(--fy)) scale(1); }
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

@media (prefers-reduced-motion: reduce) {
  .hero-shimmer-btn::before { animation: none; }
}
`;

/* ------------------------------------------------------------------ */
/*  Firefly particle system                                            */
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
/*  Static data                                                        */
/* ------------------------------------------------------------------ */

const STATS = [
  { value: '30+', labelKey: 'landing.hero.stat1', fallback: 'Data Sources' },
  { value: '94%', labelKey: 'landing.hero.stat2', fallback: 'Detection Accuracy' },
  { value: '3 wk', labelKey: 'landing.hero.stat3', fallback: 'Early Warning' },
  { value: '24/7', labelKey: 'landing.hero.stat4', fallback: 'Monitoring' },
] as const;

const TRUST_NAMES = ['Skogsstyrelsen', 'SLU', 'Lantmäteriet', 'SMHI', 'Sentinel-2'] as const;

const ALERTS = [
  { gps: '57.2, 15.1', key: 'landing.hero.alert1', fallback: 'Beetle cluster detected' },
  { gps: '58.4, 13.7', key: 'landing.hero.alert2', fallback: 'Dead tree — Action Required' },
  { gps: '56.8, 14.9', key: 'landing.hero.alert3', fallback: 'Drought stress zone' },
] as const;

const DRONES = [
  { key: 'landing.hero.drone1', fallback: 'Drone Alpha — 3 hours ago', status: 'complete' },
  { key: 'landing.hero.drone2', fallback: 'Drone Beta — In flight', status: 'active' },
  { key: 'landing.hero.drone3', fallback: 'Drone Gamma — Scheduled', status: 'pending' },
] as const;

const DAMAGE_DOTS = [
  { top: '25%', left: '35%' },
  { top: '55%', left: '60%' },
  { top: '40%', left: '75%' },
  { top: '70%', left: '30%' },
] as const;

/* ------------------------------------------------------------------ */
/*  Forest Health Ring — SVG animated gauge                            */
/* ------------------------------------------------------------------ */

function ForestHealthRing() {
  const { t } = useTranslation();
  const [count, setCount] = useState(0);
  const targetValue = 88;
  const radius = 50;
  const circumference = 2 * Math.PI * radius; // ~314
  const targetOffset = circumference - (targetValue / 100) * circumference;

  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const duration = 2000;

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * targetValue));
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className="flex flex-col items-center gap-3 p-6 rounded-2xl"
      style={{
        background: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(16, 185, 129, 0.2)',
      }}
    >
      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-400">
        {t('landing.hero.healthLabel', 'Forest Health Index')}
      </span>

      <div className="relative w-[120px] h-[120px]">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          {/* Background track */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="8"
          />
          {/* Gradient arc */}
          <defs>
            <linearGradient id="health-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="35%" stopColor="#f59e0b" />
              <stop offset="65%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
          </defs>
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="url(#health-gradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            style={{
              '--target-offset': `${targetOffset}`,
              strokeDashoffset: targetOffset,
              animation: 'count-ring 2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            } as React.CSSProperties}
          />
        </svg>
        {/* Center number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
          <span className="text-4xl font-bold text-white tabular-nums leading-none">
            {count}
          </span>
          <span className="text-[10px] text-emerald-300/60 mt-0.5">/ 100</span>
        </div>
      </div>

      <span className="text-xs text-red-400/80 font-mono">
        {t('landing.hero.healthDelta', '-2% from last week')}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Satellite Map with radar sweep                                     */
/* ------------------------------------------------------------------ */

function SatelliteMap() {
  return (
    <div className="flex flex-col gap-3">
      {/* Layer labels — like neuroimaging multi-modal tags */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'SENTINEL-2', color: '#4ade80' },
          { label: 'NDVI HEALTH', color: '#22d3ee' },
          { label: 'THERMAL IR', color: '#f97316' },
          { label: 'BEETLE RISK', color: '#ef4444' },
          { label: 'LIDAR DSM', color: '#a78bfa' },
        ].map((layer) => (
          <span
            key={layer.label}
            className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded"
            style={{
              color: layer.color,
              border: `1px solid ${layer.color}40`,
              background: `${layer.color}10`,
            }}
          >
            {layer.label}
          </span>
        ))}
      </div>

      {/* Main fusion visualization */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          transform: 'perspective(800px) rotateX(6deg) rotateY(-3deg)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(16, 185, 129, 0.08)',
        }}
      >
        {/* Base layer: Satellite optical (the "structural MRI") */}
        <img
          src="https://images.unsplash.com/photo-1476362174823-3a23f4aa6d77?w=800&q=80&auto=format&fit=crop"
          alt="Top-down aerial view of dense forest canopy with data fusion overlay"
          className="w-full h-[280px] sm:h-[340px] lg:h-[380px] object-cover"
          fetchPriority="high"
          decoding="async"
        />

        {/* Layer 2: NDVI health gradient (the "fMRI activation map") */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at 15% 20%, rgba(34, 197, 94, 0.45) 0%, transparent 25%),
              radial-gradient(ellipse at 60% 15%, rgba(34, 197, 94, 0.35) 0%, transparent 30%),
              radial-gradient(ellipse at 85% 40%, rgba(34, 197, 94, 0.4) 0%, transparent 20%),
              radial-gradient(ellipse at 40% 70%, rgba(34, 197, 94, 0.3) 0%, transparent 35%),
              linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, transparent 60%)
            `,
            mixBlendMode: 'screen',
          }}
        />

        {/* Layer 3: Thermal anomalies (orange/red hot spots) */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(circle at 33% 28%, rgba(249, 115, 22, 0.5) 0%, rgba(239, 68, 68, 0.3) 8%, transparent 18%),
              radial-gradient(circle at 68% 52%, rgba(249, 115, 22, 0.4) 0%, rgba(239, 68, 68, 0.25) 6%, transparent 14%),
              radial-gradient(circle at 48% 72%, rgba(239, 68, 68, 0.45) 0%, rgba(249, 115, 22, 0.2) 7%, transparent 16%),
              radial-gradient(circle at 78% 25%, rgba(251, 191, 36, 0.3) 0%, transparent 12%)
            `,
            mixBlendMode: 'screen',
          }}
        />

        {/* Layer 4: Beetle risk contour lines (purple/magenta) */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(circle at 33% 28%, transparent 10%, rgba(167, 139, 250, 0.15) 11%, transparent 13%),
              radial-gradient(circle at 33% 28%, transparent 16%, rgba(167, 139, 250, 0.1) 17%, transparent 19%),
              radial-gradient(circle at 68% 52%, transparent 8%, rgba(167, 139, 250, 0.12) 9%, transparent 11%),
              radial-gradient(circle at 68% 52%, transparent 13%, rgba(167, 139, 250, 0.08) 14%, transparent 16%),
              radial-gradient(circle at 48% 72%, transparent 9%, rgba(167, 139, 250, 0.15) 10%, transparent 12%)
            `,
          }}
        />

        {/* Radar sweep */}
        <div
          className="absolute inset-0"
          style={{
            animation: 'radar-sweep 4s linear infinite',
            background:
              'conic-gradient(from 0deg, transparent 0deg, transparent 300deg, rgba(16, 185, 129, 0.1) 330deg, rgba(16, 185, 129, 0.35) 350deg, rgba(16, 185, 129, 0.5) 360deg)',
            transformOrigin: 'center center',
          }}
        />

        {/* Pulsing detection dots with labels */}
        {DAMAGE_DOTS.map((dot, i) => (
          <div key={i} className="absolute" style={{ top: dot.top, left: dot.left }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: i < 2 ? '#ef4444' : '#f97316',
                boxShadow: `0 0 12px ${i < 2 ? 'rgba(239,68,68,0.7)' : 'rgba(249,115,22,0.6)'}`,
                animation: `pulse-red 2s ease-in-out infinite ${i * 0.5}s`,
              }}
            />
            <div
              className="absolute left-4 top-0 text-[8px] font-mono whitespace-nowrap px-1.5 py-0.5 rounded"
              style={{
                color: i < 2 ? '#fca5a5' : '#fdba74',
                background: 'rgba(0,0,0,0.6)',
              }}
            >
              {i === 0 && 'IPS TYPOGRAPHUS'}
              {i === 1 && 'CANOPY LOSS -12%'}
              {i === 2 && 'THERMAL ANOMALY'}
              {i === 3 && 'DROUGHT STRESS'}
            </div>
          </div>
        ))}

        {/* Scan line */}
        <div
          className="absolute left-0 right-0 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.6), transparent)',
            animation: 'hero-scan-line 3s linear infinite',
          }}
        />

        {/* Grid overlay for technical feel */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Bottom data readout bar */}
        <div
          className="absolute bottom-0 left-0 right-0 px-3 py-2 flex items-center justify-between"
          style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}
        >
          <span className="text-[9px] font-mono text-emerald-300/70">SWEREF99 TM / 57.2°N 15.1°E</span>
          <span className="text-[9px] font-mono text-emerald-300/70">5 LAYERS FUSED</span>
          <span className="text-[9px] font-mono text-emerald-300/70">RES: 10m/px</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Alert Cards + Drone Status                                         */
/* ------------------------------------------------------------------ */

function AlertPanel() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      {/* Critical Alerts */}
      <div
        className="p-4 rounded-xl"
        style={{
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-red-400 mb-3">
          {t('landing.hero.alertsTitle', 'Critical Alerts')}
        </h3>
        <div className="flex flex-col gap-2">
          {ALERTS.map((alert, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-xs text-gray-300"
              style={{
                animation: `hero-fade-in-up 0.5s ${0.8 + i * 0.15}s ease-out both`,
              }}
            >
              <span
                className="mt-1 flex-shrink-0 w-2 h-2 rounded-full bg-red-500"
                style={{ animation: `pulse-red 2s ease-in-out infinite ${i * 0.3}s` }}
              />
              <span>
                <span className="text-white/90 font-medium">
                  {t(alert.key, alert.fallback)}
                </span>
                <span className="text-gray-500 ml-1 font-mono text-[10px]">
                  GPS: {alert.gps}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Drone Sortie Status */}
      <div
        className="p-4 rounded-xl"
        style={{
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-400 mb-3">
          {t('landing.hero.droneTitle', 'Drone Sortie Status')}
        </h3>
        <div className="flex flex-col gap-2">
          {DRONES.map((drone, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-xs text-gray-300"
              style={{
                animation: `hero-fade-in-up 0.5s ${1.2 + i * 0.15}s ease-out both`,
              }}
            >
              <span
                className="flex-shrink-0 w-2 h-2 rounded-full"
                style={{
                  background:
                    drone.status === 'complete'
                      ? '#22c55e'
                      : drone.status === 'active'
                        ? '#fbbf24'
                        : '#6b7280',
                  animation:
                    drone.status === 'active'
                      ? 'pulse-green 2s ease-in-out infinite'
                      : undefined,
                }}
              />
              <span className="text-white/80">
                {t(drone.key, drone.fallback)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main HeroSection Component                                         */
/* ------------------------------------------------------------------ */

export function HeroSection() {
  const { t } = useTranslation();
  const [fireflies] = useState(() => generateFireflies(28));

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

  const statItems = useMemo(
    () =>
      STATS.map((s) => ({
        ...s,
        label: t(s.labelKey, s.fallback),
      })),
    [t],
  );

  return (
    <section className="relative overflow-hidden" style={{ background: '#060e08' }}>
      {/* ============================================================ */}
      {/*  FULL DARK SECTION — command center                          */}
      {/* ============================================================ */}
      <div
        className="relative"
        style={{
          background:
            'linear-gradient(180deg, #060e08 0%, #0a1a0d 20%, #0d2a12 50%, #122e16 75%, #0d1f10 100%)',
        }}
      >
        {/* --- Ambient glow orbs --- */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div
            className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-20"
            style={{
              background: 'radial-gradient(circle, rgba(34,197,94,0.4) 0%, transparent 70%)',
              animation: 'hero-drift 20s ease-in-out infinite',
            }}
          />
          <div
            className="absolute -bottom-20 -left-20 w-[350px] h-[350px] rounded-full opacity-15"
            style={{
              background: 'radial-gradient(circle, rgba(74,222,128,0.35) 0%, transparent 70%)',
              animation: 'hero-drift 15s ease-in-out infinite reverse',
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

        {/* --- Noise texture --- */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          aria-hidden="true"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '128px 128px',
          }}
        />

        {/* ─── Hero content ─── */}
        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 pt-24 sm:pt-28 lg:pt-32 pb-20 sm:pb-28 lg:pb-32">
          {/* ── Status Bar ── */}
          <div
            className="flex items-center gap-3 mb-8 font-mono text-xs text-emerald-400"
            style={{ animation: 'hero-fade-in-up 0.5s ease-out both' }}
            aria-label={t('landing.hero.statusBarLabel', 'System status')}
          >
            <span
              className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0"
              style={{ animation: 'pulse-green 2s ease-in-out infinite' }}
            />
            <span className="tracking-wider uppercase">
              {t('landing.hero.statusLive', 'Live Data')} |{' '}
              {t('landing.hero.statusAgent', 'AI Agent Active')} |{' '}
              {t('landing.hero.statusScan', 'Last Scan: 2 min ago')}
            </span>
          </div>

          {/* ── 3-Column Command Center ── */}
          <div
            className="grid grid-cols-1 lg:grid-cols-[240px_1fr_260px] gap-5 lg:gap-6 mb-12 lg:mb-16"
            style={{ animation: 'hero-fade-in-up 0.7s 0.2s ease-out both' }}
          >
            {/* LEFT — Forest Health Ring */}
            <div className="flex justify-center lg:justify-start">
              <ForestHealthRing />
            </div>

            {/* CENTER — Satellite Map */}
            <div className="flex items-center">
              <SatelliteMap />
            </div>

            {/* RIGHT — Alerts + Drones */}
            <AlertPanel />
          </div>

          {/* ── Headline + CTA ── */}
          <div className="max-w-3xl mx-auto text-center">
            <h1
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight mb-5"
              style={{
                fontFamily: 'var(--font-sans)',
                animation: 'hero-fade-in-up 0.7s 0.4s ease-out both',
              }}
            >
              <span className="text-white">
                {t('landing.hero.titleLine1', 'Do you know how your forest')}{' '}
              </span>
              <span className="text-white">
                {t('landing.hero.titleLine1b', 'is doing')}{' '}
              </span>
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
            </h1>

            <p
              className="text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed"
              style={{
                color: 'rgba(209, 213, 219, 0.7)',
                animation: 'hero-fade-in-up 0.7s 0.5s ease-out both',
              }}
            >
              {t(
                'landing.hero.description',
                'BeetleSense monitors your forest around the clock using satellite, drone, and sensor data. Get a simple summary and early warnings — before damage becomes visible.',
              )}
            </p>

            {/* CTA buttons */}
            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10"
              style={{ animation: 'hero-fade-in-up 0.7s 0.6s ease-out both' }}
            >
              <Link
                to="/signup"
                className="hero-shimmer-btn group inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl font-semibold text-base sm:text-lg transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  color: '#ffffff',
                  boxShadow:
                    '0 0 30px rgba(34, 197, 94, 0.35), 0 4px 20px rgba(0, 0, 0, 0.3)',
                  animation: 'hero-glow-pulse 3s ease-in-out infinite',
                }}
              >
                {t('landing.hero.ctaPrimary', 'Get Started Free')}
                <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>

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

            {/* Stats strip */}
            <div
              className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 max-w-2xl mx-auto mb-10"
              style={{ animation: 'hero-fade-in-up 0.7s 0.7s ease-out both' }}
            >
              {statItems.map(({ value, label, labelKey }) => (
                <div key={labelKey} className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
                    {value}
                  </div>
                  <div className="text-[11px] text-emerald-300/50 font-mono uppercase tracking-wider mt-1">
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {/* Trust logos */}
            <div
              className="flex flex-col items-center gap-4"
              style={{ animation: 'hero-fade-in-up 0.7s 0.8s ease-out both' }}
            >
              <span
                className="text-[10px] font-mono uppercase tracking-[0.2em]"
                style={{ color: 'rgba(156, 163, 175, 0.4)' }}
              >
                {t('landing.hero.trustedBy', 'Powered by')}
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {TRUST_NAMES.map((name) => (
                  <span
                    key={name}
                    className="text-[11px] font-medium px-3 py-1.5 rounded-lg"
                    style={{
                      color: 'rgba(156, 163, 175, 0.5)',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Gradient transition: dark to page background ─── */}
        <div
          className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, transparent, var(--bg))',
          }}
        />
      </div>
    </section>
  );
}
