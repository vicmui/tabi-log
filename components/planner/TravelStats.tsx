"use client";
import { useState, useEffect } from "react";
import { Car, Footprints, TrainFront, Loader2, ChevronDown } from "lucide-react";
import clsx from "clsx";

interface Props {
  origin: { lat: number; lng: number };
  dest: { lat: number; lng: number };
}

type TravelMode = "WALKING" | "TRANSIT" | "DRIVING";
const MODE_CONFIG: Record<TravelMode, { icon: any; label: string }> = {
  WALKING: { icon: Footprints, label: "步行" },
  TRANSIT: { icon: TrainFront, label: "交通" },
  DRIVING: { icon: Car, label: "駕車" },
};

// Cache to avoid re-fetching same pairs
const cache: Record<string, { duration: string; distance: string }> = {};

export default function TravelStats({ origin, dest }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [stats, setStats] = useState<{ duration: string; distance: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<TravelMode>("WALKING");

  const cacheKey = `${origin.lat},${origin.lng}-${dest.lat},${dest.lng}-${mode}`;

  useEffect(() => {
    // Only fetch if expanded
    if (!isExpanded) return;
    if (!window.google?.maps) return;
    if (!origin?.lat || !dest?.lat) return;

    // Return cached result immediately
    if (cache[cacheKey]) { setStats(cache[cacheKey]); return; }

    setLoading(true);
    const service = new google.maps.DistanceMatrixService();
    service.getDistanceMatrix(
      {
        origins: [{ lat: origin.lat, lng: origin.lng }],
        destinations: [{ lat: dest.lat, lng: dest.lng }],
        travelMode: google.maps.TravelMode[mode],
        unitSystem: google.maps.UnitSystem.METRIC,
      },
      (response, status) => {
        if (status === "OK" && response?.rows[0]?.elements[0]?.status === "OK") {
          const el = response.rows[0].elements[0];
          const result = {
            duration: el.duration.text.replace(" hours", "h").replace(" mins", "m"),
            distance: el.distance.text,
          };
          cache[cacheKey] = result;
          setStats(result);
        } else {
          setStats(null);
        }
        setLoading(false);
      }
    );
  }, [isExpanded, mode, cacheKey]);

  return (
    <div className="relative pl-10 py-1">
      <div className="absolute left-[28px] top-0 bottom-0 w-[2px] bg-gray-100" />

      {!isExpanded ? (
        // ── Collapsed: just a subtle clickable line ──
        <button
          onClick={() => setIsExpanded(true)}
          className="relative z-10 flex items-center gap-1.5 text-[10px] text-gray-300 hover:text-gray-500 transition-colors group"
        >
          <ChevronDown size={10} className="group-hover:text-gray-400" />
          <span className="tracking-widest uppercase">查看距離</span>
        </button>
      ) : (
        // ── Expanded: show mode picker + result ──
        <div className="relative z-10 flex items-center gap-2 flex-wrap">
          <div className="flex bg-gray-100 border border-gray-200 rounded-full p-0.5 shadow-sm">
            {(["WALKING", "TRANSIT", "DRIVING"] as TravelMode[]).map((m) => {
              const Icon = MODE_CONFIG[m].icon;
              return (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={clsx(
                    "p-1.5 rounded-full transition-colors",
                    mode === m ? "bg-black text-white shadow" : "text-gray-400 hover:bg-gray-200"
                  )}
                  title={MODE_CONFIG[m].label}
                >
                  <Icon size={12} />
                </button>
              );
            })}
          </div>

          <div className="text-[10px] text-gray-500 font-medium">
            {loading ? (
              <div className="flex items-center gap-1 text-gray-300 animate-pulse">
                <Loader2 size={10} className="animate-spin" /> 計算中...
              </div>
            ) : stats ? (
              <div className="flex items-center gap-2">
                <span>{stats.duration}</span>
                <span className="text-gray-300">•</span>
                <span>{stats.distance}</span>
              </div>
            ) : (
              <span className="text-gray-300">無法計算</span>
            )}
          </div>

          <button onClick={() => setIsExpanded(false)} className="text-[10px] text-gray-300 hover:text-gray-500 ml-1">
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
