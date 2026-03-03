"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useTripStore, PlaceToVisit, Trip } from "@/store/useTripStore";
import { CheckCircle2, Circle, Trash2, GripVertical, Plus, Sparkles, Loader2, MapPin, Search } from "lucide-react";
import clsx from "clsx";

const CATEGORY_STYLES: Record<string, string> = {
  美食: "bg-orange-50 text-orange-600 border-orange-200",
  景點: "bg-blue-50 text-blue-600 border-blue-200",
  購物: "bg-pink-50 text-pink-600 border-pink-200",
  自然: "bg-green-50 text-green-600 border-green-200",
  文化: "bg-purple-50 text-purple-600 border-purple-200",
  夜生活: "bg-indigo-50 text-indigo-600 border-indigo-200",
};

const CATEGORIES = ["景點", "美食", "購物", "自然", "文化", "夜生活"];
const FILTER_TABS = ["全部", ...CATEGORIES];

export default function PlacesToVisit({ trip }: { trip: Trip }) {
  const { addPlaceToVisit, togglePlaceVisited, deletePlaceToVisit, reorderPlacesToVisit } = useTripStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newLat, setNewLat] = useState<number | undefined>();
  const [newLng, setNewLng] = useState<number | undefined>();
  const [newCategory, setNewCategory] = useState("景點");
  const [filter, setFilter] = useState("全部");
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiDone, setAiDone] = useState(false);

  // Init Google Places Autocomplete
  useEffect(() => {
    const tryInit = () => {
      if (!inputRef.current) return false;
      if (typeof window === "undefined") return false;
      if (!window.google?.maps?.places?.Autocomplete) return false;
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ["establishment", "geocode"],
        fields: ["name", "formatted_address", "geometry"],
      });
      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current.getPlace();
        if (place?.name) {
          setNewName(place.name);
          setNewAddress(place.formatted_address || "");
          setNewLat(place.geometry?.location?.lat());
          setNewLng(place.geometry?.location?.lng());
          if (inputRef.current) inputRef.current.value = place.name;
        }
      });
      return true;
    };
    if (!tryInit()) {
      const interval = setInterval(() => { if (tryInit()) clearInterval(interval); }, 500);
      return () => clearInterval(interval);
    }
  }, []);

  const places = trip.placesToVisit || [];
  const visited = places.filter((p) => p.isVisited).length;
  const filtered = filter === "全部" ? places : places.filter((p) => p.category === filter);

  const handleAdd = () => {
    const name = newName.trim() || (inputRef.current?.value?.trim() ?? "");
    if (!name) return;
    addPlaceToVisit(trip.id, {
      name,
      address: newAddress || undefined,
      lat: newLat,
      lng: newLng,
      category: newCategory,
      isVisited: false,
      suggestedBy: "user",
    });
    setNewName("");
    setNewAddress("");
    setNewLat(undefined);
    setNewLng(undefined);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const allIds = places.map((p) => p.id);
    const filteredIds = filtered.map((p) => p.id);
    const movedId = filteredIds[result.source.index];
    const targetId = filteredIds[result.destination.index];
    const movedIdx = allIds.indexOf(movedId);
    const targetIdx = allIds.indexOf(targetId);
    const reordered = Array.from(places);
    const [moved] = reordered.splice(movedIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    reorderPlacesToVisit(trip.id, reordered.map((p, i) => ({ ...p, order: i })));
  };

  const handleAISuggest = async () => {
    setIsLoadingAI(true);
    setAiError("");
    setAiDone(false);
    try {
      const res = await fetch("/api/suggest-places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination: trip.title, tripDays: trip.dailyItinerary.length }),
      });
      const data = await res.json();
      if (data.suggestions && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        const existingNames = places.map((p) => p.name.toLowerCase());
        data.suggestions.forEach((s: { name: string; category?: string; note?: string }) => {
          if (!existingNames.includes(s.name.toLowerCase())) {
            addPlaceToVisit(trip.id, { name: s.name, category: s.category || "景點", note: s.note, isVisited: false, suggestedBy: "ai" });
          }
        });
        setFilter("全部"); // reset filter so results are always visible
        setAiDone(true);
        setTimeout(() => setAiDone(false), 3000);
      } else {
        setAiError(data.error || "未能獲取建議，請檢查 GEMINI_API_KEY 是否已在 Vercel 設定");
      }
    } catch (_e) {
      setAiError("AI建議失敗，請稍後重試");
    } finally {
      setIsLoadingAI(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 tracking-widest uppercase mb-1.5">{visited} / {places.length} 已打卡</p>
          <div className="h-[2px] w-40 bg-gray-100 overflow-hidden">
            <div className="h-full bg-black transition-all duration-500" style={{ width: places.length > 0 ? (visited / places.length) * 100 + "%" : "0%" }} />
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button onClick={handleAISuggest} disabled={isLoadingAI} className="flex items-center gap-2 border border-black bg-black text-white px-4 py-2.5 text-[10px] font-bold tracking-widest uppercase hover:opacity-80 transition-opacity disabled:opacity-50">
            {isLoadingAI ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {isLoadingAI ? "AI 生成中..." : "AI 建議景點"}
          </button>
          {aiDone && <p className="text-[9px] text-green-500 tracking-widest">✓ 已加入建議景點</p>}
          {aiError && <p className="text-[9px] text-red-400 tracking-widest">{aiError}</p>}
        </div>
      </div>

      {/* Filter tabs with counts */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTER_TABS.map((cat) => {
          const count = cat === "全部" ? places.length : places.filter((p) => p.category === cat).length;
          return (
            <button key={cat} onClick={() => setFilter(cat)} className={clsx("text-[9px] font-bold px-2.5 py-1 border tracking-widest uppercase transition-colors", filter === cat ? "bg-black text-white border-black" : "border-gray-200 text-gray-400 hover:border-black hover:text-black")}>
              {cat}{count > 0 && <span className="ml-1 opacity-60">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Add form — Google Places search */}
      <div className="border border-dashed border-gray-200 bg-gray-50 overflow-hidden">
        <div className="p-4 flex gap-2 items-center">
          <div className="relative flex-1">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
            <input
              ref={inputRef}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="搜尋景點、餐廳、商場..."
              className="w-full border-b border-gray-300 py-1.5 pl-6 text-sm bg-transparent focus:outline-none focus:border-black"
            />
          </div>
          <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="border-b border-gray-300 py-1.5 text-xs bg-transparent focus:outline-none focus:border-black pr-2 flex-shrink-0">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={handleAdd} disabled={!newName.trim() && !inputRef.current?.value?.trim()} className="flex items-center gap-1 bg-black text-white px-4 py-2 text-[10px] font-bold tracking-widest uppercase hover:opacity-80 disabled:opacity-30 transition-opacity flex-shrink-0">
            <Plus size={12} /> 新增
          </button>
        </div>
        {newAddress && (
          <div className="px-4 pb-3 pt-0 flex items-center gap-1.5 border-t border-dashed border-gray-200 pt-2">
            <MapPin size={10} className="text-gray-300 flex-shrink-0" />
            <span className="text-[10px] text-gray-400 truncate">{newAddress}</span>
          </div>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-300">
          <MapPin size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-xs tracking-widest uppercase">{places.length === 0 ? '按「AI 建議景點」或自行搜尋新增' : "此類別暫無景點"}</p>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="places-list">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                {filtered.map((place, index) => (
                  <Draggable key={place.id} draggableId={place.id} index={index}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.draggableProps} className={clsx("flex items-center gap-3 p-4 bg-white border transition-all", snapshot.isDragging ? "border-black shadow-lg" : "border-gray-100 hover:border-gray-200", place.isVisited && "opacity-50")}>
                        <div {...provided.dragHandleProps} className="text-gray-200 hover:text-gray-400 cursor-grab active:cursor-grabbing flex-shrink-0">
                          <GripVertical size={16} />
                        </div>
                        <button onClick={() => togglePlaceVisited(trip.id, place.id)} className="flex-shrink-0">
                          {place.isVisited ? <CheckCircle2 size={20} className="text-black" /> : <Circle size={20} className="text-gray-300 hover:text-black transition-colors" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={clsx("font-bold text-sm", place.isVisited && "line-through text-gray-400")}>{place.name}</span>
                            {place.suggestedBy === "ai" && <span className="text-[8px] text-gray-300 tracking-widest border border-gray-200 px-1 py-0.5 uppercase">AI</span>}
                            {place.category && (
                              <span className={clsx("text-[9px] font-bold px-1.5 py-0.5 border uppercase tracking-wider", CATEGORY_STYLES[place.category] || "bg-gray-50 text-gray-400 border-gray-200")}>
                                {place.category}
                              </span>
                            )}
                          </div>
                          {(place.address || place.note) && (
                            <div className="flex items-start gap-1 mt-0.5">
                              <MapPin size={9} className="text-gray-300 mt-0.5 flex-shrink-0" />
                              <span className="text-[10px] text-gray-400 leading-tight truncate">{place.address || place.note}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <a
                            href={"https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent((place.lat && place.lng) ? place.lat + "," + place.lng : (place.address || place.name))}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase border border-blue-200 text-blue-500 bg-blue-50 hover:bg-blue-100 transition-colors whitespace-nowrap"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                            導航
                          </a>
                          <button onClick={() => deletePlaceToVisit(trip.id, place.id)} className="p-1.5 text-gray-200 hover:text-red-400 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
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
    </div>
  );
}
