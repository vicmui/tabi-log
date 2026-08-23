'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  PolylineF,
  InfoWindowF,
} from '@react-google-maps/api'
import { useTripStore } from '@/store/useTripStore'
import Link from 'next/link'
import { ArrowLeft, SlidersHorizontal, X } from 'lucide-react'
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
  const s = title.toLowerCase()
  if (s.includes('台中') || s.includes('taichung')) return CITY_COORDS.taichung
  if (s.includes('台南') || s.includes('tainan'))   return CITY_COORDS.tainan
  if (s.includes('台北') || s.includes('taipei') || s.includes('台灣') || s.includes('taiwan')) return CITY_COORDS.taipei
  if (s.includes('大阪') || s.includes('osaka'))    return CITY_COORDS.osaka
  if (s.includes('東京') || s.includes('tokyo'))    return CITY_COORDS.tokyo
  if (s.includes('京都') || s.includes('kyoto'))    return CITY_COORDS.kyoto
  if (s.includes('香港') || s.includes('hong kong') || s.includes('hongkong')) return CITY_COORDS.hongkong
  if (s.includes('新加坡') || s.includes('singapore')) return CITY_COORDS.singapore
  if (s.includes('曼谷') || s.includes('bangkok') || s.includes('泰國')) return CITY_COORDS.bangkok
  if (s.includes('首爾') || s.includes('seoul') || s.includes('韓國')) return CITY_COORDS.seoul
  if (s.includes('巴黎') || s.includes('paris'))    return CITY_COORDS.paris
  if (s.includes('倫敦') || s.includes('london'))   return CITY_COORDS.london
  return CITY_COORDS.taipei
}

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
    { elementType: 'geometry',           stylers: [{ color: '#f5f5f5' }] },
    { elementType: 'labels.icon',        stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill',   stylers: [{ color: '#616161' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f5' }] },
    { featureType: 'poi',      elementType: 'geometry',         stylers: [{ color: '#eeeeee' }] },
    { featureType: 'poi',      elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { featureType: 'poi.park', elementType: 'geometry',         stylers: [{ color: '#e5e5e5' }] },
    { featureType: 'road',     elementType: 'geometry',         stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.highway', elementType: 'geometry',     stylers: [{ color: '#dadada' }] },
    { featureType: 'water',    elementType: 'geometry',         stylers: [{ color: '#c9c9c9' }] },
  ],
}

interface SelectedMarker {
  lat: number
  lng: number
  title: string
  seq: number
  day: number
  date: string
  color: string
  time?: string
  note?: string
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

  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set())
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [selectedMarker, setSelectedMarker] = useState<SelectedMarker | null>(null)

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
          seq: actIdx + 1,
          title: act.location,
          time: (act as any).time,
          note: (act as any).note,
          actIdx,
        })),
    }))
  }, [trip])

  const visibleDays = useMemo(
    () => selectedDays.size === 0
      ? markersByDay
      : markersByDay.filter(d => selectedDays.has(d.dayIdx)),
    [markersByDay, selectedDays]
  )

  const center = useMemo(() => {
    if (!trip) return CITY_COORDS.taipei
    const allVisible = visibleDays.flatMap(d => d.points)
    if (allVisible.length > 0) return { lat: allVisible[0].lat, lng: allVisible[0].lng }
    return getTripCenter(trip.title, trip.destLat, trip.destLng)
  }, [trip, visibleDays])

  const toggleDay = (dayIdx: number) => {
    setSelectedDays(prev => {
      const next = new Set(prev)
      if (next.has(dayIdx)) next.delete(dayIdx)
      else next.add(dayIdx)
      return next
    })
  }

  const selectAll = () => setSelectedDays(new Set())
  const daysWithPins = markersByDay.filter(d => d.points.length > 0)

  if (!isMounted || !trip) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500 text-xs tracking-widest animate-pulse">
        載入中...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-white">

      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 shrink-0 bg-white z-10">
        <Link
          href={`/planner/${params.id}`}
          className="flex items-center gap-2 text-gray-500 hover:text-black transition-colors text-xs tracking-widest uppercase"
        >
          <ArrowLeft size={16} /> 返回行程
        </Link>
        <span className="text-gray-200">|</span>
        <h1 className="text-sm font-semibold tracking-widest uppercase text-black flex-1 truncate">
          {trip.title} — 全程地圖
        </h1>
        <button
          onClick={() => setIsFilterOpen(v => !v)}
          className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest px-4 py-2 border rounded-full transition-all ${
            selectedDays.size > 0
              ? 'bg-black text-white border-black'
              : 'bg-white text-gray-500 border-gray-200 hover:border-black'
          }`}
        >
          <SlidersHorizontal size={13} />
          {selectedDays.size > 0 ? `Day ${[...selectedDays].map(i => markersByDay[i]?.day).join(', ')}` : '全部日期'}
        </button>
      </div>

      {/* Filter Panel */}
      {isFilterOpen && (
        <div className="bg-white border-b border-gray-100 px-6 py-4 flex flex-wrap gap-2 items-center shrink-0 z-10">
          <button
            onClick={selectAll}
            className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-full border transition-all ${
              selectedDays.size === 0
                ? 'bg-black text-white border-black'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
            }`}
          >
            全部
          </button>
          {daysWithPins.map(d => (
            <button
              key={d.dayIdx}
              onClick={() => toggleDay(d.dayIdx)}
              className={`flex items-center gap-2 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-full border transition-all ${
                selectedDays.has(d.dayIdx)
                  ? 'text-white border-transparent'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
              }`}
              style={selectedDays.has(d.dayIdx) ? { backgroundColor: d.color, borderColor: d.color } : {}}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedDays.has(d.dayIdx) ? '#fff' : d.color }} />
              Day {d.day}
              <span className="opacity-60">({d.date})</span>
            </button>
          ))}
          <button onClick={() => setIsFilterOpen(false)} className="ml-auto text-gray-400 hover:text-black">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Map */}
      <div className="flex-1 relative">
        {!isLoaded ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-xs animate-pulse">
            地圖載入中...
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={center}
            zoom={visibleDays.flatMap(d => d.points).length > 0 ? 13 : 12}
            options={mapOptions}
            onClick={() => setSelectedMarker(null)}
          >
            {/* Markers */}
            {visibleDays.map(dayGroup =>
              dayGroup.points.map((m, i) => (
                <MarkerF
                  key={`${dayGroup.dayIdx}-${i}`}
                  position={{ lat: m.lat, lng: m.lng }}
                  title={`Day ${dayGroup.day} #${m.seq} — ${m.title}`}
                  label={{
                    text: String(m.seq),
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '12px',
                  }}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: dayGroup.color,
                    fillOpacity: 1,
                    strokeColor: '#fff',
                    strokeWeight: 2.5,
                    scale: 15,
                  }}
                  onClick={() => setSelectedMarker({
                    lat: m.lat,
                    lng: m.lng,
                    title: m.title,
                    seq: m.seq,
                    day: dayGroup.day,
                    date: dayGroup.date,
                    color: dayGroup.color,
                    time: m.time,
                    note: m.note,
                  })}
                />
              ))
            )}

            {/* InfoWindow */}
            {selectedMarker && (
              <InfoWindowF
                position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
                onCloseClick={() => setSelectedMarker(null)}
                options={{ pixelOffset: new google.maps.Size(0, -30) }}
              >
                <div style={{ minWidth: 160, maxWidth: 230, fontFamily: 'sans-serif' }}>
                  {/* Day badge */}
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    backgroundColor: selectedMarker.color,
                    color: '#fff', borderRadius: 99,
                    padding: '2px 10px', fontSize: 10, fontWeight: 700,
                    letterSpacing: '0.1em', marginBottom: 6,
                  }}>
                    DAY {selectedMarker.day} · {selectedMarker.date}
                  </div>

                  {/* Seq + name */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                    <span style={{
                      flexShrink: 0, width: 20, height: 20, borderRadius: '50%',
                      backgroundColor: selectedMarker.color, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700,
                    }}>
                      {selectedMarker.seq}
                    </span>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 13, lineHeight: 1.3, color: '#111' }}>
                      {selectedMarker.title}
                    </p>
                  </div>

                  {/* Time */}
                  {selectedMarker.time && (
                    <p style={{ margin: '4px 0 0 26px', fontSize: 11, color: '#888' }}>
                      🕐 {selectedMarker.time}
                    </p>
                  )}

                  {/* Note */}
                  {selectedMarker.note && (
                    <p style={{ margin: '4px 0 0 26px', fontSize: 11, color: '#666', fontStyle: 'italic' }}>
                      {selectedMarker.note}
                    </p>
                  )}

                  {/* ✅ Navigation button */}
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedMarker.lat},${selectedMarker.lng}&travelmode=transit`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      marginTop: 10, padding: '8px 12px',
                      backgroundColor: '#111', color: '#fff',
                      borderRadius: 8, fontSize: 11, fontWeight: 700,
                      textDecoration: 'none', letterSpacing: '0.06em',
                      width: '100%', boxSizing: 'border-box',
                    }}
                  >
                    ↗ 導航前往
                  </a>
                </div>
              </InfoWindowF>
            )}

            {/* Polylines */}
            {visibleDays.map(dayGroup =>
              dayGroup.points.length >= 2 ? (
                <PolylineF
                  key={`line-${dayGroup.dayIdx}`}
                  path={dayGroup.points.map(p => ({ lat: p.lat, lng: p.lng }))}
                  options={{
                    strokeColor: dayGroup.color,
                    strokeOpacity: 0.55,
                    strokeWeight: 2,
                    geodesic: true,
                    icons: [{
                      icon: {
                        path: google.maps.SymbolPath.FORWARD_OPEN_ARROW,
                        strokeColor: dayGroup.color,
                        strokeOpacity: 0.7,
                        strokeWeight: 1.5,
                        scale: 2.5,
                      },
                      offset: '100%',
                      repeat: '120px',
                    }],
                  }}
                />
              ) : null
            )}
          </GoogleMap>
        )}
      </div>

      {/* Legend */}
      {daysWithPins.length > 0 && (
        <div className="flex gap-4 px-6 py-3 border-t border-gray-100 overflow-x-auto no-scrollbar bg-white shrink-0">
          {daysWithPins.map(d => (
            <button
              key={d.dayIdx}
              onClick={() => { toggleDay(d.dayIdx); setIsFilterOpen(true) }}
              className={`flex items-center gap-2 shrink-0 transition-opacity ${
                selectedDays.size > 0 && !selectedDays.has(d.dayIdx) ? 'opacity-30' : 'opacity-100'
              }`}
            >
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="text-xs font-medium tracking-widest uppercase text-gray-600 whitespace-nowrap">
                DAY {d.day} ({d.date}) · {d.points.length}個點
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
