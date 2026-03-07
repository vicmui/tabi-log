'use client'

import { useState, useEffect, useMemo } from 'react'
import { GoogleMap, useJsApiLoader, MarkerF, PolylineF } from '@react-google-maps/api'
import { useTripStore } from '@/store/useTripStore'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Libraries } from '@react-google-maps/api'

const LIBRARIES: Libraries = ['places', 'marker', 'geometry', 'routes']

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  osaka:     { lat: 34.6937, lng: 135.5023 },
  tokyo:     { lat: 35.6762, lng: 139.6503 },
  kyoto:     { lat: 35.0116, lng: 135.7681 },
  taipei:    { lat: 25.0330, lng: 121.5654 },
  taichung:  { lat: 24.1477, lng: 120.6736 },
  tainan:    { lat: 22.9999, lng: 120.2269 },
  hongkong:  { lat: 22.3193, lng: 114.1694 },
  singapore: { lat: 1.3521,  lng: 103.8198 },
  bangkok:   { lat: 13.7563, lng: 100.5018 },
  seoul:     { lat: 37.5665, lng: 126.9780 },
  paris:     { lat: 48.8566, lng: 2.3522   },
  london:    { lat: 51.5074, lng: -0.1278  },
}

function getTripCenter(title: string, destLat?: number, destLng?: number) {
  if (destLat && destLng) return { lat: destLat, lng: destLng }
  const lower = title.toLowerCase()
  if (lower.includes('台中') || lower.includes('taichung')) return CITY_COORDS.taichung
  if (lower.includes('台南') || lower.includes('tainan'))   return CITY_COORDS.tainan
  if (lower.includes('台北') || lower.includes('taipei') || lower.includes('台灣') || lower.includes('taiwan')) return CITY_COORDS.taipei
  if (lower.includes('大阪') || lower.includes('osaka'))    return CITY_COORDS.osaka
  if (lower.includes('東京') || lower.includes('tokyo'))    return CITY_COORDS.tokyo
  if (lower.includes('京都') || lower.includes('kyoto'))    return CITY_COORDS.kyoto
  if (lower.includes('香港') || lower.includes('hong kong') || lower.includes('hongkong')) return CITY_COORDS.hongkong
  if (lower.includes('新加坡') || lower.includes('singapore')) return CITY_COORDS.singapore
  if (lower.includes('曼谷') || lower.includes('bangkok') || lower.includes('泰國')) return CITY_COORDS.bangkok
  if (lower.includes('首爾') || lower.includes('seoul') || lower.includes('韓國')) return CITY_COORDS.seoul
  if (lower.includes('巴黎') || lower.includes('paris'))    return CITY_COORDS.paris
  if (lower.includes('倫敦') || lower.includes('london'))   return CITY_COORDS.london
  return CITY_COORDS.taipei
}

// ── 每日唔同顏色 ──────────────────────────────────────────────────────────
const DAY_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12',
  '#9b59b6', '#1abc9c', '#e67e22', '#e91e63',
]

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  styles: [
    { elementType: 'geometry',            stylers: [{ color: '#f5f5f5' }] },
    { elementType: 'labels.icon',         stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill',    stylers: [{ color: '#616161' }] },
    { elementType: 'labels.text.stroke',  stylers: [{ color: '#f5f5f5' }] },
    { featureType: 'poi',       elementType: 'geometry',         stylers: [{ color: '#eeeeee' }] },
    { featureType: 'poi',       elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { featureType: 'poi.park',  elementType: 'geometry',         stylers: [{ color: '#e5e5e5' }] },
    { featureType: 'road',      elementType: 'geometry',         stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.highway', elementType: 'geometry',      stylers: [{ color: '#dadada' }] },
    { featureType: 'water',     elementType: 'geometry',         stylers: [{ color: '#c9c9c9' }] },
  ],
}

export default function FullMapPage({ params }: { params: { id: string } }) {
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => setIsMounted(true), [])

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
    libraries: LIBRARIES,
  })

  const trips = useTripStore(s => s.trips)
  const trip  = trips.find(t => t.id === params.id)

  // ── 每個 marker 帶 dayIdx 同 color ────────────────────────────────────────
  const markersByDay = useMemo(() => {
    if (!trip) return []
    return trip.dailyItinerary.map((day, dayIdx) => ({
      dayIdx,
      day: day.day,
      date: day.date,
      color: DAY_COLORS[dayIdx % DAY_COLORS.length],
      points: day.activities
        .filter(act => act.lat && act.lng)
        .map((act, actIdx) => ({
          lat: act.lat!,
          lng: act.lng!,
          label: String(day.day),
          title: act.location,
          actIdx,
        })),
    }))
  }, [trip])

  // ── Flat markers for center calculation ────────────────────────────────────
  const allMarkers = useMemo(() =>
    markersByDay.flatMap(d => d.points.map(p => ({ ...p, color: d.color, dayIdx: d.dayIdx }))),
    [markersByDay]
  )

  const center = useMemo(() => {
    if (!trip) return CITY_COORDS.taipei
    if (allMarkers.length > 0) return { lat: allMarkers[0].lat, lng: allMarkers[0].lng }
    return getTripCenter(trip.title, trip.destLat, trip.destLng)
  }, [trip, allMarkers])

  if (!isMounted || !trip) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400 text-xs tracking-widest animate-pulse">
        載入中...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-white">

      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 shrink-0 bg-white z-10">
        <Link href={`/planner/${params.id}`}
          className="flex items-center gap-2 text-gray-400 hover:text-black transition-colors text-xs tracking-widest uppercase">
          <ArrowLeft size={16} /> 返回行程
        </Link>
        <span className="text-gray-200">|</span>
        <h1 className="text-sm font-bold tracking-widest uppercase text-black">
          {trip.title} — 全程地圖
        </h1>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {!isLoaded ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-xs animate-pulse">
            地圖載入中...
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={center}
            zoom={allMarkers.length > 0 ? 13 : 12}
            options={mapOptions}
          >
            {/* ── Markers ── */}
            {markersByDay.map(dayGroup =>
              dayGroup.points.map((m, i) => (
                <MarkerF
                  key={`${dayGroup.dayIdx}-${i}`}
                  position={{ lat: m.lat, lng: m.lng }}
                  title={m.title}
                  label={{
                    text: m.label,
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '11px',
                  }}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: dayGroup.color,
                    fillOpacity: 1,
                    strokeColor: '#fff',
                    strokeWeight: 2,
                    scale: 14,
                  }}
                />
              ))
            )}

            {/* ── Polylines：每日活動之間用線連住 ────────────────────────── */}
            {markersByDay.map(dayGroup =>
              dayGroup.points.length >= 2 ? (
                <PolylineF
                  key={`line-${dayGroup.dayIdx}`}
                  path={dayGroup.points.map(p => ({ lat: p.lat, lng: p.lng }))}
                  options={{
                    strokeColor: dayGroup.color,
                    strokeOpacity: 0.75,
                    strokeWeight: 3,
                    geodesic: true,
                  }}
                />
              ) : null
            )}
          </GoogleMap>
        )}
      </div>

      {/* Day Legend */}
      {markersByDay.length > 0 && (
        <div className="flex gap-4 px-6 py-3 border-t border-gray-100 overflow-x-auto no-scrollbar bg-white shrink-0">
          {markersByDay
            .filter(d => d.points.length > 0)
            .map(d => (
              <div key={d.dayIdx} className="flex items-center gap-2 shrink-0">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-[10px] font-bold tracking-widest uppercase text-gray-600 whitespace-nowrap">
                  DAY {d.day} ({d.date})
                </span>
              </div>
            ))}
        </div>
      )}

    </div>
  )
}
