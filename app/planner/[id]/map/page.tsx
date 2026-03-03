"use client";
import { useMemo, useState, useCallback, useRef } from "react";
import { GoogleMap, useJsApiLoader, MarkerF, PolylineF, InfoWindowF } from "@react-google-maps/api";
import { useTripStore } from "@/store/useTripStore";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, MapPin } from "lucide-react";
import { format, parseISO } from "date-fns";

const DAY_COLORS = [
  "#E63946", "#2196F3", "#4CAF50", "#FF9800", "#9C27B0",
  "#00BCD4", "#FF4081", "#8BC34A", "#FF5722", "#607D8B",
];

const containerStyle = { width: "100%", height: "100vh" };
const DEFAULT_CENTER = { lat: 34.6937, lng: 135.5023 };

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  styles: [
    { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
    { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9c9c9" }] },
  ],
};

export default function FullTripMapPage() {
  const params = useParams();
  const tripId = params.id as string;
  const { trips } = useTripStore();
  const trip = trips.find((t) => t.id === tripId);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<any>(null);
  const [hiddenDays, setHiddenDays] = useState<Set<number>>(new Set());
  const [legendOpen, setLegendOpen] = useState(true);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
  });

  const dayData = useMemo(() => {
    if (!trip) return [];
    return trip.dailyItinerary.map((day, idx) => {
      const color = DAY_COLORS[idx % DAY_COLORS.length];
      const markers = day.activities
        .filter((a) => a.lat && a.lng)
        .map((a, actIdx) => ({
          id: a.id,
          lat: parseFloat(String(a.lat)),
          lng: parseFloat(String(a.lng)),
          title: a.location,
          time: a.time,
          type: a.type,
          actIndex: actIdx + 1,
          dayNum: day.day,
          color,
          date: day.date,
        }));
      return { day: day.day, date: day.date, color, markers, path: markers.map((m) => ({ lat: m.lat, lng: m.lng })) };
    });
  }, [trip]);

  const visibleDayData = useMemo(() => dayData.filter((d) => !hiddenDays.has(d.day)), [dayData, hiddenDays]);
  const allVisibleMarkers = useMemo(() => visibleDayData.flatMap((d) => d.markers), [visibleDayData]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    const all = dayData.flatMap((d) => d.markers);
    if (all.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      all.forEach((m) => bounds.extend({ lat: m.lat, lng: m.lng }));
      map.fitBounds(bounds, 70);
    }
  }, [dayData]);

  const toggleDay = (dayNum: number) => {
    setHiddenDays((prev) => {
      const next = new Set(prev);
      next.has(dayNum) ? next.delete(dayNum) : next.add(dayNum);
      return next;
    });
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-white text-xs tracking-widest text-gray-400 uppercase animate-pulse">
        地圖載入中...
      </div>
    );
  }

  if (!trip) {
    return <div className="flex items-center justify-center h-screen text-gray-400 text-sm">找不到行程</div>;
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={DEFAULT_CENTER}
        zoom={12}
        options={mapOptions}
        onLoad={onLoad}
        onClick={() => setSelectedMarker(null)}
      >
        {visibleDayData.map((d) =>
          d.path.length > 1 ? (
            <PolylineF
              key={"line-" + d.day}
              path={d.path}
              options={{
                strokeColor: d.color,
                strokeOpacity: 0.75,
                strokeWeight: 3,
                icons: [{
                  icon: {
                    path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                    scale: 2.5,
                    strokeColor: d.color,
                    fillColor: d.color,
                    fillOpacity: 1,
                  },
                  offset: "50%",
                  repeat: "120px",
                }],
              }}
            />
          ) : null
        )}

        {visibleDayData.flatMap((d) =>
          d.markers.map((marker) => (
            <MarkerF
              key={marker.id}
              position={{ lat: marker.lat, lng: marker.lng }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: marker.color,
                fillOpacity: 1,
                scale: 13,
                strokeColor: "#ffffff",
                strokeWeight: 2.5,
              }}
              label={{ text: String(marker.actIndex), color: "white", fontWeight: "bold", fontSize: "11px" }}
              onClick={() => setSelectedMarker(marker)}
            />
          ))
        )}

        {selectedMarker && (
          <InfoWindowF
            position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
            onCloseClick={() => setSelectedMarker(null)}
            options={{ pixelOffset: new google.maps.Size(0, -14) }}
          >
            <div className="p-2 min-w-[160px] font-sans">
              <div
                className="text-[9px] font-bold uppercase tracking-widest mb-1.5 px-2 py-0.5 inline-block text-white"
                style={{ backgroundColor: selectedMarker.color }}
              >
                Day {selectedMarker.dayNum} · {selectedMarker.time}
              </div>
              <p className="font-bold text-sm text-black mt-1 mb-2">{selectedMarker.title}</p>
              <a
                href={"https://www.google.com/maps/dir/?api=1&destination=" + selectedMarker.lat + "," + selectedMarker.lng}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center w-full py-1.5 text-white text-[10px] font-bold tracking-widest uppercase no-underline"
                style={{ backgroundColor: selectedMarker.color }}
              >
                導航
              </a>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>

      {/* Top bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <Link
          href={"/planner/" + tripId}
          className="pointer-events-auto flex items-center gap-2 bg-white border border-gray-200 px-4 py-2.5 text-[10px] font-bold tracking-widest uppercase hover:bg-gray-50 transition-colors shadow-sm"
        >
          <ArrowLeft size={12} /> 返回行程
        </Link>
        <div className="pointer-events-auto bg-white border border-gray-200 px-4 py-2.5 text-[10px] font-bold tracking-widest uppercase shadow-sm flex items-center gap-1.5">
          <MapPin size={10} />
          {allVisibleMarkers.length} 個地點
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-8 left-4 bg-white border border-gray-200 shadow-sm overflow-hidden" style={{ minWidth: 200, maxWidth: 230 }}>
        <button
          onClick={() => setLegendOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-[9px] font-bold tracking-widest uppercase border-b border-gray-100 hover:bg-gray-50"
        >
          <span className="truncate mr-2">{trip.title}</span>
          {legendOpen ? <EyeOff size={10} className="flex-shrink-0" /> : <Eye size={10} className="flex-shrink-0" />}
        </button>

        {legendOpen && (
          <>
            <div className="max-h-[45vh] overflow-y-auto">
              {dayData.map((d) => {
                const isHidden = hiddenDays.has(d.day);
                const dateStr = d.date ? format(parseISO(d.date), "M/d EEE") : "";
                return (
                  <button
                    key={d.day}
                    onClick={() => toggleDay(d.day)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50"
                  >
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0 transition-opacity"
                      style={{ backgroundColor: d.color, opacity: isHidden ? 0.2 : 1 }}
                    />
                    <div className="flex-1 text-left">
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: isHidden ? "#ccc" : "#1a1a1a" }}>
                        Day {d.day}
                      </p>
                      <p className="text-[9px] text-gray-400">{dateStr} · {d.markers.length} 個地點</p>
                    </div>
                    {isHidden && <EyeOff size={9} className="text-gray-300 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
            {dayData.length > 1 && (
              <div className="border-t border-gray-100 flex">
                <button onClick={() => setHiddenDays(new Set())} className="flex-1 py-2.5 text-[9px] font-bold tracking-widest uppercase text-gray-400 hover:bg-gray-50 border-r border-gray-100 transition-colors">
                  全顯示
                </button>
                <button onClick={() => setHiddenDays(new Set(dayData.map((d) => d.day)))} className="flex-1 py-2.5 text-[9px] font-bold tracking-widest uppercase text-gray-400 hover:bg-gray-50 transition-colors">
                  全隱藏
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}


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