import { useRef, useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { MarketplaceListing, ListingCategory } from '@/hooks/useMarketplace';
import { useTranslation } from 'react-i18next';

const CATEGORY_COLORS: Record<ListingCategory, string> = {
  services: '#4ade80',
  equipment: '#fbbf24',
  materials: '#34d399',
  knowledge: '#38bdf8',
};

const DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  name: 'Marketplace Dark',
  sources: {
    'osm-raster': {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#030d05' },
    },
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
};

interface MarketplaceMapProps {
  listings: MarketplaceListing[];
  onListingClick: (listing: MarketplaceListing) => void;
  className?: string;
}

export function MarketplaceMap({ listings, onListingClick, className = '' }: MarketplaceMapProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [isReady, setIsReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DARK_STYLE,
      center: [14.8, 57.1], // Småland center
      zoom: 7,
      attributionControl: false,
      maxZoom: 15,
      minZoom: 5,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      setIsReady(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when listings change
  useEffect(() => {
    if (!isReady || !mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const map = mapRef.current;

    listings.forEach((listing) => {
      const color = CATEGORY_COLORS[listing.category];

      // Create custom marker element
      const el = document.createElement('div');
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = color;
      el.style.border = '2px solid #030d05';
      el.style.boxShadow = `0 0 8px ${color}40`;
      el.style.cursor = 'pointer';
      el.style.transition = 'transform 0.15s';
      el.title = listing.title;

      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.3)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });

      // Popup
      const popup = new maplibregl.Popup({
        offset: 16,
        closeButton: false,
        maxWidth: '220px',
      }).setHTML(`
        <div style="font-family: system-ui; padding: 4px;">
          <p style="font-size: 12px; font-weight: 600; color: #e5e7eb; margin: 0 0 4px 0;">${listing.title}</p>
          <p style="font-size: 10px; color: #9ca3af; margin: 0 0 4px 0;">${listing.seller.name} &middot; ${listing.seller.county}</p>
          <p style="font-size: 11px; font-weight: 600; color: ${listing.price_type === 'free' ? '#4ade80' : '#e5e7eb'}; margin: 0;">
            ${listing.price_type === 'free' ? t('marketplace.free') : listing.price_type === 'exchange' ? t('marketplace.exchange') : `${listing.price} kr`}
          </p>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(listing.coordinates)
        .setPopup(popup)
        .addTo(map);

      el.addEventListener('click', () => {
        onListingClick(listing);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds if we have listings
    if (listings.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      listings.forEach((l) => bounds.extend(l.coordinates));
      map.fitBounds(bounds, { padding: 60, maxZoom: 10, duration: 500 });
    }
  }, [listings, isReady, onListingClick, t]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full rounded-xl overflow-hidden border border-[var(--border)] ${className}`}
      role="region"
      aria-label={t('marketplace.mapLabel')}
    />
  );
}
