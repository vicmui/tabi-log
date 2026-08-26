import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/lib/supabase';

export interface Member { id: string; name: string; avatar: string; role?: string; }
export type BookingType = 'Flight' | 'Hotel' | 'Rental' | 'Ticket';
// endDate / currency 為後加欄位。
// 從前住宿只得一個 date，退房日子無處可放，唯有塞落「Check-out 時間」那格文字，
// 於是「住 11 至 15 號」變成一句人手打的說話 —— 程式讀不到，行事曆亦排不出。
// currency 同理：從前存檔時把港元硬換成日圓才儲，匯率一改，過去的單就跟著變。
export interface Booking { id: string; type: BookingType; title: string; date: string; details: { price?: number; currency?: string; endDate?: string; address?: string; fileUrl?: string; note?: string; airline?: string; flightNum?: string; seat?: string; gate?: string; origin?: string; destination?: string; departTime?: string; arriveTime?: string; checkIn?: string; checkOut?: string; pickupLocation?: string; dropoffLocation?: string; }; }
/**
 * 旅遊證件 —— 簽證、入境 QR（Visit Japan Web / K-ETA 之類）、保險、護照影本。
 *
 * 這裡只存 Storage 的 path，不存 public URL：
 * 證件不同酒店封面，一條猜不到的公開連結仍然是公開的 —— 誰拿到誰看得到。
 * 讀取時才即時簽發一條短效連結，逾時自動失效。
 */
export type TravelDocKind = 'Entry' | 'Visa' | 'Insurance' | 'Passport' | 'Other';
export interface TravelDoc {
  id: string;
  kind: TravelDocKind;
  title: string;
  /** 持有人；一家人各自一張 QR 時用來分辨 */
  holder?: string;
  /** Supabase Storage 路徑（私人 bucket） */
  path?: string;
  /** 舊資料／公開 bucket 的直接連結 */
  fileUrl?: string;
  expiry?: string;
  note?: string;
}
export type ExpenseCategory = 'Food' | 'Transport' | 'Accommodation' | 'Sightseeing' | 'Shopping' | 'Other';
// currency / rate 為後加欄位：舊紀錄沒有時一律視為旅程當地貨幣 + trip.exchangeRate，
// 因此既有帳目的顯示完全不變。rate = 記帳當刻「1 單位該貨幣 = 多少港元」。
export interface Expense { id: string; amount: number; currency?: string; rate?: number; category: ExpenseCategory; itemName: string; note: string; date: string; payerId: string; splitWithIds: string[]; customSplit?: Record<string, number>; receiptUrl?: string; }
export type Priority = 'High' | 'Medium' | 'Low';
export interface PlanItem { id: string; category: 'Todo' | 'Packing' | 'Shopping'; text: string; priority: Priority; location?: string; estimatedCost?: number; isCompleted: boolean; assigneeId?: string; imageUrl?: string; }
export interface PlaceToVisit { id: string; name: string; placeId?: string; googleMapsUri?: string; address?: string; note?: string; category?: string; suggestedBy?: string; order?: number; lat?: number; lng?: number; isVisited: boolean; }
export interface Activity { id: string; time?: string; type: string; location: string; placeId?: string; googleMapsUri?: string; note?: string; rating?: number; comment?: string; isVisited: boolean; photos?: string[]; refPhoto?: string; lat?: number; lng?: number; address?: string; }
export interface DailyItinerary { day: number; date: string; weather?: string; activities: Activity[]; coverImage?: string; coverPosX?: number; coverPosY?: number; customLocation?: string; }
export interface Trip { id: string; sortOrder?: number; title: string; startDate: string; endDate: string; coverImage?: string; coverPosX?: number; coverPosY?: number; destLat?: number; destLng?: number; destLabel?: string; localCurrency?: string; homeCurrency?: string; placesToVisit?: PlaceToVisit[]; documents?: TravelDoc[]; status: 'planning' | 'ongoing' | 'completed'; members: Member[]; bookings: Booking[]; expenses: Expense[]; plans: PlanItem[]; dailyItinerary: DailyItinerary[]; budgetTotal: number; exchangeRate: number; }

interface TripState {
  trips: Trip[];
  activeTripId: string | null;
  isSyncing: boolean;
  /**
   * 尚未確認上傳成功的旅程：tripId → 該次改動的時間戳。
   *
   * 沒有這一份紀錄的話，離線時記的帳只存在本機，
   * 而重新連線時 loadTripsFromCloud 會用雲端的舊版本整份蓋回來 —— 帳就此消失。
   * 這份紀錄同樣寫入 localStorage，所以中途關掉 app 亦不會遺失。
   */
  pendingSync: Record<string, string>;
  flushPendingSync: () => Promise<void>;
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  setActiveTrip: (id: string) => void;
  loadTripsFromCloud: () => Promise<void>;
  applyRemoteTrip: (row: { content: Trip; updated_at?: string }) => void;
  removeRemoteTrip: (tripId: string) => void;
  saveTripToCloud: (trip: Trip) => Promise<void>;
  importData: (trips: Trip[]) => void;
  addTrip: (trip: Omit<Trip, 'id'|'members'|'bookings'|'expenses'|'plans'|'dailyItinerary'|'budgetTotal'|'exchangeRate'>) => void;
  deleteTrip: (tripId: string) => Promise<void>;
  updateTrip: (tripId: string, data: Partial<Trip>) => void;
  reorderTrips: (orderedTrips: Trip[]) => void;
  updateTripSettings: (tripId: string, title: string, newStartDate: string, coverImage: string) => void;
  updateBudgetTotal: (tripId: string, total: number) => void;
  updateTripRate: (tripId: string, rate: number) => void;
  addBooking: (tripId: string, booking: Booking) => void;
  updateBooking: (tripId: string, bookingId: string, data: Partial<Booking>) => void;
  deleteBooking: (tripId: string, bookingId: string) => void;
  addDocument: (tripId: string, doc: TravelDoc) => void;
  updateDocument: (tripId: string, docId: string, data: Partial<TravelDoc>) => void;
  deleteDocument: (tripId: string, docId: string) => void;
  addExpense: (tripId: string, expense: Expense) => void;
  updateExpense: (tripId: string, expenseId: string, data: Partial<Expense>) => void;
  deleteExpense: (tripId: string, expenseId: string) => void;
  addPlanItem: (tripId: string, item: PlanItem) => void;
  updatePlanItem: (tripId: string, itemId: string, data: Partial<PlanItem>) => void;
  togglePlanItem: (tripId: string, itemId: string) => void;
  deletePlanItem: (tripId: string, itemId: string) => void;
  updatePlanOrder: (tripId: string, newPlans: PlanItem[]) => void;
  addActivity: (tripId: string, dayIndex: number, activity: Omit<Activity, 'id'>) => void;
  updateActivity: (tripId: string, dayIndex: number, activityId: string, data: Partial<Activity>) => void;
  updateActivityOrder: (tripId: string, dayIndex: number, newActivities: Activity[]) => void;
  deleteActivity: (tripId: string, dayIndex: number, activityId: string) => void;
  addDayToTrip: (tripId: string) => void;
  deleteDayFromTrip: (tripId: string, dayIndex: number) => void;
  updateDayCoverImage: (tripId: string, dayIndex: number, imageUrl: string) => void;
  updateDayCoverFocus: (tripId: string, dayIndex: number, x: number, y: number) => void;
  updateDayLocation: (tripId: string, dayIndex: number, location: string) => void;
  addPlaceToVisit: (tripId: string, place: Omit<PlaceToVisit, 'id'>) => void;
  togglePlaceVisited: (tripId: string, placeId: string) => void;
  deletePlaceToVisit: (tripId: string, placeId: string) => void;
  reorderPlacesToVisit: (tripId: string, newPlaces: PlaceToVisit[]) => void;
}

const DEFAULT_PACKING_LIST = ["✈️ 護照、簽證", "💳 信用卡、現金", "📱 手機、充電器", "🧳 行李打包", "🏨 飯店預訂確認", "🎫 機票確認", "💊 常用藥品", "📸 相機、記憶卡", "🌂 雨具", "🔌 轉接頭"];
const INITIAL_TRIP: Trip = { id: "trip-osaka-mum", title: "Osaka Trip (March) 🇯🇵", startDate: "2026-03-20", endDate: "2026-03-24", status: "planning", coverImage: "/osaka-cover.jpg", budgetTotal: 300000, exchangeRate: 0.052, members: [{ id: "m1", name: "VM", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" }, { id: "m2", name: "媽咪", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka" }], bookings: [], expenses: [], placesToVisit: [], plans: DEFAULT_PACKING_LIST.map((text, i) => ({ id: `default-${i}`, category: 'Packing', text, priority: 'High', isCompleted: false })), dailyItinerary: [{ day: 1, date: "2026-03-20", weather: "Cloud", activities: [] }, { day: 2, date: "2026-03-21", weather: "Sun", activities: [] }, { day: 3, date: "2026-03-22", weather: "Sun", activities: [] }, { day: 4, date: "2026-03-23", weather: "Rain", activities: [] }, { day: 5, date: "2026-03-24", weather: "Cloud", activities: [] }] };

// 補上舊資料可能缺少的欄位，避免渲染時出錯
const normalizeTrip = (trip: Trip): Trip => {
  if (!trip.placesToVisit) trip.placesToVisit = [];
  if (!trip.members) trip.members = [];
  if (!trip.bookings) trip.bookings = [];
  if (!trip.expenses) trip.expenses = [];
  if (!trip.plans) trip.plans = [];
  if (!trip.dailyItinerary) trip.dailyItinerary = [];
  trip.dailyItinerary.forEach(day => {
    if (!day.activities) day.activities = [];
    day.activities = day.activities.filter(a => !!a && !!a.id);
  });
  return trip;
};

// 首頁旅程卡的排序：先按使用者拖曳出來的次序，未排過的排最後（按出發日期）
const sortTrips = (trips: Trip[]): Trip[] =>
  [...trips].sort((a, b) => {
    const ao = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const bo = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return (a.startDate || '').localeCompare(b.startDate || '');
  });

// 記錄本機剛上傳的 updated_at。Realtime 會把自己的寫入一併推回，
// 若不加以區分，便會用「剛上傳的版本」覆蓋本機正在編輯的狀態。
const ownWrites = new Set<string>();

const updateStateAndSave = (set: any, get: any, updateFn: (state: TripState) => Partial<TripState>, tripId?: string) => {
  set(updateFn);
  if (tripId) {
    const updatedTrip = get().trips.find((t: Trip) => t.id === tripId);
    if (updatedTrip) get().saveTripToCloud(updatedTrip);
  }
};

const sortByTime = (activities: Activity[]) =>
  activities.sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time);
  });

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      trips: [INITIAL_TRIP],
      activeTripId: null,
      isSyncing: false,
      pendingSync: {},
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),
      setActiveTrip: (id) => set({ activeTripId: id }),

      /**
       * 把仍未上傳的改動推上雲端。恢復連線、或由背景切回前景時呼叫。
       * 逐個順序上傳而非並發：數量必然很少，順序做易於推理，亦不會撞爆連線。
       */
      flushPendingSync: async () => {
        const ids = Object.keys(get().pendingSync);
        if (ids.length === 0) return;
        for (const id of ids) {
          const trip = get().trips.find(t => t.id === id);
          if (trip) await get().saveTripToCloud(trip);
        }
      },

      loadTripsFromCloud: async () => {
        // 先把本機未上傳的改動推上去，再讀 —— 次序倒轉的話，
        // 下面即使有保護，雲端與本機亦會多繞一圈才收斂。
        await get().flushPendingSync();

        set({ isSyncing: true });
        try {
          const { data, error } = await supabase.from('trips').select('*');
          if (error) {
            console.warn('loadTripsFromCloud failed', error.message);
          } else if (data) {
            const pending = get().pendingSync;
            const local   = get().trips;
            const cloud   = data.map(row => normalizeTrip(row.content as Trip));

            const seen = new Set<string>();
            const merged: Trip[] = cloud.map(c => {
              seen.add(c.id);
              const localVer = local.find(t => t.id === c.id);
              // 這個旅程本機仍有未上傳的改動：本機版本才是最新，不可被雲端蓋走
              return pending[c.id] && localVer ? localVer : c;
            });

            // 雲端沒有、本機有的旅程：
            // 有 pending 代表根本未上傳過，要保住；
            // 沒有 pending 代表曾經同步成功而如今雲端已無 —— 即在另一部裝置刪掉了，應跟著移除。
            local.forEach(t => {
              if (!seen.has(t.id) && pending[t.id]) merged.push(t);
            });

            if (merged.length > 0) {
              const sorted = sortTrips(merged);
              set({ trips: sorted });
              const currentId = get().activeTripId;
              if (!sorted.some(t => t.id === currentId)) {
                set({ activeTripId: sorted[0].id });
              }
            }
          }
        } catch (e) {
          // 讀取失敗就保留本機資料，不做任何覆寫
          console.warn('loadTripsFromCloud threw', e);
        }
        set({ isSyncing: false });
      },

      saveTripToCloud: async (trip: Trip) => {
        set({ isSyncing: true });
        const stamp = new Date().toISOString();
        ownWrites.add(stamp);
        setTimeout(() => ownWrites.delete(stamp), 60000);

        // 先標記未同步再上傳：即使此刻斷電、關掉 app，重開後仍然知道這個旅程未上到雲端
        set(state => ({ pendingSync: { ...state.pendingSync, [trip.id]: stamp } }));

        let ok = false;
        try {
          // Supabase 的 upsert 不會 throw，失敗是回傳 { error } ——
          // 從前只用 try/catch，最常見的失敗（RLS 攔截、4xx）根本進不到 catch，於是靜靜地當作成功。
          const { error } = await supabase
            .from('trips')
            .upsert({ id: trip.id, title: trip.title, content: trip, updated_at: stamp });
          ok = !error;
          if (error) console.warn('saveTripToCloud failed', error.message);
        } catch (e) {
          ok = false;   // 離線時 fetch 會 throw
          console.warn('saveTripToCloud threw', e);
        }

        set(state => {
          if (!ok) return { isSyncing: false };
          // 上傳途中若又改過一次，時間戳已被覆蓋 —— 那筆新改動仍未上傳，標記不可清走
          if (state.pendingSync[trip.id] !== stamp) return { isSyncing: false };
          const next = { ...state.pendingSync };
          delete next[trip.id];
          return { pendingSync: next, isSyncing: false };
        });
      },

      // 由 Realtime 推送而來的改動（即另一部裝置的編輯）
      applyRemoteTrip: (row) => {
        if (row.updated_at && ownWrites.has(row.updated_at)) return; // 本機自己的寫入，略過
        // 本機仍有未上傳的改動，遠端版本必定較舊，不可套用
        if (row?.content?.id && get().pendingSync[row.content.id]) return;
        const incoming = row?.content;
        if (!incoming || !incoming.id) return;
        const trip = normalizeTrip(incoming);
        set(state => ({
          trips: sortTrips(
            state.trips.some(t => t.id === trip.id)
              ? state.trips.map(t => (t.id === trip.id ? trip : t))
              : [...state.trips, trip]
          ),
        }));
      },

      removeRemoteTrip: (tripId) => set(state => {
        const newTrips = state.trips.filter(t => t.id !== tripId);
        return {
          trips: newTrips,
          activeTripId: state.activeTripId === tripId ? (newTrips[0]?.id || null) : state.activeTripId,
        };
      }),
      importData: (newTrips: Trip[]) => { set({ trips: newTrips, activeTripId: newTrips.length > 0 ? newTrips[0].id : null }); if (newTrips.length > 0) get().saveTripToCloud(newTrips[0]); },
      addTrip: (tripData) => { const newTrip: Trip = { ...tripData, id: uuidv4(), exchangeRate: 0.052, members: [], bookings: [], expenses: [], dailyItinerary: [], placesToVisit: [], budgetTotal: 0, plans: DEFAULT_PACKING_LIST.map((text) => ({ id: uuidv4(), category: 'Packing', text, priority: 'High', isCompleted: false })) }; set(state => ({ trips: [...state.trips, newTrip], activeTripId: newTrip.id })); get().saveTripToCloud(newTrip); },
      deleteTrip: async (tripId) => {
        set({ isSyncing: true });
        try { await supabase.from('trips').delete().eq('id', tripId); } catch (e) { console.warn('deleteTrip failed', e); }
        set(state => {
          const newTrips = state.trips.filter(t => t.id !== tripId);
          // 一併清走待同步標記，否則下次讀雲端會把這個已刪的旅程當成「未上傳」再放回來
          const nextPending = { ...state.pendingSync };
          delete nextPending[tripId];
          return {
            trips: newTrips,
            pendingSync: nextPending,
            activeTripId: state.activeTripId === tripId ? (newTrips[0]?.id || null) : state.activeTripId,
            isSyncing: false,
          };
        });
      },
      updateTrip: (tripId, data) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, ...data } : t) }), tripId),

      // 首頁拖曳排序：把新次序寫入每張卡的 sortOrder，逐張存回雲端
      reorderTrips: (orderedTrips) => {
        const stamped = orderedTrips.map((t, i) => ({ ...t, sortOrder: i }));
        set({ trips: stamped });
        stamped.forEach(t => get().saveTripToCloud(t));
      },
      updateTripSettings: (tripId, title, newStartDate, coverImage) => updateStateAndSave(set, get, (state) => ({ trips: state.trips.map(t => { if (t.id !== tripId) return t; const start = new Date(newStartDate); const newItinerary = t.dailyItinerary.map((day, index) => { const d = new Date(start); d.setDate(start.getDate() + index); return { ...day, date: d.toISOString().split('T')[0] }; }); const lastDate = new Date(start); if (newItinerary.length > 0) lastDate.setDate(start.getDate() + newItinerary.length - 1); return { ...t, title, startDate: newStartDate, coverImage, dailyItinerary: newItinerary, endDate: lastDate.toISOString().split('T')[0] }; }) }), tripId),
      updateBudgetTotal: (tripId, total) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, budgetTotal: total } : t) }), tripId),
      updateTripRate: (tripId, rate) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, exchangeRate: rate } : t) }), tripId),
      addBooking: (tripId, booking) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, bookings: [...t.bookings, booking] } : t) }), tripId),
      updateBooking: (tripId, bookingId, data) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, bookings: t.bookings.map(b => b.id === bookingId ? { ...b, ...data } : b) } : t) }), tripId),
      deleteBooking: (tripId, bookingId) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, bookings: t.bookings.filter(b => b.id !== bookingId) } : t) }), tripId),
      addDocument: (tripId, doc) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, documents: [...(t.documents ?? []), doc] } : t) }), tripId),
      updateDocument: (tripId, docId, data) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, documents: (t.documents ?? []).map(d => d.id === docId ? { ...d, ...data } : d) } : t) }), tripId),
      deleteDocument: (tripId, docId) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, documents: (t.documents ?? []).filter(d => d.id !== docId) } : t) }), tripId),
      addExpense: (tripId, expense) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, expenses: [expense, ...t.expenses] } : t) }), tripId),
      updateExpense: (tripId, expenseId, data) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, expenses: t.expenses.map(e => e.id === expenseId ? { ...e, ...data } : e) } : t) }), tripId),
      deleteExpense: (tripId, expenseId) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, expenses: t.expenses.filter(e => e.id !== expenseId) } : t) }), tripId),
      addPlanItem: (tripId, item) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, plans: [...t.plans, item] } : t) }), tripId),
      updatePlanItem: (tripId, itemId, data) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, plans: t.plans.map(p => p.id === itemId ? { ...p, ...data } : p) } : t) }), tripId),
      togglePlanItem: (tripId, itemId) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(t => { if (t.id !== tripId) return t; return { ...t, plans: t.plans.map(p => p.id === itemId ? { ...p, isCompleted: !p.isCompleted } : p) }; }) }), tripId),
      deletePlanItem: (tripId, itemId) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, plans: t.plans.filter(p => p.id !== itemId) } : t) }), tripId),
      updatePlanOrder: (tripId, newPlans) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(t => t.id === tripId ? { ...t, plans: newPlans } : t) }), tripId),
      addActivity: (tripId, dayIndex, activity) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(trip => { if (trip.id !== tripId) return trip; const newItinerary = [...trip.dailyItinerary]; if (!newItinerary[dayIndex]) return trip; const { cost, ...rest } = activity as any; newItinerary[dayIndex] = { ...newItinerary[dayIndex], activities: sortByTime([...newItinerary[dayIndex].activities, { ...rest, id: uuidv4(), isVisited: false }]) }; return { ...trip, dailyItinerary: newItinerary }; }) }), tripId),
      updateActivity: (tripId, dayIndex, activityId, data) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(trip => { if (trip.id !== tripId) return trip; const newItinerary = [...trip.dailyItinerary]; const updated = newItinerary[dayIndex].activities.map(a => a.id === activityId ? { ...a, ...data } : a); newItinerary[dayIndex] = { ...newItinerary[dayIndex], activities: data.time ? sortByTime(updated) : updated }; return { ...trip, dailyItinerary: newItinerary }; }) }), tripId),
      updateActivityOrder: (tripId, dayIndex, newActivities) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(trip => { if (trip.id !== tripId) return trip; const newItinerary = [...trip.dailyItinerary]; newItinerary[dayIndex] = { ...newItinerary[dayIndex], activities: newActivities }; return { ...trip, dailyItinerary: newItinerary }; }) }), tripId),
      deleteActivity: (tripId, dayIndex, activityId) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(trip => { if (trip.id !== tripId) return trip; const newItinerary = [...trip.dailyItinerary]; newItinerary[dayIndex] = { ...newItinerary[dayIndex], activities: newItinerary[dayIndex].activities.filter(a => a.id !== activityId) }; return { ...trip, dailyItinerary: newItinerary }; }) }), tripId),
      addDayToTrip: (tripId) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(trip => { if (trip.id !== tripId) return trip; let nextDateStr = trip.startDate; if (trip.dailyItinerary.length > 0) { const lastDay = trip.dailyItinerary[trip.dailyItinerary.length - 1]; const d = new Date(lastDay.date); d.setDate(d.getDate() + 1); nextDateStr = d.toISOString().split('T')[0]; } return { ...trip, endDate: nextDateStr, dailyItinerary: [...trip.dailyItinerary, { day: trip.dailyItinerary.length + 1, date: nextDateStr, weather: 'Sun', activities: [] }] }; }) }), tripId),
      deleteDayFromTrip: (tripId, dayIndex) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(trip => { if (trip.id !== tripId) return trip; const newItinerary = trip.dailyItinerary.filter((_, idx) => idx !== dayIndex).map((item, idx) => ({ ...item, day: idx + 1 })); return { ...trip, dailyItinerary: newItinerary }; }) }), tripId),
      updateDayCoverImage: (tripId, dayIndex, imageUrl) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(trip => { if (trip.id !== tripId) return trip; const newItinerary = [...trip.dailyItinerary]; if (newItinerary[dayIndex]) newItinerary[dayIndex] = { ...newItinerary[dayIndex], coverImage: imageUrl, coverPosX: 50, coverPosY: 50 }; return { ...trip, dailyItinerary: newItinerary }; }) }), tripId),
      updateDayCoverFocus: (tripId, dayIndex, x, y) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(trip => { if (trip.id !== tripId) return trip; const newItinerary = [...trip.dailyItinerary]; if (newItinerary[dayIndex]) newItinerary[dayIndex] = { ...newItinerary[dayIndex], coverPosX: x, coverPosY: y }; return { ...trip, dailyItinerary: newItinerary }; }) }), tripId),
      updateDayLocation: (tripId, dayIndex, location) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(trip => { if (trip.id !== tripId) return trip; const newItinerary = [...trip.dailyItinerary]; if (newItinerary[dayIndex]) newItinerary[dayIndex] = { ...newItinerary[dayIndex], customLocation: location }; return { ...trip, dailyItinerary: newItinerary }; }) }), tripId),
      addPlaceToVisit: (tripId, place) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(trip => { if (trip.id !== tripId) return trip; return { ...trip, placesToVisit: [...(trip.placesToVisit || []), { ...place, id: uuidv4() }] }; }) }), tripId),
      togglePlaceVisited: (tripId, placeId) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(trip => { if (trip.id !== tripId) return trip; return { ...trip, placesToVisit: (trip.placesToVisit || []).map(p => p.id === placeId ? { ...p, isVisited: !p.isVisited } : p) }; }) }), tripId),
      deletePlaceToVisit: (tripId, placeId) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(trip => { if (trip.id !== tripId) return trip; return { ...trip, placesToVisit: (trip.placesToVisit || []).filter(p => p.id !== placeId) }; }) }), tripId),
      reorderPlacesToVisit: (tripId, newPlaces) => updateStateAndSave(set, get, state => ({ trips: state.trips.map(trip => trip.id !== tripId ? trip : { ...trip, placesToVisit: newPlaces }) }), tripId),
    }),
    {
      name: 'vm-build-v18-dnd-planning',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        // Mark hydration complete after localStorage is read
        state?.setHasHydrated(true);
        // isSyncing 亦會被寫入 localStorage：若在同步途中關掉 app，
        // 下次開啟就會停在「同步中」那條藍線，實際上什麼都沒有在跑。開機時一律歸零。
        if (state) state.isSyncing = false;
      },
    }
  )
);
