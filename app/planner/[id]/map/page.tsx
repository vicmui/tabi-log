"use client";
import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { GoogleMap, MarkerF, PolylineF, InfoWindowF } from "@react-google-maps/api";
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
const DEST_CENTERS = {
  osaka:{lat:34.6937,lng:135.5023}, tokyo:{lat:35.6762,lng:139.6503},
  kyoto:{lat:35.0116,lng:135.7681}, taipei:{lat:25.0330,lng:121.5654},
  taichung:{lat:24.1477,lng:120.6736}, hongkong:{lat:22.3193,lng:114.1694},
  singapore:{lat:1.3521,lng:103.8198}, bangkok:{lat:13.7563,lng:100.5018},
  seoul:{lat:37.5665,lng:126.9780},
};
function getTripCenter(title) {
  const s = title.toLowerCase();
  if (/osaka/.test(s)) return DEST_CENTERS.osaka;
  if (/tokyo/.test(s)) return DEST_CENTERS.tokyo;
  if (/kyoto/.test(s)) return DEST_CENTERS.kyoto;
  if (/taichung/.test(s)) return DEST_CENTERS.taichung;
  if (/taipei|taiwan/.test(s)) return DEST_CENTERS.taipei;
  if (/hongkong|hong.kong/.test(s)) return DEST_CENTERS.hongkong;
  if (/singapore/.test(s)) return DEST_CENTERS.singapore;
  if (/bangkok|thailand/.test(s)) return DEST_CENTERS.bangkok;
  if (/seoul|korea/.test(s)) return DEST_CENTERS.seoul;
  return DEFAULT_CENTER;
}


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
  const [isReady, setIsReady] = useState(typeof window !== "undefined" && !!(window as any).google?.maps);

  // layout.tsx already loaded Google Maps — just wait for it to be ready
  useEffect(() => {
    if ((window as any).google?.maps) { setIsReady(true); return; }
    const t = setInterval(() => { if ((window as any).google?.maps) { setIsReady(true); clearInterval(t); } }, 200);
    return () => clearInterval(t);
  }, []);

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

  if (!isReady) {
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
        center={trip ? getTripCenter(trip.title) : DEFAULT_CENTER}
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
      <div className="absolute bottom-20 md:bottom-8 left-4 bg-white border border-gray-200 shadow-sm overflow-hidden" style={{ minWidth: 200, maxWidth: 230 }}>
        <button
          onClick={() => setLegendOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-[9px] font-bold tracking-widest uppercase border-b border-gray-100 hover:bg-gray-50"
        >
          <span className="truncate mr-2">{trip.title}</span>
          {legendOpen ? <EyeOff size={10} className="flex-shrink-0" /> : <Eye size={10} className="flex-shrink-0" />}
        </button>

        {legendOpen && (
          <>
            <div className="max-h-[30vh] md:max-h-[45vh] overflow-y-auto">
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

