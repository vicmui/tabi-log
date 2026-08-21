"use client";
import { useState, useEffect } from "react";
import { Car, Footprints, TrainFront, Loader2, ChevronDown, X } from "lucide-react";
import clsx from "clsx";

interface Point {
  lat: number;
  lng: number;
  /** 有 placeId 時優先採用，較座標準確（不會計算到旁邊的建築物） */
  placeId?: string;
}

interface Props {
  origin: Point;
  dest: Point;
}

type TravelMode = "WALKING" | "TRANSIT" | "DRIVING";
const MODE_CONFIG: Record<TravelMode, { icon: any; label: string }> = {
  WALKING: { icon: Footprints, label: "步行" },
  TRANSIT: { icon: TrainFront, label: "交通" },
  DRIVING: { icon: Car,        label: "駕車" },
};

interface Stats { minutes: number; meters: number }

// 同一組地點與交通模式只向 Google 查詢一次
const cache: Record<string, Stats> = {};

/** 分鐘 → 「12 分鐘」／「1 小時 5 分鐘」 */
function formatDuration(minutes: number) {
  if (minutes < 1) return "少於 1 分鐘";
  if (minutes < 60) return `${minutes} 分鐘`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} 小時` : `${h} 小時 ${m} 分鐘`;
}

/** 米 → 「950 m」／「1.2 km」 */
function formatDistance(meters: number) {
  return meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`;
}

/** Distance Matrix 接受 placeId 或經緯度 */
const toWaypoint = (p: Point): any =>
  p.placeId ? { placeId: p.placeId } : { lat: p.lat, lng: p.lng };

export default function TravelStats({ origin, dest }: Props) {
  // 預設收合，保持版面簡潔；點擊後才向 Google 查詢
  const [isExpanded, setIsExpanded] = useState(false);
  const [mode, setMode] = useState<TravelMode>("WALKING");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const key = `${origin.placeId || `${origin.lat},${origin.lng}`}>${dest.placeId || `${dest.lat},${dest.lng}`}|${mode}`;

  useEffect(() => {
    if (!isExpanded) return;
    if (!origin || !dest) return;
    if (cache[key]) { setStats(cache[key]); setFailed(false); return; }

    // Google Maps SDK 可能尚未載入完成，稍候再試
    let cancelled = false;
    let tries = 0;
    const run = () => {
      if (cancelled) return;
      const g = (window as any).google?.maps;
      if (!g?.DistanceMatrixService) {
        if (tries++ < 20) setTimeout(run, 300);
        return;
      }

      setLoading(true);
      setFailed(false);
      const service = new g.DistanceMatrixService();
      service.getDistanceMatrix(
        {
          origins: [toWaypoint(origin)],
          destinations: [toWaypoint(dest)],
          travelMode: g.TravelMode[mode],
          unitSystem: g.UnitSystem.METRIC,
        },
        (response: any, status: string) => {
          if (cancelled) return;
          const el = response?.rows?.[0]?.elements?.[0];
          if (status === "OK" && el?.status === "OK") {
            const result: Stats = {
              minutes: Math.round(el.duration.value / 60),
              meters: el.distance.value,
            };
            cache[key] = result;
            setStats(result);
          } else {
            // 例如兩點之間沒有公共交通路線
            setStats(null);
            setFailed(true);
          }
          setLoading(false);
        }
      );
    };
    run();
    return () => { cancelled = true; };
  }, [isExpanded, key, mode, origin, dest]);

  const ModeIcon = MODE_CONFIG[mode].icon;

  return (
    <div className="relative pl-10 py-1">
      <div className="absolute left-[28px] top-0 bottom-0 w-[2px] bg-gray-100" />

      {!isExpanded ? (
        // 收合狀態：只有一行極輕的提示
        <button
          onClick={() => setIsExpanded(true)}
          className="relative z-10 flex items-center gap-1.5 text-xs text-gray-500 hover:text-black transition-colors group"
        >
          <ChevronDown size={11} />
          <span className="tracking-widest uppercase">查看距離</span>
        </button>
      ) : (
        <div className="relative z-10 flex items-center gap-2 flex-wrap">
          {/* 交通模式 */}
          <div className="flex bg-gray-100 border border-gray-200 rounded-full p-0.5">
            {(Object.keys(MODE_CONFIG) as TravelMode[]).map(m => {
              const Icon = MODE_CONFIG[m].icon;
              const active = mode === m;
              return (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  aria-label={MODE_CONFIG[m].label}
                  title={MODE_CONFIG[m].label}
                  className={clsx(
                    "p-1.5 rounded-full transition-colors",
                    // 原本只有 text-white 而沒有背景色，選中的一項會白字白底看不見
                    active ? "bg-black text-white" : "text-gray-500 hover:bg-gray-200"
                  )}
                >
                  <Icon size={12} />
                </button>
              );
            })}
          </div>

          {/* 結果 */}
          <div className="text-xs">
            {loading ? (
              <span className="flex items-center gap-1 text-gray-500">
                <Loader2 size={11} className="animate-spin" /> 計算中…
              </span>
            ) : stats ? (
              <span className="flex items-center gap-1.5 text-gray-600">
                <ModeIcon size={11} className="text-gray-500" />
                <span className="font-medium text-gray-800">{formatDuration(stats.minutes)}</span>
                <span className="text-gray-400">·</span>
                <span>{formatDistance(stats.meters)}</span>
              </span>
            ) : failed ? (
              <span className="text-gray-500">沒有可用路線</span>
            ) : null}
          </div>

          <button
            onClick={() => setIsExpanded(false)}
            aria-label="收起"
            className="text-gray-400 hover:text-black transition-colors ml-1"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
