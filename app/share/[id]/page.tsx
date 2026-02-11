"use client";
import { useState, useEffect, useMemo } from "react";
import ItineraryList from "@/components/planner/ItineraryList";
import TripMap from "@/components/planner/TripMap";
import { useTripStore, Booking, PlanItem, Expense } from "@/store/useTripStore";
import { MapPin, Calendar, Clock, Map as MapIcon, List as ListIcon, Ticket, Wallet, ClipboardList, Plane, Building, Car, Navigation, CheckCircle2, Circle } from "lucide-react";
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
  
  if (!isMounted || !trip) return <div className="p-10 text-center text-xs tracking-widest text-gray-400">LOADING SHARED TRIP...</div>;

  const currentDailyItinerary = trip.dailyItinerary[activeDay];
  const displayLocation = currentDailyItinerary?.activities.length > 0 ? currentDailyItinerary.activities[0].location.split(' ')[0] : trip.title;

  return (
    <div className="min-h-screen bg-white font-sans text-jp-charcoal pb-20">
      {/* Read Only Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 px-6 py-4 flex justify-between items-center">
          <div>
             <h1 className="font-black tracking-tighter text-xl uppercase leading-none">VM&apos;s Build</h1>
             <p className="text-[9px] text-gray-400 tracking-[0.2em] uppercase font-bold mt-1">Shared Hand-book</p>
          </div>
          <div className="text-[10px] font-bold bg-black text-white px-3 py-1 rounded-full uppercase tracking-widest">Read Only</div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex justify-around border-b border-gray-50 bg-white sticky top-[65px] z-40">
          {(['itinerary', 'bookings', 'budget', 'planning'] as Tab[]).map((tab) => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)}
                className={clsx(
                    "flex flex-col items-center py-3 px-2 gap-1 transition-all",
                    activeTab === tab ? "text-black border-b-2 border-black" : "text-gray-300"
                )}
              >
                  {tab === 'itinerary' && <Calendar size={18}/>}
                  {tab === 'bookings' && <Ticket size={18}/>}
                  {tab === 'budget' && <Wallet size={18}/>}
                  {tab === 'planning' && <ClipboardList size={18}/>}
                  <span className="text-[9px] font-bold uppercase tracking-widest">{tab}</span>
              </button>
          ))}
      </div>

      <div className="p-4 max-w-4xl mx-auto">
          {activeTab === 'itinerary' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                  {/* Day Slider */}
                  <div className="flex overflow-x-auto gap-3 pb-4 no-scrollbar">
                      {trip.dailyItinerary.map((day, idx) => (
                          <button key={idx} onClick={() => setActiveDay(idx)} className={clsx(
                              "flex-shrink-0 w-16 h-20 border rounded-xl flex flex-col items-center justify-center transition-all",
                              activeDay === idx ? "bg-black text-white shadow-lg" : "bg-gray-50 text-gray-400"
                          )}>
                              <span className="text-[9px] uppercase font-bold">{format(parseISO(day.date), 'EEE')}</span>
                              <span className="text-xl font-bold">{day.day}</span>
                          </button>
                      ))}
                  </div>

                  <div className="flex justify-between items-center border-b pb-2">
                      <h2 className="text-sm font-bold tracking-widest uppercase">Day {activeDay + 1} Itinerary</h2>
                      <button onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')} className="text-[10px] border px-3 py-1 rounded-full uppercase font-bold">
                          {viewMode === 'list' ? "Map View" : "List View"}
                      </button>
                  </div>

                  {viewMode === 'list' ? (
                      <ItineraryList dayIndex={activeDay} activities={currentDailyItinerary?.activities || []} tripId={trip.id} isReadOnly={true} onActivityClick={()=>{}} />
                  ) : (
                      <div className="h-[50vh] border rounded-2xl overflow-hidden"><TripMap activities={currentDailyItinerary?.activities || []} /></div>
                  )}
              </div>
          )}

          {activeTab === 'bookings' && (
              <div className="space-y-6 animate-in fade-in">
                  <h2 className="text-sm font-bold tracking-widest uppercase border-b pb-2">Booking Vouchers</h2>
                  {trip.bookings.length > 0 ? trip.bookings.map(b => (
                      <div key={b.id} className="border border-gray-100 rounded-2xl p-5 bg-white shadow-sm">
                          <div className="flex justify-between mb-4">
                              <div className="flex items-center gap-3">
                                  <div className="p-2 bg-gray-100 rounded-lg">{b.type === 'Flight' ? <Plane size={20}/> : <Building size={20}/>}</div>
                                  <div><p className="text-[10px] text-gray-400 uppercase">{b.type}</p><p className="font-bold">{b.title}</p></div>
                              </div>
                              <span className="text-xs font-mono text-gray-400">{b.date}</span>
                          </div>
                          {b.details.address && <p className="text-xs text-gray-500 flex items-center gap-1 mb-3"><MapPin size={12}/> {b.details.address}</p>}
                          {b.details.fileUrl && (
                              <button onClick={() => window.open(b.details.fileUrl, '_blank')} className="w-full py-2 bg-gray-50 border border-gray-100 text-[10px] font-bold uppercase rounded-lg">View Confirmation</button>
                          )}
                      </div>
                  )) : <div className="text-center py-20 text-gray-300">No bookings added</div>}
              </div>
          )}

          {activeTab === 'budget' && (
              <div className="space-y-6 animate-in fade-in">
                  <div className="bg-black text-white p-6 rounded-2xl shadow-xl">
                      <p className="text-[10px] tracking-widest opacity-60 uppercase mb-1">Total Spent</p>
                      <h2 className="text-4xl font-bold font-serif">¥{trip.expenses.reduce((acc, e) => acc + e.amount, 0).toLocaleString()}</h2>
                  </div>
                  <div className="space-y-2">
                      {trip.expenses.map(e => (
                          <div key={e.id} className="flex justify-between items-center p-4 border-b border-gray-50">
                              <div><p className="font-bold text-sm">{e.itemName}</p><p className="text-[10px] text-gray-400 uppercase">{e.date} • {e.category}</p></div>
                              <span className="font-bold">¥{e.amount.toLocaleString()}</span>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {activeTab === 'planning' && (
              <div className="space-y-6 animate-in fade-in">
                  <h2 className="text-sm font-bold tracking-widest uppercase border-b pb-2">Preparation Checklist</h2>
                  <div className="grid grid-cols-1 gap-3">
                      {trip.plans.map(p => (
                          <div key={p.id} className="flex items-center gap-4 p-4 border border-gray-50 rounded-xl">
                              {p.isCompleted ? <CheckCircle2 className="text-green-500" size={20}/> : <Circle className="text-gray-200" size={20}/>}
                              <div className="flex-1">
                                  <p className={clsx("text-sm font-medium", p.isCompleted && "line-through text-gray-300")}>{p.text}</p>
                                  <p className="text-[9px] uppercase tracking-widest text-gray-400">{p.priority} Priority</p>
                              </div>
                              {p.imageUrl && <img src={p.imageUrl} className="w-10 h-10 rounded-lg object-cover"/>}
                          </div>
                      ))}
                  </div>
              </div>
          )}
      </div>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-gray-300 tracking-[0.5em] uppercase">
          Hand-crafted by VM
      </div>
    </div>
  );
}