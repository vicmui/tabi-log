"use client";
import { useMemo, useState, useCallback, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, PolylineF, InfoWindowF } from '@react-google-maps/api';
import { Activity } from '@/store/useTripStore';
import { Navigation } from 'lucide-react';

const containerStyle = { width: '100%', height: '100%' };
const DEFAULT_CENTER = { lat: 34.6937, lng: 135.5023 }; // 大阪

// Wanderlog 風格顏色 (藍色為主)
const THEME_COLOR = "#3B82F6"; 

const mapOptions = {
  disableDefaultUI: true, 
  zoomControl: true, 
  clickableIcons: false, // 唔好俾 Google 預設既地標干擾
  styles: [
    { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }, // 隱藏 Google 預設景點
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
  const [selectedMarker, setSelectedMarker] = useState<any>(null);

  // 1. 轉換數據為 Marker (並過濾無座標的廢資料)
  const markers = useMemo(() => {
    if (!activities) return [];
    
    // Debug: 睇下有幾多個點真係有 lat/lng
    const validPoints = activities.filter(act => act.lat && act.lng);
    console.log(`地圖數據: 總共 ${activities.length} 個行程，其中 ${validPoints.length} 個有座標`);

    return validPoints.map((act, index) => ({
        id: act.id,
        lat: act.lat!,
        lng: act.lng!,
        label: (index + 1).toString(), // 1, 2, 3...
        title: act.location,
        type: act.type
      }));
  }, [activities]);

  const path = useMemo(() => markers.map(m => ({ lat: m.lat, lng: m.lng })), [markers]);

  // 2. 自動縮放 (Fit Bounds) - 這是關鍵！
  useEffect(() => {
    if (map && markers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach(m => bounds.extend({ lat: m.lat, lng: m.lng }));
      map.fitBounds(bounds, 50); // 50px padding
    } else if (map) {
      map.setCenter(DEFAULT_CENTER);
      map.setZoom(12);
    }
  }, [map, markers]);

  const onLoad = useCallback((map: google.maps.Map) => setMap(map), []);

  if (!isLoaded) return <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 text-xs">載入地圖中...</div>;

  return (
    <div className="w-full h-full rounded-xl overflow-hidden shadow-inner border border-gray-200 bg-gray-100 relative">
      <GoogleMap 
        mapContainerStyle={containerStyle} 
        center={DEFAULT_CENTER} 
        zoom={13} 
        options={mapOptions} 
        onLoad={onLoad}
        onClick={() => setSelectedMarker(null)}
      >
        {/* 連線 */}
        {markers.length > 1 && (
            <PolylineF 
                path={path} 
                options={{ 
                    strokeColor: THEME_COLOR, 
                    strokeOpacity: 0.8, 
                    strokeWeight: 4,
                    icons: [{ icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 3, strokeColor: THEME_COLOR }, offset: '50%', repeat: '100px' }]
                }} 
            />
        )}

        {/* Wanderlog 風格數字波波 */}
        {markers.map((marker) => (
          <MarkerF 
            key={marker.id} 
            position={{ lat: marker.lat, lng: marker.lng }} 
            label={{ 
                text: marker.label, 
                color: 'white', 
                fontWeight: 'bold', 
                fontSize: '14px',
                className: 'marker-label' // CSS hack if needed
            }} 
            icon={{
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: THEME_COLOR,
                fillOpacity: 1,
                scale: 14, // 波波大細
                strokeColor: 'white',
                strokeWeight: 2,
            }}
            onClick={() => setSelectedMarker(marker)}
          />
        ))}

        {/* 點擊後彈出資訊視窗 */}
        {selectedMarker && (
            <InfoWindowF
                position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
                onCloseClick={() => setSelectedMarker(null)}
                options={{ pixelOffset: new google.maps.Size(0, -15) }}
            >
                <div className="p-1 min-w-[160px]">
                    <h3 className="font-bold text-sm mb-1 text-black">{selectedMarker.title}</h3>
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-2">
                        <span className="bg-gray-100 px-1 rounded uppercase">{selectedMarker.type}</span>
                    </div>
                    <a 
                        href={`https://www.google.com/maps/dir/?api=1&destination=${selectedMarker.lat},${selectedMarker.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white text-[10px] py-1.5 rounded hover:bg-blue-700 transition-colors no-underline font-bold"
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