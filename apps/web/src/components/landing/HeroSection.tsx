import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Viewer, Entity, CameraFlyTo, ImageryLayer } from 'resium';
import {
  Ion,
  Cartesian2,
  Cartesian3,
  Color,
  Math as CesiumMath,
  createWorldTerrainAsync,
  UrlTemplateImageryProvider,
  VerticalOrigin,
  HorizontalOrigin,
  LabelStyle,
  NearFarScalar,
} from 'cesium';
import 'cesium/Source/Widgets/widgets.css';

// Set Cesium Ion access token
Ion.defaultAccessToken =
  import.meta.env.VITE_CESIUM_ION_TOKEN ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxNTk0ZGE1Zi1lMzg1LTQyNzQtYjQxNy0zMWQ0NjVlMjUzZWQiLCJpZCI6MjU5LCJzY29wZXMiOlsiYXNyIiwiZ2MiXSwiaWF0IjoxNTMwMTI2NjE3fQ.D3xQgCfmLIH8gQJ_7eSqZR8FthVnM1rsE4MvRdp3tOg';

// Async terrain provider (created once, shared across renders)
const terrainProviderPromise = createWorldTerrainAsync();

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
        background: '#0a1a0d',
        border: '1px solid rgba(16, 185, 129, 0.15)',
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

const DETECTION_POINTS = [
  { coords: [15.05, 57.25] as [number, number], label: 'IPS TYPOGRAPHUS', color: '#ef4444' },
  { coords: [15.15, 57.18] as [number, number], label: 'CANOPY LOSS -12%', color: '#ef4444' },
  { coords: [15.22, 57.22] as [number, number], label: 'THERMAL +3.2\u00b0C', color: '#f97316' },
  { coords: [14.98, 57.15] as [number, number], label: 'DROUGHT INDEX', color: '#f97316' },
] as const;

/** Hansen tree cover loss imagery overlay */
const hansenLossProvider = new UrlTemplateImageryProvider({
  url: 'https://storage.googleapis.com/earthenginepartners-hansen/tiles/gfc_v1.11/loss_year/{z}/{x}/{y}.png',
  maximumLevel: 12,
});

function SatelliteMap() {
  // Camera destination: Småland, Sweden at 15 km altitude
  const destination = useMemo(
    () => Cartesian3.fromDegrees(15.1, 57.2, 15000),
    [],
  );
  const orientation = useMemo(
    () => ({
      heading: CesiumMath.toRadians(0),
      pitch: CesiumMath.toRadians(-45),
      roll: 0,
    }),
    [],
  );

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

      {/* CesiumJS 3D terrain viewer */}
      <div
        className="relative rounded-xl overflow-hidden h-[400px] sm:h-[480px] lg:h-[560px]"
        style={{
          border: '1px solid rgba(16, 185, 129, 0.2)',
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.5)',
        }}
      >
        <Viewer
          full
          timeline={false}
          animation={false}
          baseLayerPicker={false}
          geocoder={false}
          homeButton={false}
          navigationHelpButton={false}
          sceneModePicker={false}
          fullscreenButton={false}
          selectionIndicator={false}
          infoBox={false}
          terrainProvider={terrainProviderPromise}
          style={{ position: 'absolute', inset: 0 }}
        >
          {/* Camera fly to Småland with a 45-degree pitch */}
          <CameraFlyTo
            destination={destination}
            orientation={orientation}
            duration={0}
            once
          />

          {/* Hansen tree cover loss overlay */}
          <ImageryLayer imageryProvider={hansenLossProvider} alpha={0.6} />

          {/* Detection point entities with pulsing markers */}
          {DETECTION_POINTS.map((pt, i) => (
            <Entity
              key={i}
              position={Cartesian3.fromDegrees(pt.coords[0], pt.coords[1], 200)}
              point={{
                pixelSize: 12,
                color: Color.fromCssColorString(pt.color).withAlpha(0.9),
                outlineColor: Color.WHITE.withAlpha(0.5),
                outlineWidth: 2,
                scaleByDistance: new NearFarScalar(1000, 1.5, 50000, 0.6),
              }}
              label={{
                text: pt.label,
                font: '11px monospace',
                fillColor: pt.color === '#ef4444'
                  ? Color.fromCssColorString('#fca5a5')
                  : Color.fromCssColorString('#fdba74'),
                backgroundColor: Color.BLACK.withAlpha(0.6),
                showBackground: true,
                backgroundPadding: new Cartesian2(6, 4),
                verticalOrigin: VerticalOrigin.BOTTOM,
                horizontalOrigin: HorizontalOrigin.LEFT,
                pixelOffset: new Cartesian2(14, -4),
                style: LabelStyle.FILL,
                scaleByDistance: new NearFarScalar(1000, 1.2, 50000, 0.5),
              }}
            />
          ))}
        </Viewer>

        {/* Scan line */}
        <div
          className="absolute left-0 right-0 h-px pointer-events-none z-10"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.6), transparent)',
            animation: 'hero-scan-line 3s linear infinite',
          }}
        />

        {/* Grid overlay for technical feel */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none z-10"
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
          className="absolute bottom-0 left-0 right-0 px-3 py-2 flex items-center justify-between pointer-events-none z-10"
          style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}
        >
          <span className="text-[9px] font-mono text-emerald-300/70">SWEREF99 TM / 57.2{'\u00b0'}N 15.1{'\u00b0'}E</span>
          <span className="text-[9px] font-mono text-emerald-300/70">3D TERRAIN + 5 LAYERS</span>
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
          background: '#0a1a0d',
          border: '1px solid rgba(255, 255, 255, 0.08)',
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
          background: '#0a1a0d',
          border: '1px solid rgba(255, 255, 255, 0.08)',
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

          {/* ── Full-Width Map with Overlaid Data ── */}
          <div
            className="relative mb-12 lg:mb-16"
            style={{ animation: 'hero-fade-in-up 0.7s 0.2s ease-out both' }}
          >
            {/* THE MAP — full width, this IS the hero */}
            <SatelliteMap />

            {/* Health Ring — overlaid top-left on the map */}
            <div className="absolute top-4 left-4 z-10 hidden sm:block">
              <ForestHealthRing />
            </div>

            {/* Alerts — overlaid top-right on the map */}
            <div className="absolute top-4 right-4 z-10 hidden lg:block" style={{ maxWidth: '280px' }}>
              <AlertPanel />
            </div>

            {/* Mobile: show health ring + alerts below map */}
            <div className="sm:hidden mt-4 flex flex-col gap-4">
              <ForestHealthRing />
            </div>
            <div className="lg:hidden mt-4">
              <AlertPanel />
            </div>
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
