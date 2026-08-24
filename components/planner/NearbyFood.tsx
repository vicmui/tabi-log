'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GoogleMap, MarkerF } from '@react-google-maps/api'
import {
  X, Star, Loader2, Navigation, Plus, ExternalLink, MapPin,
  List as ListIcon, Map as MapIcon, AlertTriangle, RefreshCw, Check,
} from 'lucide-react'
import { Trip, useTripStore } from '@/store/useTripStore'

/**
 * 附近美食。
 *
 * 資料來源是 Google Places，不是食べログ ——
 * 食べログ的官方 API 自 2014 年起已停止提供，其服務條款亦禁止抓取，
 * 所以每間店旁邊改為附一條「食べログ」搜尋連結：跳過去看評語，
 * 但不從對方系統取任何資料。
 *
 * 兩者的分數不能直接比較：食べログ 3.5 已屬好店，同一間店在 Google 可能是 4.3。
 * 前者以日本本地食客為主，後者混雜大量遊客。分數高低量度的是不同的人。
 */

const WALK_METRES_PER_MIN = 80

const RADIUS_OPTIONS = [
  { value: 300,  label: '300m' },
  { value: 500,  label: '500m' },
  { value: 1000, label: '1km'  },
  { value: 2000, label: '2km'  },
]

interface Spot {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  rating?: number
  reviews?: number
  priceLevel?: string
  openNow?: boolean
  googleMapsUri?: string
  distance: number
}

const tabelogUrl = (name: string) =>
  `https://tabelog.com/rst/rstsearch/?SrtT=rt&sk=${encodeURIComponent(name)}`

/** PriceLevel 枚舉轉成符號 */
function priceSymbol(level: any): string | undefined {
  const map: Record<string, string> = {
    INEXPENSIVE: '¥', MODERATE: '¥¥', EXPENSIVE: '¥¥¥', VERY_EXPENSIVE: '¥¥¥¥',
    PRICE_LEVEL_INEXPENSIVE: '¥', PRICE_LEVEL_MODERATE: '¥¥',
    PRICE_LEVEL_EXPENSIVE: '¥¥¥', PRICE_LEVEL_VERY_EXPENSIVE: '¥¥¥¥',
  }
  return level ? map[String(level)] : undefined
}

interface Props {
  trip: Trip
  dayIndex: number
  onClose: () => void
}

export default function NearbyFood({ trip, dayIndex, onClose }: Props) {
  const addActivity = useTripStore(s => s.addActivity)

  const [centre, setCentre]   = useState<{ lat: number; lng: number } | null>(null)
  const [origin, setOrigin]   = useState<'gps' | 'itinerary' | 'trip'>('gps')
  const [radius, setRadius]   = useState(500)
  const [goodOnly, setGoodOnly] = useState(true)
  const [openOnly, setOpenOnly] = useState(false)
  const [view, setView]       = useState<'list' | 'map'>('list')

  const [spots, setSpots]     = useState<Spot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [added, setAdded]     = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<string | null>(null)

  /** 行程當日最後一個有座標的地點 —— 未開定位時的後備中心 */
  const itineraryFallback = useMemo(() => {
    const acts = trip.dailyItinerary?.[dayIndex]?.activities ?? []
    for (let i = acts.length - 1; i >= 0; i--) {
      const a = acts[i]
      if (a?.lat && a?.lng) return { lat: Number(a.lat), lng: Number(a.lng) }
    }
    return null
  }, [trip, dayIndex])

  const tripFallback = trip.destLat && trip.destLng
    ? { lat: Number(trip.destLat), lng: Number(trip.destLng) }
    : null

  // 取定位。失敗不是死路：退回當日行程最後一點，再退回旅程目的地。
  const locate = useCallback(() => {
    setError(null)
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      const fb = itineraryFallback ?? tripFallback
      if (fb) { setCentre(fb); setOrigin(itineraryFallback ? 'itinerary' : 'trip') }
      else setError('此裝置不支援定位，亦找不到可用的參考位置。')
      return
    }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCentre({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setOrigin('gps')
      },
      err => {
        const fb = itineraryFallback ?? tripFallback
        if (fb) {
          setCentre(fb)
          setOrigin(itineraryFallback ? 'itinerary' : 'trip')
        } else {
          setLoading(false)
          setError(
            err.code === err.PERMISSION_DENIED
              ? '定位權限被拒絕。請於瀏覽器設定允許存取位置，或先在當日行程加入一個地點作為參考。'
              : '暫時取不到位置，請再試一次。'
          )
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }, [itineraryFallback, tripFallback])

  useEffect(() => { locate() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 搜尋。每次改半徑都會重新叫一次 Places，所以選項刻意做得少。
  const search = useCallback(async (at: { lat: number; lng: number }, r: number) => {
    const g = (window as any).google
    if (!g?.maps?.places?.Place) {
      setError('地圖服務尚未載入，請稍候再試。')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { Place, SearchNearbyRankPreference } = g.maps.places
      const { places } = await Place.searchNearby({
        fields: [
          'id', 'displayName', 'formattedAddress', 'location', 'googleMapsURI',
          'rating', 'userRatingCount', 'priceLevel', 'regularOpeningHours',
        ],
        locationRestriction: { center: at, radius: r },
        includedPrimaryTypes: ['restaurant'],
        maxResultCount: 20,
        rankPreference: SearchNearbyRankPreference.POPULARITY,
        language: 'zh-HK',
      })

      const spherical = g.maps.geometry?.spherical
      const centreLatLng = new g.maps.LatLng(at.lat, at.lng)

      const mapped: Spot[] = await Promise.all(
        (places ?? []).map(async (p: any) => {
          let openNow: boolean | undefined
          try { openNow = await p.isOpen() } catch { openNow = undefined }
          const lat = p.location?.lat?.() ?? p.location?.lat
          const lng = p.location?.lng?.() ?? p.location?.lng
          const distance = spherical
            ? spherical.computeDistanceBetween(centreLatLng, p.location)
            : 0
          return {
            id: p.id,
            name: p.displayName ?? '',
            address: p.formattedAddress ?? '',
            lat: Number(lat), lng: Number(lng),
            rating: p.rating ?? undefined,
            reviews: p.userRatingCount ?? undefined,
            priceLevel: priceSymbol(p.priceLevel),
            openNow,
            googleMapsUri: p.googleMapsURI ?? undefined,
            distance: Math.round(distance),
          }
        })
      )
      setSpots(mapped)
    } catch (e: any) {
      console.error('searchNearby failed', e)
      setError('搜尋失敗，請稍後再試。若持續失敗，請確認 Google Cloud 已啟用 Places API (New)。')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (centre) search(centre, radius)
  }, [centre, radius, search])

  /**
   * 只按星數排序會被「三個五星評價」的店騙到，
   * 所以先要求評論數達門檻，再以星數排序，同分再比評論數。
   */
  const visible = useMemo(() => {
    let list = [...spots]
    if (goodOnly) list = list.filter(s => (s.rating ?? 0) >= 4.0 && (s.reviews ?? 0) >= 100)
    if (openOnly) list = list.filter(s => s.openNow !== false)
    return list.sort((a, b) =>
      (b.rating ?? 0) - (a.rating ?? 0) || (b.reviews ?? 0) - (a.reviews ?? 0)
    )
  }, [spots, goodOnly, openOnly])

  const handleAdd = (s: Spot) => {
    addActivity(trip.id, dayIndex, {
      type: 'Food',
      location: s.name,
      address: s.address,
      placeId: s.id,
      googleMapsUri: s.googleMapsUri,
      lat: s.lat,
      lng: s.lng,
      note: s.rating ? `Google ${s.rating.toFixed(1)}★（${s.reviews ?? 0} 則評價）` : '',
      isVisited: false,
    })
    setAdded(prev => new Set(prev).add(s.id))
  }

  const originLabel =
    origin === 'gps' ? '目前位置'
    : origin === 'itinerary' ? '當日最後一個地點'
    : '旅程目的地'

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col">
      {/* 標題列 */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
        <div className="min-w-0">
          <h2 className="text-sm font-medium tracking-widest uppercase">附近美食</h2>
          <p className="text-[11px] text-gray-500 mt-0.5 truncate">
            以{originLabel}為中心 · 資料來自 Google
          </p>
        </div>
        <button onClick={onClose} aria-label="關閉" className="text-gray-500 hover:text-black shrink-0 ml-4">
          <X size={20} />
        </button>
      </div>

      {/* 篩選列 */}
      <div className="px-5 py-3 border-b border-gray-100 shrink-0 space-y-2.5">
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
          {RADIUS_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => setRadius(o.value)}
              className={`shrink-0 px-3 py-1.5 text-[11px] tracking-wider border transition-colors ${
                radius === o.value ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-600 hover:border-black'
              }`}
            >
              {o.label}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={() => setView(view === 'list' ? 'map' : 'list')}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-[11px] tracking-wider border border-gray-200 hover:border-black transition-colors"
          >
            {view === 'list' ? <><MapIcon size={12} /> 地圖</> : <><ListIcon size={12} /> 列表</>}
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setGoodOnly(v => !v)}
            className={`shrink-0 px-3 py-1.5 text-[11px] tracking-wider border transition-colors ${
              goodOnly ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-600 hover:border-black'
            }`}
          >
            4.0★ 以上
          </button>
          <button
            onClick={() => setOpenOnly(v => !v)}
            className={`shrink-0 px-3 py-1.5 text-[11px] tracking-wider border transition-colors ${
              openOnly ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-600 hover:border-black'
            }`}
          >
            營業中
          </button>
          <button
            onClick={locate}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-[11px] tracking-wider border border-gray-200 text-gray-600 hover:border-black transition-colors"
          >
            <RefreshCw size={11} /> 重新定位
          </button>
        </div>
      </div>

      {/* 內容 */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="py-24 flex flex-col items-center gap-3 text-gray-500">
            <Loader2 size={20} className="animate-spin" />
            <p className="text-[11px] tracking-widest uppercase">搜尋中…</p>
          </div>
        ) : error ? (
          <div className="p-6">
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 px-4 py-3 flex items-start gap-2 leading-relaxed">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {error}
            </p>
          </div>
        ) : view === 'map' && centre ? (
          <div className="relative h-full min-h-[60vh]">
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={centre}
              zoom={radius <= 500 ? 16 : radius <= 1000 ? 15 : 14}
              options={{ disableDefaultUI: true, zoomControl: true, clickableIcons: false }}
            >
              <MarkerF
                position={centre}
                icon={{
                  path: (window as any).google?.maps?.SymbolPath?.CIRCLE,
                  scale: 7, fillColor: '#1a1a1a', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2,
                }}
              />
              {visible.map(s => (
                <MarkerF
                  key={s.id}
                  position={{ lat: s.lat, lng: s.lng }}
                  onClick={() => setSelected(s.id)}
                  label={{
                    text: s.rating ? s.rating.toFixed(1) : '—',
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: '600',
                  }}
                />
              ))}
            </GoogleMap>

            {/* 選中的店家浮於地圖之上，不必切回列表 */}
            {selected && (() => {
              const s = visible.find(x => x.id === selected)
              if (!s) return null
              return (
                <div className="absolute left-4 right-4 bottom-6 bg-white border border-gray-200 p-4 shadow-lg">
                  <SpotBody s={s} added={added.has(s.id)} onAdd={() => handleAdd(s)} />
                </div>
              )
            })()}
          </div>
        ) : visible.length === 0 ? (
          <div className="py-24 text-center text-sm text-gray-500 px-8 leading-relaxed">
            這個範圍內沒有符合條件的餐廳。<br />
            可以放寬至 1km，或關掉「4.0★ 以上」再看看。
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {visible.map(s => (
              <div key={s.id} className="p-5">
                <SpotBody s={s} added={added.has(s.id)} onAdd={() => handleAdd(s)} />
              </div>
            ))}
            <p className="px-5 py-6 text-[11px] text-gray-500 leading-relaxed">
              評分來自 Google，與食べログ的評分標準不同 —— 食べログ 3.5 已屬好店，同一間店在 Google 可能是 4.3。
              兩者面向的食客不一樣，宜互相對照而非直接比較。
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function SpotBody({ s, added, onAdd }: { s: Spot; added: boolean; onAdd: () => void }) {
  const walk = Math.max(1, Math.round(s.distance / WALK_METRES_PER_MIN))
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-medium leading-snug break-words">{s.name}</h3>
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[11px] text-gray-500">
            {s.rating != null && (
              <span className="flex items-center gap-1 text-black">
                <Star size={11} className="fill-black" />
                <span className="font-medium">{s.rating.toFixed(1)}</span>
                <span className="text-gray-500">（{(s.reviews ?? 0).toLocaleString()}）</span>
              </span>
            )}
            {s.priceLevel && <span>{s.priceLevel}</span>}
            <span className="flex items-center gap-1">
              <Navigation size={10} /> {s.distance} m · 步行約 {walk} 分鐘
            </span>
            {s.openNow != null && (
              <span className={s.openNow ? 'text-green-700' : 'text-gray-400'}>
                {s.openNow ? '營業中' : '休息中'}
              </span>
            )}
          </div>
          {s.address && (
            <p className="text-[11px] text-gray-500 mt-1.5 flex items-start gap-1">
              <MapPin size={10} className="shrink-0 mt-0.5" />
              <span className="break-words">{s.address}</span>
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={onAdd}
          disabled={added}
          className="flex-1 flex items-center justify-center gap-1.5 text-[11px] tracking-widest uppercase bg-black text-white py-2.5 hover:bg-gray-800 transition-colors disabled:opacity-40"
        >
          {added ? <><Check size={12} /> 已加入</> : <><Plus size={12} /> 加入今日行程</>}
        </button>
        <a
          href={tabelogUrl(s.name)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1.5 text-[11px] tracking-widest uppercase border border-gray-200 px-4 py-2.5 hover:border-black transition-colors whitespace-nowrap"
        >
          食べログ <ExternalLink size={11} />
        </a>
        {s.googleMapsUri && (
          <a
            href={s.googleMapsUri}
            target="_blank"
            rel="noreferrer"
            aria-label="在 Google 地圖開啟"
            className="flex items-center justify-center border border-gray-200 px-3 py-2.5 hover:border-black transition-colors"
          >
            <MapPin size={13} />
          </a>
        )}
      </div>
    </>
  )
}
