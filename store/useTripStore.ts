import { create } from 'zustand';
// 移除 persist，改用 Supabase
// import { persist, createJSONStorage } from 'zustand/middleware'; 
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase'; // 引入剛剛建立的 client

// ================= 類型定義 (保持不變) =================
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
  trips: Trip[]; activeTripId: string | null; 
  isSyncing: boolean; // 顯示同步狀態用

  setActiveTrip: (id: string) => void;
  
  // 🔥 Cloud Functions
  loadTripsFromCloud: () => Promise<void>;
  saveTripToCloud: (trip: Trip) => Promise<void>;
  subscribeToTrip: (tripId: string) => void;

  // Actions (修改後會自動觸發 Save)
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

// 輔助函數：更新 State 並自動上傳 Supabase
const updateStateAndSave = (set: any, get: any, updateFn: (state: TripState) => Partial<TripState>, tripId: string) => {
    set(updateFn);
    const updatedTrip = get().trips.find((t: Trip) => t.id === tripId);
    if (updatedTrip) {
        get().saveTripToCloud(updatedTrip);
    }
};

export const useTripStore = create<TripState>((set, get) => ({
  trips: [], 
  activeTripId: null,
  isSyncing: false,

  setActiveTrip: (id) => set({ activeTripId: id }),

  // 🔥 1. 從 Supabase 下載資料
  loadTripsFromCloud: async () => {
      set({ isSyncing: true });
      const { data, error } = await supabase.from('trips').select('*');
      if (error) {
          console.error("Download Error:", error);
      } else if (data) {
          // 將 JSONB 轉換回 Trip 物件
          const loadedTrips = data.map(row => row.content as Trip);
          set({ trips: loadedTrips, isSyncing: false });
          if (loadedTrips.length > 0 && !get().activeTripId) {
              set({ activeTripId: loadedTrips[0].id });
          }
      }
      set({ isSyncing: false });
  },

  // 🔥 2. 上傳資料到 Supabase
  saveTripToCloud: async (trip: Trip) => {
      set({ isSyncing: true });
      // Upsert: 有 ID 就更新，無 ID 就新增
      const { error } = await supabase.from('trips').upsert({
          id: trip.id,
          title: trip.title,
          content: trip,
          updated_at: new Date().toISOString()
      });
      if (error) console.error("Upload Error:", error);
      set({ isSyncing: false });
  },

  // 🔥 3. 訂閱變更 (Real-time)
  subscribeToTrip: (tripId: string) => {
      supabase.channel('trips-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips', filter: `id=eq.${tripId}` }, (payload) => {
          // 當雲端資料改變，更新本地
          const newTrip = payload.new.content as Trip;
          set(state => ({
              trips: state.trips.map(t => t.id === newTrip.id ? newTrip : t)
          }));
      })
      .subscribe();
  },

  // === Actions (全部改寫為 Update State + Trigger Save) ===

  addTrip: (tripData) => {
      const newTrip: Trip = { 
          ...tripData, id: uuidv4(), members: [], bookings: [], expenses: [], dailyItinerary: [], budgetTotal: 0,
          plans: DEFAULT_PACKING_LIST.map((text, i) => ({ id: uuidv4(), category: 'Packing', text, priority: 'High', isCompleted: false }))
      };
      set(state => ({ trips: [...state.trips, newTrip], activeTripId: newTrip.id }));
      get().saveTripToCloud(newTrip); // Save to Cloud
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
}));