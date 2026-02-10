"use client";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Activity, useTripStore } from "@/store/useTripStore";
import { Utensils, Camera, Train, Bed, ShoppingBag, MapPin, AlignLeft, Map, Trash2, CheckCircle2, Circle, Navigation } from "lucide-react";
import clsx from "clsx";
import { motion, useMotionValue, useTransform } from "framer-motion";

const TYPE_CONFIG: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  Food: { icon: Utensils, label: "美食", color: "text-orange-600", bg: "bg-orange-50" },
  Sightseeing: { icon: Camera, label: "景點", color: "text-blue-600", bg: "bg-blue-50" },
  Transport: { icon: Train, label: "交通", color: "text-green-600", bg: "bg-green-50" },
  Hotel: { icon: Bed, label: "住宿", color: "text-purple-600", bg: "bg-purple-50" },
  Shopping: { icon: ShoppingBag, label: "購物", color: "text-pink-600", bg: "bg-pink-50" },
  Other: { icon: MapPin, label: "其他", color: "text-gray-600", bg: "bg-gray-50" },
};

interface Props { dayIndex: number; activities: Activity[]; tripId: string; onActivityClick: (id: string) => void; }

const SwipableItem = ({ activity, index, tripId, dayIndex, onActivityClick, provided }: any) => {
  const { deleteActivity, updateActivity } = useTripStore();
  const x = useMotionValue(0);
  const bgOpacity = useTransform(x, [-100, 0], [1, 0]);

  const handleDragEnd = (e: any, info: any) => {
    if (info.offset.x < -100) {
      if (confirm(`確定要刪除「${activity.location}」嗎？`)) {
        deleteActivity(tripId, dayIndex, activity.id);
      }
    }
  };

  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const dest = (activity.lat && activity.lng) ? `${activity.lat},${activity.lng}` : encodeURIComponent(activity.address || activity.location);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=transit`, '_blank');
  };

  const toggleCheck = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateActivity(tripId, dayIndex, activity.id, { isVisited: !activity.isVisited });
  };

  const config = TYPE_CONFIG[activity.type] || TYPE_CONFIG.Other;

  return (
    <div className="relative overflow-hidden rounded-xl mb-3" ref={provided.innerRef} {...provided.draggableProps}>
      <motion.div style={{ opacity: bgOpacity }} className="absolute inset-0 bg-red-500 flex items-center justify-end pr-6 rounded-xl"><Trash2 className="text-white" size={20} /></motion.div>
      <motion.div
        drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={{ left: 0.6, right: 0 }} onDragEnd={handleDragEnd} style={{ x }}
        className="bg-white relative z-10 rounded-xl shadow-sm border border-gray-200 group"
        {...provided.dragHandleProps} onClick={() => onActivityClick(activity.id)}
      >
        <div className="flex items-start gap-4 p-4 cursor-pointer">
            <div className="flex flex-col items-center gap-2 min-w-[50px] pt-1">
              <span className="text-[11px] font-mono text-gray-800 font-bold">{activity.time}</span>
              <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center shadow-sm", activity.isVisited ? "bg-gray-800 text-white" : "bg-white border border-gray-200 text-gray-500")}>
                  {activity.isVisited ? <CheckCircle2 size={14}/> : <config.icon size={14} />}
              </div>
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex justify-between items-start mb-1">
                <h4 className={clsx("text-sm font-bold tracking-wide leading-tight", activity.isVisited ? "text-gray-400 line-through" : "text-black")}>{activity.location}</h4>
                {activity.cost > 0 && <span className="text-[10px] font-mono text-gray-500 whitespace-nowrap ml-2">¥ {activity.cost.toLocaleString()}</span>}
              </div>
              
              <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={clsx("text-[9px] uppercase tracking-wider border px-1.5 py-0.5 rounded-sm", config.bg, config.color, "border-transparent")}>{config.label}</span>
                  {activity.rating && activity.rating > 0 && <span className="text-[9px] flex items-center gap-1 text-yellow-500 font-bold">★ {activity.rating}</span>}
              </div>
              
              {activity.note && (<div className="flex items-start gap-1 text-gray-500 mt-1"><AlignLeft size={10} className="mt-[2px] shrink-0"/><p className="text-[11px] line-clamp-2 leading-relaxed">{activity.note}</p></div>)}
              
              <div className="flex gap-3 mt-3 pt-3 border-t border-gray-50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                 <button onClick={handleNavigate} className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline bg-blue-50 px-2 py-1 rounded"><Navigation size={10}/> 導航</button>
                 <button onClick={toggleCheck} className="flex items-center gap-1 text-[10px] text-green-600 hover:underline bg-green-50 px-2 py-1 rounded">{activity.isVisited ? <><Circle size={10}/> 取消</> : <><CheckCircle2 size={10}/> 打卡</>}</button>
              </div>
            </div>
        </div>
      </motion.div>
    </div>
  );
};

export default function ItineraryList({ dayIndex, activities, tripId, onActivityClick }: Props) {
  const { updateActivityOrder } = useTripStore();
  const onDragEnd = (result: DropResult) => { if (!result.destination) return; const items = Array.from(activities); const [reorderedItem] = items.splice(result.source.index, 1); items.splice(result.destination.index, 0, reorderedItem); updateActivityOrder(tripId, dayIndex, items); };

  if (!activities || activities.length === 0) return (<div className="flex flex-col items-center justify-center py-20 text-center opacity-60"><div className="text-6xl mb-4 grayscale">🐈🌸</div><p className="text-sm font-bold text-gray-400 tracking-widest uppercase">今日暫無行程</p><p className="text-[10px] text-gray-300 mt-1">按右下角 &quot;+&quot; 開始規劃冒險</p></div>);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId={`day-${dayIndex}`}>
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-0 relative pl-4 py-2">
            <div className="absolute left-[28px] top-4 bottom-4 w-[2px] bg-gray-100" />
            {activities.map((activity, index) => (<Draggable key={activity.id} draggableId={activity.id} index={index}>{(provided) => (<SwipableItem activity={activity} index={index} tripId={tripId} dayIndex={dayIndex} onActivityClick={onActivityClick} provided={provided} />)}</Draggable>))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}