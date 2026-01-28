import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

// ================= 類型定義 =================

export interface Member {
  id: string;
  name: string;
  avatar: string;
}

export type BookingType = 'Flight' | 'Hotel' | 'Rental' | 'Ticket';
export interface Booking {
  id: string;
  type: BookingType;
  title: string;
  date: string;
  details: {
    checkIn?: string; checkOut?: string; 
    seat?: string; gate?: string; airline?: string; 
    pickupLocation?: string; dropoffLocation?: string;
    address?: string;
    price?: number;
  };
}

export type ExpenseCategory = 'Food' | 'Transport' | 'Accommodation' | 'Sightseeing' | 'Shopping' | 'Other';
export interface Expense {
  id: string;
  amount: number;
  category: ExpenseCategory;
  itemName: string; // 新增：項目名稱
  note: string;     // 備註
  date: string; 
  payerId: string;
  splitWithIds: string[];
}

export type Priority = 'High' | 'Medium' | 'Low';
export interface PlanItem {
  id: string;
  category: 'Todo' | 'Packing' | 'Shopping';
  text: string;
  priority: Priority;
  location?: string; 
  estimatedCost?: number; // 新增：預算金額 (Shopping用)
  isCompleted: boolean;
  assigneeId?: string; // 指派給誰
  imageUrl?: string;
}

export interface Activity {
  id: string;
  time: string;
  type: string;
  location: string;
  cost: number;
  note?: string;
  rating?: number;
  comment?: string;
  isVisited: boolean;
}

export interface DailyItinerary {
  day: number;
  date: string;
  weather?: string;
  activities: Activity[];
}

export interface Trip {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  coverImage?: string;
  status: 'planning' | 'ongoing' | 'completed';
  members: Member[];
  bookings: Booking[];
  expenses: Expense[];
  plans: PlanItem[];
  dailyItinerary: DailyItinerary[];
  budgetTotal: number;
}

interface TripState {
  trips: Trip[];
  activeTripId: string | null;
  setActiveTrip: (id: string) => void;
  addTrip: (trip: Omit<Trip, 'id' | 'members' | 'bookings' | 'expenses' | 'plans' | 'dailyItinerary' | 'budgetTotal'>) => void;
  updateTrip: (tripId: string, data: Partial<Trip>) => void;
  
  addBooking: (tripId: string, booking: Booking) => void;
  addExpense: (tripId: string, expense: Expense) => void;
  addPlanItem: (tripId: string, item: PlanItem) => void;
  togglePlanItem: (tripId: string, itemId: string) => void;
  deletePlanItem: (tripId: string, itemId: string) => void;
  
  addActivity: (tripId: string, dayIndex: number, activity: Omit<Activity, 'id'>) => void;
  updateActivity: (tripId: string, dayIndex: number, activityId: string, data: Partial<Activity>) => void;
  updateActivityOrder: (tripId: string, dayIndex: number, newActivities: Activity[]) => void;
}

// 🔥 完整的大阪母子遊資料 (Restored)
const INITIAL_TRIP: Trip = {
  id: "trip-osaka-mum",
  title: "大阪母子遊 🇯🇵",
  startDate: "2026-03-20",
  endDate: "2026-03-24",
  status: "planning",
  coverImage: "/osaka-cover.jpg", 
  budgetTotal: 300000,
  
  members: [
    { id: "m1", name: "VM", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" },
    { id: "m2", name: "媽咪", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka" },
  ],

  bookings: [], 
  expenses: [],
  plans: [],
  dailyItinerary: [
     { 
       day: 1, date: "2026-03-20", weather: "Cloud",
       activities: [
         { id: "d1-1", time: "10:00", type: "Hotel", location: "Zentis Osaka (Check-in)", cost: 0, note: "放行李", isVisited: false },
         { id: "d1-2", time: "11:00", type: "Shopping", location: "大丸心齋橋", cost: 0, note: "逛街", isVisited: false },
         { id: "d1-3", time: "12:00", type: "Food", location: "Castella GINSO", cost: 1500, note: "蜂蜜蛋糕", isVisited: false },
         { id: "d1-4", time: "12:30", type: "Food", location: "Nishiya", cost: 3000, note: "Booked 12:30", isVisited: false },
         { id: "d1-5", time: "14:00", type: "Food", location: "Harbs", cost: 2000, note: "下午茶蛋糕", isVisited: false },
         { id: "d1-6", time: "16:00", type: "Sightseeing", location: "大阪 Wonder Cruise", cost: 1200, note: "道頓堀遊船", isVisited: false },
         { id: "d1-7", time: "19:00", type: "Food", location: "蟹松 (北新地)", cost: 15000, note: "訂位 19:00", isVisited: false }
       ]
     },
     { 
       day: 2, date: "2026-03-21", weather: "Sun",
       activities: [
         { id: "d2-1", time: "09:00", type: "Transport", location: "大阪站 JR", cost: 500, note: "買票去京都", isVisited: false },
         { id: "d2-2", time: "10:30", type: "Sightseeing", location: "東寺", cost: 600, note: "五重塔櫻花", isVisited: false },
         { id: "d2-3", time: "13:30", type: "Food", location: "松籟庵 (Shoraian)", cost: 6000, note: "豆腐料理 Booked 13:30", isVisited: false },
         { id: "d2-4", time: "15:30", type: "Sightseeing", location: "嵐山人力車", cost: 4000, note: "體驗", isVisited: false },
         { id: "d2-5", time: "20:15", type: "Food", location: "Sumibiyakitori Ikoka", cost: 5000, note: "串燒 Omakase", isVisited: false }
       ]
     },
     { day: 3, date: "2026-03-22", weather: "Sun", activities: [
         { id: "d3-1", time: "10:30", type: "Food", location: "春駒壽司 本店", cost: 3000, note: "早點去排隊", isVisited: false },
         { id: "d3-2", time: "13:00", type: "Sightseeing", location: "大阪城公園", cost: 600, note: "賞櫻", isVisited: false },
         { id: "d3-3", time: "16:00", type: "Shopping", location: "Namba Parks", cost: 0, note: "United Arrows", isVisited: false },
         { id: "d3-4", time: "19:15", type: "Food", location: "San Bettei 北新地", cost: 8000, note: "Shabushabu", isVisited: false }
     ]},
     { day: 4, date: "2026-03-23", weather: "Rain", activities: [
         { id: "d4-1", time: "11:00", type: "Food", location: "Ramen KUON", cost: 1200, note: "需預約", isVisited: false },
         { id: "d4-2", time: "13:00", type: "Sightseeing", location: "鶴見綠地公園", cost: 0, note: "賞櫻", isVisited: false },
         { id: "d4-3", time: "15:30", type: "Shopping", location: "LaLaport 門真", cost: 0, note: "Outlet", isVisited: false },
         { id: "d4-4", time: "19:15", type: "Food", location: "Tempura tentomi", cost: 10000, note: "天婦羅", isVisited: false }
     ]},
     { day: 5, date: "2026-03-24", weather: "Cloud", activities: [
         { id: "d5-1", time: "10:00", type: "Hotel", location: "Zentis Osaka", cost: 0, note: "Check out", isVisited: false },
         { id: "d5-2", time: "11:00", type: "Sightseeing", location: "中之島美術館", cost: 1800, note: "NAKKA", isVisited: false },
         { id: "d5-3", time: "12:00", type: "Food", location: "小麥之麵神", cost: 1200, note: "KITTE大阪店", isVisited: false },
         { id: "d5-4", time: "15:00", type: "Food", location: "grenier", cost: 800, note: "梅田店 下午茶", isVisited: false }
     ]}
  ]
};

export const useTripStore = create<TripState>()(
  persist(
    (set) => ({
      trips: [INITIAL_TRIP],
      activeTripId: null,

      setActiveTrip: (id) => set({ activeTripId: id }),

      addTrip: (tripData) => set((state) => ({
        trips: [...state.trips, { ...tripData, id: uuidv4(), members: [], bookings: [], expenses: [], plans: [], dailyItinerary: [], budgetTotal: 0 }]
      })),
      
      updateTrip: (tripId, data) => set((state) => ({
        trips: state.trips.map(t => t.id === tripId ? { ...t, ...data } : t)
      })),

      addBooking: (tripId, booking) => set((state) => ({
        trips: state.trips.map(t => t.id === tripId ? { ...t, bookings: [...t.bookings, booking] } : t)
      })),

      addExpense: (tripId, expense) => set((state) => ({
        trips: state.trips.map(t => t.id === tripId ? { ...t, expenses: [expense, ...t.expenses] } : t)
      })),

      addPlanItem: (tripId, item) => set((state) => ({
        trips: state.trips.map(t => t.id === tripId ? { ...t, plans: [...t.plans, item] } : t)
      })),

      togglePlanItem: (tripId, itemId) => set((state) => ({
        trips: state.trips.map(t => {
            if (t.id !== tripId) return t;
            return { ...t, plans: t.plans.map(p => p.id === itemId ? { ...p, isCompleted: !p.isCompleted } : p) };
        })
      })),

      deletePlanItem: (tripId, itemId) => set((state) => ({
        trips: state.trips.map(t => t.id === tripId ? { ...t, plans: t.plans.filter(p => p.id !== itemId) } : t)
      })),

      addActivity: (tripId, dayIndex, activity) => set((state) => ({
        trips: state.trips.map(trip => {
          if (trip.id !== tripId) return trip;
          const newItinerary = [...trip.dailyItinerary];
          if (!newItinerary[dayIndex]) return trip;
          newItinerary[dayIndex].activities.push({ ...activity, id: uuidv4(), isVisited: false });
          return { ...trip, dailyItinerary: newItinerary };
        })
      })),

      updateActivity: (tripId, dayIndex, activityId, data) => set((state) => ({
        trips: state.trips.map(trip => {
            if (trip.id !== tripId) return trip;
            const newItinerary = [...trip.dailyItinerary];
            newItinerary[dayIndex].activities = newItinerary[dayIndex].activities.map(a => 
                a.id === activityId ? { ...a, ...data } : a
            );
            return { ...trip, dailyItinerary: newItinerary };
        })
      })),

      updateActivityOrder: (tripId, dayIndex, newActivities) => set((state) => ({
        trips: state.trips.map(trip => {
          if (trip.id !== tripId) return trip;
          const newItinerary = [...trip.dailyItinerary];
          newItinerary[dayIndex].activities = newActivities;
          return { ...trip, dailyItinerary: newItinerary };
        })
      })),
    }),
    { name: 'vm-build-final-v1', storage: createJSONStorage(() => localStorage) }
  )
);