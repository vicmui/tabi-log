"use client";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Activity, useTripStore } from "@/store/useTripStore";
import { Utensils, Camera, Train, Bed, ShoppingBag, MapPin, AlignLeft, Trash2, CheckCircle2, Circle, Navigation, GripVertical } from "lucide-react";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import TravelStats from "./TravelStats";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { useState } from "react";

const TYPE_CONFIG: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  Food:        { icon: Utensils,    label: "美食", color: "text-orange-600", bg: "bg-orange-50" },
  Sightseeing: { icon: Camera,      label: "景點", color: "text-blue-600",   bg: "bg-blue-50"   },
  Transport:   { icon: Train,       label: "交通", color: "text-green-600",  bg: "bg-green-50"  },
  Hotel:       { icon: Bed,         label: "住宿", color: "text-purple-600", bg: "bg-purple-50" },
  Shopping:    { icon: ShoppingBag, label: "購物", color: "text-pink-600",   bg: "bg-pink-50"   },
  Other:       { icon: MapPin,      label: "其他", color: "text-gray-600",   bg: "bg-gray-50"   },
};

interface Props {
  dayIndex: number
  activities: Activity[]
  tripId: string
  onActivityClick: (id: string) => void
  isReadOnly?: boolean
}

// ── Single activity card ────────────────────────────────────────────────────
const ItemContent = ({
  activity, onActivityClick, isReadOnly, config, index, tripId, dayIndex,
}: any) => {
  const { updateActivity, deleteActivity } = useTripStore();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const dest = activity.lat && activity.lng
      ? `${activity.lat},${activity.lng}`
      : encodeURIComponent(activity.address || activity.location);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=transit`, "_blank");
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
        <div className="absolute -left-4 top-4 w-8 h-8 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center font-bold text-sm border-4 border-white z-20 select-none">
          {index + 1}
        </div>

        <div
          className="flex items-start gap-4 p-4 pl-6 cursor-pointer bg-white relative z-10 border border-gray-200 hover:shadow-md transition-shadow select-none"
          onClick={() => !isReadOnly && onActivityClick?.(activity.id)}
        >
          {/* Time + type icon */}
          <div className="flex flex-col items-center gap-2 min-w-[50px] pt-1">
            <span className="text-[11px] font-mono text-gray-800 font-bold">{activity.time}</span>
            <div className={clsx(
              "w-8 h-8 rounded-full flex items-center justify-center z-10",
              activity.isVisited ? "bg-black text-white" : "bg-white border border-gray-200 text-gray-500"
            )}>
              {activity.isVisited ? <CheckCircle2 size={14} /> : <config.icon size={14} />}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex justify-between items-start mb-1">
              <h4 className={clsx(
                "text-sm font-bold tracking-wide leading-tight mr-2",
                activity.isVisited ? "text-gray-400 line-through" : "text-black"
              )}>
                {activity.location}
              </h4>
              {hasCost && (
                <span className="text-[10px] font-mono text-gray-500 whitespace-nowrap bg-gray-50 px-2 py-0.5 border border-gray-100">
                  ¥ {costValue.toLocaleString()}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={clsx(
                "text-[9px] uppercase tracking-wider border px-1.5 py-0.5 rounded-sm",
                config.bg, config.color, "border-transparent"
              )}>
                {config.label}
              </span>
              {(activity.rating ?? 0) > 0 && (
                <span className="text-[9px] flex items-center gap-1 text-yellow-500 font-bold">★ {activity.rating}</span>
              )}
            </div>

            {activity.note && (
              <div className="flex items-start gap-1 text-gray-500 mt-1">
                <AlignLeft size={10} className="mt-[2px] shrink-0" />
                <p className="text-[11px] line-clamp-2 leading-relaxed">{activity.note}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className={clsx(
              "flex gap-3 mt-3 pt-3 border-t border-gray-50 transition-opacity",
              isReadOnly ? "" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
            )}>
              <button
                onClick={handleNavigate}
                className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline bg-blue-50 px-2.5 py-1 border border-blue-100"
              >
                <Navigation size={10} fill="currentColor" /> 導航
              </button>
              {!isReadOnly && (
                <>
                  <button
                    onClick={toggleCheck}
                    className="flex items-center gap-1 text-[10px] text-green-600 hover:underline bg-green-50 px-2.5 py-1 border border-green-100"
                  >
                    {activity.isVisited ? <><Circle size={10} /> 取消</> : <><CheckCircle2 size={10} /> 打卡</>}
                  </button>
                  {/* ✅ Delete button inline — replaces swipe gesture */}
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}
                    className="flex items-center gap-1 text-[10px] text-red-400 hover:underline bg-red-50 px-2.5 py-1 border border-red-100 ml-auto"
                  >
                    <Trash2 size={10} /> 刪除
                  </button>
                </>
              )}
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

// ── Draggable row (no swipe gesture — avoids DnD conflict) ─────────────────
const DraggableItem = ({ activity, index, tripId, dayIndex, onActivityClick, provided }: any) => {
  const config = TYPE_CONFIG[activity.type] || TYPE_CONFIG.Other;
  return (
    <motion.div
      layout
      transition={{ duration: 0.15 }}
      className="relative"
      ref={provided.innerRef}
      {...provided.draggableProps}
    >
      {/* Drag handle — separate from card click */}
      <div
        {...provided.dragHandleProps}
        className="absolute left-[-28px] top-1/2 -translate-y-1/2 z-30 p-2 text-gray-300 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none"
        onClick={e => e.stopPropagation()}
      >
        <GripVertical size={16} />
      </div>
      <ItemContent
        activity={activity}
        onActivityClick={onActivityClick}
        isReadOnly={false}
        config={config}
        tripId={tripId}
        dayIndex={dayIndex}
        index={index}
      />
    </motion.div>
  );
};

// ── Main list ───────────────────────────────────────────────────────────────
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
      <div className="text-6xl mb-4 grayscale">🐈🌸</div>
      <p className="text-sm font-bold text-gray-400 tracking-widest uppercase">今日暫無行程</p>
      {!isReadOnly && <p className="text-[10px] text-gray-300 mt-1">按右下角 &quot;+&quot; 開始規劃冒險</p>}
    </div>
  );

  return (
    <div className="relative">
      {!isReadOnly ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId={`day-${dayIndex}`}>
            {provided => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-0 relative pl-8 py-2"   // ← extra left padding for grip handle
              >
                {/* Timeline line */}
                <div className="absolute left-[46px] top-4 bottom-4 w-[2px] bg-gray-100" />

                <AnimatePresence initial={false}>
                  {validActivities.map((activity, index) => {
                    const next = validActivities[index + 1];
                    const showStats = next && activity.lat && activity.lng && next.lat && next.lng;
                    return (
                      <div key={activity.id} className="relative">
                        <Draggable draggableId={activity.id} index={index}>
                          {provided => (
                            <DraggableItem
                              activity={activity}
                              index={index}
                              tripId={tripId}
                              dayIndex={dayIndex}
                              onActivityClick={onActivityClick}
                              provided={provided}
                            />
                          )}
                        </Draggable>
                        {showStats && (
                          <div className="pl-4">
                            <TravelStats
                              origin={{ lat: Number(activity.lat), lng: Number(activity.lng) }}
                              dest={{ lat: Number(next.lat), lng: Number(next.lng) }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </AnimatePresence>
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
        <div className="space-y-0 pl-2">
          <div className="absolute left-[38px] top-4 bottom-4 w-[2px] bg-gray-100" />
          {validActivities.map((activity, index) => {
            const next = validActivities[index + 1];
            const showStats = next && activity.lat && activity.lng && next.lat && next.lng;
            return (
              <div key={activity.id} className="relative mb-0">
                <ItemContent
                  activity={activity}
                  isReadOnly
                  config={TYPE_CONFIG[activity.type] || TYPE_CONFIG.Other}
                  tripId={tripId}
                  dayIndex={dayIndex}
                  index={index}
                />
                {showStats && (
                  <div className="pl-4">
                    <TravelStats
                      origin={{ lat: Number(activity.lat), lng: Number(activity.lng) }}
                      dest={{ lat: Number(next.lat), lng: Number(next.lng) }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
