"use client";
import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { GoogleMap, MarkerF, PolylineF, InfoWindowF } from '@react-google-maps/api';
import { Activity } from '@/store/useTripStore';
import { Navigation, MapPin } from 'lucide-react';

const containerStyle = { width: '100%', height: '100%' };
const DEFAULT_CENTER = { lat: 34.6937, lng: 135.5023 };

export default function TripMap({ activities }: { activities: Activity[] }) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<any>(null);

  // 1. 強力數據清洗 (過濾 null 及 確保數值正確)
  const markers = useMemo(() => {
    if (!activities) return [];
    return activities
      .filter(act => !!act && !!act.id && act.lat && act.lng)
      .map((act, index) => ({
        id: act.id,
        lat: parseFloat(String(act.lat)),
        lng: parseFloat(String(act.lng)),
        label: (index + 1).toString(),
        title: act.location,
        type: act.type
      }));
  }, [activities]);

  const path = useMemo(() => markers.map(m => ({ lat: m.lat, lng: m.lng })), [markers]);

  // 2. 自動縮放邏輯
  useEffect(() => {
    if (mapRef.current) {
        if (markers.length > 0) {
            const bounds = new google.maps.LatLngBounds();
            markers.forEach(m => bounds.extend({ lat: m.lat, lng: m.lng }));
            if (markers.length === 1) {
                mapRef.current.setCenter({ lat: markers[0].lat, lng: markers[0].lng });
                mapRef.current.setZoom(15);
            } else {
                mapRef.current.fitBounds(bounds, 50);
                const listener = google.maps.event.addListener(mapRef.current, "idle", () => {
                    if (mapRef.current && mapRef.current.getZoom()! > 16) mapRef.current.setZoom(16);
                    google.maps.event.removeListener(listener);
                });
            }
        } else {
            mapRef.current.setCenter(DEFAULT_CENTER);
            mapRef.current.setZoom(12);
        }
    }
  }, [markers]);

  const onLoad = useCallback((map: google.maps.Map) => { mapRef.current = map; }, []);

  return (
    <div className="w-full h-full  overflow-hidden shadow-sm border border-gray-200 bg-gray-50 relative">
      {/* 已定位地點顯示 */}
      <div className="absolute top-3 left-3 z-10 bg-white/80 backdrop-blur-sm text-neutral-700 px-3 py-1.5 rounded-full shadow-sm text-[10px] font-semibold flex items-center gap-1.5 tracking-widest uppercase border border-white/60">
         <MapPin size={10} className={markers.length > 0 ? "text-white" : "text-gray-500"}/>
         {markers.length > 0 ? `LOCATED: ${markers.length} PLACES` : "NO COORDINATES"}
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
            // 🔥 已移除自定義 styles，還原 Google Maps 原始彩色
        }} 
        onLoad={onLoad} 
        onClick={() => setSelectedMarker(null)}
      >
        {/* 🔥 連接線：改為純黑色 (United Tokyo Style) */}
        {markers.length > 1 && (
            <PolylineF 
                path={path} 
                options={{ 
                    strokeColor: '#000000', 
                    strokeOpacity: 0.8, 
                    strokeWeight: 3, 
                    icons: [{ 
                        icon: { 
                            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, 
                            scale: 2, 
                            strokeColor: '#000000',
                            fillColor: '#000000',
                            fillOpacity: 1
                        }, 
                        offset: '50%', 
                        repeat: '100px' 
                    }] 
                }} 
            />
        )}

        {/* 🔥 Pin (Markers)：改為純黑圓點 + 白色數字邊框 */}
        {markers.map((marker) => (
          <MarkerF 
            key={marker.id} 
            position={{ lat: marker.lat, lng: marker.lng }} 
            label={{ 
                text: marker.label, 
                color: 'white', 
                fontWeight: 'bold', 
                fontSize: '11px' 
            }} 
            icon={{
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#000000', // 純黑
                fillOpacity: 1,
                scale: 12,
                strokeColor: '#ffffff', // 白色邊框
                strokeWeight: 2,
            }}
            onClick={() => setSelectedMarker(marker)}
          />
        ))}

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
                        className="flex items-center justify-center gap-1 w-full bg-black text-white text-[10px] py-2 rounded hover:opacity-80 transition-opacity no-underline font-bold tracking-widest uppercase mt-2"
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
