import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

// ================= 類型定義 (保留所有新功能) =================

export interface Member { id: string; name: string; avatar: string; }

export type BookingType = 'Flight' | 'Hotel' | 'Rental' | 'Ticket';
export interface Booking {
  id: string; type: BookingType; title: string; date: string;
  details: { 
    checkIn?: string; checkOut?: string; 
    seat?: string; gate?: string; airline?: string; 
    pickupLocation?: string; dropoffLocation?: string;
    address?: string; price?: number; 
  };
}

export type ExpenseCategory = 'Food' | 'Transport' | 'Accommodation' | 'Sightseeing' | 'Shopping' | 'Other';
export interface Expense {
  id: string; amount: number; category: ExpenseCategory; 
  itemName: string; note: string; date: string; 
  payerId: string; splitWithIds: string[]; 
  customSplit?: Record<string, number>; // 自訂分帳金額
  receiptUrl?: string; // 收據
}

export type Priority = 'High' | 'Medium' | 'Low';
export interface PlanItem {
  id: string; category: 'Todo' | 'Packing' | 'Shopping'; 
  text: string; priority: Priority; 
  location?: string; estimatedCost?: number; // 購物預算
  isCompleted: boolean; assigneeId?: string; imageUrl?: string; // 縮圖
}

export interface Activity {
  id: string; time: string; type: string; 
  location: string; cost: number; 
  note?: string; rating?: number; comment?: string; 
  isVisited: boolean; // 打卡功能
}

export interface DailyItinerary {
  day: number; date: string; weather?: string; activities: Activity[];
}

export interface Trip {
  id: string; title: string; startDate: string; endDate: string; 
  coverImage?: string; status: 'planning' | 'ongoing' | 'completed';
  members: Member[]; bookings: Booking[]; expenses: Expense[]; plans: PlanItem[]; dailyItinerary: DailyItinerary[]; 
  budgetTotal: number;
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
}

// 預設行李清單
const DEFAULT_PACKING_LIST = [
  "✈️ 護照、簽證", "💳 信用卡、現金", "📱 手機、充電器", "🧳 行李打包",
  "🏨 飯店預訂確認", "🎫 機票確認", "💊 常用藥品", "📸 相機、記憶卡",
  "🌂 雨具", "🔌 轉接頭"
];

// 🔥 完整的大阪行程資料 (Day 1 - Day 5)
const INITIAL_TRIP: Trip = {
  id: "trip-osaka-mum",
  title: "Osaka Trip (March) 🇯🇵", // 改了名
  startDate: "2026-03-20",
  endDate: "2026-03-24",
  status: "planning",
  coverImage: "/osaka-cover.jpg", // 記得放你的圖
  budgetTotal: 300000,
  
  members: [
    { id: "m1", name: "VM", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" },
    { id: "m2", name: "媽咪", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka" },
  ],

  bookings: [], 
  expenses: [],
  
  plans: DEFAULT_PACKING_LIST.map((text, i) => ({
    id: `default-${i}`, category: 'Packing', text, priority: 'High', isCompleted: false
  })),

  dailyItinerary: [
     // === Day 1: 20th March (Friday) ===
     { 
       day: 1, date: "2026-03-20", weather: "Cloud",
       activities: [
         { id: "d1-1", time: "Check-in", type: "Hotel", location: "Zentis Osaka", cost: 0, note: "Check in / 放行李", isVisited: false },
         { id: "d1-2", time: "11:00", type: "Shopping", location: "Daimaru Shinsaibashi", cost: 0, note: "大丸心齋橋", isVisited: false },
         { id: "d1-3", time: "12:00", type: "Food", location: "Castella GINSO", cost: 1500, note: "蜂蜜蛋糕", isVisited: false },
         { id: "d1-4", time: "13:00", type: "Food", location: "Harbs", cost: 2000, note: "午茶蛋糕", isVisited: false },
         { id: "d1-5", time: "12:30", type: "Food", location: "Nishiya", cost: 3000, note: "Booked 12:30", isVisited: false },
         { id: "d1-6", time: "16:00", type: "Sightseeing", location: "Osaka Wonder Cruise", cost: 1200, note: "道頓堀遊船", isVisited: false },
         { id: "d1-7", time: "17:30", type: "Sightseeing", location: "法善寺横丁 (Hozenji)", cost: 0, note: "不動明王", isVisited: false },
         { id: "d1-8", time: "18:00", type: "Hotel", location: "Zentis Osaka", cost: 0, note: "稍作休息", isVisited: false },
         { id: "d1-9", time: "18:30", type: "Sightseeing", location: "Harukas 300", cost: 1500, note: "觀景台夜景", isVisited: false },
         { id: "d1-10", time: "19:00", type: "Food", location: "蟹松 (Kanimatsu)", cost: 15000, note: "Booked 19:00 北新地", isVisited: false }
       ]
     },
     // === Day 2: 21st March (Saturday) - Kyoto ===
     { 
       day: 2, date: "2026-03-21", weather: "Sun",
       activities: [
         { id: "d2-1", time: "09:00", type: "Transport", location: "大阪站中央口", cost: 0, note: "JR Ticket Office", isVisited: false },
         { id: "d2-2", time: "10:30", type: "Transport", location: "Kyoto Station", cost: 0, note: "抵達京都", isVisited: false },
         { id: "d2-3", time: "11:00", type: "Sightseeing", location: "To-ji Temple (東寺)", cost: 600, note: "五重塔與櫻花", isVisited: false },
         { id: "d2-4", time: "12:30", type: "Food", location: "GOKAGO", cost: 1000, note: "Coffee Break", isVisited: false },
         { id: "d2-5", time: "13:30", type: "Food", location: "Shoraian (松籟庵)", cost: 6000, note: "Booked 13:30 豆腐料理", isVisited: false },
         { id: "d2-6", time: "15:00", type: "Sightseeing", location: "嵐山人力車 (Ebisuya)", cost: 4000, note: "體驗", isVisited: false },
         { id: "d2-7", time: "16:30", type: "Food", location: "eXcafe Kyoto", cost: 1500, note: "Arashiyama Main Store", isVisited: false },
         { id: "d2-8", time: "18:00", type: "Transport", location: "Kyoto Station", cost: 0, note: "返回大阪", isVisited: false },
         { id: "d2-9", time: "20:15", type: "Food", location: "Sumibiyakitori Ikoka", cost: 5000, note: "Booked 20:15 串燒", isVisited: false },
         { id: "d2-10", time: "22:00", type: "Hotel", location: "Zentis Osaka", cost: 0, note: "Back to Hotel", isVisited: false }
       ]
     },
     // === Day 3: 22nd March (Sunday) ===
     { 
       day: 3, date: "2026-03-22", weather: "Sun", 
       activities: [
         { id: "d3-1", time: "10:00", type: "Food", location: "epais 阪神梅田店", cost: 2000, note: "炸豬排 (2月尾先book到)", isVisited: false },
         { id: "d3-2", time: "10:30", type: "Food", location: "Eel Nakasho", cost: 3000, note: "Shinsaibashi (Booked)", isVisited: false },
         { id: "d3-3", time: "10:30", type: "Food", location: "Harukoma (春駒本店)", cost: 3000, note: "需提早排隊", isVisited: false },
         { id: "d3-4", time: "13:00", type: "Sightseeing", location: "大阪城公園", cost: 600, note: "Osaka Castle 賞櫻", isVisited: false },
         { id: "d3-5", time: "14:30", type: "Sightseeing", location: "西之丸庭園", cost: 200, note: "Nishinomaru Garden", isVisited: false },
         { id: "d3-6", time: "16:00", type: "Shopping", location: "Namba Parks", cost: 0, note: "Freak's Store, United Arrows", isVisited: false },
         { id: "d3-7", time: "17:30", type: "Shopping", location: "Supreme Osaka", cost: 0, note: "Shopping", isVisited: false },
         { id: "d3-8", time: "18:30", type: "Food", location: "Le Pineau Kitahorie", cost: 1000, note: "甜點 Main Store", isVisited: false },
         { id: "d3-9", time: "19:00", type: "Food", location: "Mochisho Shizuku", cost: 800, note: "Shinmachi", isVisited: false },
         { id: "d3-10", time: "19:15", type: "Food", location: "San Bettei Kitashinchi", cost: 8000, note: "Shabushabu @ 19:15", isVisited: false },
         { id: "d3-11", time: "21:30", type: "Hotel", location: "Zentis Osaka", cost: 0, note: "Back to Hotel", isVisited: false }
       ]
     },
     // === Day 4: 23rd March (Monday) ===
     { 
       day: 4, date: "2026-03-23", weather: "Rain", 
       activities: [
         { id: "d4-1", time: "11:00", type: "Food", location: "Ramen KUON", cost: 1200, note: "需三月先Book", isVisited: false },
         { id: "d4-2", time: "13:00", type: "Sightseeing", location: "鶴見綠地公園", cost: 0, note: "Tsurumi Ryokuchi Park 賞櫻", isVisited: false },
         { id: "d4-3", time: "15:30", type: "Shopping", location: "LaLaport 門真", cost: 0, note: "Mitsui Outlet Park", isVisited: false },
         { id: "d4-4", time: "19:15", type: "Food", location: "Tempura tentomi", cost: 10000, note: "Booked 19:15 天婦羅", isVisited: false },
         { id: "d4-5", time: "21:30", type: "Hotel", location: "Zentis Osaka", cost: 0, note: "Back to Hotel", isVisited: false }
       ]
     },
     // === Day 5: 24th March (Tuesday) ===
     { 
       day: 5, date: "2026-03-24", weather: "Cloud", 
       activities: [
         { id: "d5-1", time: "10:00", type: "Hotel", location: "Zentis Osaka", cost: 0, note: "Check out", isVisited: false },
         { id: "d5-2", time: "11:00", type: "Sightseeing", location: "中之島美術館", cost: 1800, note: "NAKKA Art Museum", isVisited: false },
         { id: "d5-3", time: "12:00", type: "Food", location: "小麥之麵神", cost: 1200, note: "KITTE大阪店 (3月先book到)", isVisited: false },
         { id: "d5-4", time: "14:00", type: "Shopping", location: "Grand Front Osaka", cost: 0, note: "Shopping", isVisited: false },
         { id: "d5-5", time: "15:00", type: "Food", location: "grenier", cost: 800, note: "Umeda branch", isVisited: false },
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
      updateBudgetTotal: (tripId, total) => set((state) => ({
        trips: state.trips.map(t => t.id === tripId ? { ...t, budgetTotal: total } : t)
      })),

      addBooking: (tripId, booking) => set((state) => ({
        trips: state.trips.map(t => t.id === tripId ? { ...t, bookings: [...t.bookings, booking] } : t)
      })),
      updateBooking: (tripId, bookingId, data) => set((state) => ({
        trips: state.trips.map(t => t.id === tripId ? { ...t, bookings: t.bookings.map(b => b.id === bookingId ? { ...b, ...data } : b) } : t)
      })),
      deleteBooking: (tripId, bookingId) => set((state) => ({
        trips: state.trips.map(t => t.id === tripId ? { ...t, bookings: t.bookings.filter(b => b.id !== bookingId) } : t)
      })),

      addExpense: (tripId, expense) => set((state) => ({
        trips: state.trips.map(t => t.id === tripId ? { ...t, expenses: [expense, ...t.expenses] } : t)
      })),
      updateExpense: (tripId, expenseId, data) => set((state) => ({
        trips: state.trips.map(t => t.id === tripId ? { ...t, expenses: t.expenses.map(e => e.id === expenseId ? { ...e, ...data } : e) } : t)
      })),
      deleteExpense: (tripId, expenseId) => set((state) => ({
        trips: state.trips.map(t => t.id === tripId ? { ...t, expenses: t.expenses.filter(e => e.id !== expenseId) } : t)
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
    { name: 'vm-build-final-restore', storage: createJSONStorage(() => localStorage) } // 更新 Key 以確保資料刷新
  )
);