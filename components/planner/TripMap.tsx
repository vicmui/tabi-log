"use client";
import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, PolylineF, InfoWindowF } from '@react-google-maps/api';
import { Activity } from '@/store/useTripStore';
import { Navigation, MapPin } from 'lucide-react';

const containerStyle = { width: '100%', height: '100%' };
const DEFAULT_CENTER = { lat: 34.6937, lng: 135.5023 }; // 大阪

export default function TripMap({ activities }: { activities: Activity[] }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || ""
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<any>(null);

  const safeActivities = activities || [];

  const markers = useMemo(() => {
    if (safeActivities.length === 0) return [];
    return safeActivities
      .map((act, index) => {
        const lat = parseFloat(String(act.lat));
        const lng = parseFloat(String(act.lng));
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;
        return { id: act.id, lat, lng, label: (index + 1).toString(), title: act.location, type: act.type };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);
  }, [safeActivities]);

  const path = useMemo(() => markers.map(m => ({ lat: m.lat, lng: m.lng })), [markers]);

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

  if (loadError) return <div className="w-full h-full flex items-center justify-center bg-gray-100 text-xs text-red-400">Map Error</div>;
  if (!isLoaded) return <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 text-xs animate-pulse">LOADING MAP...</div>;

  return (
    <div className="w-full h-full rounded-xl overflow-hidden shadow-sm border border-gray-200 bg-gray-50 relative">
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
            clickableIcons: true, // 恢復可點擊圖標
            maxZoom: 18 
            // 🔥 移除 styles 設定，恢復 Google Default 彩色
        }} 
        onLoad={onLoad} 
        onClick={() => setSelectedMarker(null)}
      >
        {markers.length > 1 && <PolylineF path={path as google.maps.LatLngLiteral[]} options={{ strokeColor: '#4285F4', strokeOpacity: 0.8, strokeWeight: 4, icons: [{ icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 2, strokeColor: '#4285F4' }, offset: '50%', repeat: '100px' }] }} />}
        {markers.map((marker) => (<MarkerF key={marker.id} position={{ lat: marker.lat, lng: marker.lng }} label={{ text: marker.label, color: 'white', fontWeight: 'bold', fontSize: '12px' }} onClick={() => setSelectedMarker(marker)} />))}
        {selectedMarker && (<InfoWindowF position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }} onCloseClick={() => setSelectedMarker(null)} options={{ pixelOffset: new google.maps.Size(0, -12) }}><div className="p-2 min-w-[140px] text-center"><h3 className="font-bold text-sm mb-1 text-black font-sans">{selectedMarker.title}</h3><a href={`https://www.google.com/maps/dir/?api=1&destination=${selectedMarker.lat},${selectedMarker.lng}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1 w-full bg-blue-600 text-white text-[10px] py-1.5 rounded hover:opacity-80 transition-opacity no-underline font-bold tracking-widest uppercase mt-2"><Navigation size={10} /> Navigate</a></div></InfoWindowF>)}
      </GoogleMap>
    </div>
  );
}