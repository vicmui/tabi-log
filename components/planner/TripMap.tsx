"use client";
import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, PolylineF, InfoWindowF } from '@react-google-maps/api';
import { Activity } from '@/store/useTripStore';
import { Navigation, MapPin } from 'lucide-react';

const containerStyle = { width: '100%', height: '100%' };
const DEFAULT_CENTER = { lat: 34.6937, lng: 135.5023 };

// 🔥 關鍵修正：必須與 layout.tsx 完全一致
const LIBRARIES: ("places" | "marker" | "geometry" | "routes")[] = ["places", "marker", "geometry", "routes"];

export default function TripMap({ activities }: { activities: Activity[] }) {
  // 這裡再次呼叫 loader 是安全的，只要參數一樣，它會重用已載入的 script
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "",
    libraries: LIBRARIES, 
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<any>(null);

  // 數據轉換
  const markers = useMemo(() => {
    if (!activities || activities.length === 0) return [];
    return activities
      .map((act, index) => {
        const lat = parseFloat(String(act.lat));
        const lng = parseFloat(String(act.lng));
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
      .filter((m): m is NonNullable<typeof m> => m !== null);
  }, [activities]);

  const path = useMemo(() => markers.map(m => ({ lat: m.lat, lng: m.lng })), [markers]);

  // 自動 Zoom
  useEffect(() => {
    if (mapRef.current && markers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach(m => bounds.extend({ lat: m.lat, lng: m.lng }));
      if (markers.length === 1) {
          mapRef.current.setCenter({ lat: markers[0].lat, lng: markers[0].lng });
          mapRef.current.setZoom(15);
      } else {
          mapRef.current.fitBounds(bounds, 50);
      }
    } else if (mapRef.current) {
      mapRef.current.setCenter(DEFAULT_CENTER);
      mapRef.current.setZoom(12);
    }
  }, [markers, isLoaded]); // 加入 isLoaded 依賴

  const onLoad = useCallback((map: google.maps.Map) => { mapRef.current = map; }, []);

  if (loadError) return <div className="w-full h-full flex items-center justify-center bg-gray-100 text-xs text-red-400">Map Error</div>;
  if (!isLoaded) return <div className="w-full h-full flex items-center justify-center bg-gray-100 text-xs text-gray-400 animate-pulse">LOADING MAP...</div>;

  return (
    <div className="w-full h-full rounded-xl overflow-hidden shadow-sm border border-gray-200 bg-white relative">
      <div className="absolute top-2 left-2 z-10 bg-white/90 backdrop-blur px-3 py-1 rounded-full shadow-sm border border-gray-200 text-[10px] font-bold text-gray-600 flex items-center gap-1">
         <MapPin size={10} className={markers.length > 0 ? "text-green-500" : "text-gray-400"}/>
         {markers.length > 0 ? `已定位 ${markers.length} 個地點` : "暫無座標資料"}
      </div>
      
      <GoogleMap 
        mapContainerStyle={containerStyle} 
        center={DEFAULT_CENTER} 
        zoom={12} 
        options={{
            disableDefaultUI: true, 
            zoomControl: true, 
            clickableIcons: false,
            maxZoom: 18,
            // 🔥 移除 styles: MONOCHROME_STYLE -> 變回彩色
        }}
        onLoad={onLoad} 
        onClick={() => setSelectedMarker(null)}
      >
        {/* 連線 (改為藍色以配合 Google 風格) */}
        {markers.length > 1 && (
            <PolylineF 
                path={path as google.maps.LatLngLiteral[]} 
                options={{ 
                    strokeColor: '#4285F4', // Google Blue
                    strokeOpacity: 0.8, 
                    strokeWeight: 4, 
                    icons: [{ icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 2, strokeColor: '#4285F4' }, offset: '50%', repeat: '100px' }] 
                }} 
            />
        )}

        {/* Markers (改為 Google 紅色波波) */}
        {markers.map((marker) => (
          <MarkerF 
            key={marker.id} 
            position={{ lat: marker.lat, lng: marker.lng }} 
            label={{ text: marker.label, color: 'white', fontWeight: 'bold', fontSize: '12px' }} 
            onClick={() => setSelectedMarker(marker)}
          />
        ))}

        {selectedMarker && (
            <InfoWindowF position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }} onCloseClick={() => setSelectedMarker(null)} options={{ pixelOffset: new google.maps.Size(0, -30) }}>
                <div className="p-2 min-w-[140px] text-center">
                    <h3 className="font-bold text-sm mb-1 text-black font-sans">{selectedMarker.title}</h3>
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${selectedMarker.lat},${selectedMarker.lng}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1 w-full bg-blue-600 text-white text-[10px] py-1.5 rounded hover:opacity-80 transition-opacity no-underline font-bold tracking-widest uppercase mt-2"><Navigation size={10} /> 導航</a>
                </div>
            </InfoWindowF>
        )}
      </GoogleMap>
    </div>
  );
}