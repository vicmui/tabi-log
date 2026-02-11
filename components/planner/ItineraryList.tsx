"use client";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Activity, useTripStore } from "@/store/useTripStore";
import { Utensils, Camera, Train, Bed, ShoppingBag, MapPin, AlignLeft, Trash2, CheckCircle2, Circle, Navigation } from "lucide-react";
import clsx from "clsx";
import { motion, useMotionValue, useTransform } from "framer-motion";
import TravelStats from "./TravelStats";

const TYPE_CONFIG: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  Food: { icon: Utensils, label: "美食", color: "text-orange-600", bg: "bg-orange-50" },
  Sightseeing: { icon: Camera, label: "景點", color: "text-blue-600", bg: "bg-blue-50" },
  Transport: { icon: Train, label: "交通", color: "text-green-600", bg: "bg-green-50" },
  Hotel: { icon: Bed, label: "住宿", color: "text-purple-600", bg: "bg-purple-50" },
  Shopping: { icon: ShoppingBag, label: "購物", color: "text-pink-600", bg: "bg-pink-50" },
  Other: { icon: MapPin, label: "其他", color: "text-gray-600", bg: "bg-gray-50" },
};

interface Props { 
  dayIndex: number; 
  activities: Activity[]; 
  tripId: string; 
  onActivityClick?: (id: string) => void; 
  isReadOnly?: boolean;
}

export default function ItineraryList({ dayIndex, activities, tripId, onActivityClick, isReadOnly = false }: Props) {
  const { updateActivityOrder, deleteActivity, updateActivity } = useTripStore();

  const onDragEnd = (result: DropResult) => { 
    if (!result.destination) return; 
    const items = Array.from(activities); 
    const [reorderedItem] = items.splice(result.source.index, 1); 
    items.splice(result.destination.index, 0, reorderedItem); 
    updateActivityOrder(tripId, dayIndex, items); 
  };

  if (!activities || activities.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
            <div className="text-6xl mb-4 grayscale">🐈🌸</div>
            <p className="text-sm font-bold text-gray-400 tracking-widest uppercase">今日暫無行程</p>
            {!isReadOnly && <p className="text-[10px] text-gray-300 mt-1">按 &quot;+&quot; 開始規劃冒險</p>}
        </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd} isDragDisabled={isReadOnly}>
      <Droppable droppableId={`day-${dayIndex}`}>
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-0">
            {activities.map((activity, index) => {
              const config = TYPE_CONFIG[activity.type] || TYPE_CONFIG.Other;

              return (
                <div key={activity.id}>
                    <Draggable draggableId={activity.id} index={index}>
                      {(provided) => (
                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="relative z-10">
                            <div className="flex items-start gap-4 p-4 cursor-pointer bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group" onClick={() => onActivityClick && onActivityClick(activity.id)}>
                                {/* 左側 */}
                                <div className="flex flex-col items-center gap-2 min-w-[50px] pt-1">
                                    <span className="text-[11px] font-mono text-gray-800 font-bold">{activity.time}</span>
                                    <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center shadow-sm z-10", activity.isVisited ? "bg-gray-800 text-white" : "bg-white border border-gray-200 text-gray-500")}>
                                        {activity.isVisited ? <CheckCircle2 size={14}/> : <config.icon size={14} />}
                                    </div>
                                </div>
                                {/* 右側 */}
                                <div className="flex-1 min-w-0 pt-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className={clsx("text-sm font-bold tracking-wide leading-tight mr-2", activity.isVisited ? "text-gray-400 line-through" : "text-black")}>{activity.location}</h4>
                                        {activity.cost > 0 && <span className="text-[10px] font-mono text-gray-500 whitespace-nowrap bg-gray-50 px-1.5 py-0.5 rounded">¥ {activity.cost.toLocaleString()}</span>}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className={clsx("text-[9px] uppercase tracking-wider border px-1.5 py-0.5 rounded-sm", config.bg, config.color, "border-transparent")}>{config.label}</span>
                                        {activity.address && <span className="text-[9px] text-gray-400 flex items-center gap-0.5 bg-gray-50 px-1 rounded"><MapPin size={8}/> Map</span>}
                                    </div>
                                    {activity.note && <p className="text-xs text-gray-500 mt-1">{activity.note}</p>}
                                    {!isReadOnly && <button onClick={(e) => { e.stopPropagation(); updateActivity(tripId, dayIndex, activity.id, { isVisited: !activity.isVisited }); }} className="text-xs text-green-600 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">打卡</button>}
                                </div>
                            </div>
                        </div>
                      )}
                    </Draggable>

                    {/* 🔥 交通資訊 */}
                    {index < activities.length - 1 && (
                        <TravelStats 
                           origin={{ lat: Number(activities[index].lat), lng: Number(activities[index].lng) }} 
                           dest={{ lat: Number(activities[index+1].lat), lng: Number(activities[index+1].lng) }} 
                        />
                    )}
                </div>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}