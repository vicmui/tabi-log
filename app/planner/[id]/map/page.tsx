'use client'
import { useState, useEffect, useMemo } from 'react'
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api'
import { useTripStore } from '@/store/useTripStore'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Libraries } from '@react-google-maps/api'

const LIBRARIES: Libraries = ['places', 'marker', 'geometry', 'routes']

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  osaka: { lat: 34.6937, lng: 135.5023 },
  tokyo: { lat: 35.6762, lng: 139.6503 },
  kyoto: { lat: 35.0116, lng: 135.7681 },
  taipei: { lat: 25.0330, lng: 121.5654 },
  taichung: { lat: 24.1477, lng: 120.6736 },
  tainan: { lat: 22.9999, lng: 120.2269 },
  hongkong: { lat: 22.3193, lng: 114.1694 },
  singapore: { lat: 1.3521, lng: 103.8198 },
  bangkok: { lat: 13.7563, lng: 100.5018 },
  seoul: { lat: 37.5665, lng: 126.9780 },
  paris: { lat: 48.8566, lng: 2.3522 },
  london: { lat: 51.5074, lng: -0.1278 },
}

function getTripCenter(title: string, destLat?: number, destLng?: number) {
  if (destLat && destLng) return { lat: destLat, lng: destLng }
  const lower = title.toLowerCase()
  for (const [key, coords] of Object.entries(CITY_COORDS)) {
    if (lower.includes(key) || lower.includes(key === 'osaka' ? '大阪' : key === 'tokyo' ? '東京' : key === 'taichung' ? '台中' : key === 'taipei' ? '台北' : '')) {
      return coords
    }
  }
  if (lower.includes('台中') || lower.includes('taichung')) return CITY_COORDS.taichung
  if (lower.includes('台北') || lower.includes('taipei')) return CITY_COORDS.taipei
  if (lower.includes('大阪') || lower.includes('osaka')) return CITY_COORDS.osaka
  if (lower.includes('東京') || lower.includes('tokyo')) return CITY_COORDS.tokyo
  if (lower.includes('京都') || lower.includes('kyoto')) return CITY_COORDS.kyoto
  return CITY_COORDS.taipei
}

const DAY_COLORS = ['#e74c3c','#3498db','#2ecc71','#f39c12','#9b59b6','#1abc9c','#e67e22','#e91e63']

export default function FullMapPage({ params }: { params: { id: string } }) {
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => setIsMounted(true), [])

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
    libraries: LIBRARIES,
  })

  const trips = useTripStore(s => s.trips)
  const trip = trips.find(t => t.id === params.id)

  const markers = useMemo(() => {
    if (!trip) return []
    return trip.dailyItinerary.flatMap((day, dayIdx) =>
      day.activities
        .filter(act => act.lat && act.lng)
        .map((act, actIdx) => ({
          lat: act.lat!,
          lng: act.lng!,
          label: String(day.day),
          title: act.location,
          color: DAY_COLORS[dayIdx % DAY_COLORS.length],
          dayIdx,
          actIdx,
        }))
    )
  }, [trip])

  const center = useMemo(() => {
    if (!trip) return CITY_COORDS.taipei
    if (markers.length > 0) return { lat: markers[0].lat, lng: markers[0].lng }
    return getTripCenter(trip.title, trip.destLat, trip.destLng)
  }, [trip, markers])

  if (!isMounted || !trip) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-xs tracking-widest text-gray-400 uppercase animate-pulse">載入中...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 shrink-0">
        <Link href={`/planner/${trip.id}`} className="flex items-center gap-2 text-xs tracking-widest uppercase text-gray-500 hover:text-black transition-colors">
          <ArrowLeft size={14} /> 返回行程
        </Link>
        <div className="h-4 w-px bg-gray-200" />
        <span className="text-xs font-bold tracking-widest uppercase">{trip.title} — 全程地圖</span>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {!isLoaded ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <p className="text-xs tracking-widest text-gray-400 uppercase animate-pulse">地圖載入中...</p>
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={center}
            zoom={markers.length > 0 ? 13 : 12}
            options={{ disableDefaultUI: false, zoomControl: true, streetViewControl: false, mapTypeControl: false }}
          >
            {markers.map((m, i) => (
              <MarkerF
                key={i}
                position={{ lat: m.lat, lng: m.lng }}
                title={`Day ${m.label}: ${m.title}`}
                label={{ text: m.label, color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
              />
            ))}
          </GoogleMap>
        )}
      </div>

      {/* Day Legend */}
      {trip.dailyItinerary.length > 0 && (
        <div className="shrink-0 border-t border-gray-100 px-6 py-3 overflow-x-auto">
          <div className="flex gap-4 items-center">
            {trip.dailyItinerary.map((day, i) => (
              <div key={i} className="flex items-center gap-1.5 shrink-0">
                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: DAY_COLORS[i % DAY_COLORS.length] }} />
                <span className="text-[10px] tracking-widest uppercase text-gray-500">Day {day.day} ({day.date})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
