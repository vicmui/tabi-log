"use client";
import { useMemo } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';
import { useTripStore } from '@/store/useTripStore';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const DEST_CENTERS: Record<string, {lat:number;lng:number}> = {
  osaka:{lat:34.6937,lng:135.5023}, tokyo:{lat:35.6762,lng:139.6503},
  kyoto:{lat:35.0116,lng:135.7681}, hokkaido:{lat:43.0642,lng:141.3469},
  taipei:{lat:25.0330,lng:121.5654}, taichung:{lat:24.1477,lng:120.6736},
  tainan:{lat:22.9999,lng:120.2269}, hongkong:{lat:22.3193,lng:114.1694},
  singapore:{lat:1.3521,lng:103.8198}, bangkok:{lat:13.7563,lng:100.5018},
  seoul:{lat:37.5665,lng:126.9780}, paris:{lat:48.8566,lng:2.3522},
  london:{lat:51.5074,lng:-0.1278}, newyork:{lat:40.7128,lng:-74.0060},
};
function getTripCenter(title: string) {
  const s = title.toLowerCase();
  if (/osaka|\u5927\u962a/.test(s)) return DEST_CENTERS.osaka;
  if (/tokyo|\u6771\u4eac/.test(s)) return DEST_CENTERS.tokyo;
  if (/kyoto|\u4eac\u90fd/.test(s)) return DEST_CENTERS.kyoto;
  if (/hokkaido|\u5317\u6d77\u9053/.test(s)) return DEST_CENTERS.hokkaido;
  if (/taichung|\u53f0\u4e2d/.test(s)) return DEST_CENTERS.taichung;
  if (/tainan|\u53f0\u5357/.test(s)) return DEST_CENTERS.tainan;
  if (/taipei|\u53f0\u5317|taiwan|\u53f0\u7063/.test(s)) return DEST_CENTERS.taipei;
  if (/hongkong|hong.kong|\u9999\u6e2f/.test(s)) return DEST_CENTERS.hongkong;
  if (/singapore|\u65b0\u52a0\u5761/.test(s)) return DEST_CENTERS.singapore;
  if (/bangkok|\u66fc\u8c37|thailand|\u6cf0\u570b/.test(s)) return DEST_CENTERS.bangkok;
  if (/seoul|\u9996\u723e|korea|\u97d3\u570b/.test(s)) return DEST_CENTERS.seoul;
  if (/paris|\u5df4\u9ece/.test(s)) return DEST_CENTERS.paris;
  if (/london|\u502b\u6566/.test(s)) return DEST_CENTERS.london;
  return DEST_CENTERS.taipei; // default to Taipei instead of Osaka
}

const containerStyle = { width: '100%', height: '100vh' };


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
    // Use pinned destination if available, otherwise detect from title
    if (trip?.destLat && trip?.destLng) return { lat: trip.destLat, lng: trip.destLng };
    return trip ? getTripCenter(trip.title) : DEST_CENTERS.taipei;
  }, [markers, trip]);

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