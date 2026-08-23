"use client";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Activity, useTripStore } from "@/store/useTripStore";
import { Utensils, Camera, Train, Bed, ShoppingBag, MapPin, AlignLeft, Trash2, CheckCircle2, Circle, Navigation, GripVertical } from "lucide-react";
import clsx from "clsx";
import TravelStats from "./TravelStats";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { useState } from "react";

// 分類不再以顏色區分，改由圖示辨識。彩色標籤是整個介面與
// United Tokyo / STUDIOUS 那種調性距離最遠的一環。
const TYPE_CONFIG: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  Food:        { icon: Utensils,    label: "美食", color: "text-neutral-700", bg: "bg-white" },
  Sightseeing: { icon: Camera,      label: "景點", color: "text-neutral-700", bg: "bg-white" },
  Transport:   { icon: Train,       label: "交通", color: "text-neutral-700", bg: "bg-white" },
  Hotel:       { icon: Bed,         label: "住宿", color: "text-neutral-700", bg: "bg-white" },
  Shopping:    { icon: ShoppingBag, label: "購物", color: "text-neutral-700", bg: "bg-white" },
  Other:       { icon: MapPin,      label: "其他", color: "text-neutral-700", bg: "bg-white" },
};

interface Props {
  dayIndex: number
  activities: Activity[]
  tripId: string
  onActivityClick: (id: string) => void
  isReadOnly?: boolean
}

// ── Single activity card — NO framer-motion here ────────────────────────────
const ItemContent = ({ activity, onActivityClick, isReadOnly, config, index, tripId, dayIndex }: any) => {
  const { updateActivity, deleteActivity } = useTripStore();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const params = new URLSearchParams({ api: "1", travelmode: "transit" });
    params.set(
      "destination",
      activity.lat && activity.lng
        ? `${activity.lat},${activity.lng}`
        : (activity.address || activity.location)
    );
    // 有 placeId 便鎖定該分店，不會導航至錯誤的地點
    if (activity.placeId) params.set("destination_place_id", activity.placeId);
    window.open(`https://www.google.com/maps/dir/?${params.toString()}`, "_blank");
  };

  const toggleCheck = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateActivity(tripId, dayIndex, activity.id, { isVisited: !activity.isVisited });
  };

  const costValue = Number(activity.cost);
  const hasCost   = !isNaN(costValue) && costValue > 0;

  return (
    <>
      <div className="relative group ml-4">
        {/* Sequence bubble */}
        <div className="absolute -left-4 top-4 w-8 h-8 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center font-bold text-sm border-4 border-white z-20 select-none pointer-events-none">
          {index + 1}
        </div>

        <div
          className="flex items-start gap-4 p-4 pl-6 bg-white relative z-10 border border-gray-200 hover:border-neutral-400 transition-colors"
          onClick={() => !isReadOnly && onActivityClick?.(activity.id)}
          style={{ cursor: isReadOnly ? 'default' : 'pointer' }}
        >
          <div className="flex flex-col items-center gap-2 min-w-[50px] pt-1">
            <span className="text-[11px] font-mono text-gray-800 font-bold">{activity.time}</span>
            <div className={clsx(
              "w-8 h-8 rounded-full flex items-center justify-center",
              activity.isVisited ? "bg-black text-white" : "bg-white border border-gray-200 text-gray-500"
            )}>
              {activity.isVisited ? <CheckCircle2 size={14} /> : <config.icon size={14} />}
            </div>
          </div>

          <div className="flex-1 min-w-0 pt-1">
            <div className="flex justify-between items-start mb-1">
              <h4 className={clsx(
                "text-sm font-bold tracking-wide leading-tight mr-2",
                activity.isVisited ? "text-gray-500 line-through" : "text-black"
              )}>
                {activity.location}
              </h4>
              {hasCost && (
                <span className="text-xs font-mono text-gray-500 whitespace-nowrap bg-gray-50 px-2 py-0.5 border border-gray-100">
                  ¥ {costValue.toLocaleString()}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={clsx(
                "text-[11px] uppercase tracking-wider border px-1.5 py-0.5 rounded-sm border-transparent",
                config.bg, config.color
              )}>
                {config.label}
              </span>
              {(activity.rating ?? 0) > 0 && (
                <span className="text-[11px] flex items-center gap-1 text-yellow-500 font-bold">★ {activity.rating}</span>
              )}
            </div>

            {activity.note && (
              <div className="flex items-start gap-1 text-gray-500 mt-1">
                <AlignLeft size={10} className="mt-[2px] shrink-0" />
                <p className="text-[11px] line-clamp-2 leading-relaxed">{activity.note}</p>
              </div>
            )}

            {/* Action row */}
            <div className={clsx(
              "flex gap-2 mt-3 pt-3 border-t border-gray-50 transition-opacity",
              isReadOnly ? "hidden" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
            )}>
              <button
                onClick={handleNavigate}
                className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2.5 py-1 border border-blue-100 hover:bg-blue-100 transition-colors"
              >
                <Navigation size={10} fill="currentColor" /> 導航
              </button>
              <button
                onClick={toggleCheck}
                className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2.5 py-1 border border-green-100 hover:bg-green-100 transition-colors"
              >
                {activity.isVisited ? <><Circle size={10} /> 取消</> : <><CheckCircle2 size={10} /> 打卡</>}
              </button>
              <button
                onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}
                className="flex items-center gap-1 text-xs text-red-400 bg-red-50 px-2.5 py-1 border border-red-100 hover:bg-red-100 transition-colors ml-auto"
              >
                <Trash2 size={10} /> 刪除
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDelete}
        title="刪除活動"
        message={`確定要刪除「${activity.location}」嗎？`}
        confirmLabel="刪除" cancelLabel="取消" danger
        onConfirm={() => { deleteActivity(tripId, dayIndex, activity.id); setConfirmDelete(false); }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
};

export default function ItineraryList({ dayIndex, activities, tripId, onActivityClick, isReadOnly = false }: Props) {
  const { updateActivityOrder } = useTripStore();

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(activities);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    updateActivityOrder(tripId, dayIndex, items);
  };

  const validActivities = (activities || []).filter(a => !!a && !!a.id);

  if (validActivities.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
      <div className="w-10 h-[1px] bg-neutral-300 mb-6" />
      <p className="text-sm font-bold text-gray-500 tracking-widest uppercase">今日暫無行程</p>
      {!isReadOnly && <p className="text-xs text-gray-500 mt-2 tracking-wide">按右下角「＋」新增第一個地點</p>}
    </div>
  );

  if (isReadOnly) {
    return (
      <div className="space-y-0 pl-2 relative">
        <div className="absolute left-[38px] top-4 bottom-4 w-[2px] bg-gray-100" />
        {validActivities.map((activity, index) => {
          const next = validActivities[index + 1];
          const showStats = next && activity.lat && activity.lng && next.lat && next.lng;
          return (
            <div key={activity.id}>
              <ItemContent activity={activity} isReadOnly config={TYPE_CONFIG[activity.type] || TYPE_CONFIG.Other} tripId={tripId} dayIndex={dayIndex} index={index} />
              {showStats && (
                <div className="pl-4">
                  <TravelStats
                    origin={{ lat: Number(activity.lat), lng: Number(activity.lng), placeId: activity.placeId }}
                    dest={{ lat: Number(next.lat), lng: Number(next.lng), placeId: next.placeId }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId={`day-${dayIndex}`}>
        {(droppableProvided, droppableSnapshot) => (
          <div
            ref={droppableProvided.innerRef}
            {...droppableProvided.droppableProps}
            className="relative pl-8 py-2"
            // Prevent default touch behaviour on the list so iOS doesn't interfere
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {/* Timeline line */}
            <div className="absolute left-[46px] top-4 bottom-4 w-[2px] bg-gray-100 pointer-events-none" />

            {validActivities.map((activity, index) => {
              const next = validActivities[index + 1];
              const showStats = next && activity.lat && activity.lng && next.lat && next.lng;

              return (
                // ✅ Plain div wrapper — NO framer-motion to avoid layout reflow during drag
                <div key={activity.id}>
                  <Draggable draggableId={activity.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        // ✅ Slightly elevate while dragging via inline style only (no transition classes)
                        style={{
                          ...provided.draggableProps.style,
                          opacity: snapshot.isDragging ? 0.85 : 1,
                          boxShadow: snapshot.isDragging ? '0 8px 24px rgba(0,0,0,0.12)' : undefined,
                        }}
                        className="relative"
                      >
                        {/* ✅ Drag handle lives OUTSIDE ItemContent to avoid pointer conflicts */}
                        <div
                          {...provided.dragHandleProps}
                          className="absolute left-[-26px] top-1/2 -translate-y-1/2 z-30 p-2 text-gray-400 hover:text-gray-600 active:text-black transition-colors touch-none cursor-grab active:cursor-grabbing"
                          onClick={e => e.stopPropagation()}
                        >
                          <GripVertical size={16} />
                        </div>

                        <ItemContent
                          activity={activity}
                          onActivityClick={onActivityClick}
                          isReadOnly={false}
                          config={TYPE_CONFIG[activity.type] || TYPE_CONFIG.Other}
                          tripId={tripId}
                          dayIndex={dayIndex}
                          index={index}
                        />
                      </div>
                    )}
                  </Draggable>

                  {/* TravelStats lives outside Draggable so it doesn't affect drag layout */}
                  {showStats && !droppableSnapshot.isDraggingOver && (
                    <div className="pl-4">
                      <TravelStats
                        origin={{ lat: Number(activity.lat), lng: Number(activity.lng), placeId: activity.placeId }}
                        dest={{ lat: Number(next.lat), lng: Number(next.lng), placeId: next.placeId }}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {droppableProvided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
