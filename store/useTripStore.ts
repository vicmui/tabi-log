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
  itemName: string;
  note: string;
  date: string; 
  payerId: string;
  splitWithIds: string[];
  customSplit?: Record<string, number>;
}

export type Priority = 'High' | 'Medium' | 'Low';
export interface PlanItem {
  id: string;
  category: 'Todo' | 'Packing' | 'Shopping';
  text: string;
  priority: Priority;
  location?: string; 
  estimatedCost?: number; 
  isCompleted: boolean;
  assigneeId?: string;
  imageUrl?: string;
}

export interface Activity {
  id: string;
  time: string; // 建議格式 HH:mm 或 文字
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

// 預設行李清單
const DEFAULT_PACKING_LIST = [
  "✈️ 護照、簽證", "💳 信用卡、現金", "📱 手機、充電器", "🧳 行李打包",
  "🏨 飯店預訂確認", "🎫 機票確認", "💊 常用藥品", "📸 相機、記憶卡",
  "🌂 雨具", "🔌 轉接頭"
];

// 🔥 根據 PDF 輸入的完整大阪行程
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
  
  // 預載清單
  plans: DEFAULT_PACKING_LIST.map((text, i) => ({
    id: `default-${i}`, category: 'Packing', text, priority: 'High', isCompleted: false
  })),

  dailyItinerary: [
     // === Day 1: Friday, 20th March ===
     { 
       day: 1, date: "2026-03-20", weather: "Cloud",
       activities: [
         { id: "d1-1", time: "Check-in", type: "Hotel", location: "Zentis Osaka", cost: 0, note: "Check in", isVisited: false },
         { id: "d1-2", time: "11:00", type: "Shopping", location: "大丸心齋橋 (Daimaru)", cost: 0, note: "1 min · 200 ft", isVisited: false },
         { id: "d1-3", time: "12:00", type: "Food", location: "Castella GINSO Shinsaibashi", cost: 1500, note: "蜂蜜蛋糕", isVisited: false },
         { id: "d1-4", time: "13:00", type: "Food", location: "Harbs", cost: 2000, note: "2 min · 500 ft", isVisited: false },
         { id: "d1-5", time: "12:30", type: "Food", location: "Nishiya", cost: 3000, note: "Booked 12:30", isVisited: false },
         { id: "d1-6", time: "16:00", type: "Sightseeing", location: "Osaka Wonder Cruise", cost: 1200, note: "5 min · 0.25 mi", isVisited: false },
         { id: "d1-7", time: "17:30", type: "Sightseeing", location: "法善寺横丁 (Hozenji)", cost: 0, note: "不動明王", isVisited: false },
         { id: "d1-8", time: "18:00", type: "Hotel", location: "Zentis Osaka", cost: 0, note: "稍作休息", isVisited: false },
         { id: "d1-9", time: "18:30", type: "Sightseeing", location: "Harukas 300 (觀景台)", cost: 1500, note: "夜景", isVisited: false },
         { id: "d1-10", time: "19:00", type: "Food", location: "蟹松 Kitashinchi", cost: 15000, note: "Booked 19:00 (北新地)", isVisited: false },
         { id: "d1-11", time: "21:00", type: "Hotel", location: "Zentis Osaka", cost: 0, note: "Back to Hotel", isVisited: false }
       ]
     },
     // === Day 2: Saturday, 21st March (Kyoto) ===
     { 
       day: 2, date: "2026-03-21", weather: "Sun",
       activities: [
         { id: "d2-1", time: "09:00", type: "Transport", location: "Zentis Osaka 出發", cost: 0, note: "前往大阪站", isVisited: false },
         { id: "d2-2", time: "09:30", type: "Transport", location: "大阪站中央口 JR Ticket Office", cost: 0, note: "買票", isVisited: false },
         { id: "d2-3", time: "10:30", type: "Transport", location: "京都站 (Kyoto Station)", cost: 0, note: "抵達京都", isVisited: false },
         { id: "d2-4", time: "11:00", type: "Sightseeing", location: "東寺 (To-ji Temple)", cost: 600, note: "五重塔與早開的櫻花", isVisited: false },
         { id: "d2-5", time: "12:30", type: "Food", location: "GOKAGO", cost: 1000, note: "Coffee / Break", isVisited: false },
         { id: "d2-6", time: "13:30", type: "Food", location: "松籟庵 (Shoraian)", cost: 6000, note: "Booked 13:30 (豆腐料理)", isVisited: false },
         { id: "d2-7", time: "15:00", type: "Sightseeing", location: "嵐山人力車 (Ebisuya)", cost: 4000, note: "體驗", isVisited: false },
         { id: "d2-8", time: "16:30", type: "Food", location: "eXcafe Kyoto Arashiyama", cost: 1500, note: "Main Store", isVisited: false },
         { id: "d2-9", time: "18:00", type: "Transport", location: "京都站", cost: 0, note: "返回大阪", isVisited: false },
         { id: "d2-10", time: "19:00", type: "Transport", location: "大阪站中央口", cost: 0, note: "抵達", isVisited: false },
         { id: "d2-11", time: "20:15", type: "Food", location: "Sumibiyakitori Ikoka", cost: 5000, note: "Booked 20:15 (串燒 Omakase)", isVisited: false },
         { id: "d2-12", time: "22:00", type: "Hotel", location: "Zentis Osaka", cost: 0, note: "Back to Hotel", isVisited: false }
       ]
     },
     // === Day 3: Sunday, 22nd March ===
     { 
       day: 3, date: "2026-03-22", weather: "Sun", 
       activities: [
         { id: "d3-1", time: "09:00", type: "Hotel", location: "Zentis Osaka", cost: 0, note: "出發", isVisited: false },
         { id: "d3-2", time: "10:00", type: "Food", location: "epais 阪神梅田店", cost: 2000, note: "炸豬排 (2月尾先book到)", isVisited: false },
         { id: "d3-3", time: "10:30", type: "Food", location: "Eel Nakasho Shinsaibashi", cost: 3000, note: "Booked", isVisited: false },
         { id: "d3-4", time: "10:30", type: "Food", location: "春駒 (Harukoma) 本店", cost: 3000, note: "需提早排隊 (10:30去到)", isVisited: false },
         { id: "d3-5", time: "13:00", type: "Sightseeing", location: "大阪城公園 (Osaka Castle)", cost: 600, note: "賞櫻/景點", isVisited: false },
         { id: "d3-6", time: "14:30", type: "Sightseeing", location: "西之丸庭園 (Nishinomaru)", cost: 200, note: "庭園", isVisited: false },
         { id: "d3-7", time: "16:00", type: "Shopping", location: "Namba Parks", cost: 0, note: "Freak's Store, United Arrows", isVisited: false },
         { id: "d3-8", time: "17:30", type: "Shopping", location: "Supreme Osaka", cost: 0, note: "Shopping", isVisited: false },
         { id: "d3-9", time: "18:30", type: "Food", location: "Le Pineau Kitahorie", cost: 1000, note: "甜點", isVisited: false },
         { id: "d3-10", time: "19:00", type: "Food", location: "Mochisho Shizuku", cost: 800, note: "和菓子", isVisited: false },
         { id: "d3-11", time: "19:15", type: "Food", location: "San Bettei Kitashinchi", cost: 8000, note: "Shabushabu @ 19:15", isVisited: false },
         { id: "d3-12", time: "21:30", type: "Hotel", location: "Zentis Osaka", cost: 0, note: "Back to Hotel", isVisited: false }
       ]
     },
     // === Day 4: Monday, 23rd March ===
     { 
       day: 4, date: "2026-03-23", weather: "Rain", 
       activities: [
         { id: "d4-1", time: "10:00", type: "Hotel", location: "Zentis Osaka", cost: 0, note: "出發", isVisited: false },
         { id: "d4-2", time: "11:00", type: "Food", location: "Ramen KUON", cost: 1200, note: "需三月先Book", isVisited: false },
         { id: "d4-3", time: "13:00", type: "Sightseeing", location: "鶴見綠地公園 (Tsurumi Ryokuchi)", cost: 0, note: "賞櫻", isVisited: false },
         { id: "d4-4", time: "15:30", type: "Shopping", location: "LaLaport 門真 / Outlet", cost: 0, note: "Mitsui Outlet Park", isVisited: false },
         { id: "d4-5", time: "19:15", type: "Food", location: "Tempura tentomi", cost: 10000, note: "Booked 19:15 (天婦羅)", isVisited: false },
         { id: "d4-6", time: "21:30", type: "Hotel", location: "Zentis Osaka", cost: 0, note: "Back to Hotel", isVisited: false }
       ]
     },
     // === Day 5: Tuesday, 24th March ===
     { 
       day: 5, date: "2026-03-24", weather: "Cloud", 
       activities: [
         { id: "d5-1", time: "10:00", type: "Hotel", location: "Zentis Osaka", cost: 0, note: "Check out", isVisited: false },
         { id: "d5-2", time: "11:00", type: "Sightseeing", location: "中之島美術館 (NAKKA)", cost: 1800, note: "go at 11", isVisited: false },
         { id: "d5-3", time: "12:00", type: "Food", location: "小麥之麵神 KITTE大阪店", cost: 1200, note: "going to book 12 (3月先book到)", isVisited: false },
         { id: "d5-4", time: "14:00", type: "Shopping", location: "Grand Front Osaka", cost: 0, note: "Shopping", isVisited: false },
         { id: "d5-5", time: "15:00", type: "Food", location: "grenier Umeda", cost: 800, note: "下午茶", isVisited: false },
         { id: "d5-6", time: "16:00", type: "Shopping", location: "Umeda LOFT", cost: 0, note: "Shopping", isVisited: false },
         { id: "d5-7", time: "17:00", type: "Shopping", location: "Hankyu Department Store", cost: 0, note: "梅田本店", isVisited: false },
         { id: "d5-8", time: "18:00", type: "Sightseeing", location: "GRAND GREEN OSAKA", cost: 0, note: "新地標", isVisited: false }
       ]
     }
  ]
};

export const useTripStore = create<TripState>()(
  persist(
    (set) => ({
      trips: [INITIAL_TRIP],
      activeTripId: null,

      setActiveTrip: (id) => set({ activeTripId: id }),

      addTrip: (tripData) => set((state) => ({
        trips: [...state.trips, { 
            ...tripData, id: uuidv4(), members: [], bookings: [], expenses: [], dailyItinerary: [], budgetTotal: 0,
            plans: DEFAULT_PACKING_LIST.map((text, i) => ({ id: uuidv4(), category: 'Packing', text, priority: 'High', isCompleted: false }))
        }]
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
            return {
                ...t,
                plans: t.plans.map(p => p.id === itemId ? { ...p, isCompleted: !p.isCompleted } : p)
            };
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
    { name: 'vm-build-v7-final', storage: createJSONStorage(() => localStorage) } // 更新 Version 以刷新資料
  )
);