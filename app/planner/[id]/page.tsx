"use client";
import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/layout/Sidebar";
import ItineraryList from "@/components/planner/ItineraryList";
import AddActivityModal from "@/components/planner/AddActivityModal";
import ActivityDetailModal from "@/components/planner/ActivityDetailModal";
import TripMap from "@/components/planner/TripMap";
import { useTripStore } from "@/store/useTripStore";
import { ArrowLeft, Plus, MapPin, Clock, Map as MapIcon, List as ListIcon, CalendarX, Camera, Navigation, Share, Globe, Sun, Cloud, CloudSun, CloudRain, Snowflake, Edit, ImagePlus, X, Check } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import clsx from "clsx";
import EditTripModal from "@/components/dashboard/EditTripModal";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import { format, parseISO, differenceInDays } from "date-fns";
import { RepositionPanel, CoverFocus } from "@/components/ui/RepositionPanel";
import { formatMoney, sumOnDate, sumLocal } from "@/lib/money";
import { ConfirmDialog, AlertDialog } from "@/components/ui/Dialog";
import { motion, AnimatePresence } from "framer-motion";

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
};

function getTripCoords(title: string, destLat?: number, destLng?: number) {
  if (destLat && destLng) return { lat: destLat, lng: destLng };
  const s = title.toLowerCase();
  if (s.includes("taichung") || s.includes("\u53f0\u4e2d")) return CITY_COORDS.taichung;
  if (s.includes("tainan")   || s.includes("\u53f0\u5357")) return CITY_COORDS.tainan;
  if (s.includes("taipei")   || s.includes("\u53f0\u5317") || s.includes("\u53f0\u7063") || s.includes("taiwan")) return CITY_COORDS.taipei;
  if (s.includes("osaka")    || s.includes("\u5927\u962a")) return CITY_COORDS.osaka;
  if (s.includes("tokyo")    || s.includes("\u6771\u4eac")) return CITY_COORDS.tokyo;
  if (s.includes("kyoto")    || s.includes("\u4eac\u90fd")) return CITY_COORDS.kyoto;
  if (s.includes("hongkong") || s.includes("hong kong") || s.includes("\u9999\u6e2f")) return CITY_COORDS.hongkong;
  if (s.includes("singapore")|| s.includes("\u65b0\u52a0\u5761")) return CITY_COORDS.singapore;
  if (s.includes("bangkok")  || s.includes("\u66fc\u8c37") || s.includes("\u6cf0\u570b")) return CITY_COORDS.bangkok;
  if (s.includes("seoul")    || s.includes("\u9996\u723e") || s.includes("\u97d3\u570b")) return CITY_COORDS.seoul;
  return CITY_COORDS.osaka;
}

// ── Custom Edit Location Modal (replaces native prompt) ─────────────────────
function EditLocationModal({
  current,
  onConfirm,
  onClose,
}: {
  current: string;
  onConfirm: (val: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(current);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 60);
  }, []);

  const handleConfirm = () => {
    const v = value.trim();
    if (v) onConfirm(v);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 4, scale: 0.98 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        onClick={e => e.stopPropagation()}
        className="relative bg-white w-full max-w-xs border border-gray-200"
      >
        <div className="h-[3px] bg-black" />
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[11px] text-gray-500 tracking-[0.2em] uppercase mb-0.5">當日地點</p>
              <h3 className="font-semibold text-base tracking-tight">修改地點名稱</h3>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-black transition-colors">
              <X size={16} />
            </button>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleConfirm(); if (e.key === "Escape") onClose(); }}
            className="w-full border-b border-gray-200 focus:border-black outline-none py-2 text-sm transition-colors"
            placeholder="例：大阪城公園周邊"
          />
        </div>
        <div className="flex border-t border-gray-100">
          <button onClick={onClose}
            className="flex-1 py-3.5 text-xs font-semibold tracking-widest text-gray-500 uppercase hover:bg-gray-50 transition-colors border-r border-gray-100">
            取消
          </button>
          <button onClick={handleConfirm}
            className="flex-1 py-3.5 text-xs font-medium tracking-widest text-black uppercase hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5">
            <Check size={12} /> 確認
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function PlannerPage() {
  const params = useParams();
  const { trips, _hasHydrated, addActivity, addDayToTrip, deleteDayFromTrip, updateDayCoverImage, updateDayCoverFocus, updateDayLocation } = useTripStore();

  const [activeDay, setActiveDay]               = useState(0);
  const [isModalOpen, setIsModalOpen]           = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen]     = useState(false);
  const [viewMode, setViewMode]                 = useState<"list" | "map">("list");
  const [weatherMap, setWeatherMap]             = useState<Record<string, { temp: string; code: number }>>({});
  const [repositioning, setRepositioning]       = useState(false);
  // ✅ Custom edit-location modal state
  const [editLocationOpen, setEditLocationOpen] = useState(false);
  const [alertMsg, setAlertMsg]                 = useState<string | null>(null);
  const [confirmDeleteDay, setConfirmDeleteDay] = useState(false);

  const trip = trips.find((t) => t.id === params.id);




  // 旅途模式：若今日落在行程日期範圍內，進入頁面即自動跳至當日，
  // 毋須在日曆上逐格尋找。日期以本地時間計算而非 UTC——
  // 在日本清晨開啟應用程式時，UTC 仍屬前一日。
  const todayKey = (() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  })();
  const [autoJumped, setAutoJumped] = useState(false);
  useEffect(() => {
    if (!trip || autoJumped) return;
    const idx = trip.dailyItinerary.findIndex(d => d.date === todayKey);
    if (idx >= 0) setActiveDay(idx);
    setAutoJumped(true);
  }, [trip, autoJumped, todayKey]);

  useEffect(() => { if (trip && activeDay >= trip.dailyItinerary.length) setActiveDay(Math.max(0, trip.dailyItinerary.length - 1)); }, [trip, activeDay]);
  useEffect(() => { setRepositioning(false); }, [activeDay]);

  useEffect(() => {
    if (!trip || trip.dailyItinerary.length === 0) return;
    const startDate = trip.dailyItinerary[0].date;
    const endDate   = trip.dailyItinerary[trip.dailyItinerary.length - 1].date;
    const daysUntilTrip = differenceInDays(parseISO(startDate), new Date());
    const dummy: Record<string, { temp: string; code: number }> = {};
    trip.dailyItinerary.forEach(d => { dummy[d.date] = { temp: "15/25", code: 1 }; });
    setWeatherMap(dummy);
    if (daysUntilTrip > 15 || daysUntilTrip < -trip.dailyItinerary.length) return;
    const { lat, lng } = getTripCoords(trip.title, trip.destLat, trip.destLng);
    const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + 15);
    const clampedEnd = parseISO(endDate) > maxDate ? maxDate.toISOString().split("T")[0] : endDate;
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&start_date=${startDate}&end_date=${clampedEnd}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => {
        if (data.daily?.time?.length) {
          const newMap = { ...dummy };
          data.daily.time.forEach((d: string, i: number) => {
            newMap[d] = { temp: `${Math.round(data.daily.temperature_2m_min[i])}/${Math.round(data.daily.temperature_2m_max[i])}`, code: data.daily.weather_code[i] };
          });
          setWeatherMap(newMap);
        }
      }).catch(() => {});
  }, [trip?.id]);

  if (!_hasHydrated) return <div className="p-10 text-center animate-pulse text-gray-500 text-xs tracking-widest">載入中...</div>;
  if (!trip) return <div className="p-10 text-center text-gray-500 text-xs tracking-widest">找不到旅程</div>;

  const currentDay      = trip.dailyItinerary[activeDay];
  const coverSrc        = currentDay?.coverImage || trip.coverImage || "";
  // 若當日冇自己嘅封面，就沿用旅程封面同佢嘅焦點
  const usingTripCover  = !currentDay?.coverImage && !!trip.coverImage;
  const coverFocus: CoverFocus = usingTripCover
    ? { x: trip.coverPosX ?? 50, y: trip.coverPosY ?? 50 }
    : { x: currentDay?.coverPosX ?? 50, y: currentDay?.coverPosY ?? 50 };
  const displayLocation = currentDay?.customLocation
    || (currentDay?.activities?.length > 0 ? currentDay.activities[0].location.split(" ")[0] : "自由探索");

  const handleAddActivity = (data: any) => { addActivity(trip.id, activeDay, data); setIsModalOpen(false); };
  const handleDeleteDay = () => {
    if (trip.dailyItinerary.length <= 1) { setAlertMsg("行程需保留至少一日。"); return; }
    setConfirmDeleteDay(true);
  };
  const handleShare = async () => {
    const url = `${window.location.origin}/share/${trip.id}`;
    if (navigator.share) { try { await navigator.share({ title: trip.title, text: `查看我的行程：${trip.title}`, url }); return; } catch (_) {} }
    window.open(`https://wa.me/?text=${encodeURIComponent(trip.title + "\n" + url)}`, "_blank");
  };
  const handleOpenDayRoute = () => {
    if (!currentDay || currentDay.activities.length < 2) { setAlertMsg("需要至少兩個地點才能規劃路線。"); return; }
    const acts = currentDay.activities.filter(a => a && (a.address || a.location));
    const origin = acts[0].lat ? `${acts[0].lat},${acts[0].lng}` : encodeURIComponent(acts[0].address || acts[0].location);
    const dest   = acts[acts.length-1].lat ? `${acts[acts.length-1].lat},${acts[acts.length-1].lng}` : encodeURIComponent(acts[acts.length-1].address || acts[acts.length-1].location);
    const wp     = acts.slice(1,-1).map(a => a.lat ? `${a.lat},${a.lng}` : encodeURIComponent(a.address || a.location)).join("|");
    window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&waypoints=${wp}&travelmode=transit`, "_blank");
  };
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const filePath = `public/${trip.id}/day-covers/${activeDay}-${uuidv4()}`;
    const { error } = await supabase.storage.from("trip_files").upload(filePath, file);
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from("trip_files").getPublicUrl(filePath);
      updateDayCoverImage(trip.id, activeDay, publicUrl);
      setRepositioning(true);
    }
    e.target.value = "";
  };

  const WeatherIcon = ({ code }: { code?: number }) => {
    if (!code) return <Cloud size={12} className="text-gray-500" />;
    if (code <= 1) return <Sun size={12} className="text-gray-500" />;
    if (code <= 3) return <CloudSun size={12} className="text-gray-500" />;
    if (code >= 51 && code <= 67) return <CloudRain size={12} className="text-gray-500" />;
    if (code >= 71) return <Snowflake size={12} className="text-gray-500" />;
    return <Cloud size={12} className="text-gray-500" />;
  };

  return (
    <>
      {/* ✅ Custom edit location modal */}
      <AnimatePresence>
        {editLocationOpen && (
          <EditLocationModal
            current={displayLocation}
            onConfirm={v => updateDayLocation(trip.id, activeDay, v)}
            onClose={() => setEditLocationOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row h-screen bg-white font-sans text-[#333333] overflow-hidden">
        <Sidebar />
        <main className="flex-1 min-w-0 flex flex-col md:flex-row h-full ml-0 md:ml-64 relative overflow-hidden">

          {/* Mobile Header */}
          <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-100 bg-white shrink-0 z-40">
            <Link href="/" className="p-1"><ArrowLeft size={22} className="text-gray-500" /></Link>
            <h1 className="font-semibold text-sm tracking-widest uppercase truncate flex-1 text-center px-4">{trip.title}</h1>
            <button onClick={() => setIsModalOpen(true)} className="bg-black text-white p-2 active:scale-95 transition-transform"><Plus size={20} /></button>
          </div>

          {/* Desktop Day Sidebar */}
          <div className="hidden md:flex w-72 border-r border-gray-100 bg-white h-full overflow-y-auto flex-col shrink-0 z-20 pt-10">
            <div className="px-8 pb-8 border-b border-gray-50 sticky top-0 bg-white z-10">
              <Link href="/" className="flex items-center gap-2 text-xs text-gray-400 hover:text-black mb-6 transition-colors tracking-widest uppercase font-medium"><ArrowLeft size={10} /> BACK</Link>
              <div className="cursor-pointer" onClick={() => setIsSettingsOpen(true)}>
                <h2 className="text-lg font-semibold leading-snug mb-1 text-black tracking-tight">{trip.title}</h2>
                <p className="text-[11px] text-gray-500 tracking-[0.2em] uppercase">{trip.startDate}</p>
              </div>
            </div>
            <div className="flex-1 py-4">
              {trip.dailyItinerary.map((dayItem, index) => {
                const info = weatherMap[dayItem.date];
                return (
                  <button key={dayItem.day} onClick={() => setActiveDay(index)}
                    className={`w-full text-left py-6 px-8 transition-all duration-300 relative border-b border-gray-50 last:border-0 ${activeDay === index ? "bg-gray-50" : "hover:bg-gray-50"}`}>
                    <div className="flex justify-between items-center">
                      <span className={clsx("text-xs tracking-[0.15em] uppercase", activeDay === index ? "font-semibold text-black" : "font-light text-gray-500")}>Day {dayItem.day}</span>
                      <span className="text-[11px] text-gray-500 font-medium uppercase">{format(parseISO(dayItem.date), "EEE")}</span>
                    </div>
                    <div className="text-[11px] mt-1 text-gray-500 font-light">{dayItem.date}</div>
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-500">
                      <WeatherIcon code={info?.code} />
                      <span>{info?.temp ?? "15/25"}</span>
                    </div>
                    {activeDay === index && <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-black" />}
                  </button>
                );
              })}
              <button onClick={() => addDayToTrip(trip.id)} className="w-full py-6 text-xs text-gray-400 hover:text-black flex items-center justify-center gap-2 uppercase tracking-[0.2em] transition-colors"><Plus size={12} /> Add Day</button>
            </div>
          </div>

          {/* Mobile Day Picker */}
          <div className="md:hidden w-full bg-white border-b border-gray-100 z-30 shrink-0">
            <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar py-4 px-4 gap-3 items-center">
              {trip.dailyItinerary.map((dayItem, index) => {
                const info = weatherMap[dayItem.date];
                return (
                  <button key={dayItem.day} onClick={() => setActiveDay(index)}
                    className={clsx("relative flex-shrink-0 snap-center flex flex-col items-center justify-center w-20 h-24 border transition-all duration-300",
                      activeDay === index ? "bg-black text-white border-black scale-105" : "bg-white text-gray-500 border-gray-100",
                      dayItem.date === todayKey && activeDay !== index && "border-black")}>
                    {dayItem.date === todayKey && (
                      <span className={clsx(
                        "absolute -top-2 px-1.5 py-0.5 text-[10px] font-medium tracking-widest",
                        activeDay === index ? "bg-white text-black" : "bg-black text-white"
                      )}>今日</span>
                    )}
                    <span className="text-[11px] font-medium uppercase tracking-widest">{format(parseISO(dayItem.date), "EEE")}</span>
                    <span className="text-xl font-semibold leading-none my-1">{format(parseISO(dayItem.date), "d")}</span>
                    <div className="flex flex-col items-center gap-1 border-t border-current/10 pt-2 w-full mt-1">
                      <WeatherIcon code={info?.code} />
                      <span className="text-[11px] font-medium">{info?.temp ?? "15/25"}</span>
                    </div>
                  </button>
                );
              })}
              <button onClick={() => addDayToTrip(trip.id)} className="flex-shrink-0 flex items-center justify-center w-12 h-24 border border-dashed border-gray-200 text-gray-400 snap-center"><Plus size={20} /></button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 relative overflow-y-auto bg-white scroll-smooth h-full no-scrollbar pb-32">

            {/* Cover image area */}
            <div className="relative w-full shrink-0">
              {repositioning && coverSrc && (
                <>
                  <div className="fixed inset-0 z-[300] md:hidden">
                    <RepositionPanel src={coverSrc} initial={coverFocus} aspect={3.2}
                      onConfirm={f => { updateDayCoverFocus(trip.id, activeDay, f.x, f.y); setRepositioning(false); }}
                      onCancel={() => setRepositioning(false)} />
                  </div>
                  <div className="hidden md:block">
                    <RepositionPanel compact src={coverSrc} initial={coverFocus} aspect={2.2}
                      onConfirm={f => { updateDayCoverFocus(trip.id, activeDay, f.x, f.y); setRepositioning(false); }}
                      onCancel={() => setRepositioning(false)} />
                  </div>
                </>
              )}

              {!repositioning && (
                <div className="h-44 md:h-80 relative w-full group">
                  {coverSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverSrc} alt="Cover" className="w-full h-full object-cover"
                      style={{ objectPosition: `${coverFocus.x}% ${coverFocus.y}%` }} />
                  ) : (
                    <label className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center gap-3 cursor-pointer hover:from-gray-200 hover:to-gray-300 transition-colors">
                      <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                      <div className="w-14 h-14 rounded-full bg-white/60 flex items-center justify-center">
                        <ImagePlus size={26} className="text-gray-500" />
                      </div>
                      <div className="text-center px-4">
                        <p className="text-sm font-semibold text-gray-500 tracking-widest uppercase">點擊上傳封面相片</p>
                        <p className="text-xs text-gray-500 mt-1.5">建議 <span className="font-medium text-gray-700">2400 × 750px</span>（約 3.2:1 橫向），JPG / PNG</p>
                        <p className="text-[11px] text-gray-500 mt-1">主體置中；上傳後可左右上下調整焦點</p>
                      </div>
                    </label>
                  )}

                  {coverSrc && (
                    <div className="absolute bottom-0 left-0 right-0 px-6 md:px-16 pb-6 pt-20 pointer-events-none">
                      <div className="pointer-events-auto">
                        <h3 className="text-4xl md:text-7xl font-semibold tracking-tight uppercase leading-none text-black drop-shadow-[0_2px_15px_rgba(255,255,255,0.8)]">Day {activeDay + 1}</h3>
                        {/* ✅ Opens custom modal instead of prompt() */}
                        <button
                          onClick={() => setEditLocationOpen(true)}
                          className="flex items-center gap-3 text-xs text-gray-600 tracking-[0.3em] uppercase font-medium mt-2 bg-white/90 backdrop-blur-sm w-fit px-3 py-1 rounded-full hover:bg-white transition-all"
                        >
                          <MapPin size={10} /><span>{displayLocation}</span><Edit size={8} className="opacity-50" />
                          <span className="w-px h-3 bg-gray-300" /><Clock size={10} /><span>{currentDay?.date}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {coverSrc && (
                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <button onClick={() => setRepositioning(true)}
                        className="flex items-center gap-1.5 bg-white/85 hover:bg-white text-black text-xs font-medium uppercase tracking-widest px-3 py-2 backdrop-blur-sm transition-all">
                        調整位置
                      </button>
                      <label className="flex items-center gap-1.5 bg-white/85 hover:bg-white text-black text-xs font-medium uppercase tracking-widest px-3 py-2 backdrop-blur-sm cursor-pointer transition-all">
                        <Camera size={13} /> 換封面
                        <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-4 md:px-12 py-6 max-w-5xl mx-auto min-h-[500px]">
              <div className="mb-8 border-b border-gray-100 pb-4 sticky top-0 bg-white/95 backdrop-blur z-30 pt-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="text-[11px] font-medium tracking-[0.2em] text-black uppercase">行程規劃</span>
                    <button onClick={handleDeleteDay} className="text-gray-400 hover:text-red-400 p-1"><CalendarX size={16} /></button>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto overflow-x-auto hide-scrollbar pb-1">
                    <button onClick={handleShare} className="flex-1 md:flex-none flex items-center justify-center gap-2 text-xs font-medium tracking-widest border border-gray-200 text-gray-500 py-2.5 bg-white uppercase hover:border-black transition-all whitespace-nowrap px-5"><Share size={14} /><span className="hidden sm:inline">分享</span></button>
                    <button onClick={handleOpenDayRoute} className="flex-1 md:flex-none flex items-center justify-center gap-2 text-xs font-medium tracking-widest border border-gray-200 text-gray-500 py-2.5 bg-white uppercase hover:border-black transition-all whitespace-nowrap px-5"><Navigation size={14} /><span className="hidden sm:inline">路線</span></button>
                    <Link href={`/planner/${trip.id}/map`} className="flex-1 md:flex-none flex items-center justify-center gap-2 text-xs font-medium tracking-widest border border-gray-200 text-gray-500 py-2.5 bg-white uppercase hover:border-black transition-all whitespace-nowrap px-5">
                      <Globe size={14} /><span className="hidden sm:inline">全程地圖</span>
                    </Link>
                    <button onClick={() => setViewMode(viewMode === "list" ? "map" : "list")} className="flex-1 md:flex-none flex items-center justify-center gap-2 text-xs font-medium tracking-widest border border-gray-200 text-gray-500 py-2.5 bg-white uppercase hover:border-black transition-all whitespace-nowrap px-5">
                      {viewMode === "list" ? <><MapIcon size={14} /><span className="hidden sm:inline">地圖</span></> : <><ListIcon size={14} /><span className="hidden sm:inline">列表</span></>}
                    </button>
                    <button onClick={() => setIsModalOpen(true)} className="hidden md:flex flex-none items-center gap-2 text-xs tracking-widest bg-black text-white px-6 py-2.5 hover:bg-gray-800 transition-colors uppercase font-medium"><Plus size={12} /> 新增活動</button>
                  </div>
                </div>
              </div>

              {/* 今日花費 vs 預算 —— 資料本身一直都有，只是從未在行程頁顯示過 */}
              {trip.budgetTotal > 0 && (() => {
                const todaySpend = currentDay ? sumOnDate(trip, currentDay.date) : 0;
                const tripSpend  = sumLocal(trip.expenses ?? [], trip);
                const usedPct    = Math.min(Math.round((tripSpend / trip.budgetTotal) * 100), 100);
                const over       = tripSpend > trip.budgetTotal;
                return (
                  <div className="mb-6 border-y border-gray-100 py-4 flex flex-wrap items-baseline gap-x-8 gap-y-2">
                    <div>
                      <p className="text-[11px] tracking-[0.2em] uppercase text-gray-500 mb-1">今日花費</p>
                      <p className="text-xl font-serif">
                        {formatMoney(todaySpend, trip.localCurrency)}
                      </p>
                    </div>
                    <div className="flex-1 min-w-[160px]">
                      <div className="flex justify-between text-[11px] tracking-widest uppercase text-gray-500 mb-1.5">
                        <span>全程已用</span>
                        <span className={over ? "text-red-600" : undefined}>
                          {formatMoney(tripSpend, trip.localCurrency)} / {formatMoney(trip.budgetTotal, trip.localCurrency)}　{usedPct}%
                        </span>
                      </div>
                      <div className="h-[3px] bg-gray-100 w-full">
                        <div
                          className={clsx("h-full transition-all duration-500", over ? "bg-red-600" : "bg-black")}
                          style={{ width: `${usedPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="w-full">
                {viewMode === "list" ? (
                  currentDay
                    ? <ItineraryList dayIndex={activeDay} activities={currentDay.activities} tripId={trip.id} onActivityClick={id => setSelectedActivityId(id)} />
                    : <div className="text-center py-20 text-gray-400 text-xs uppercase tracking-widest">今日暫無行程安排</div>
                ) : (
                  <div className="h-[65dvh] w-full border border-gray-200 rounded-3xl overflow-hidden bg-gray-50">
                    <TripMap
                      key={`${trip.id}-${activeDay}`}
                      activities={currentDay?.activities || []}
                      fallbackCenter={getTripCoords(trip.title, trip.destLat, trip.destLng)}
                    />
                  </div>
                )}
              </div>
            </div>

            <AddActivityModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleAddActivity} tripId={trip.id} destLat={trip.destLat} destLng={trip.destLng} />
            {selectedActivityId && <ActivityDetailModal tripId={trip.id} dayIndex={activeDay} activityId={selectedActivityId} onClose={() => setSelectedActivityId(null)} />}
            {isSettingsOpen && <EditTripModal trip={trip} onClose={() => setIsSettingsOpen(false)} />}

            <ConfirmDialog
              isOpen={confirmDeleteDay}
              title={`刪除 Day ${activeDay + 1}`}
              message="此日的所有行程項目將一併刪除，且無法復原。"
              confirmLabel="刪除"
              danger
              onConfirm={() => { deleteDayFromTrip(trip.id, activeDay); setConfirmDeleteDay(false); }}
              onCancel={() => setConfirmDeleteDay(false)}
            />
            <AlertDialog
              isOpen={!!alertMsg}
              message={alertMsg || ""}
              onClose={() => setAlertMsg(null)}
            />
          </div>
        </main>
      </div>
    </>
  );
}
