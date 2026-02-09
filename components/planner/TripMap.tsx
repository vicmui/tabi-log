"use client";
import { useMemo, useState, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, PolylineF } from '@react-google-maps/api';
import { Activity } from '@/store/useTripStore';

const containerStyle = { width: '100%', height: '100%' };

// 預設中心點 (大阪) - 如果你的行程沒有座標，就會顯示這裡
const DEFAULT_CENTER = { lat: 34.6937, lng: 135.5023 };

const mapOptions = {
  disableDefaultUI: true, zoomControl: true, mapTypeControl: false, streetViewControl: false,
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
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "" // 防止 undefined crash
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);

  // 1. 找出有座標的活動
  const markers = useMemo(() => {
    if (!activities) return [];
    return activities
      .filter(act => act.lat && act.lng) // 只攞有經緯度嘅
      .map((act, index) => ({
        id: act.id,
        lat: act.lat!,
        lng: act.lng!,
        label: (index + 1).toString(),
        title: act.location,
      }));
  }, [activities]);

  const path = useMemo(() => markers.map(m => ({ lat: m.lat, lng: m.lng })), [markers]);

  // 2. 決定地圖中心
  const center = useMemo(() => {
    if (markers.length > 0) return { lat: markers[0].lat, lng: markers[0].lng };
    return DEFAULT_CENTER; // 無數據時顯示大阪
  }, [markers]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    // 如果有多個點，自動 Zoom 到合適範圍
    if (markers.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach(m => bounds.extend({ lat: m.lat, lng: m.lng }));
      map.fitBounds(bounds);
    }
  }, [markers]);

  if (loadError) return <div className="w-full h-full flex items-center justify-center bg-gray-100 text-red-400 text-xs">Map Error: Check API Key</div>;
  if (!isLoaded) return <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 text-xs animate-pulse">Loading Map...</div>;

  return (
    <div className="w-full h-full rounded-xl overflow-hidden shadow-inner border border-gray-200 bg-gray-100">
      <GoogleMap 
        mapContainerStyle={containerStyle} 
        center={center} 
        zoom={13} 
        options={mapOptions} 
        onLoad={onLoad}
      >
        {markers.map((marker) => (
          <MarkerF 
            key={marker.id} 
            position={{ lat: marker.lat, lng: marker.lng }} 
            label={{ text: marker.label, color: 'white', fontWeight: 'bold', fontSize: '14px' }} 
            title={marker.title}
          />
        ))}
        {/* 連線 */}
        {markers.length > 1 && (
            <PolylineF 
    path={path} 
    options={{ 
        strokeColor: '#222222', // 深黑色
        strokeOpacity: 1.0,     // 不透明
        strokeWeight: 4,        // 🔥 加粗線條
        icons: [{ icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 3, strokeColor: '#222222' }, offset: '100%' }] // 加箭頭
    }} 
/>
        )}
      </GoogleMap>
    </div>
  );
}