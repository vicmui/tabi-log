import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';

// ... (類型定義保持不變，為節省篇幅省略，請保留你原有的 interface) ...
// 如果你怕漏，請確保 Member, Booking, Expense, Trip 這些 interface 都在

// 這裡只列出 TripState 和 create 部分，請保留上方的 interface
export interface Member { id: string; name: string; avatar: string; }
export type BookingType = 'Flight' | 'Hotel' | 'Rental' | 'Ticket';
export interface Booking {
  id: string; type: BookingType; title: string; date: string;
  details: { 
    price?: number; address?: string; fileUrl?: string; note?: string;
    airline?: string; flightNum?: string; seat?: string; gate?: string; 
    origin?: string; destination?: string; departTime?: string; arriveTime?: string;
    checkIn?: string; checkOut?: string; pickupLocation?: string; dropoffLocation?: string;
  };
}
export type ExpenseCategory = 'Food' | 'Transport' | 'Accommodation' | 'Sightseeing' | 'Shopping' | 'Other';
export interface Expense {
  id: string; amount: number; category: ExpenseCategory; itemName: string; note: string; date: string; payerId: string; splitWithIds: string[]; customSplit?: Record<string, number>; receiptUrl?: string;
}
export type Priority = 'High' | 'Medium' | 'Low';
export interface PlanItem {
  id: string; category: 'Todo' | 'Packing' | 'Shopping'; text: string; priority: Priority; location?: string; estimatedCost?: number; isCompleted: boolean; assigneeId?: string; imageUrl?: string;
}
export interface Activity {
  id: string; time: string; type: string; location: string; cost: number; note?: string; rating?: number; comment?: string; isVisited: boolean;
}
export interface DailyItinerary { day: number; date: string; weather?: string; activities: Activity[]; }
export interface Trip {
  id: string; title: string; startDate: string; endDate: string; coverImage?: string; status: 'planning' | 'ongoing' | 'completed';
  members: Member[]; bookings: Booking[]; expenses: Expense[]; plans: PlanItem[]; dailyItinerary: DailyItinerary[]; budgetTotal: number;
}

interface TripState {
  trips: Trip[]; activeTripId: string | null; isSyncing: boolean;
  setActiveTrip: (id: string) => void;
  loadTripsFromCloud: () => Promise<void>;
  saveTripToCloud: (trip: Trip) => Promise<void>;
  subscribeToTrip: (tripId: string) => void;
  importData: (trips: Trip[]) => void; // 確保有這個

  // Actions
  addTrip: (trip: Omit<Trip, 'id' | 'members' | 'bookings' | 'expenses' | 'plans' | 'dailyItinerary' | 'budgetTotal'>) => void;
  updateTripSettings: (tripId: string, title: string, newStartDate: string, coverImage: string) => void;
  updateTrip: (tripId: string, data: Partial<Trip>) => void;
  updateBudgetTotal: (tripId: string, total: number) => void;
  addBooking: (tripId: string, booking: Booking) => void;
  updateBooking: (tripId: string, bookingId: string, data: Partial<Booking>) => void;
  deleteBooking: (tripId: string, bookingId: string) => void;
  addExpense: (tripId: string, expense: Expense) => void;
  updateExpense: (tripId: string, expenseId: string, data: Partial<Expense>) => void;
  deleteExpense: (tripId: string, expenseId: string) => void;
  addPlanItem: (tripId: string, item: PlanItem) => void;
  togglePlanItem: (tripId: string, itemId: string) => void;
  deletePlanItem: (tripId: string, itemId: string) => void;
  addActivity: (tripId: string, dayIndex: number, activity: Omit<Activity, 'id'>) => void;
  updateActivity: (tripId: string, dayIndex: number, activityId: string, data: Partial<Activity>) => void;
  updateActivityOrder: (tripId: string, dayIndex: number, newActivities: Activity[]) => void;
  deleteActivity: (tripId: string, dayIndex: number, activityId: string) => void;
  addDayToTrip: (tripId: string) => void;
  deleteDayFromTrip: (tripId: string, dayIndex: number) => void;
}

const DEFAULT_PACKING_LIST = ["✈️ 護照、簽證", "💳 信用卡、現金", "📱 手機、充電器", "🧳 行李打包", "🏨 飯店預訂確認", "🎫 機票確認", "💊 常用藥品", "📸 相機、記憶卡", "🌂 雨具", "🔌 轉接頭"];

const INITIAL_TRIP: Trip = {
  id: "trip-osaka-mum", title: "Osaka Trip (March) 🇯🇵", startDate: "2026-03-20", endDate: "2026-03-24", status: "planning", coverImage: "/osaka-cover.jpg", budgetTotal: 300000,
  members: [{ id: "m1", name: "VM", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" }, { id: "m2", name: "媽咪", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka" }],
  bookings: [], expenses: [],
  plans: DEFAULT_PACKING_LIST.map((text, i) => ({ id: `default-${i}`, category: 'Packing', text, priority: 'High', isCompleted: false })),
  dailyItinerary: [
     { day: 1, date: "2026-03-20", weather: "Cloud", activities: [] },
     { day: 2, date: "2026-03-21", weather: "Sun", activities: [] },
     { day: 3, date: "2026-03-22", weather: "Sun", activities: [] },
     { day: 4, date: "2026-03-23", weather: "Rain", activities: [] },
     { day: 5, date: "2026-03-24", weather: "Cloud", activities: [] }
  ]
};

// 輔助函數
const updateStateAndSave = (set: any, get: any, updateFn: (state: TripState) => Partial<TripState>, tripId: string) => {
    set(updateFn);
    const updatedTrip = get().trips.find((t: Trip) => t.id === tripId);
    if (updatedTrip) {
        get().saveTripToCloud(updatedTrip);
    }
};

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      trips: [INITIAL_TRIP], activeTripId: null, isSyncing: false,
      setActiveTrip: (id) => set({ activeTripId: id }),

      // 🔥 1. Cloud Load
      loadTripsFromCloud: async () => {
          set({ isSyncing: true });
          const { data, error } = await supabase.from('trips').select('*');
          if (!error && data) {
              const loadedTrips = data.map(row => row.content as Trip);
              set({ trips: loadedTrips, isSyncing: false });
              if (loadedTrips.length > 0 && !get().activeTripId) {
                  set({ activeTripId: loadedTrips[0].id });
              }
          }
          set({ isSyncing: false });
      },

      // 🔥 2. Cloud Save
      saveTripToCloud: async (trip: Trip) => {
          set({ isSyncing: true });
          await supabase.from('trips').upsert({ id: trip.id, title: trip.title, content: trip, updated_at: new Date().toISOString() });
          set({ isSyncing: false });
      },

      // 🔥 3. Subscribe
      subscribeToTrip: (tripId: string) => {
          supabase.channel('trips-channel')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` }, (payload) => {
              const newTrip = payload.new.content as Trip;
              set(state => ({ trips: state.trips.map(t => t.id === newTrip.id ? newTrip : t) }));
          })
          .subscribe();
      },

      // 🔥 4. Import
      importData: (newTrips: Trip[]) => {
          set({ trips: newTrips, activeTripId: newTrips.length > 0 ? newTrips[0].id : null });
          // Import 後自動上傳第一個
          if(newTrips.length > 0) get().saveTripToCloud(newTrips[0]);
      },

      addTrip: (tripData) => {
          const newTrip: Trip = { ...tripData, id: uuidv4(), members: [], bookings: [], expenses: [], dailyItinerary: [], budgetTotal: 0, plans: DEFAULT_PACKING_LIST.map((text, i) => ({ id: uuidv4(), category: 'Packing', text, priority: 'High', isCompleted: false })) };
          set(state => ({ trips: [...state.trips, newTrip], activeTripId: newTrip.id }));
          get().saveTripToCloud(newTrip);
      },

      updateTripSettings: (tripId, title, newStartDate, coverImage) => updateStateAndSave(set, get, (state) => ({
        trips: state.trips.map(t => {
          if (t.id !== tripId) return t;
          const start = new Date(newStartDate);
          const newItinerary = t.dailyItinerary.map((day, index) => {
             const d = new Date(start); d.setDate(start.getDate() + index);
             return { ...day, date: d.toISOString().split('T')[0] };
          });
          const lastDate = new Date(start);
          if (newItinerary.length > 0) lastDate.setDate(start.getDate() + newItinerary.length - 1);
          return { ...t, title, startDate: newStartDate, coverImage, dailyItinerary: newItinerary, endDate: lastDate.toISOString().split('T')[0] };
        })
      }), tripId),

      updateTrip: (tripId, data) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, ...data } : t) }), tripId),
      updateBudgetTotal: (tripId, total) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, budgetTotal: total } : t) }), tripId),
      addBooking: (tripId, booking) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, bookings: [...t.bookings, booking] } : t) }), tripId),
      updateBooking: (tripId, bookingId, data) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, bookings: t.bookings.map(b => b.id === bookingId ? { ...b, ...data } : b) } : t) }), tripId),
      deleteBooking: (tripId, bookingId) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, bookings: t.bookings.filter(b => b.id !== bookingId) } : t) }), tripId),
      addExpense: (tripId, expense) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, expenses: [expense, ...t.expenses] } : t) }), tripId),
      updateExpense: (tripId, expenseId, data) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, expenses: t.expenses.map(e => e.id === expenseId ? { ...e, ...data } : e) } : t) }), tripId),
      deleteExpense: (tripId, expenseId) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, expenses: t.expenses.filter(e => e.id !== expenseId) } : t) }), tripId),
      addPlanItem: (tripId, item) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, plans: [...t.plans, item] } : t) }), tripId),
      togglePlanItem: (tripId, itemId) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(t => { if (t.id !== tripId) return t; return { ...t, plans: t.plans.map(p => p.id === itemId ? { ...p, isCompleted: !p.isCompleted } : p) }; }) }), tripId),
      deletePlanItem: (tripId, itemId) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, plans: t.plans.filter(p => p.id !== itemId) } : t) }), tripId),
      addActivity: (tripId, dayIndex, activity) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(trip => { if (trip.id !== tripId) return trip; const newItinerary = [...trip.dailyItinerary]; if (!newItinerary[dayIndex]) return trip; newItinerary[dayIndex].activities.push({ ...activity, id: uuidv4(), isVisited: false }); return { ...trip, dailyItinerary: newItinerary }; }) }), tripId),
      updateActivity: (tripId, dayIndex, activityId, data) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(trip => { if (trip.id !== tripId) return trip; const newItinerary = [...trip.dailyItinerary]; newItinerary[dayIndex].activities = newItinerary[dayIndex].activities.map(a => a.id === activityId ? { ...a, ...data } : a); return { ...trip, dailyItinerary: newItinerary }; }) }), tripId),
      updateActivityOrder: (tripId, dayIndex, newActivities) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(trip => { if (trip.id !== tripId) return trip; const newItinerary = [...trip.dailyItinerary]; newItinerary[dayIndex].activities = newActivities; return { ...trip, dailyItinerary: newItinerary }; }) }), tripId),
      deleteActivity: (tripId, dayIndex, activityId) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(trip => { if (trip.id !== tripId) return trip; const newItinerary = [...trip.dailyItinerary]; newItinerary[dayIndex].activities = newItinerary[dayIndex].activities.filter(a => a.id !== activityId); return { ...trip, dailyItinerary: newItinerary }; }) }), tripId),
      addDayToTrip: (tripId) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(trip => { 
          if (trip.id !== tripId) return trip;
          let nextDateStr = trip.startDate;
          if (trip.dailyItinerary.length > 0) {
             const lastDay = trip.dailyItinerary[trip.dailyItinerary.length - 1];
             const d = new Date(lastDay.date); d.setDate(d.getDate() + 1);
             nextDateStr = d.toISOString().split('T')[0];
          }
          return { ...trip, endDate: nextDateStr, dailyItinerary: [...trip.dailyItinerary, { day: trip.dailyItinerary.length + 1, date: nextDateStr, weather: 'Sun', activities: [] }] };
      }) }), tripId),
      deleteDayFromTrip: (tripId, dayIndex) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(trip => { if (trip.id !== tripId) return trip; const newItinerary = trip.dailyItinerary.filter((_, idx) => idx !== dayIndex).map((item, idx) => ({ ...item, day: idx + 1 })); return { ...trip, dailyItinerary: newItinerary }; }) }), tripId),
    }),
    { name: 'vm-build-v12-supabase', storage: createJSONStorage(() => localStorage) }
  )
);