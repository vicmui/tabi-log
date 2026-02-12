"use client";
import { useState, useEffect } from "react";
import ItineraryList from "@/components/planner/ItineraryList";
import TripMap from "@/components/planner/TripMap";
import { useTripStore, Member, Booking, PlanItem, Expense } from "@/store/useTripStore";
import { MapPin, Calendar, Clock, Map as MapIcon, List as ListIcon, Ticket, Wallet, ClipboardList, Plane, Building, Navigation, CheckCircle2, Circle } from "lucide-react";
import { useParams } from "next/navigation";
import Image from "next/image";
import clsx from "clsx";
import { format, parseISO } from "date-fns";

type Tab = 'itinerary' | 'bookings' | 'budget' | 'planning';

export default function SharePage() {
  const params = useParams();
  const { trips, loadTripsFromCloud } = useTripStore();
  const [activeTab, setActiveTab] = useState<Tab>('itinerary');
  const [activeDay, setActiveDay] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  useEffect(() => {
    loadTripsFromCloud();
    setIsMounted(true);
  }, [loadTripsFromCloud]);

  const trip = trips.find((t) => t.id === params.id);
  useEffect(() => { if (trip && activeDay >= trip.dailyItinerary.length) setActiveDay(0); }, [trip]);

  if (!isMounted || !trip) return <div className="p-10 text-center text-xs tracking-widest text-gray-400 animate-pulse">正在載入共享手帳...</div>;

  const currentDailyItinerary = trip.dailyItinerary[activeDay];
  const displayLocation = currentDailyItinerary?.activities.length > 0 ? currentDailyItinerary.activities[0].location.split(' ')[0] : trip.title;

  const packingItems = trip.plans.filter(p => p.category === 'Packing');
  const todoItems = trip.plans.filter(p => p.category === 'Todo');
  const shoppingItems = trip.plans.filter(p => p.category === 'Shopping');

  return (
    <div className="min-h-screen bg-white font-sans text-[#333333] pb-24">
      {/* 唯讀 Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 px-6 py-4 flex flex-col gap-2">
          <div className="flex justify-between items-start">
             <div>
                 <h1 className="font-black tracking-tighter text-xl uppercase leading-none mb-1">{trip.title}</h1>
                 {/* 🔥 新增：日期範圍顯示 */}
                 <div className="flex items-center gap-2 text-[10px] text-gray-500 tracking-wider font-medium">
                     <Calendar size={12} />
                     <span>{trip.startDate} — {trip.endDate}</span>
                 </div>
             </div>
             <div className="text-[10px] font-bold bg-black text-white px-3 py-1 rounded-full uppercase tracking-widest shrink-0">Read Only</div>
          </div>
      </div>

      {/* 導航 Tabs */}
      <div className="flex justify-around border-b border-gray-50 bg-white sticky top-[76px] z-40">
          {[
            { id: 'itinerary', label: '行程', icon: Calendar },
            { id: 'bookings', label: '預訂', icon: Ticket },
            { id: 'budget', label: '預算', icon: Wallet },
            { id: 'planning', label: '準備', icon: ClipboardList },
          ].map((t) => (
              <button key={t.id} onClick={() => setActiveTab(t.id as Tab)} className={clsx("flex flex-col items-center py-3 px-2 gap-1 transition-all", activeTab === t.id ? "text-black border-b-2 border-black" : "text-gray-300")}>
                  <t.icon size={18}/>
                  <span className="text-[10px] font-bold uppercase tracking-widest">{t.label}</span>
              </button>
          ))}
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
          {activeTab === 'itinerary' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex overflow-x-auto gap-3 pb-4 no-scrollbar snap-x">
                      {trip.dailyItinerary.map((day, idx) => (
                          <button key={idx} onClick={() => setActiveDay(idx)} className={clsx("flex-shrink-0 w-16 h-20 border rounded-xl flex flex-col items-center justify-center transition-all snap-center", activeDay === idx ? "bg-black text-white shadow-lg scale-105" : "bg-gray-50 text-gray-400")}>
                              <span className="text-[9px] uppercase font-bold">{format(parseISO(day.date), 'EEE')}</span>
                              <span className="text-xl font-bold">{day.day}</span>
                          </button>
                      ))}
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                      <h2 className="text-sm font-bold tracking-widest uppercase">Day {activeDay + 1}</h2>
                      <button onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')} className="text-[10px] border px-3 py-1 rounded-full uppercase font-bold">{viewMode === 'list' ? "地圖" : "列表"}</button>
                  </div>
                  {viewMode === 'list' ? (
                      <ItineraryList dayIndex={activeDay} activities={currentDailyItinerary?.activities || []} tripId={trip.id} isReadOnly={true} onActivityClick={()=>{}} />
                  ) : (
                      <div className="h-[60vh] border rounded-2xl overflow-hidden shadow-sm"><TripMap activities={currentDailyItinerary?.activities || []} /></div>
                  )}
              </div>
          )}

          {activeTab === 'bookings' && (
              <div className="space-y-6 animate-in fade-in">
                  <h2 className="text-sm font-bold tracking-widest uppercase border-b pb-2">預訂憑證總覽</h2>
                  <div className="grid grid-cols-1 gap-6">
                      {trip.bookings.length > 0 ? trip.bookings.map(b => (
                          <div key={b.id} className="border border-gray-100 rounded-2xl p-5 bg-white shadow-sm relative">
                              <div className="flex justify-between mb-4">
                                  <div className="flex items-center gap-3">
                                      <div className="p-2 bg-gray-100 rounded-lg">{b.type === 'Flight' ? <Plane size={20}/> : <Building size={20}/>}</div>
                                      <div><p className="text-[10px] text-gray-400 uppercase tracking-widest">{b.type}</p><p className="font-bold">{b.title}</p></div>
                                  </div>
                                  <span className="font-mono text-[10px] bg-gray-50 px-2 py-1 rounded">{b.date}</span>
                              </div>
                              {b.details.address && <p className="text-xs text-gray-500 flex items-center gap-1 mb-3"><MapPin size={12}/> {b.details.address}</p>}
                              {b.details.fileUrl && (<button onClick={() => window.open(b.details.fileUrl, '_blank')} className="w-full py-2 bg-black text-white text-[10px] font-bold uppercase rounded-lg">查看憑證</button>)}
                          </div>
                      )) : <div className="text-center py-20 text-gray-300 text-xs">目前沒有預訂紀錄</div>}
                  </div>
              </div>
          )}

          {activeTab === 'budget' && (
              <div className="space-y-6 animate-in fade-in">
                  <div className="bg-black text-white p-6 rounded-2xl shadow-xl flex justify-between items-center">
                      <div><p className="text-[10px] tracking-widest opacity-60 uppercase mb-1">Total Spent</p><h2 className="text-4xl font-bold font-serif">¥{trip.expenses.reduce((acc, e) => acc + e.amount, 0).toLocaleString()}</h2></div>
                      <Wallet size={40} className="opacity-20" />
                  </div>
                  <div className="space-y-1">
                      {trip.expenses.map(e => (
                          <div key={e.id} className="flex justify-between items-center p-4 border-b border-gray-50">
                              <div><p className="font-bold text-sm">{e.itemName}</p><p className="text-[10px] text-gray-400 uppercase tracking-wider">{e.date} • {e.category}</p></div>
                              <span className="font-bold font-mono">¥{e.amount.toLocaleString()}</span>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {activeTab === 'planning' && (
              <div className="space-y-10 animate-in fade-in">
                  <section><h2 className="text-xs font-bold tracking-widest uppercase border-b pb-2 mb-4 text-gray-400">行李清單</h2><div className="grid grid-cols-1 gap-2">{packingItems.map(p => <SharePlanItem key={p.id} item={p} members={trip.members} />)}</div></section>
                  <section><h2 className="text-xs font-bold tracking-widest uppercase border-b pb-2 mb-4 text-gray-400">待辦事項</h2><div className="grid grid-cols-1 gap-2">{todoItems.map(p => <SharePlanItem key={p.id} item={p} members={trip.members} />)}</div></section>
                  <section><h2 className="text-xs font-bold tracking-widest uppercase border-b pb-2 mb-4 text-gray-400">購物清單</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{shoppingItems.map(p => (<div key={p.id} className="border border-gray-100 rounded-xl p-4 flex gap-4">{p.imageUrl && <img src={p.imageUrl} className="w-20 h-20 rounded-lg object-contain bg-white border border-gray-100"/>}<div className="flex-1"><p className="font-bold text-sm">{p.text}</p><p className="text-[10px] text-gray-400 mt-1 uppercase">預算: ¥{p.estimatedCost || '--'}</p><p className="text-[10px] text-gray-400 uppercase">地點: {p.location || '未定'}</p></div></div>))}</div></section>
              </div>
          )}
      </div>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-gray-300 tracking-[0.4em] uppercase font-bold">VM&apos;S BUILD • SHARED</div>
    </div>
  );
}

function SharePlanItem({ item, members }: { item: PlanItem, members: Member[] }) {
    const assigned = members.find(m => m.id === item.assigneeId);
    return (
        <div className="flex items-center gap-4 p-4 border border-gray-50 rounded-xl bg-gray-50/30">
            {item.isCompleted ? <CheckCircle2 className="text-black" size={20}/> : <Circle className="text-gray-200" size={20}/>}
            <div className="flex-1"><p className={clsx("text-sm font-medium", item.isCompleted && "line-through text-gray-300")}>{item.text}</p></div>
            {assigned && <img src={assigned.avatar} title={assigned.name} className="w-6 h-6 rounded-full border border-white shadow-sm"/>}
        </div>
    );
}