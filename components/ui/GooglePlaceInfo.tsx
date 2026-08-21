'use client'
import { useEffect, useState } from 'react'
import { Star, Clock, ExternalLink, Loader2 } from 'lucide-react'
import { googleMapsLink } from '@/components/ui/PlacesSearch'

interface Props {
  placeId?: string
  /** 冇 placeId 嗰陣用嚟砌 fallback 連結 */
  name?: string
  address?: string
  /** 存低咗嘅 Google Maps 連結（有就唔使等 API） */
  googleMapsUri?: string
  compact?: boolean
}

interface Info {
  rating?: number
  userRatingCount?: number
  googleMapsUri?: string
  todayHours?: string
  openNow?: boolean
}

/**
 * 喺景點卡／詳情頁顯示 Google 嘅評分同今日營業時間，
 * 再加一個「睇 Google 評價」掣直接跳出 Google Maps。
 *
 * ⚠️ 條款：Google 只准長期儲存 placeId。評分同營業時間唔可以 cache 落
 * Supabase，所以呢個 component 係開嗰陣先即場問 Google 攞。
 *
 * 慳額度：只喺詳情頁用，唔好喺 list 度逐個 render。
 */
export default function GooglePlaceInfo({
  placeId,
  name,
  address,
  googleMapsUri,
  compact = false,
}: Props) {
  const [info, setInfo] = useState<Info | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!placeId) return
    let alive = true
    setLoading(true)

    ;(async () => {
      try {
        const Place = (window as any).google?.maps?.places?.Place
        if (!Place) return
        const place = new Place({ id: placeId })
        await place.fetchFields({
          fields: [
            'rating',
            'userRatingCount',
            'googleMapsURI',
            'regularOpeningHours',
            'utcOffsetMinutes',
          ],
        })
        if (!alive) return

        // weekdayDescriptions 由星期一排到星期日
        const descriptions: string[] | undefined =
          place.regularOpeningHours?.weekdayDescriptions
        const mondayFirstIndex = (new Date().getDay() + 6) % 7
        const todayHours = descriptions?.[mondayFirstIndex]

        let openNow: boolean | undefined
        try {
          openNow = await place.isOpen()
        } catch (_) {
          openNow = undefined
        }
        if (!alive) return

        setInfo({
          rating: place.rating ?? undefined,
          userRatingCount: place.userRatingCount ?? undefined,
          googleMapsUri: place.googleMapsURI ?? undefined,
          todayHours,
          openNow,
        })
      } catch (_) {
        // 靜靜地失敗 — 下面個連結照樣行得通
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => { alive = false }
  }, [placeId])

  const href = info?.googleMapsUri ?? googleMapsUri ?? googleMapsLink({ placeId, name, address })

  return (
    <div className={compact ? 'flex items-center gap-3 flex-wrap' : 'space-y-2'}>
      {/* 評分 */}
      {loading && !info && (
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
          <Loader2 size={12} className="animate-spin" /> 讀緊 Google 資料…
        </span>
      )}

      {info?.rating !== undefined && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-sm">
            <Star size={13} className="text-amber-500 fill-amber-500" />
            <span className="font-bold text-gray-900">{info.rating.toFixed(1)}</span>
            {info.userRatingCount !== undefined && (
              <span className="text-gray-500 text-xs">
                {info.userRatingCount.toLocaleString()} 個評價
              </span>
            )}
          </span>
          {info.openNow !== undefined && (
            <span
              className={
                'text-xs font-bold px-2 py-0.5 ' +
                (info.openNow
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-600')
              }
            >
              {info.openNow ? '營業中' : '休息中'}
            </span>
          )}
        </div>
      )}

      {/* 今日營業時間 */}
      {info?.todayHours && !compact && (
        <p className="flex items-center gap-1.5 text-xs text-gray-600">
          <Clock size={12} className="text-gray-500 shrink-0" />
          {info.todayHours}
        </p>
      )}

      {/* 出 Google Maps */}
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-xs font-bold tracking-widest uppercase text-gray-700 hover:border-black hover:text-black transition-colors"
      >
        <ExternalLink size={12} />
        睇 Google 評價
      </a>

      {info && !compact && (
        <p className="text-[11px] text-gray-500">評分及營業時間來自 Google</p>
      )}
    </div>
  )
}
