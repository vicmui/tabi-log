import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export interface Member { id: string; name: string; avatar: string; }
export type BookingType = 'Flight' | 'Hotel' | 'Rental' | 'Ticket';
export interface Booking {
  id: string; type: BookingType; title: string; date: string;
  details: { checkIn?: string; checkOut?: string; seat?: string; gate?: string; airline?: string; pickupLocation?: string; dropoffLocation?: string; address?: string; price?: number; };
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
  trips: Trip[]; activeTripId: string | null; setActiveTrip: (id: string) => void;
  addTrip: (trip: Omit<Trip, 'id' | 'members' | 'bookings' | 'expenses' | 'plans' | 'dailyItinerary' | 'budgetTotal'>) => void;
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
  deleteActivity: (tripId: string, dayIndex: number, activityId: string) => void; // 新增：刪除單一活動
  
  addDayToTrip: (tripId: string) => void;
  deleteDayFromTrip: (tripId: string, dayIndex: number) => void; // 新增：刪除整天
}

const DEFAULT_PACKING_LIST = ["✈️ 護照、簽證", "💳 信用卡、現金", "📱 手機、充電器", "🧳 行李打包", "🏨 飯店預訂確認", "🎫 機票確認", "💊 常用藥品", "📸 相機、記憶卡", "🌂 雨具", "🔌 轉接頭"];

const INITIAL_TRIP: Trip = {
  id: "trip-osaka-mum", title: "Osaka Trip (March) 🇯🇵", startDate: "2026-03-20", endDate: "2026-03-24", status: "planning", coverImage: "/osaka-cover.jpg", budgetTotal: 300000,
  members: [{ id: "m1", name: "VM", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" }, { id: "m2", name: "媽咪", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka" }],
  bookings: [], expenses: [],
  plans: DEFAULT_PACKING_LIST.map((text, i) => ({ id: `default-${i}`, category: 'Packing', text, priority: 'High', isCompleted: false })),
  dailyItinerary: [
     { day: 1, date: "2026-03-20", weather: "Cloud", activities: [{ id: "d1-1", time: "Check-in", type: "Hotel", location: "Zentis Osaka", cost: 0, note: "Check in / 放行李", isVisited: false }, { id: "d1-2", time: "11:00", type: "Shopping", location: "Daimaru Shinsaibashi", cost: 0, note: "大丸心齋橋", isVisited: false }] },
     { day: 2, date: "2026-03-21", weather: "Sun", activities: [] },
     { day: 3, date: "2026-03-22", weather: "Sun", activities: [] },
     { day: 4, date: "2026-03-23", weather: "Rain", activities: [] },
     { day: 5, date: "2026-03-24", weather: "Cloud", activities: [] }
  ]
};

export const useTripStore = create<TripState>()(
  persist(
    (set) => ({
      trips: [INITIAL_TRIP], activeTripId: null,
      setActiveTrip: (id) => set({ activeTripId: id }),
      addTrip: (tripData) => set((state) => ({ trips: [...state.trips, { ...tripData, id: uuidv4(), members: [], bookings: [], expenses: [], dailyItinerary: [], budgetTotal: 0, plans: DEFAULT_PACKING_LIST.map((text, i) => ({ id: uuidv4(), category: 'Packing', text, priority: 'High', isCompleted: false })) }] })),
      updateTrip: (tripId, data) => set((state) => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, ...data } : t) })),
      updateBudgetTotal: (tripId, total) => set((state) => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, budgetTotal: total } : t) })),
      addBooking: (tripId, booking) => set((state) => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, bookings: [...t.bookings, booking] } : t) })),
      updateBooking: (tripId, bookingId, data) => set((state) => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, bookings: t.bookings.map(b => b.id === bookingId ? { ...b, ...data } : b) } : t) })),
      deleteBooking: (tripId, bookingId) => set((state) => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, bookings: t.bookings.filter(b => b.id !== bookingId) } : t) })),
      addExpense: (tripId, expense) => set((state) => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, expenses: [expense, ...t.expenses] } : t) })),
      updateExpense: (tripId, expenseId, data) => set((state) => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, expenses: t.expenses.map(e => e.id === expenseId ? { ...e, ...data } : e) } : t) })),
      deleteExpense: (tripId, expenseId) => set((state) => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, expenses: t.expenses.filter(e => e.id !== expenseId) } : t) })),
      addPlanItem: (tripId, item) => set((state) => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, plans: [...t.plans, item] } : t) })),
      togglePlanItem: (tripId, itemId) => set((state) => ({ trips: state.trips.map(t => { if (t.id !== tripId) return t; return { ...t, plans: t.plans.map(p => p.id === itemId ? { ...p, isCompleted: !p.isCompleted } : p) }; }) })),
      deletePlanItem: (tripId, itemId) => set((state) => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, plans: t.plans.filter(p => p.id !== itemId) } : t) })),
      addActivity: (tripId, dayIndex, activity) => set((state) => ({ trips: state.trips.map(trip => { if (trip.id !== tripId) return trip; const newItinerary = [...trip.dailyItinerary]; if (!newItinerary[dayIndex]) return trip; newItinerary[dayIndex].activities.push({ ...activity, id: uuidv4(), isVisited: false }); return { ...trip, dailyItinerary: newItinerary }; }) })),
      updateActivity: (tripId, dayIndex, activityId, data) => set((state) => ({ trips: state.trips.map(trip => { if (trip.id !== tripId) return trip; const newItinerary = [...trip.dailyItinerary]; newItinerary[dayIndex].activities = newItinerary[dayIndex].activities.map(a => a.id === activityId ? { ...a, ...data } : a); return { ...trip, dailyItinerary: newItinerary }; }) })),
      updateActivityOrder: (tripId, dayIndex, newActivities) => set((state) => ({ trips: state.trips.map(trip => { if (trip.id !== tripId) return trip; const newItinerary = [...trip.dailyItinerary]; newItinerary[dayIndex].activities = newActivities; return { ...trip, dailyItinerary: newItinerary }; }) })),
      
      // 🔥 新增：刪除單一活動 (配合 Swipe to Delete)
      deleteActivity: (tripId, dayIndex, activityId) => set((state) => ({
        trips: state.trips.map(trip => {
          if (trip.id !== tripId) return trip;
          const newItinerary = [...trip.dailyItinerary];
          newItinerary[dayIndex].activities = newItinerary[dayIndex].activities.filter(a => a.id !== activityId);
          return { ...trip, dailyItinerary: newItinerary };
        })
      })),

      addDayToTrip: (tripId) => set((state) => ({
        trips: state.trips.map(trip => {
          if (trip.id !== tripId) return trip;
          const lastDay = trip.dailyItinerary[trip.dailyItinerary.length - 1];
          const lastDate = new Date(lastDay.date);
          const nextDate = new Date(lastDate);
          nextDate.setDate(lastDate.getDate() + 1);
          return { ...trip, endDate: nextDate.toISOString().split('T')[0], dailyItinerary: [...trip.dailyItinerary, { day: lastDay.day + 1, date: nextDate.toISOString().split('T')[0], weather: 'Sun', activities: [] }] };
        })
      })),

      // 🔥 新增：刪除整天 (Delete Day)
      deleteDayFromTrip: (tripId, dayIndex) => set((state) => ({
        trips: state.trips.map(trip => {
          if (trip.id !== tripId) return trip;
          const newItinerary = trip.dailyItinerary.filter((_, idx) => idx !== dayIndex);
          // 重新排序 Day 1, 2, 3...
          const reorderedItinerary = newItinerary.map((day, idx) => ({ ...day, day: idx + 1 }));
          return { ...trip, dailyItinerary: reorderedItinerary };
        })
      })),
    }),
    { name: 'vm-build-v9-swipe', storage: createJSONStorage(() => localStorage) } // Update version to force refresh
  )
);