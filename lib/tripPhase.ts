// lib/tripPhase.ts
import { Trip } from "@/store/useTripStore";

/**
 * 旅程所處的階段：籌備中、進行中、已完成。
 *
 * Trip 本身有一個 status 欄位，但從來沒有任何介面去更新它 —— 每個旅程建立時寫入
 * 'planning' 之後便永遠停在那裡。與其補一堆「記得改狀態」的按鈕，
 * 不如直接由日期推算：日期本身就是事實，不會忘記更新。
 */
export type TripPhase = "upcoming" | "ongoing" | "completed";

/**
 * 本地日期的 YYYY-MM-DD。
 * 刻意不用 toISOString()：那是 UTC，在日本早上八點開 app，UTC 仍是前一日。
 */
export function localDateKey(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 兩個 YYYY-MM-DD 之間相差的日曆日數（b − a），不受時分秒與時區影響 */
export function daysBetween(a: string, b: string): number {
  const ta = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
  const tb = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10));
  return Math.round((tb - ta) / 86400000);
}

/**
 * 旅程的實際起訖日。
 * 以每日行程為準，而非 trip.startDate / endDate —— 加減日數時行程會變，
 * 舊版的 endDate 卻未必跟著更新。
 */
export function tripRange(trip: Trip): { start: string; end: string } {
  const days = trip.dailyItinerary ?? [];
  const start = days[0]?.date ?? trip.startDate;
  const end = days[days.length - 1]?.date ?? trip.endDate ?? start;
  return { start, end };
}

export function tripPhase(trip: Trip, today: string = localDateKey()): TripPhase {
  const { start, end } = tripRange(trip);
  if (!start) return "upcoming";
  if (today < start) return "upcoming";
  if (today > end) return "completed";
  return "ongoing";
}

/** 首頁卡片上的標籤文字 */
export function phaseLabel(trip: Trip, today: string = localDateKey()): string {
  const { start } = tripRange(trip);
  const phase = tripPhase(trip, today);
  if (phase === "completed") return "已完成";
  if (phase === "ongoing") {
    const n = daysBetween(start, today) + 1;
    return `旅程進行中 · Day ${n}`;
  }
  const left = daysBetween(today, start);
  if (left === 1) return "明日出發";
  return `尚餘 ${left} 天`;
}
