import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapPin, Navigation } from 'lucide-react';

interface ParcelSelectionMapProps {
  onSelect: (coords: [number, number], parcelInfo?: any) => void;
  initialCenter?: [number, number];
}

export const ParcelSelectionMap: React.FC<ParcelSelectionMapProps> = ({ 
  onSelect, 
  initialCenter = [15.0, 57.2] // Default to Southern Sweden
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const marker = useRef<maplibregl.Marker | null>(null);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [loadingParcel, setLoadingParcel] = useState(false);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors'
          }
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: initialCenter,
      zoom: 5
    });

    map.current.on('click', async (e) => {
      const { lng, lat } = e.lngLat;
      const coords: [number, number] = [lng, lat];
      setSelected(coords);

      if (marker.current) {
        marker.current.setLngLat(coords);
      } else {
        marker.current = new maplibregl.Marker({ color: '#10b981' })
          .setLngLat(coords)
          .addTo(map.current!);
      }

      // Simulate Lantmäteriet lookup
      setLoadingParcel(true);
      await new Promise(r => setTimeout(r, 800));
      
      const mockParcelInfo = {
        name: `Skogsskiftet ${Math.floor(Math.random() * 1000)}`,
        municipality: 'Vimmerby',
        area_ha: (Math.random() * 50 + 5).toFixed(1),
        municipality_code: '0880'
      };
      
      setLoadingParcel(false);
      onSelect(coords, mockParcelInfo);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  const handleLocate = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        map.current?.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 14,
          essential: true
        });
      });
    }
  };

  return (
    <div className="relative w-full h-[400px] rounded-2xl overflow-hidden border border-[var(--border)] group">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Controls Overlay */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button 
          onClick={handleLocate}
          className="p-2.5 rounded-xl bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] hover:text-[var(--green)] transition-all shadow-lg active:scale-95"
          title="Hitta min skog"
        >
          <Navigation size={18} />
        </button>
      </div>

      {/* Guide Overlay */}
      {!selected && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
          <div className="px-5 py-3 rounded-2xl bg-[var(--bg)]/90 border border-[var(--border)] text-center shadow-2xl scale-in">
            <MapPin className="mx-auto mb-2 text-[var(--green)]" size={24} />
            <p className="text-sm font-medium text-[var(--text)]">Klicka på kartan för att välja din fastighet</p>
            <p className="text-[11px] text-[var(--text3)] mt-1">Du kan panorera och zooma fritt</p>
          </div>
        </div>
      )}

      {/* Loading state for parcel lookup */}
      {loadingParcel && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-[var(--bg)]/90 border border-[var(--green)]/30 text-[var(--text)] text-xs flex items-center gap-2 shadow-xl">
          <div className="w-3 h-3 rounded-full border-2 border-[var(--green)]/20 border-t-[var(--green)] animate-spin" />
          Hämtar fastighetsdata från Lantmäteriet...
        </div>
      )}
    </div>
  );
};
