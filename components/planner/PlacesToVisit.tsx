"use client";
import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useTripStore, Trip } from "@/store/useTripStore";
import { CheckCircle2, Circle, Trash2, GripVertical, Plus, Sparkles, Loader2, MapPin, CalendarPlus, Clock, Check, X } from "lucide-react";
import clsx from "clsx";
import { ConfirmDialog } from "@/components/ui/Dialog";
import PlacesSearch, { PlaceResult, googleMapsLink } from "@/components/ui/PlacesSearch";
import { format, parseISO } from "date-fns";

// ✅ Aligned with Planner activity types (Food/Sightseeing/Shopping/Transport/Hotel/Other)
const CATEGORY_STYLES: Record<string, string> = {
  美食: "bg-orange-50 text-orange-600 border-orange-200",
  景點: "bg-blue-50 text-blue-600 border-blue-200",
  購物: "bg-pink-50 text-pink-600 border-pink-200",
  交通: "bg-green-50 text-green-600 border-green-200",
  住宿: "bg-purple-50 text-purple-600 border-purple-200",
  其他: "bg-gray-50 text-gray-500 border-gray-200",
};

// Same order as Planner type selector
const CATEGORIES  = ["景點", "美食", "購物", "交通", "住宿", "其他"];
const FILTER_TABS = ["全部", ...CATEGORIES];

// 1:1 mapping to Planner activity type keys
const CAT_TO_TYPE: Record<string, string> = {
  美食: "Food",
  景點: "Sightseeing",
  購物: "Shopping",
  交通: "Transport",
  住宿: "Hotel",
  其他: "Other",
};

// ── Inline "加入行程" panel ──────────────────────────────────────────────────
function AddToDayPanel({
  place, trip, onClose,
}: {
  place: any; trip: Trip; onClose: () => void;
}) {
  const { addActivity } = useTripStore();
  const [selectedDayIdx, setSelectedDayIdx] = useState<number | null>(null);
  const [time, setTime] = useState("");
  const [done, setDone] = useState(false);

  const handleAdd = () => {
    if (selectedDayIdx === null) return;
    addActivity(trip.id, selectedDayIdx, {
      type:      CAT_TO_TYPE[place.category] || "Other",
      time:      time || undefined,
      location:  place.name,
      address:   place.address || "",
      note:      place.note || "",
      lat:       place.lat,
      lng:       place.lng,
      isVisited: false,
    });
    setDone(true);
    setTimeout(() => { onClose(); }, 900);
  };

  return (
    <div className="mt-2 mb-1 bg-gray-50 border border-gray-200 p-3 space-y-3">
      {done ? (
        <p className="text-[11px] text-green-600 font-bold tracking-widest flex items-center gap-1.5">
          <Check size={12} /> 已加入行程！
        </p>
      ) : (
        <>
          {/* Day picker */}
          <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-widest mb-1.5">選擇日期</p>
            <div className="flex flex-wrap gap-1.5">
              {trip.dailyItinerary.map((day, idx) => (
                <button
                  key={day.day}
                  onClick={() => setSelectedDayIdx(idx)}
                  className={clsx(
                    "px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest border transition-all",
                    selectedDayIdx === idx
                      ? "bg-black text-white border-black"
                      : "border-gray-200 text-gray-500 hover:border-black hover:text-black"
                  )}
                >
                  Day {day.day}
                  <span className="ml-1 font-normal opacity-60 normal-case">
                    {format(parseISO(day.date), "M/d")}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Time picker */}
          {selectedDayIdx !== null && (
            <div className="flex items-center gap-2">
              <Clock size={11} className="text-gray-500 shrink-0" />
              <div className="flex-1">
                <label className="text-[11px] text-gray-500 uppercase tracking-widest block mb-0.5">
                  時間 <span className="normal-case text-gray-400">（選填）</span>
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full bg-transparent text-sm border-b border-gray-200 focus:border-black focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-200 text-gray-500 hover:border-gray-400 transition-colors"
            >
              <X size={10} /> 取消
            </button>
            <button
              onClick={handleAdd}
              disabled={selectedDayIdx === null}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold uppercase tracking-widest bg-black text-white hover:bg-gray-800 disabled:opacity-30 transition-colors"
            >
              <CalendarPlus size={11} /> 加入行程
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function PlacesToVisit({ trip }: { trip: Trip }) {
  const { addPlaceToVisit, togglePlaceVisited, deletePlaceToVisit, reorderPlacesToVisit } = useTripStore();

  const [newName, setNewName]         = useState("");
  const [newAddress, setNewAddress]   = useState("");
  const [newLat, setNewLat]           = useState<number | undefined>();
  const [newLng, setNewLng]           = useState<number | undefined>();
  const [newPlaceId, setNewPlaceId]   = useState<string | undefined>();
  const [newMapsUri, setNewMapsUri]   = useState<string | undefined>();
  const [newCategory, setNewCategory] = useState("景點");
  const [filter, setFilter]           = useState("全部");
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError]         = useState("");
  const [aiDone, setAiDone]           = useState(false);
  const [deletingPlaceId, setDeletingPlaceId] = useState<string | null>(null);
  // Which place has the add-to-day panel open
  const [expandedPlaceId, setExpandedPlaceId] = useState<string | null>(null);

  const places   = trip.placesToVisit || [];
  const visited  = places.filter(p => p.isVisited).length;
  const filtered = filter === "全部" ? places : places.filter(p => p.category === filter);

  const handlePlaceSelect = (result: PlaceResult) => {
    setNewName(result.name);
    setNewAddress(result.label);
    if (result.lat && result.lng) { setNewLat(result.lat); setNewLng(result.lng); }
    setNewPlaceId(result.placeId);
    setNewMapsUri(result.googleMapsUri);
  };

  const handleAdd = () => {
    if (!newName.trim()) return;
    addPlaceToVisit(trip.id, {
      name: newName.trim(), address: newAddress || undefined,
      lat: newLat, lng: newLng, category: newCategory,
      placeId: newPlaceId, googleMapsUri: newMapsUri,
      isVisited: false, suggestedBy: "user",
    });
    setNewName(""); setNewAddress(""); setNewLat(undefined); setNewLng(undefined);
    setNewPlaceId(undefined); setNewMapsUri(undefined);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const allIds      = places.map(p => p.id);
    const filteredIds = filtered.map(p => p.id);
    const movedIdx    = allIds.indexOf(filteredIds[result.source.index]);
    const targetIdx   = allIds.indexOf(filteredIds[result.destination.index]);
    const reordered   = Array.from(places);
    const [moved]     = reordered.splice(movedIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    reorderPlacesToVisit(trip.id, reordered.map((p, i) => ({ ...p, order: i })));
  };

  const handleAISuggest = async () => {
    setIsLoadingAI(true); setAiError(""); setAiDone(false);
    try {
      const res  = await fetch("/api/suggest-places", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination: trip.title, tripDays: trip.dailyItinerary.length }),
      });
      const data = await res.json();
      if (data.suggestions?.length > 0) {
        const existing = places.map(p => p.name.toLowerCase());
        data.suggestions.forEach((s: { name: string; category?: string; note?: string }) => {
          if (!existing.includes(s.name.toLowerCase()))
            addPlaceToVisit(trip.id, { name: s.name, category: s.category || "景點", note: s.note, isVisited: false, suggestedBy: "ai" });
        });
        setFilter("全部"); setAiDone(true);
        setTimeout(() => setAiDone(false), 3000);
      } else {
        setAiError(data.error || "未能獲取建議，請檢查 GEMINI_API_KEY 是否已設定");
      }
    } catch (_) { setAiError("AI建議失敗，請稍後重試"); }
    finally { setIsLoadingAI(false); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 tracking-widest uppercase mb-1.5">{visited} / {places.length} 已打卡</p>
          <div className="h-[2px] w-40 bg-gray-100 overflow-hidden">
            <div className="h-full bg-black transition-all duration-500"
              style={{ width: places.length > 0 ? `${(visited / places.length) * 100}%` : "0%" }} />
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button onClick={handleAISuggest} disabled={isLoadingAI}
            className="flex items-center gap-2 border border-black bg-black text-white px-4 py-2.5 text-xs font-bold tracking-widest uppercase hover:opacity-80 transition-opacity disabled:opacity-50">
            {isLoadingAI ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {isLoadingAI ? "AI 生成中..." : "AI 建議景點"}
          </button>
          {aiDone  && <p className="text-[11px] text-green-500 tracking-widest">✓ 已加入建議景點</p>}
          {aiError && <p className="text-[11px] text-red-400 tracking-widest">{aiError}</p>}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTER_TABS.map(cat => {
          const count = cat === "全部" ? places.length : places.filter(p => p.category === cat).length;
          return (
            <button key={cat} onClick={() => setFilter(cat)}
              className={clsx("text-[11px] font-bold px-2.5 py-1 border tracking-widest uppercase transition-colors",
                filter === cat ? "bg-black text-white border-black" : "border-gray-200 text-gray-500 hover:border-black hover:text-black")}>
              {cat}{count > 0 && <span className="ml-1 opacity-60">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Add form */}
      <div className="border border-dashed border-gray-200 bg-gray-50 overflow-hidden">
        <div className="p-4 flex flex-col gap-3">
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder="景點名稱（必填）"
            className="w-full border-b border-gray-300 py-2 text-sm bg-transparent focus:outline-none focus:border-black" />
          <PlacesSearch placeholder="搜尋地點自動填入座標..." onSelect={handlePlaceSelect}
            locationBias={trip.destLat && trip.destLng ? { lat: trip.destLat, lng: trip.destLng } : undefined} />
          <div className="flex gap-2 items-center">
            <select value={newCategory} onChange={e => setNewCategory(e.target.value)}
              className="border border-gray-200 py-2 px-2 text-xs bg-white focus:outline-none focus:border-black flex-1">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={handleAdd} disabled={!newName.trim()}
              className="flex items-center gap-1 bg-black text-white px-5 py-2 text-xs font-bold tracking-widest uppercase hover:opacity-80 disabled:opacity-30 transition-opacity flex-shrink-0">
              <Plus size={12} /> 新增
            </button>
          </div>
        </div>
        {newAddress && (
          <div className="px-4 pb-3 pt-2 flex items-center gap-1.5 border-t border-dashed border-gray-200">
            <MapPin size={10} className="text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-500 truncate">{newAddress}</span>
            {newLat && newLng && <span className="text-xs text-green-500 font-bold ml-auto shrink-0">座標鎖定</span>}
          </div>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <MapPin size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-xs tracking-widest uppercase">
            {places.length === 0 ? '按「AI 建議景點」或自行搜尋新增' : "此類別暫無景點"}
          </p>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="places-list">
            {provided => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1">
                {filtered.map((place, index) => (
                  <Draggable key={place.id} draggableId={place.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={clsx(
                          "bg-white border transition-all",
                          snapshot.isDragging ? "border-black shadow-lg" : "border-gray-100 hover:border-gray-200",
                          place.isVisited && "opacity-50"
                        )}
                      >
                        {/* Main row */}
                        <div className="flex items-center gap-2 p-3">
                          <div {...provided.dragHandleProps}
                            className="text-gray-200 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0">
                            <GripVertical size={16} />
                          </div>

                          <button onClick={() => togglePlaceVisited(trip.id, place.id)} className="flex-shrink-0">
                            {place.isVisited
                              ? <CheckCircle2 size={20} className="text-black" />
                              : <Circle size={20} className="text-gray-400 hover:text-black transition-colors" />
                            }
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={clsx("font-bold text-sm", place.isVisited && "line-through text-gray-500")}>
                                {place.name}
                              </span>
                              {place.suggestedBy === "ai" && (
                                <span className="text-[11px] text-gray-400 tracking-widest border border-gray-200 px-1 py-0.5 uppercase">AI</span>
                              )}
                              {place.category && (
                                <span className={clsx("text-[11px] font-bold px-1.5 py-0.5 border uppercase tracking-wider",
                                  CATEGORY_STYLES[place.category] || "bg-gray-50 text-gray-500 border-gray-200")}>
                                  {place.category}
                                </span>
                              )}
                            </div>
                            {(place.address || place.note) && (
                              <div className="flex items-start gap-1 mt-0.5 min-w-0">
                                <MapPin size={11} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                <span className="text-xs text-gray-500 leading-tight truncate">{place.address || place.note}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* ✅ Add-to-day button */}
                            <button
                              onClick={() => setExpandedPlaceId(expandedPlaceId === place.id ? null : place.id)}
                              className={clsx(
                                "flex items-center gap-1 px-2.5 py-1 text-xs font-bold tracking-widest uppercase border transition-colors whitespace-nowrap",
                                expandedPlaceId === place.id
                                  ? "bg-black text-white border-black"
                                  : "border-gray-200 text-gray-500 hover:border-black hover:text-black"
                              )}
                            >
                              <CalendarPlus size={10} />
                              <span className="hidden sm:inline">加入行程</span>
                            </button>

                            {/* Navigate */}
                            <a
                              href={place.googleMapsUri ?? googleMapsLink({ placeId: place.placeId, name: place.name, address: place.address })}
                              target="_blank" rel="noreferrer"
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold tracking-widest uppercase border border-blue-200 text-blue-500 bg-blue-50 hover:bg-blue-100 transition-colors whitespace-nowrap"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                              </svg>
                              <span className="hidden sm:inline">導航</span>
                            </a>

                            <button onClick={() => setDeletingPlaceId(place.id)}
                              className="p-1.5 text-gray-200 hover:text-red-400 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* ✅ Inline add-to-day panel */}
                        {expandedPlaceId === place.id && (
                          <div className="px-3 pb-3">
                            <AddToDayPanel
                              place={place}
                              trip={trip}
                              onClose={() => setExpandedPlaceId(null)}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      <ConfirmDialog
        isOpen={!!deletingPlaceId}
        title="刪除景點" message="確定要刪除這個景點嗎？"
        confirmLabel="刪除" cancelLabel="取消" danger
        onConfirm={() => { if (deletingPlaceId) deletePlaceToVisit(trip.id, deletingPlaceId); setDeletingPlaceId(null); }}
        onCancel={() => setDeletingPlaceId(null)}
      />
    </div>
  );
}
