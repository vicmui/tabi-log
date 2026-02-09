"use client";
import { useMemo, useState, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, PolylineF } from '@react-google-maps/api';
import { Activity } from '@/store/useTripStore';

const containerStyle = { width: '100%', height: '100%' };

// 極簡地圖風格 (去除了多餘標籤)
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
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);

  const markers = useMemo(() => {
    return activities
      .filter(act => act.lat && act.lng)
      .map((act, index) => ({
        id: act.id,
        lat: act.lat!,
        lng: act.lng!,
        label: (index + 1).toString(), // 🔥 加入數字 1, 2, 3...
        title: act.location,
      }));
  }, [activities]);

  const path = useMemo(() => markers.map(m => ({ lat: m.lat, lng: m.lng })), [markers]);

  // 🔥 自動縮放地圖以顯示所有點
  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    if (markers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach(m => bounds.extend({ lat: m.lat, lng: m.lng }));
      map.fitBounds(bounds);
    }
  }, [markers]);

  if (!isLoaded) return <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 text-xs">Map Loading...</div>;

  return (
    <div className="w-full h-[60vh] rounded-xl overflow-hidden shadow-inner border border-gray-200">
      <GoogleMap mapContainerStyle={containerStyle} zoom={13} options={mapOptions} onLoad={onLoad}>
        {/* 數字 Marker */}
        {markers.map((marker) => (
          <MarkerF 
            key={marker.id} 
            position={{ lat: marker.lat, lng: marker.lng }} 
            label={{ text: marker.label, color: 'white', fontWeight: 'bold', fontSize: '14px' }} 
            title={marker.title}
          />
        ))}
        {/* 連線 */}
        <PolylineF 
            path={path} 
            options={{ strokeColor: '#333333', strokeOpacity: 0.8, strokeWeight: 3, icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 2 }, offset: '0', repeat: '15px' }] }} 
        />
      </GoogleMap>
    </div>
  );
}