"use client";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Activity, useTripStore } from "@/store/useTripStore";
import { Utensils, Camera, Train, Bed, ShoppingBag, MapPin, AlignLeft, Map, Trash2, CheckCircle2, Circle, Navigation } from "lucide-react";
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
    const handleNavigate = (e: React.MouseEvent) => { e.stopPropagation(); const dest = (activity.lat && activity.lng) ? `${activity.lat},${activity.lng}` : encodeURIComponent(activity.address || activity.location); window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=transit`, '_blank'); };
    const toggleCheck = (e: React.MouseEvent) => { e.stopPropagation(); updateActivity(activity.id, { isVisited: !activity.isVisited }); }; // 這裡需傳遞正確參數，視 Store 定義

    return (
        <div className="flex items-start gap-4 p-4 cursor-pointer bg-white relative z-10 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow group" onClick={() => !isReadOnly && onActivityClick && onActivityClick(activity.id)}>
            <div className="flex flex-col items-center gap-2 min-w-[50px] pt-1 relative">
                {/* 🔥 新增：對應地圖的數字編號 */}
                <div className="absolute -left-3 top-0 w-5 h-5 bg-black text-white rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-sm z-30">
                    {index + 1}
                </div>
                
                <span className="text-[11px] font-mono text-gray-800 font-bold">{activity.time}</span>
                <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center shadow-sm z-20", activity.isVisited ? "bg-gray-800 text-white" : "bg-white border border-gray-200 text-gray-500")}>
                    {activity.isVisited ? <CheckCircle2 size={14}/> : <config.icon size={14} />}
                </div>
            </div>

            <div className="flex-1 min-w-0 pt-1">
                <div className="flex justify-between items-start mb-1">
                    <h4 className={clsx("text-sm font-bold tracking-wide leading-tight mr-2", activity.isVisited ? "text-gray-400 line-through" : "text-black")}>{activity.location}</h4>
                    {/* 🔥 修正：隱藏 $0 */}
                    {Number(activity.cost) > 0 && <span className="text-[10px] font-mono text-gray-500 whitespace-nowrap bg-gray-50 px-1.5 py-0.5 rounded">¥ {Number(activity.cost).toLocaleString()}</span>}
                </div>
                
                <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={clsx("text-[9px] uppercase tracking-wider border px-1.5 py-0.5 rounded-sm", config.bg, config.color, "border-transparent")}>{config.label}</span>
                    {activity.rating && activity.rating > 0 && <span className="text-[9px] flex items-center gap-1 text-yellow-500 font-bold">★ {activity.rating}</span>}
                    {activity.address && <span className="text-[9px] text-gray-400 flex items-center gap-0.5 bg-gray-50 px-1 rounded"><MapPin size={8}/> Map</span>}
                </div>
                
                {activity.note && (<div className="flex items-start gap-1 text-gray-500 mt-1"><AlignLeft size={10} className="mt-[2px] shrink-0"/><p className="text-[11px] line-clamp-2 leading-relaxed">{activity.note}</p></div>)}
                
                {!isReadOnly && (
                    <div className="flex gap-3 mt-3 pt-3 border-t border-gray-50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button onClick={handleNavigate} className="flex items-center gap-1 text-[10px] text-blue-600 font-bold hover:underline bg-blue-50 px-2.5 py-1 rounded"><Navigation size={10} fill="currentColor" /> 導航</button>
                    </div>
                )}
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
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-0">
                    {activities.map((activity, index) => (
                       <div key={activity.id} className="relative">
                           <Draggable draggableId={activity.id} index={index}>
                              {(provided) => (<SwipableItem activity={activity} index={index} tripId={tripId} dayIndex={dayIndex} onActivityClick={onActivityClick} provided={provided} />)}
                           </Draggable>
                           {index < activities.length - 1 && (
                               <TravelStats origin={{ lat: Number(activities[index].lat), lng: Number(activities[index].lng) }} dest={{ lat: Number(activities[index+1].lat), lng: Number(activities[index+1].lng) }} />
                           )}
                       </div>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
        ) : (
            <div className="space-y-0">
                {activities.map((activity, index) => (
                   <div key={activity.id} className="relative mb-0">
                       <ItemContent activity={activity} isReadOnly={true} config={TYPE_CONFIG[activity.type] || TYPE_CONFIG.Other} tripId={tripId} dayIndex={dayIndex} index={index} />
                       {index < activities.length - 1 && (
                           <TravelStats origin={{ lat: Number(activities[index].lat), lng: Number(activities[index].lng) }} dest={{ lat: Number(activities[index+1].lat), lng: Number(activities[index+1].lng) }} />
                       )}
                   </div>
                ))}
            </div>
        )}
    </div>
  );
}