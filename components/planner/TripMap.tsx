"use client";
import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { GoogleMap, MarkerF, PolylineF, InfoWindowF } from '@react-google-maps/api';
import { Activity } from '@/store/useTripStore';
import { Navigation, MapPin } from 'lucide-react';

const containerStyle = { width: '100%', height: '100%' };
const DEFAULT_CENTER = { lat: 34.6937, lng: 135.5023 };

// ── Category label map ────────────────────────────────────────────────────────
const TYPE_LABELS: Record<string, { label: string; emoji: string }> = {
  Food:          { label: '餐飲',   emoji: '🍽️' },
  Transport:     { label: '交通',   emoji: '🚃' },
  Accommodation: { label: '住宿',   emoji: '🏨' },
  Sightseeing:   { label: '景點',   emoji: '📸' },
  Shopping:      { label: '購物',   emoji: '🛍️' },
  Other:         { label: '其他',   emoji: '📍' },
}

export default function TripMap({ activities }: { activities: Activity[] }) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<any>(null);

  // ── Data cleaning ─────────────────────────────────────────────────────────
  const markers = useMemo(() => {
    if (!activities) return [];
    return activities
      .filter(act => !!act && !!act.id && act.lat && act.lng)
      .map((act, index) => ({
        id:      act.id,
        lat:     parseFloat(String(act.lat)),
        lng:     parseFloat(String(act.lng)),
        seq:     index + 1,
        title:   act.location,
        time:    (act as any).time   ?? '',
        note:    (act as any).note   ?? '',
        address: (act as any).address ?? '',
        type:    act.type ?? 'Other',
      }));
  }, [activities]);

  const path = useMemo(() => markers.map(m => ({ lat: m.lat, lng: m.lng })), [markers]);

  // ── Auto-fit bounds ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    if (markers.length === 0) {
      mapRef.current.setCenter(DEFAULT_CENTER);
      mapRef.current.setZoom(12);
      return;
    }
    if (markers.length === 1) {
      mapRef.current.setCenter({ lat: markers[0].lat, lng: markers[0].lng });
      mapRef.current.setZoom(15);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    markers.forEach(m => bounds.extend({ lat: m.lat, lng: m.lng }));
    mapRef.current.fitBounds(bounds, 50);
    const listener = google.maps.event.addListener(mapRef.current, 'idle', () => {
      if (mapRef.current && mapRef.current.getZoom()! > 16) mapRef.current.setZoom(16);
      google.maps.event.removeListener(listener);
    });
  }, [markers]);

  const onLoad = useCallback((map: google.maps.Map) => { mapRef.current = map; }, []);

  return (
    <div className="w-full h-full overflow-hidden shadow-sm border border-gray-200 bg-gray-50 relative">

      {/* Located badge */}
      <div className="absolute top-3 left-3 z-10 bg-white/80 backdrop-blur-sm text-neutral-700 px-3 py-1.5 rounded-full shadow-sm text-[10px] font-semibold flex items-center gap-1.5 tracking-widest uppercase border border-white/60">
        <MapPin size={10} className={markers.length > 0 ? 'text-black' : 'text-gray-400'} />
        {markers.length > 0 ? `LOCATED: ${markers.length} PLACES` : 'NO COORDINATES'}
      </div>

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={DEFAULT_CENTER}
        zoom={12}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          clickableIcons: true,
          maxZoom: 18,
        }}
        onLoad={onLoad}
        onClick={() => setSelectedMarker(null)}
      >
        {/* Connecting polyline */}
        {markers.length > 1 && (
          <PolylineF
            path={path}
            options={{
              strokeColor: '#000000',
              strokeOpacity: 0.7,
              strokeWeight: 2,
              icons: [{
                icon: {
                  path: google.maps.SymbolPath.FORWARD_OPEN_ARROW,
                  scale: 2.5,
                  strokeColor: '#000000',
                  strokeOpacity: 0.8,
                  strokeWeight: 1.5,
                },
                offset: '100%',
                repeat: '100px',
              }],
            }}
          />
        )}

        {/* Markers */}
        {markers.map(marker => (
          <MarkerF
            key={marker.id}
            position={{ lat: marker.lat, lng: marker.lng }}
            label={{
              text: String(marker.seq),
              color: 'white',
              fontWeight: 'bold',
              fontSize: '11px',
            }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: '#111111',
              fillOpacity: 1,
              scale: 13,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            }}
            onClick={() => setSelectedMarker(marker)}
          />
        ))}

        {/* ── Rich InfoWindow ── */}
        {selectedMarker && (
          <InfoWindowF
            position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
            onCloseClick={() => setSelectedMarker(null)}
            options={{ pixelOffset: new google.maps.Size(0, -28) }}
          >
            <div style={{ minWidth: 180, maxWidth: 240, fontFamily: 'sans-serif', padding: '2px 2px 4px' }}>

              {/* Seq badge + type */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%',
                  backgroundColor: '#111', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>
                  {selectedMarker.seq}
                </span>
                {(() => {
                  const t = TYPE_LABELS[selectedMarker.type] ?? TYPE_LABELS.Other;
                  return (
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                      backgroundColor: '#f3f4f6', color: '#555',
                      padding: '2px 8px', borderRadius: 99,
                    }}>
                      {t.emoji} {t.label}
                    </span>
                  );
                })()}
              </div>

              {/* Place name */}
              <p style={{ margin: '0 0 4px 0', fontWeight: 700, fontSize: 13, color: '#111', lineHeight: 1.3 }}>
                {selectedMarker.title}
              </p>

              {/* Time */}
              {selectedMarker.time && (
                <p style={{ margin: '4px 0', fontSize: 11, color: '#888' }}>
                  🕐 {selectedMarker.time}
                </p>
              )}

              {/* Address */}
              {selectedMarker.address && (
                <p style={{ margin: '4px 0', fontSize: 10, color: '#aaa', lineHeight: 1.4 }}>
                  📍 {selectedMarker.address}
                </p>
              )}

              {/* Note */}
              {selectedMarker.note && (
                <p style={{ margin: '4px 0 6px', fontSize: 11, color: '#666', fontStyle: 'italic', lineHeight: 1.4 }}>
                  {selectedMarker.note}
                </p>
              )}

              {/* Navigation button */}
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${selectedMarker.lat},${selectedMarker.lng}&travelmode=transit`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  marginTop: 8, padding: '8px 12px',
                  backgroundColor: '#111', color: '#fff',
                  borderRadius: 8, fontSize: 11, fontWeight: 700,
                  textDecoration: 'none', letterSpacing: '0.06em',
                  width: '100%', boxSizing: 'border-box',
                }}
              >
                ↗ 導航前往
              </a>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>
    </div>
  );
}
