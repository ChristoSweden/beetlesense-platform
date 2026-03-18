import { useRef, useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, X, Truck, Factory } from 'lucide-react';
import {
  MILLS,
  haversineDistance,
  estimateTransportCost,
  type Mill,
  type Assortment,
  ASSORTMENTS,
} from '@/services/timberMarketService';

// Default user location — central Småland (adjustable)
const DEFAULT_USER_LAT = 57.0;
const DEFAULT_USER_LNG = 15.0;

interface MillMapProps {
  userLat?: number;
  userLng?: number;
}

export function MillMap({ userLat = DEFAULT_USER_LAT, userLng = DEFAULT_USER_LNG }: MillMapProps) {
  const { i18n, t } = useTranslation();
  const lang = i18n.language;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [selectedMill, setSelectedMill] = useState<Mill | null>(null);
  const [mapError, setMapError] = useState(false);

  const initMap = useCallback(async () => {
    if (!mapContainerRef.current || mapRef.current) return;

    try {
      const maplibregl = await import('maplibre-gl');
      await import('maplibre-gl/dist/maplibre-gl.css');

      const map = new maplibregl.default.Map({
        container: mapContainerRef.current,
        style: {
          version: 8,
          name: 'BeetleSense Dark',
          sources: {
            'osm-raster': {
              type: 'raster',
              tiles: [
                'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
              ],
              tileSize: 256,
            },
          },
          layers: [
            { id: 'background', type: 'background', paint: { 'background-color': '#030d05' } },
            {
              id: 'osm-raster',
              type: 'raster',
              source: 'osm-raster',
              paint: {
                'raster-saturation': -0.8,
                'raster-brightness-max': 0.35,
                'raster-brightness-min': 0.0,
                'raster-contrast': 0.2,
                'raster-hue-rotate': 90,
              },
            },
          ],
        },
        center: [userLng, userLat],
        zoom: 5.5,
        attributionControl: false,
      });

      mapRef.current = map;

      map.on('load', () => {
        // Add mill markers
        MILLS.forEach((mill) => {
          const el = document.createElement('div');
          el.className = 'mill-marker';
          el.style.cssText = `
            width: 28px; height: 28px; border-radius: 50%;
            background: #030d05; border: 2px solid #4ade80;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; transition: transform 0.15s;
          `;
          el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/></svg>`;
          el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.2)'; });
          el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });
          el.addEventListener('click', () => setSelectedMill(mill));

          new maplibregl.default.Marker({ element: el })
            .setLngLat([mill.lng, mill.lat])
            .addTo(map);
        });

        // Add user location marker
        const userEl = document.createElement('div');
        userEl.style.cssText = `
          width: 14px; height: 14px; border-radius: 50%;
          background: #3b82f6; border: 3px solid #1d4ed8;
          box-shadow: 0 0 0 4px rgba(59,130,246,0.2);
        `;
        new maplibregl.default.Marker({ element: userEl })
          .setLngLat([userLng, userLat])
          .addTo(map);
      });
    } catch {
      setMapError(true);
    }
  }, [userLat, userLng]);

  useEffect(() => {
    initMap();
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [initMap]);

  const distance = selectedMill
    ? haversineDistance(userLat, userLng, selectedMill.lat, selectedMill.lng)
    : 0;
  const transportCost = estimateTransportCost(distance);

  if (mapError) {
    return (
      <div className="rounded-xl border border-[var(--border)] p-8 text-center" style={{ background: 'var(--bg2)' }}>
        <MapPin size={32} className="mx-auto text-[var(--text3)] mb-2" />
        <p className="text-sm text-[var(--text2)]">{t('market.millMap.unavailable')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      {/* Map */}
      <div ref={mapContainerRef} className="w-full h-80 relative">
        {/* Selected mill info overlay */}
        {selectedMill && (
          <div
            className="absolute top-3 right-3 z-10 w-72 rounded-xl border border-[var(--border2)] p-4 shadow-xl"
            style={{ background: 'var(--bg)' }}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="text-sm font-semibold text-[var(--text)]">{selectedMill.name}</h4>
                <p className="text-[11px] text-[var(--text3)]">{selectedMill.company}</p>
              </div>
              <button
                onClick={() => setSelectedMill(null)}
                className="p-1 rounded hover:bg-[var(--bg3)] transition-colors"
              >
                <X size={14} className="text-[var(--text3)]" />
              </button>
            </div>

            {/* Distance + transport */}
            <div className="flex items-center gap-4 mb-3 py-2 border-y border-[var(--border)]">
              <div className="flex items-center gap-1.5">
                <MapPin size={12} className="text-[var(--green)]" />
                <span className="text-[11px] font-mono text-[var(--text2)]">{distance} km</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Truck size={12} className="text-[var(--text3)]" />
                <span className="text-[11px] font-mono text-[var(--text2)]">{transportCost} kr/m³fub</span>
              </div>
            </div>

            {/* Bid prices */}
            <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--text3)] mb-1.5">
              {t('market.millMap.currentBids')}
            </p>
            <div className="space-y-1">
              {(Object.entries(selectedMill.assortments) as [Assortment, number][]).map(
                ([assortment, price]) => {
                  const info = ASSORTMENTS.find((a) => a.id === assortment);
                  if (!info) return null;
                  return (
                    <div key={assortment} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: info.color }}
                        />
                        <span className="text-[11px] text-[var(--text2)]">
                          {lang === 'sv' ? info.nameSv : info.nameEn}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-[var(--text)]">
                        {price} kr/m³fub
                      </span>
                    </div>
                  );
                },
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mill list below map */}
      <div className="p-4 border-t border-[var(--border)]">
        <div className="flex items-center gap-2 mb-3">
          <Factory size={14} className="text-[var(--green)]" />
          <h4 className="text-xs font-semibold text-[var(--text)]">
            {t('market.millMap.nearestMills')}
          </h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {MILLS.slice()
            .sort(
              (a, b) =>
                haversineDistance(userLat, userLng, a.lat, a.lng) -
                haversineDistance(userLat, userLng, b.lat, b.lng),
            )
            .slice(0, 4)
            .map((mill) => {
              const d = haversineDistance(userLat, userLng, mill.lat, mill.lng);
              return (
                <button
                  key={mill.id}
                  onClick={() => setSelectedMill(mill)}
                  className={`
                    flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all
                    ${selectedMill?.id === mill.id
                      ? 'border-[var(--green)]/30 bg-[var(--green)]/5'
                      : 'border-[var(--border)] hover:border-[var(--border2)] hover:bg-[var(--bg3)]'
                    }
                  `}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--green)10', color: 'var(--green)' }}
                  >
                    <Factory size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-[var(--text)] truncate">{mill.name}</p>
                    <p className="text-[10px] text-[var(--text3)]">{mill.company} &middot; {d} km</p>
                  </div>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}
