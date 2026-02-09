"use client";
import { useMemo } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';
import { useTripStore } from '@/store/useTripStore';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const containerStyle = {
  width: '100%',
  height: '100vh'
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  styles: [ // 極簡地圖風格
    { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
    { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e5e5e5' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dadada' }] },
    { featureType: 'transit.station', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
  ],
};

export default function MapViewPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;
  const { trips } = useTripStore();
  const trip = trips.find(t => t.id === tripId);

  // 1. 載入 Google Maps API
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!
  });

  // 2. 準備所有 Marker
  const markers = useMemo(() => {
    if (!trip) return [];
    return trip.dailyItinerary.flatMap(day =>
      day.activities
        .filter(act => act.lat && act.lng) // 只攞有經緯度嘅
        .map(act => ({
          lat: act.lat!,
          lng: act.lng!,
          label: day.day.toString(), // 顯示 Day Number
          title: act.location,
        }))
    );
  }, [trip]);

  // 3. 計算地圖中心點
  const center = useMemo(() => {
    if (markers.length > 0) {
      return { lat: markers[0].lat, lng: markers[0].lng };
    }
    return { lat: 34.6937, lng: 135.5023 }; // 預設大阪市中心
  }, [markers]);

  if (!isLoaded) return <div className="p-10 text-center animate-pulse">地圖載入中...</div>;

  return (
    <div className="relative h-screen w-screen">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={12}
        options={mapOptions}
      >
        {/* 在地圖上畫 Pin */}
        {markers.map((marker, index) => (
          <MarkerF
            key={index}
            position={{ lat: marker.lat, lng: marker.lng }}
            label={{ text: marker.label, color: 'white', fontWeight: 'bold' }}
            title={marker.title}
          />
        ))}
      </GoogleMap>

      {/* 返回按鈕 */}
      <Link href={`/planner/${tripId}`} className="absolute top-4 left-4 bg-white p-3 rounded-full shadow-lg text-black hover:bg-gray-100">
        <ArrowLeft size={20} />
      </Link>
    </div>
  );
}