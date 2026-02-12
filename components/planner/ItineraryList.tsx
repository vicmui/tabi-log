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

interface Props { dayIndex: number; activities: Activity[]; tripId: string; onActivityClick: (id: string) => void; isReadOnly?: boolean; }

const ItemContent = ({ activity, onActivityClick, isReadOnly, config, index }: any) => {
    const { updateActivity } = useTripStore();
    
    const handleNavigate = (e: React.MouseEvent) => {
        e.stopPropagation();
        const dest = (activity.lat && activity.lng) ? `${activity.lat},${activity.lng}` : encodeURIComponent(activity.address || activity.location);
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=transit`, '_blank');
    };

    const toggleCheck = (e: React.MouseEvent) => {
        e.stopPropagation();
        updateActivity(tripId, dayIndex, activity.id, { isVisited: !activity.isVisited });
    };

    return (
        <div className="relative group ml-4">
            
            {/* 黑色數字波波 */}
            <div className="absolute -left-4 top-4 w-8 h-8 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center font-bold text-sm shadow-md border-4 border-white z-20">
                {index + 1}
            </div>

            <div 
                className="flex items-start gap-4 p-4 pl-6 cursor-pointer bg-white relative z-10 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow" 
                onClick={() => !isReadOnly && onActivityClick && onActivityClick(activity.id)}
            >
                {/* 左側 Icon & Time */}
                <div className="flex flex-col items-center gap-2 min-w-[50px] pt-1">
                    <span className="text-[11px] font-mono text-gray-800 font-bold">{activity.time}</span>
                    <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center shadow-sm z-10", activity.isVisited ? "bg-black text-white" : "bg-white border border-gray-200 text-gray-500")}>
                        {activity.isVisited ? <CheckCircle2 size={14}/> : <config.icon size={14} />}
                    </div>
                </div>

                {/* 右側內容 */}
                <div className="flex-1 min-w-0 pt-1">
                    <div className="flex justify-between items-start mb-1">
                        <h4 className={clsx("text-sm font-bold tracking-wide leading-tight mr-2", activity.isVisited ? "text-gray-400 line-through" : "text-black")}>{activity.location}</h4>
                        {/* 🔥 此處已完全移除價錢顯示代碼 */}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                        {/* 類別標籤 */}
                        <span className={clsx("text-[9px] uppercase tracking-wider border px-1.5 py-0.5 rounded-sm", config.bg, config.color, "border-transparent")}>{config.label}</span>
                        
                        {/* 評分星星 */}
                        {activity.rating && activity.rating > 0 ? <span className="text-[9px] flex items-center gap-1 text-yellow-500 font-bold">★ {activity.rating}</span> : null}
                        
                        {/* Map Tag 已移除 */}
                    </div>
                    
                    {/* 備註 */}
                    {activity.note && (<div className="flex items-start gap-1 text-gray-500 mt-1"><AlignLeft size={10} className="mt-[2px] shrink-0"/><p className="text-[11px] line-clamp-2 leading-relaxed">{activity.note}</p></div>)}
                    
                    {/* 操作按鈕 */}
                    <div className={clsx("flex gap-3 mt-3 pt-3 border-t border-gray-50 transition-opacity", isReadOnly ? "" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100")}>
                        <button onClick={handleNavigate} className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline bg-blue-50 px-2.5 py-1 rounded"><Navigation size={10} fill="currentColor" /> 導航</button>
                        {!isReadOnly && (
                            <button onClick={toggleCheck} className="flex items-center gap-1 text-[10px] text-green-600 hover:underline bg-green-50 px-2.5 py-1 rounded">
                                {activity.isVisited ? <><Circle size={10}/> 取消</> : <><CheckCircle2 size={10}/> 打卡</>}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const SwipableItem = ({ activity, index, tripId, dayIndex, onActivityClick, provided }: any) => {
  const { deleteActivity } = useTripStore();
  const x = useMotionValue(0);
  const bgOpacity = useTransform(x, [-100, 0], [1, 0]);
  const handleDragEnd = (e: any, info: any) => { if (info.offset.x < -100) { if (confirm(`確定要刪除「${activity.location}」嗎？`)) deleteActivity(tripId, dayIndex, activity.id); } };
  const config = TYPE_CONFIG[activity.type] || TYPE_CONFIG.Other;
  return (
    <div className="relative overflow-visible" ref={provided.innerRef} {...provided.draggableProps}>
      <motion.div style={{ opacity: bgOpacity }} className="absolute inset-0 bg-red-500 flex items-center justify-end pr-6 rounded-xl my-1"><Trash2 className="text-white" size={20} /></motion.div>
      <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={{ left: 0.6, right: 0 }} onDragEnd={handleDragEnd} style={{ x }} className="relative z-10 group" {...provided.dragHandleProps}>
          <ItemContent activity={activity} onActivityClick={onActivityClick} isReadOnly={false} config={config} tripId={tripId} dayIndex={dayIndex} index={index} />
      </motion.div>
    </div>
  );
};

export default function ItineraryList({ dayIndex, activities, tripId, onActivityClick, isReadOnly = false }: Props) {
  const { updateActivityOrder } = useTripStore();
  const onDragEnd = (result: DropResult) => { if (!result.destination) return; const items = Array.from(activities); const [reorderedItem] = items.splice(result.source.index, 1); items.splice(result.destination.index, 0, reorderedItem); updateActivityOrder(tripId, dayIndex, items); };

  if (!activities || activities.length === 0) return (<div className="flex flex-col items-center justify-center py-20 text-center opacity-60"><div className="text-6xl mb-4 grayscale">🐈🌸</div><p className="text-sm font-bold text-gray-400 tracking-widest uppercase">今日暫無行程</p>{!isReadOnly && <p className="text-[10px] text-gray-300 mt-1">按右下角 &quot;+&quot; 開始規劃冒險</p>}</div>);

  return (
    <div className="relative">
        {!isReadOnly ? (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId={`day-${dayIndex}`}>
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-0 relative pl-2 py-2">
                    <div className="absolute left-[38px] top-4 bottom-4 w-[2px] bg-gray-100" />
                    {activities.map((activity, index) => (
                       <div key={activity.id} className="relative">
                           <Draggable draggableId={activity.id} index={index}>
                              {(provided) => (<SwipableItem activity={activity} index={index} tripId={tripId} dayIndex={dayIndex} onActivityClick={onActivityClick} provided={provided} />)}
                           </Draggable>
                           {index < activities.length - 1 && (
                               <div className="pl-4">
                                  <TravelStats origin={{ lat: Number(activities[index].lat), lng: Number(activities[index].lng) }} dest={{ lat: Number(activities[index+1].lat), lng: Number(activities[index+1].lng) }} />
                               </div>
                           )}
                       </div>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
        ) : (
            <div className="space-y-0 pl-2">
                 <div className="absolute left-[38px] top-4 bottom-4 w-[2px] bg-gray-100" />
                {activities.map((activity, index) => (
                   <div key={activity.id} className="relative mb-0">
                       <ItemContent activity={activity} isReadOnly={true} config={TYPE_CONFIG[activity.type] || TYPE_CONFIG.Other} tripId={tripId} dayIndex={dayIndex} index={index} />
                       {index < activities.length - 1 && (
                           <div className="pl-4">
                               <TravelStats origin={{ lat: Number(activities[index].lat), lng: Number(activities[index].lng) }} dest={{ lat: Number(activities[index+1].lat), lng: Number(activities[index+1].lng) }} />
                           </div>
                       )}
                   </div>
                ))}
            </div>
        )}
    </div>
  );
}