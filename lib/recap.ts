// lib/recap.ts
import { Activity, ExpenseCategory, Trip } from "@/store/useTripStore";
import { dailySpend, homeOf, sumHome, toHome } from "@/lib/money";

/**
 * 旅程回顧的統計。全部由現有資料推算，不需要使用者額外輸入任何東西。
 */

export const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  Food: "餐飲", Transport: "交通", Accommodation: "住宿",
  Sightseeing: "景點", Shopping: "購物", Other: "其他",
};

/** 兩點之間的球面距離（公里） */
function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const hasCoords = (a?: Activity) =>
  !!a && a.lat != null && a.lng != null && !isNaN(Number(a.lat)) && !isNaN(Number(a.lng));

export interface RecapDay {
  day: number;
  date: string;
  label?: string;
  activities: Activity[];
  spend: number;
  km: number;
}

export interface Recap {
  days: RecapDay[];
  dayCount: number;
  totalPlaces: number;
  visitedPlaces: number;
  /** 有沒有人用過「打卡」—— 沒有的話，「到訪比例」這個數字沒有意義，介面要改講法 */
  usedCheckIn: boolean;
  km: number;
  totalSpend: number;
  avgDailySpend: number;
  home: string;
  topRated: { act: Activity; day: number }[];
  byCategory: { key: ExpenseCategory; label: string; amount: number }[];
  peakDay?: RecapDay;
  biggestExpense?: { name: string; amount: number; date: string };
  photos: string[];
}

export function buildRecap(trip: Trip): Recap {
  const home = homeOf(trip);
  const spendByDate = new Map(dailySpend(trip).map(d => [d.date, d.amount]));

  const days: RecapDay[] = (trip.dailyItinerary ?? []).map(d => {
    const acts = (d.activities ?? []).filter(Boolean);
    // 距離 = 當日相鄰兩個地點的直線距離總和。
    // 這是「至少移動了這麼遠」的下限，不是實際步行或乘車距離 —— 介面上要照實說。
    let km = 0;
    const geo = acts.filter(hasCoords);
    for (let i = 1; i < geo.length; i++) {
      km += haversineKm(
        { lat: Number(geo[i - 1].lat), lng: Number(geo[i - 1].lng) },
        { lat: Number(geo[i].lat), lng: Number(geo[i].lng) }
      );
    }
    return {
      day: d.day,
      date: d.date,
      label: d.customLocation,
      activities: acts,
      spend: spendByDate.get(d.date) ?? 0,
      km,
    };
  });

  const all = days.flatMap(d => d.activities.map(act => ({ act, day: d.day })));
  const visited = all.filter(x => x.act.isVisited).length;

  const topRated = all
    .filter(x => (x.act.rating ?? 0) >= 4)
    .sort((a, b) => (b.act.rating ?? 0) - (a.act.rating ?? 0))
    .slice(0, 5);

  const catMap = new Map<ExpenseCategory, number>();
  (trip.expenses ?? []).forEach(e => {
    catMap.set(e.category, (catMap.get(e.category) ?? 0) + toHome(e, trip));
  });
  const byCategory = [...catMap.entries()]
    .map(([key, amount]) => ({ key, label: CATEGORY_LABEL[key] ?? key, amount }))
    .sort((a, b) => b.amount - a.amount);

  const totalSpend = sumHome(trip.expenses ?? [], trip);
  const spentDays = days.filter(d => d.spend > 0);
  const peakDay = spentDays.length
    ? spentDays.reduce((m, d) => (d.spend > m.spend ? d : m))
    : undefined;

  const biggest = (trip.expenses ?? []).reduce<{ name: string; amount: number; date: string } | undefined>(
    (m, e) => {
      const amt = toHome(e, trip);
      return !m || amt > m.amount ? { name: e.itemName, amount: amt, date: e.date } : m;
    },
    undefined
  );

  // 相片：先放打卡過的地點，再放其他
  const photos = [...all]
    .sort((a, b) => Number(!!b.act.isVisited) - Number(!!a.act.isVisited))
    .flatMap(x => [...(x.act.photos ?? []), ...((x.act as any).refPhoto ? [(x.act as any).refPhoto] : [])])
    .filter((u, i, arr) => !!u && arr.indexOf(u) === i);

  return {
    days,
    dayCount: days.length,
    totalPlaces: all.length,
    visitedPlaces: visited,
    usedCheckIn: visited > 0,
    km: days.reduce((s, d) => s + d.km, 0),
    totalSpend,
    // 只計行程日內的開支：訂機票、訂酒店那種出發前的支出不應拉高「每日」平均
    avgDailySpend: spentDays.length ? spentDays.reduce((t, d) => t + d.spend, 0) / spentDays.length : 0,
    home,
    topRated,
    byCategory,
    peakDay,
    biggestExpense: biggest,
    photos,
  };
}
