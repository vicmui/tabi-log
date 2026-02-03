"use client";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Activity, useTripStore } from "@/store/useTripStore";
import { Utensils, Camera, Train, Bed, ShoppingBag, MapPin, AlignLeft, Map, Trash2, CheckCircle2, Circle } from "lucide-react";
import clsx from "clsx";

const TYPE_CONFIG: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  Food: { icon: Utensils, label: "美食", color: "text-orange-600", bg: "bg-orange-50" },
  Sightseeing: { icon: Camera, label: "景點", color: "text-blue-600", bg: "bg-blue-50" },
  Transport: { icon: Train, label: "交通", color: "text-green-600", bg: "bg-green-50" },
  Hotel: { icon: Bed, label: "住宿", color: "text-purple-600", bg: "bg-purple-50" },
  Shopping: { icon: ShoppingBag, label: "購物", color: "text-pink-600", bg: "bg-pink-50" },
  Other: { icon: MapPin, label: "其他", color: "text-gray-600", bg: "bg-gray-50" },
};

interface Props { dayIndex: number; activities: Activity[]; tripId: string; onActivityClick: (id: string) => void; }

export default function ItineraryList({ dayIndex, activities, tripId, onActivityClick }: Props) {
  const { updateActivityOrder, updateActivity } = useTripStore();

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(activities);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    updateActivityOrder(tripId, dayIndex, items);
  };

  const openGoogleMaps = (e: React.MouseEvent, location: string) => {
    e.stopPropagation();
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`, '_blank');
  };

  const toggleCheck = (e: React.MouseEvent, activity: Activity) => {
    e.stopPropagation();
    updateActivity(tripId, dayIndex, activity.id, { isVisited: !activity.isVisited });
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if(confirm("確定要刪除這個行程嗎？")) {
       const newItems = activities.filter(a => a.id !== id);
       updateActivityOrder(tripId, dayIndex, newItems);
    }
  };

  // 🔥 優化空狀態 (Empty State)
  if (activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
         {/* 這裡使用一個可愛的 Emoji 組合或者你上傳的貓貓圖 */}
         <div className="text-6xl mb-4 grayscale">🐈🌸</div> 
         <p className="text-sm font-bold text-gray-400 tracking-widest uppercase">今日暫無行程</p>
         <p className="text-[10px] text-gray-300 mt-1">按右下角 "+" 開始規劃冒險</p>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId={`day-${dayIndex}`}>
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4 relative pl-4 py-2" id="itinerary-capture-area">
            <div className="absolute left-[27px] top-4 bottom-4 w-[1px] bg-gray-100" />
            {activities.map((activity, index) => {
              const config = TYPE_CONFIG[activity.type] || TYPE_CONFIG.Other;
              return (
                <Draggable key={activity.id} draggableId={activity.id} index={index}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} style={{ ...provided.draggableProps.style }} onClick={() => onActivityClick(activity.id)} className={clsx("relative bg-white group transition-all duration-200 border-b border-gray-50 last:border-0 pb-4 cursor-pointer hover:bg-gray-50", snapshot.isDragging && "z-50 shadow-2xl scale-105 bg-white rounded-xl border-none")}>
                      <div className="flex items-start gap-5 p-2 transition-colors rounded-lg">
                        <div className="flex flex-col items-center gap-2 z-10 min-w-[50px] pt-1">
                          <span className="text-[11px] font-mono text-jp-charcoal font-bold">{activity.time}</span>
                          <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm", activity.isVisited ? "bg-black text-white" : "bg-white border border-gray-200 text-gray-400")}>
                             {activity.isVisited ? <CheckCircle2 size={14}/> : <config.icon size={14} />}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <div className="flex justify-between items-baseline mb-1">
                            <h4 className={clsx("text-sm font-bold tracking-wide truncate pr-2", activity.isVisited ? "text-gray-400 line-through" : "text-jp-charcoal")}>{activity.location}</h4>
                            {activity.cost > 0 && <span className="text-[10px] font-mono text-gray-400 whitespace-nowrap">¥ {activity.cost.toLocaleString()}</span>}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                             <span className={clsx("text-[9px] uppercase tracking-wider border px-1.5 py-0.5 rounded-sm", config.bg, config.color, "border-transparent")}>{config.label}</span>
                             {activity.rating && activity.rating > 0 && <span className="text-[9px] flex items-center gap-1 text-yellow-500 font-bold">★ {activity.rating}</span>}
                             {activity.note && (<div className="flex items-center gap-1 text-gray-400"><AlignLeft size={10} /><p className="text-[11px] text-gray-500 line-clamp-1">{activity.note}</p></div>)}
                          </div>
                          <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-3 pt-2 border-t border-dashed border-gray-100 md:flex">
                            <button onClick={(e) => openGoogleMaps(e, activity.location)} className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline"><Map size={10} /> 地圖</button>
                            <button onClick={(e) => toggleCheck(e, activity)} className="flex items-center gap-1 text-[10px] text-green-600 hover:underline">{activity.isVisited ? <Circle size={10}/> : <CheckCircle2 size={10}/>} {activity.isVisited ? "取消" : "打卡"}</button>
                            <button onClick={(e) => handleDelete(e, activity.id)} className="flex items-center gap-1 text-[10px] text-gray-300 hover:text-red-500 hover:underline ml-auto"><Trash2 size={10} /> 刪除</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Draggable>
              );
            })}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}