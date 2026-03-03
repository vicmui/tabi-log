"use client";
import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useTripStore, PlaceToVisit, Trip } from "@/store/useTripStore";
import { CheckCircle2, Circle, Trash2, GripVertical, Plus, Sparkles, Loader2, MapPin } from "lucide-react";
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
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("景點");
  const [filter, setFilter] = useState("全部");
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiDone, setAiDone] = useState(false);

  const places = trip.placesToVisit || [];
  const visited = places.filter((p) => p.isVisited).length;
  const filtered = filter === "全部" ? places : places.filter((p) => p.category === filter);

  const handleAdd = () => {
    if (!newName.trim()) return;
    addPlaceToVisit(trip.id, { name: newName.trim(), category: newCategory, isVisited: false, suggestedBy: "user" });
    setNewName("");
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(places);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    reorderPlacesToVisit(trip.id, reordered.map((p, i) => ({ ...p, order: i })));
  };

  const handleAISuggest = async () => {
    setIsLoadingAI(true);
    setAiError("");
    setAiDone(false);
    // Extract destination from trip title (e.g. "2026 大阪行" → "大阪", "Osaka Trip" → "Osaka")
    const destination = trip.title;
    const tripDays = trip.dailyItinerary.length;
    try {
      const res = await fetch("/api/suggest-places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination, tripDays }),
      });
      const data = await res.json();
      if (data.suggestions && Array.isArray(data.suggestions)) {
        const existingNames = places.map((p) => p.name.toLowerCase());
        let added = 0;
        data.suggestions.forEach((s: { name: string; category?: string; note?: string }) => {
          if (!existingNames.includes(s.name.toLowerCase())) {
            addPlaceToVisit(trip.id, {
              name: s.name,
              category: s.category || "景點",
              note: s.note,
              isVisited: false,
              suggestedBy: "ai",
            });
            added++;
          }
        });
        setAiDone(true);
        setTimeout(() => setAiDone(false), 3000);
      } else {
        setAiError("未能獲取建議，請稍後重試");
      }
    } catch (_e) {
      setAiError("AI建議失敗，請稍後重試");
    } finally {
      setIsLoadingAI(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header: progress + AI button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 tracking-widest uppercase mb-1.5">
            {visited} / {places.length} 已打卡
          </p>
          <div className="h-[2px] w-40 bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-black transition-all duration-500"
              style={{ width: places.length > 0 ? (visited / places.length) * 100 + "%" : "0%" }}
            />
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={handleAISuggest}
            disabled={isLoadingAI}
            className="flex items-center gap-2 border border-black bg-black text-white px-4 py-2.5 text-[10px] font-bold tracking-widest uppercase hover:opacity-80 transition-opacity disabled:opacity-50"
          >
            {isLoadingAI ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {isLoadingAI ? "AI 生成中..." : "AI 建議景點"}
          </button>
          {aiDone && <p className="text-[9px] text-green-500 tracking-widest">✓ 已加入建議景點</p>}
          {aiError && <p className="text-[9px] text-red-400 tracking-widest">{aiError}</p>}
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTER_TABS.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={clsx(
              "text-[9px] font-bold px-2.5 py-1 border tracking-widest uppercase transition-colors",
              filter === cat
                ? "bg-black text-white border-black"
                : "border-gray-200 text-gray-400 hover:border-black hover:text-black"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Add form */}
      <div className="border border-dashed border-gray-200 p-4 bg-gray-50 flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-[9px] text-gray-400 tracking-widest uppercase block mb-1">新增景點</label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="例：道頓堀、心齋橋、天守閣..."
            className="w-full border-b border-gray-300 py-1.5 text-sm bg-transparent focus:outline-none focus:border-black"
          />
        </div>
        <div className="flex-shrink-0">
          <label className="text-[9px] text-gray-400 tracking-widest uppercase block mb-1">類別</label>
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="border-b border-gray-300 py-1.5 text-xs bg-transparent focus:outline-none focus:border-black pr-2"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleAdd}
          disabled={!newName.trim()}
          className="flex items-center gap-1 bg-black text-white px-4 py-2 text-[10px] font-bold tracking-widest uppercase hover:opacity-80 disabled:opacity-30 transition-opacity flex-shrink-0"
        >
          <Plus size={12} /> 新增
        </button>
      </div>

      {/* Place list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-300">
          <MapPin size={32} className="mx-auto mb-3 opacity-20" />
          <p className="text-xs tracking-widest uppercase">
            {places.length === 0 ? '按「AI 建議景點」或自行新增' : "此類別暫無景點"}
          </p>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="places-list">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                {filtered.map((place, index) => (
                  <Draggable key={place.id} draggableId={place.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={clsx(
                          "flex items-center gap-3 p-4 bg-white border transition-all",
                          snapshot.isDragging ? "border-black shadow-lg" : "border-gray-100 hover:border-gray-200",
                          place.isVisited && "opacity-50"
                        )}
                      >
                        {/* Drag handle */}
                        <div
                          {...provided.dragHandleProps}
                          className="text-gray-200 hover:text-gray-400 cursor-grab active:cursor-grabbing flex-shrink-0"
                        >
                          <GripVertical size={16} />
                        </div>

                        {/* Visited toggle */}
                        <button onClick={() => togglePlaceVisited(trip.id, place.id)} className="flex-shrink-0">
                          {place.isVisited
                            ? <CheckCircle2 size={20} className="text-black" />
                            : <Circle size={20} className="text-gray-300 hover:text-black transition-colors" />}
                        </button>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={clsx("font-bold text-sm", place.isVisited && "line-through text-gray-400")}>
                              {place.name}
                            </span>
                            {place.suggestedBy === "ai" && (
                              <span className="text-[8px] text-gray-300 tracking-widest border border-gray-200 px-1 py-0.5 uppercase">AI</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {place.category && (
                              <span className={clsx(
                                "text-[9px] font-bold px-1.5 py-0.5 border uppercase tracking-wider",
                                CATEGORY_STYLES[place.category] || "bg-gray-50 text-gray-400 border-gray-200"
                              )}>
                                {place.category}
                              </span>
                            )}
                            {place.note && (
                              <span className="text-[10px] text-gray-400 truncate">{place.note}</span>
                            )}
                          </div>
                        </div>

                        {/* Delete */}
                        <button
                          onClick={() => deletePlaceToVisit(trip.id, place.id)}
                          className="text-gray-200 hover:text-red-400 transition-colors flex-shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
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
