"use client";
import { useState, useEffect } from "react";
import { Car, Footprints, TrainFront, Loader2 } from "lucide-react";
import clsx from "clsx";

interface Point {
  lat: number;
  lng: number;
  /** 有 placeId 就用佢，比座標準（唔會計去咗隔籬座大廈） */
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

// 同一對地點 + 同一個模式只會問 Google 一次
const cache: Record<string, Stats> = {};

/** 秒 → 「12 分鐘」／「1 小時 5 分鐘」 */
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

/** DistanceMatrix 收 place_id: 前綴嘅字串，或者 LatLng */
const toWaypoint = (p: Point): any =>
  p.placeId ? { placeId: p.placeId } : { lat: p.lat, lng: p.lng };

export default function TravelStats({ origin, dest }: Props) {
  const [showModes, setShowModes] = useState(false);
  const [mode, setMode] = useState<TravelMode>("WALKING");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const key = `${origin.placeId || `${origin.lat},${origin.lng}`}>${dest.placeId || `${dest.lat},${dest.lng}`}|${mode}`;

  useEffect(() => {
    if (!origin || !dest) return;
    if (cache[key]) { setStats(cache[key]); setFailed(false); return; }

    // Maps JS 可能仲未 load 好，等佢
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
            // 例如兩點之間冇公共交通路線
            setStats(null);
            setFailed(true);
          }
          setLoading(false);
        }
      );
    };
    run();
    return () => { cancelled = true; };
  }, [key, mode, origin, dest]);

  const ModeIcon = MODE_CONFIG[mode].icon;

  return (
    <div className="relative pl-10 py-1.5">
      <div className="absolute left-[28px] top-0 bottom-0 w-[2px] bg-gray-100" />

      <div className="relative z-10 flex items-center gap-2 flex-wrap">
        {/* 一眼睇到嘅結果 —— 唔使撳都有 */}
        <button
          onClick={() => setShowModes(v => !v)}
          className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-black transition-colors"
        >
          {loading ? (
            <>
              <Loader2 size={12} className="animate-spin text-gray-400" />
              <span className="text-gray-500">計緊…</span>
            </>
          ) : stats ? (
            <>
              <ModeIcon size={12} className="text-gray-500" />
              <span className="font-medium">{formatDuration(stats.minutes)}</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-500">{formatDistance(stats.meters)}</span>
            </>
          ) : failed ? (
            <>
              <ModeIcon size={12} className="text-gray-400" />
              <span className="text-gray-500">冇路線</span>
            </>
          ) : (
            <span className="text-gray-500 tracking-widest uppercase">查看距離</span>
          )}
        </button>

        {/* 撳一下先出模式切換 */}
        {showModes && (
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
                    // 之前呢度淨係 text-white 冇背景，揀中咗嗰個係睇唔到嘅
                    active
                      ? "bg-black text-white"
                      : "text-gray-500 hover:bg-gray-200"
                  )}
                >
                  <Icon size={12} />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
