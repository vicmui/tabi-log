"use client";
import { useMemo, useState, useCallback, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, PolylineF, InfoWindowF } from '@react-google-maps/api';
import { Activity } from '@/store/useTripStore';
import { Navigation, MapPin } from 'lucide-react';

const containerStyle = { width: '100%', height: '100%' };

// 預設大阪 (如果真的完全無行程)
const DEFAULT_CENTER = { lat: 34.6937, lng: 135.5023 };

const mapOptions = {
  disableDefaultUI: true, 
  zoomControl: true, 
  mapTypeControl: false, 
  streetViewControl: false,
  styles: [
    { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
  ],
};

export default function TripMap({ activities }: { activities: Activity[] }) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ""
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<any>(null); // 存儲當前點擊的 Marker

  // 1. 整理 Marker 資料
  const markers = useMemo(() => {
    if (!activities) return [];
    return activities
      .filter(act => act.lat && act.lng) // 必須有經緯度
      .map((act, index) => ({
        id: act.id,
        lat: act.lat!,
        lng: act.lng!,
        label: (index + 1).toString(), // 1, 2, 3...
        title: act.location,
        type: act.type
      }));
  }, [activities]);

  // 2. 連線路徑
  const path = useMemo(() => markers.map(m => ({ lat: m.lat, lng: m.lng })), [markers]);

  // 3. 自動縮放 (Auto Zoom)
  useEffect(() => {
    if (map && markers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach(m => bounds.extend({ lat: m.lat, lng: m.lng }));
      // 如果只有一個點，不要 Zoom 太近
      if (markers.length === 1) {
          map.setCenter({ lat: markers[0].lat, lng: markers[0].lng });
          map.setZoom(15);
      } else {
          map.fitBounds(bounds, 50); // 50px padding
      }
    } else if (map) {
      map.setCenter(DEFAULT_CENTER);
      map.setZoom(12);
    }
  }, [map, markers]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  if (!isLoaded) return <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 text-xs animate-pulse">地圖載入中...</div>;

  return (
    <div className="w-full h-full rounded-xl overflow-hidden shadow-inner border border-gray-200 bg-gray-100 relative">
      <GoogleMap 
        mapContainerStyle={containerStyle} 
        zoom={13} 
        center={DEFAULT_CENTER}
        options={mapOptions} 
        onLoad={onLoad}
        onClick={() => setSelectedMarker(null)} // 點地圖空白處關閉視窗
      >
        {/* 連線 */}
        {markers.length > 1 && (
            <PolylineF 
                path={path} 
                options={{ strokeColor: '#333333', strokeOpacity: 0.8, strokeWeight: 3, icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 2 }, offset: '0', repeat: '20px' }] }} 
            />
        )}

        {/* Markers */}
        {markers.map((marker) => (
          <MarkerF 
            key={marker.id} 
            position={{ lat: marker.lat, lng: marker.lng }} 
            label={{ text: marker.label, color: 'white', fontWeight: 'bold', fontSize: '14px' }} 
            onClick={() => setSelectedMarker(marker)}
          />
        ))}

        {/* 🔥 InfoWindow (點擊後彈出) */}
        {selectedMarker && (
            <InfoWindowF
                position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
                onCloseClick={() => setSelectedMarker(null)}
                options={{ pixelOffset: new google.maps.Size(0, -30) }}
            >
                <div className="p-2 min-w-[150px]">
                    <h3 className="font-bold text-sm mb-1 text-black">{selectedMarker.title}</h3>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                        <span className="bg-gray-100 px-1 rounded uppercase">{selectedMarker.type}</span>
                    </div>
                    
                    {/* 🔥 導航按鈕 */}
                    <a 
                        href={`https://www.google.com/maps/dir/?api=1&destination=${selectedMarker.lat},${selectedMarker.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white text-xs py-2 rounded-lg hover:bg-blue-700 transition-colors no-underline font-bold"
                    >
                        <Navigation size={12} /> Google 導航
                    </a>
                </div>
            </InfoWindowF>
        )}
      </GoogleMap>
    </div>
  );
}