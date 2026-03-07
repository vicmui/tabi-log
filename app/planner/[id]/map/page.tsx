'use client'
import { useMemo } from 'react'
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api'
import { useTripStore } from '@/store/useTripStore'
import { useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const DEST_CENTERS: Record<string, { lat: number; lng: number }> = {
  osaka:     { lat: 34.6937, lng: 135.5023 },
  tokyo:     { lat: 35.6762, lng: 139.6503 },
  kyoto:     { lat: 35.0116, lng: 135.7681 },
  hokkaido:  { lat: 43.0642, lng: 141.3469 },
  taipei:    { lat: 25.0330, lng: 121.5654 },
  taichung:  { lat: 24.1477, lng: 120.6736 },
  tainan:    { lat: 22.9999, lng: 120.2269 },
  hongkong:  { lat: 22.3193, lng: 114.1694 },
  singapore: { lat: 1.3521,  lng: 103.8198 },
  bangkok:   { lat: 13.7563, lng: 100.5018 },
  seoul:     { lat: 37.5665, lng: 126.9780 },
  paris:     { lat: 48.8566, lng: 2.3522   },
  london:    { lat: 51.5074, lng: -0.1278  },
  newyork:   { lat: 40.7128, lng: -74.0060 },
}

function getTripCenter(title: string) {
  const s = title.toLowerCase()
  if (/osaka|大阪/.test(s))              return DEST_CENTERS.osaka
  if (/tokyo|東京/.test(s))              return DEST_CENTERS.tokyo
  if (/kyoto|京都/.test(s))              return DEST_CENTERS.kyoto
  if (/hokkaido|北海道|sapporo|札幌/.test(s)) return DEST_CENTERS.hokkaido
  if (/taichung|台中/.test(s))           return DEST_CENTERS.taichung
  if (/tainan|台南/.test(s))             return DEST_CENTERS.tainan
  if (/taipei|台北|taiwan|台灣/.test(s)) return DEST_CENTERS.taipei
  if (/hong.?kong|香港/.test(s))         return DEST_CENTERS.hongkong
  if (/singapore|新加坡/.test(s))        return DEST_CENTERS.singapore
  if (/bangkok|泰國|thailand/.test(s))   return DEST_CENTERS.bangkok
  if (/seoul|首爾|korea|韓國/.test(s))   return DEST_CENTERS.seoul
  if (/paris|巴黎/.test(s))              return DEST_CENTERS.paris
  if (/london|倫敦/.test(s))             return DEST_CENTERS.london
  return DEST_CENTERS.taipei // default fallback
}

const containerStyle = { width: '100%', height: '100vh' }

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  styles: [
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
}

export default function MapViewPage() {
  const params = useParams()
  const tripId = params.id as string
  const trips = useTripStore(s => s.trips)
  const trip = trips.find(t => t.id === tripId)

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
  })

  const markers = useMemo(() => {
    if (!trip) return []
    return trip.dailyItinerary.flatMap(day =>
      day.activities
        .filter(act => act.lat && act.lng)
        .map(act => ({
          lat: act.lat!,
          lng: act.lng!,
          label: day.day.toString(),
          title: act.location,
        }))
    )
  }, [trip])

  // ── FIX: markers first → title detection → fallback (removed destLat/destLng priority) ──
  const center = useMemo(() => {
    if (markers.length > 0) return { lat: markers[0].lat, lng: markers[0].lng }
    if (trip) return getTripCenter(trip.title)
    return DEST_CENTERS.taipei
  }, [markers, trip])

  if (!isLoaded) return (
    <div className="p-10 text-center animate-pulse text-gray-400">Loading map...</div>
  )

  return (
    <div className="relative h-screen w-screen">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={12}
        options={mapOptions}
      >
        {markers.map((marker, index) => (
          <MarkerF
            key={index}
            position={{ lat: marker.lat, lng: marker.lng }}
            label={{ text: marker.label, color: 'white', fontWeight: 'bold' }}
            title={marker.title}
          />
        ))}
      </GoogleMap>
      <Link
        href={`/planner/${tripId}`}
        className="absolute top-4 left-4 bg-white p-3 rounded-full shadow-lg text-black hover:bg-gray-100"
      >
        <ArrowLeft size={20} />
      </Link>
    </div>
  )
}
