"use client";
import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, PolylineF, InfoWindowF } from '@react-google-maps/api';
import { Activity } from '@/store/useTripStore';
import { Navigation } from 'lucide-react';

const containerStyle = { width: '100%', height: '100%' };
const DEFAULT_CENTER = { lat: 34.6937, lng: 135.5023 }; // 大阪

// United Tokyo 風格 (黑白灰)
const MONOCHROME_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
  { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "transit.line", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
  { featureType: "transit.station", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9c9c9" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] }
];

export default function TripMap({ activities }: { activities: Activity[] }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ""
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<any>(null);

  const markers = useMemo(() => {
    if (!activities || activities.length === 0) return [];
    return activities
      .filter(act => act.lat && act.lng)
      .map((act, index) => ({
        id: act.id,
        lat: Number(act.lat),
        lng: Number(act.lng),
        label: (index + 1).toString(),
        title: act.location,
        type: act.type
      }));
  }, [activities]);

  const path = useMemo(() => markers.map(m => ({ lat: m.lat, lng: m.lng })), [markers]);

  // 🔥 修正：更穩定的 Zoom 邏輯
  useEffect(() => {
    if (mapRef.current && markers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach(m => bounds.extend({ lat: m.lat, lng: m.lng }));

      if (markers.length === 1) {
          // 單點：直接定位 + 固定 Zoom
          mapRef.current.setCenter({ lat: markers[0].lat, lng: markers[0].lng });
          mapRef.current.setZoom(15);
      } else {
          // 多點：Fit Bounds
          mapRef.current.fitBounds(bounds, 50);
          
          // 🔥 防止 Zoom 太深導致灰畫面 (重要 Fix)
          const listener = google.maps.event.addListener(mapRef.current, "idle", () => {
            if (mapRef.current && mapRef.current.getZoom()! > 16) {
                mapRef.current.setZoom(16); 
            }
            google.maps.event.removeListener(listener);
          });
      }
    } else if (mapRef.current) {
      mapRef.current.setCenter(DEFAULT_CENTER);
      mapRef.current.setZoom(12);
    }
  }, [markers]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  if (loadError) return <div className="w-full h-full flex items-center justify-center bg-gray-100 text-xs text-red-400">Map Error</div>;
  if (!isLoaded) return <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 text-xs animate-pulse">LOADING MAP...</div>;

  return (
    <div className="w-full h-full rounded-xl overflow-hidden shadow-sm border border-gray-200 bg-gray-50 relative">
      <GoogleMap 
        mapContainerStyle={containerStyle} 
        center={DEFAULT_CENTER} 
        zoom={12} 
        options={{
            disableDefaultUI: true, 
            zoomControl: true, 
            clickableIcons: false,
            minZoom: 2,  // 防止縮太細
            maxZoom: 18, // 🔥 防止縮太深變灰
            styles: MONOCHROME_STYLE
        }}
        onLoad={onLoad}
        onClick={() => setSelectedMarker(null)}
      >
        {/* 連線 */}
        {markers.length > 1 && (
            <PolylineF 
                path={path} 
                options={{ strokeColor: '#333333', strokeOpacity: 0.8, strokeWeight: 3, icons: [{ icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 2, strokeColor: '#333333' }, offset: '50%', repeat: '100px' }] }} 
            />
        )}

        {/* Markers */}
        {markers.map((marker) => (
          <MarkerF 
            key={marker.id} 
            position={{ lat: marker.lat, lng: marker.lng }} 
            label={{ text: marker.label, color: 'white', fontWeight: 'bold', fontSize: '12px' }} 
            icon={{
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#1a1a1a', 
                fillOpacity: 1,
                scale: 12,
                strokeColor: '#ffffff',
                strokeWeight: 2,
            }}
            onClick={() => setSelectedMarker(marker)}
          />
        ))}

        {/* InfoWindow */}
        {selectedMarker && (
            <InfoWindowF
                position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
                onCloseClick={() => setSelectedMarker(null)}
                options={{ pixelOffset: new google.maps.Size(0, -12) }}
            >
                <div className="p-2 min-w-[140px] text-center">
                    <h3 className="font-bold text-sm mb-1 text-black font-sans">{selectedMarker.title}</h3>
                    <a 
                        href={`https://www.google.com/maps/dir/?api=1&destination=${selectedMarker.lat},${selectedMarker.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-1 w-full bg-blue-600 text-white text-[10px] py-1.5 rounded hover:opacity-80 transition-opacity no-underline font-bold tracking-widest uppercase mt-2"
                    >
                        <Navigation size={10} /> Google 導航
                    </a>
                </div>
            </InfoWindowF>
        )}
      </GoogleMap>
    </div>
  );
}