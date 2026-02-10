"use client";
import { useMemo, useState, useCallback, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, PolylineF, InfoWindowF } from '@react-google-maps/api';
import { Activity } from '@/store/useTripStore';
import { Navigation } from 'lucide-react';

const containerStyle = { width: '100%', height: '100%' };

// 預設大阪中心
const DEFAULT_CENTER = { lat: 34.7024, lng: 135.4959 };

// United Tokyo 風格
const MONOCHROME_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
  { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
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

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<any>(null);

  // 1. 整理 Marker 數據
  const markers = useMemo(() => {
    if (!activities || activities.length === 0) return [];
    
    return activities
      .filter(act => act.lat !== undefined && act.lng !== undefined)
      .map((act, index) => {
        const lat = Number(act.lat);
        const lng = Number(act.lng);
        if (isNaN(lat) || isNaN(lng)) return null;

        return {
          id: act.id,
          lat,
          lng,
          label: (index + 1).toString(),
          title: act.location,
          type: act.type
        };
      })
      .filter(m => m !== null);
  }, [activities]);

  const path = useMemo(() => markers.map(m => ({ lat: m!.lat, lng: m!.lng })), [markers]);

  // 2. 🔥 智能縮放邏輯 (Smart Zoom)
  useEffect(() => {
    if (map && markers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach(m => bounds.extend({ lat: m!.lat, lng: m!.lng }));

      // 檢查所有點是否太過接近 (例如全部都在同一個座標)
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      
      // 計算經緯度差值
      const latDiff = Math.abs(ne.lat() - sw.lat());
      const lngDiff = Math.abs(ne.lng() - sw.lng());

      // 如果只有一個點，或者所有點都擠在一起 (差值極小)
      if (markers.length === 1 || (latDiff < 0.005 && lngDiff < 0.005)) {
          // 強制設定中心點 + 舒適的 Zoom Level
          map.setCenter({ lat: markers[0]!.lat, lng: markers[0]!.lng });
          map.setZoom(15); // Level 15 是街道級別，睇得最舒服
      } else {
          // 點夠分散，先 Fit Bounds
          map.fitBounds(bounds, 50); // 50px padding
          
          // 防止 Fit Bounds Zoom 得太深 (例如只有兩個點且很近)
          // 這裡使用 listener 限制最大 Zoom
          const listener = google.maps.event.addListener(map, "idle", () => { 
            if (map.getZoom()! > 16) map.setZoom(16); 
            google.maps.event.removeListener(listener); 
          });
      }
    } else if (map) {
      // 無 Marker，去大阪
      map.setCenter(DEFAULT_CENTER);
      map.setZoom(12);
    }
  }, [map, markers]);

  const onLoad = useCallback((map: google.maps.Map) => setMap(map), []);

  if (loadError) return <div className="w-full h-full flex items-center justify-center bg-gray-100 text-xs text-red-400">Map Error</div>;
  if (!isLoaded) return <div className="w-full h-full flex items-center justify-center bg-gray-100 text-xs text-gray-400 animate-pulse">LOADING MAP...</div>;

  return (
    <div className="w-full h-full rounded-xl overflow-hidden shadow-sm border border-gray-200 bg-gray-50 relative">
      <GoogleMap 
        mapContainerStyle={containerStyle} 
        center={DEFAULT_CENTER} 
        zoom={12} 
        options={{
            ...{ 
              disableDefaultUI: true, 
              zoomControl: true, 
              clickableIcons: false,
              maxZoom: 18 // 🔥 限制最大縮放，防止變灰
            },
            styles: MONOCHROME_STYLE
        }}
        onLoad={onLoad}
        onClick={() => setSelectedMarker(null)}
      >
        {/* 連線 */}
        {markers.length > 1 && (
            <PolylineF 
                path={path as google.maps.LatLngLiteral[]} 
                options={{ 
                    strokeColor: '#333333', 
                    strokeOpacity: 0.6, 
                    strokeWeight: 2,
                    icons: [{ icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 2, strokeColor: '#333333' }, offset: '50%', repeat: '100px' }]
                }} 
            />
        )}

        {/* Markers */}
        {markers.map((marker) => (
          <MarkerF 
            key={marker!.id} 
            position={{ lat: marker!.lat, lng: marker!.lng }} 
            label={{ 
                text: marker!.label, 
                color: 'white', 
                fontWeight: 'bold', 
                fontSize: '12px',
            }} 
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
                    <div className="flex justify-center mb-2">
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full uppercase tracking-wider">{selectedMarker.type}</span>
                    </div>
                    <a 
                        href={`https://www.google.com/maps/dir/?api=1&destination=${selectedMarker.lat},${selectedMarker.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-1 w-full bg-black text-white text-[10px] py-1.5 rounded hover:opacity-80 transition-opacity no-underline font-bold tracking-widest uppercase"
                    >
                        <Navigation size={10} /> Navigate
                    </a>
                </div>
            </InfoWindowF>
        )}
      </GoogleMap>
    </div>
  );
}