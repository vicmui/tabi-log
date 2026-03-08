"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import ItineraryList from "@/components/planner/ItineraryList";
import AddActivityModal from "@/components/planner/AddActivityModal";
import ActivityDetailModal from "@/components/planner/ActivityDetailModal";
import TripMap from "@/components/planner/TripMap";
import { useTripStore } from "@/store/useTripStore";
import { ArrowLeft, Plus, MapPin, Clock, Map as MapIcon, List as ListIcon, CalendarX, Camera, Navigation, Share, Globe, Sun, Cloud, CloudSun, CloudRain, Snowflake, Edit, ImagePlus } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import clsx from "clsx";
import EditTripModal from "@/components/dashboard/EditTripModal";
import { supabase } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import { format, parseISO, differenceInDays } from "date-fns";
import { RepositionPanel } from "@/components/ui/RepositionPanel";

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

export default function PlannerPage() {
  const params = useParams();
  const { trips, _hasHydrated, addActivity, addDayToTrip, deleteDayFromTrip, updateDayCoverImage, updateDayLocation } = useTripStore();

  const [activeDay, setActiveDay]               = useState(0);
  const [isModalOpen, setIsModalOpen]           = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen]     = useState(false);
  const [viewMode, setViewMode]                 = useState<"list" | "map">("list");
  const [weatherMap, setWeatherMap]             = useState<Record<string, { temp: string; code: number }>>({});

  // Cover position: key = `${tripId}-${dayIndex}`, value = Y% (0-100)
  const [positionMap, setPositionMap]           = useState<Record<string, number>>({});
  const [repositioning, setRepositioning]       = useState(false);

  const trip = trips.find((t) => t.id === params.id);

  // Load saved positions
  useEffect(() => {
    if (!trip) return;
    try { const raw = localStorage.getItem(`coverPos-${trip.id}`); if (raw) setPositionMap(JSON.parse(raw)); } catch (_) {}
  }, [trip?.id]);

  const savePosMap = (map: Record<string, number>, tripId: string) => {
    setPositionMap(map);
    try { localStorage.setItem(`coverPos-${tripId}`, JSON.stringify(map)); } catch (_) {}
  };

  const getCoverPos = (tId: string, dIdx: number) => positionMap[`${tId}-${dIdx}`] ?? 50;

  useEffect(() => { if (trip && activeDay >= trip.dailyItinerary.length) setActiveDay(Math.max(0, trip.dailyItinerary.length - 1)); }, [trip, activeDay]);

  // Close reposition when switching day
  useEffect(() => { setRepositioning(false); }, [activeDay]);

  // Weather fetch
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

  if (!_hasHydrated) return <div className="p-10 text-center animate-pulse text-gray-400 text-xs tracking-widest">載入中...</div>;
  if (!trip) return <div className="p-10 text-center text-gray-400 text-xs tracking-widest">找不到旅程</div>;

  const currentDay = trip.dailyItinerary[activeDay];
  const coverSrc   = currentDay?.coverImage || trip.coverImage || "";
  const coverPosY  = getCoverPos(trip.id, activeDay);
  const displayLocation = currentDay?.customLocation
    || (currentDay?.activities?.length > 0 ? currentDay.activities[0].location.split(" ")[0] : "自由探索");

  const handleEditLocation = () => {
    const v = prompt("修改當日地點名稱:", displayLocation);
    if (v) updateDayLocation(trip.id, activeDay, v);
  };
  const handleAddActivity = (data: any) => { addActivity(trip.id, activeDay, data); setIsModalOpen(false); };
  const handleDeleteDay = () => {
    if (trip.dailyItinerary.length <= 1) { alert("最少保留一天！"); return; }
    if (confirm(`確定要刪除 Day ${activeDay + 1} 嗎？`)) deleteDayFromTrip(trip.id, activeDay);
  };
  const handleShare = async () => {
    const url = `${window.location.origin}/share/${trip.id}`;
    if (navigator.share) { try { await navigator.share({ title: trip.title, text: `查看我的行程：${trip.title}`, url }); return; } catch (_) {} }
    window.open(`https://wa.me/?text=${encodeURIComponent(trip.title + "\n" + url)}`, "_blank");
  };
  const handleOpenDayRoute = () => {
    if (!currentDay || currentDay.activities.length < 2) { alert("請至少安排兩個地點"); return; }
    const acts = currentDay.activities.filter(a => a && (a.address || a.location));
    const origin = acts[0].lat ? `${acts[0].lat},${acts[0].lng}` : encodeURIComponent(acts[0].address || acts[0].location);
    const dest   = acts[acts.length-1].lat ? `${acts[acts.length-1].lat},${acts[acts.length-1].lng}` : encodeURIComponent(acts[acts.length-1].address || acts[acts.length-1].location);
    const wp     = acts.slice(1,-1).map(a => a.lat ? `${a.lat},${a.lng}` : encodeURIComponent(a.address || a.location)).join("|");
    window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&waypoints=${wp}&travelmode=transit`, "_blank");
  };

  // Upload → save to store → auto open reposition
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const filePath = `public/${trip.id}/day-covers/${activeDay}-${uuidv4()}`;
    const { error } = await supabase.storage.from("trip_files").upload(filePath, file);
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from("trip_files").getPublicUrl(filePath);
      updateDayCoverImage(trip.id, activeDay, publicUrl);
      // Reset to centre, open reposition panel
      savePosMap({ ...positionMap, [`${trip.id}-${activeDay}`]: 50 }, trip.id);
      setRepositioning(true);
    }
    e.target.value = "";
  };

  const WeatherIcon = ({ code }: { code?: number }) => {
    if (!code) return <Cloud size={12} className="text-gray-400" />;
    if (code <= 1) return <Sun size={12} className="text-gray-500" />;
    if (code <= 3) return <CloudSun size={12} className="text-gray-500" />;
    if (code >= 51 && code <= 67) return <CloudRain size={12} className="text-gray-500" />;
    if (code >= 71) return <Snowflake size={12} className="text-gray-500" />;
    return <Cloud size={12} className="text-gray-400" />;
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-white font-sans text-[#333333] overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col md:flex-row h-full ml-0 md:ml-64 relative overflow-hidden">

        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-100 bg-white shrink-0 z-40">
          <Link href="/" className="p-1"><ArrowLeft size={22} className="text-gray-400" /></Link>
          <h1 className="font-bold text-sm tracking-widest uppercase truncate flex-1 text-center px-4">{trip.title}</h1>
          <button onClick={() => setIsModalOpen(true)} className="bg-black text-white p-2 shadow-sm active:scale-95 transition-transform"><Plus size={20} /></button>
        </div>

        {/* Desktop Day Sidebar */}
        <div className="hidden md:flex w-72 border-r border-gray-100 bg-white h-full overflow-y-auto flex-col shrink-0 z-20 pt-10">
          <div className="px-8 pb-8 border-b border-gray-50 sticky top-0 bg-white z-10">
            <Link href="/" className="flex items-center gap-2 text-[10px] text-gray-300 hover:text-black mb-6 transition-colors tracking-widest uppercase font-medium"><ArrowLeft size={10} /> BACK</Link>
            <div className="cursor-pointer" onClick={() => setIsSettingsOpen(true)}>
              <h2 className="text-lg font-bold leading-snug mb-1 text-black tracking-tight">{trip.title}</h2>
              <p className="text-[9px] text-gray-400 tracking-[0.2em] uppercase">{trip.startDate}</p>
            </div>
          </div>
          <div className="flex-1 py-4">
            {trip.dailyItinerary.map((dayItem, index) => {
              const info = weatherMap[dayItem.date];
              return (
                <button key={dayItem.day} onClick={() => setActiveDay(index)}
                  className={`w-full text-left py-6 px-8 transition-all duration-300 relative border-b border-gray-50 last:border-0 ${activeDay === index ? "bg-gray-50" : "hover:bg-gray-50"}`}>
                  <div className="flex justify-between items-center">
                    <span className={clsx("text-xs tracking-[0.15em] uppercase", activeDay === index ? "font-semibold text-black" : "font-light text-gray-400")}>Day {dayItem.day}</span>
                    <span className="text-[9px] text-gray-400 font-medium uppercase">{format(parseISO(dayItem.date), "EEE")}</span>
                  </div>
                  <div className="text-[9px] mt-1 text-gray-500 font-light">{dayItem.date}</div>
                  <div className="mt-2 flex items-center gap-2 text-[9px] text-gray-400">
                    <WeatherIcon code={info?.code} />
                    <span>{info?.temp ?? "15/25"}</span>
                  </div>
                  {activeDay === index && <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-black" />}
                </button>
              );
            })}
            <button onClick={() => addDayToTrip(trip.id)} className="w-full py-6 text-[10px] text-gray-300 hover:text-black flex items-center justify-center gap-2 uppercase tracking-[0.2em] transition-colors"><Plus size={12} /> Add Day</button>
          </div>
        </div>

        {/* Mobile Day Picker */}
        <div className="md:hidden w-full bg-white border-b border-gray-100 z-30 shrink-0 shadow-sm">
          <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar py-4 px-4 gap-3 items-center">
            {trip.dailyItinerary.map((dayItem, index) => {
              const info = weatherMap[dayItem.date];
              return (
                <button key={dayItem.day} onClick={() => setActiveDay(index)}
                  className={clsx("flex-shrink-0 snap-center flex flex-col items-center justify-center w-20 h-24 border transition-all duration-300",
                    activeDay === index ? "bg-black text-white border-black shadow-lg scale-105" : "bg-white text-gray-400 border-gray-100")}>
                  <span className="text-[9px] font-bold uppercase tracking-widest">{format(parseISO(dayItem.date), "EEE")}</span>
                  <span className="text-xl font-bold leading-none my-1">{format(parseISO(dayItem.date), "d")}</span>
                  <div className="flex flex-col items-center gap-1 border-t border-current/10 pt-2 w-full mt-1">
                    <WeatherIcon code={info?.code} />
                    <span className="text-[8px] font-bold">{info?.temp ?? "15/25"}</span>
                  </div>
                </button>
              );
            })}
            <button onClick={() => addDayToTrip(trip.id)} className="flex-shrink-0 flex items-center justify-center w-12 h-24 border border-dashed border-gray-200 text-gray-300 snap-center"><Plus size={20} /></button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 relative overflow-y-auto bg-white scroll-smooth h-full no-scrollbar pb-32">

          {/* ── Cover image area ── */}
          <div className="relative w-full shrink-0">

            {/* Reposition panel — fullscreen on mobile, inline on desktop */}
            {repositioning && coverSrc && (
              <>
                {/* Mobile: fullscreen overlay */}
                <div className="fixed inset-0 z-[300] md:hidden">
                  <RepositionPanel
                    src={coverSrc}
                    initialY={coverPosY}
                    onConfirm={y => { savePosMap({ ...positionMap, [`${trip.id}-${activeDay}`]: y }, trip.id); setRepositioning(false); }}
                    onCancel={() => setRepositioning(false)}
                  />
                </div>
                {/* Desktop: inline above the cover image */}
                <div className="hidden md:block">
                  <RepositionPanel
                    compact
                    src={coverSrc}
                    initialY={coverPosY}
                    onConfirm={y => { savePosMap({ ...positionMap, [`${trip.id}-${activeDay}`]: y }, trip.id); setRepositioning(false); }}
                    onCancel={() => setRepositioning(false)}
                  />
                </div>
              </>
            )}

            {/* Actual cover */}
            {!repositioning && (
              <div className="h-44 md:h-80 relative w-full group">
                {coverSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverSrc} alt="Cover" className="w-full h-full object-cover"
                    style={{ objectPosition: `center ${coverPosY}%` }} />
                ) : (
                  <label className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center gap-3 cursor-pointer hover:from-gray-200 hover:to-gray-300 transition-colors">
                    <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                    <div className="w-14 h-14 rounded-full bg-white/60 flex items-center justify-center shadow-sm">
                      <ImagePlus size={26} className="text-gray-400" />
                    </div>
                    <div className="text-center px-4">
                      <p className="text-sm font-bold text-gray-500 tracking-widest uppercase">點擊上傳封面相片</p>
                      <p className="text-xs text-gray-400 mt-1.5">建議 <span className="font-bold text-gray-600">2400 × 800px</span>，橫向構圖，JPG / PNG</p>
                      <p className="text-[11px] text-gray-300 mt-1">上傳後可用滑桿調整焦點位置</p>
                    </div>
                  </label>
                )}

                {/* Text overlay */}
                {coverSrc && (
                  <div className="absolute bottom-0 left-0 right-0 px-6 md:px-16 pb-6 pt-20 pointer-events-none">
                    <div className="pointer-events-auto">
                      <h3 className="text-4xl md:text-7xl font-bold tracking-tight uppercase leading-none text-black drop-shadow-[0_2px_15px_rgba(255,255,255,0.8)]">Day {activeDay + 1}</h3>
                      <button onClick={handleEditLocation} className="flex items-center gap-3 text-[10px] text-gray-600 tracking-[0.3em] uppercase font-bold mt-2 bg-white/90 backdrop-blur-sm w-fit px-3 py-1 rounded-full shadow-md hover:bg-white transition-all">
                        <MapPin size={10} /><span>{displayLocation}</span><Edit size={8} className="opacity-50" />
                        <span className="w-px h-3 bg-gray-300" /><Clock size={10} /><span>{currentDay?.date}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Hover controls */}
                {coverSrc && (
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button onClick={() => setRepositioning(true)}
                      className="flex items-center gap-1.5 bg-white/85 hover:bg-white text-black text-[10px] font-bold uppercase tracking-widest px-3 py-2 backdrop-blur-sm shadow-sm transition-all">
                      調整位置
                    </button>
                    <label className="flex items-center gap-1.5 bg-white/85 hover:bg-white text-black text-[10px] font-bold uppercase tracking-widest px-3 py-2 backdrop-blur-sm shadow-sm cursor-pointer transition-all"
                      title="建議：2400×800px · 橫向 · JPG/PNG">
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
                  <span className="text-[11px] font-bold tracking-[0.2em] text-black uppercase">行程規劃</span>
                  <button onClick={handleDeleteDay} className="text-gray-300 hover:text-red-400 p-1"><CalendarX size={16} /></button>
                </div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto hide-scrollbar pb-1">
                  <button onClick={handleShare} className="flex-1 md:flex-none flex items-center justify-center gap-2 text-[10px] font-bold tracking-widest border border-gray-200 text-gray-500 py-2.5 bg-white uppercase hover:border-black transition-all whitespace-nowrap px-5"><Share size={14} /><span className="hidden sm:inline">分享</span></button>
                  <button onClick={handleOpenDayRoute} className="flex-1 md:flex-none flex items-center justify-center gap-2 text-[10px] font-bold tracking-widest border border-gray-200 text-gray-500 py-2.5 bg-white uppercase hover:border-black transition-all whitespace-nowrap px-5"><Navigation size={14} /><span className="hidden sm:inline">路線</span></button>
                  <Link href={`/planner/${trip.id}/map`} className="flex-1 md:flex-none flex items-center justify-center gap-2 text-[10px] font-bold tracking-widest border border-gray-200 text-gray-500 py-2.5 bg-white uppercase hover:border-black transition-all whitespace-nowrap px-5">
                    <Globe size={14} /><span className="hidden sm:inline">全程地圖</span>
                  </Link>
                  <button onClick={() => setViewMode(viewMode === "list" ? "map" : "list")} className="flex-1 md:flex-none flex items-center justify-center gap-2 text-[10px] font-bold tracking-widest border border-gray-200 text-gray-500 py-2.5 bg-white uppercase hover:border-black transition-all whitespace-nowrap px-5">
                    {viewMode === "list" ? <><MapIcon size={14} /><span className="hidden sm:inline">地圖</span></> : <><ListIcon size={14} /><span className="hidden sm:inline">列表</span></>}
                  </button>
                  <button onClick={() => setIsModalOpen(true)} className="hidden md:flex flex-none items-center gap-2 text-[10px] tracking-widest bg-black text-white px-6 py-2.5 hover:bg-gray-800 transition-colors shadow-lg uppercase font-bold"><Plus size={12} /> 新增活動</button>
                </div>
              </div>
            </div>

            <div className="w-full">
              {viewMode === "list" ? (
                currentDay
                  ? <ItineraryList dayIndex={activeDay} activities={currentDay.activities} tripId={trip.id} onActivityClick={(id) => setSelectedActivityId(id)} />
                  : <div className="text-center py-20 text-gray-300 text-[10px] uppercase tracking-widest">今日暫無行程安排</div>
              ) : (
                <div className="h-[65dvh] w-full border border-gray-200 rounded-3xl overflow-hidden shadow-sm bg-gray-50">
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
        </div>
      </main>
    </div>
  );
}
