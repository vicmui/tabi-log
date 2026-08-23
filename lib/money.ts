// lib/money.ts
import { Expense, Trip } from "@/store/useTripStore";

export const CURRENCY_SYMBOL: Record<string, string> = {
  JPY: "¥", TWD: "NT$", HKD: "HK$", KRW: "₩",
  SGD: "S$", THB: "฿", EUR: "€", USD: "$", GBP: "£",
  CNY: "¥", AUD: "A$", MYR: "RM", VND: "₫",
};

/** 沒有小數位的貨幣 —— 日圓、韓圜、越南盾切勿顯示小數 */
const ZERO_DECIMAL = new Set(["JPY", "KRW", "VND"]);

export const symbolOf = (c?: string) => CURRENCY_SYMBOL[c ?? ""] ?? (c ? c + " " : "$");

/**
 * 記帳的基準貨幣 —— 預算、總計、分帳都以此為準。
 * 你在總預算填 50,000 時心裡想的是港元，所以基準是港元而非當地貨幣。
 */
export const homeOf = (trip: Trip): string => trip.homeCurrency ?? "HKD";

/**
 * 旅程目的地的貨幣，記帳時的預設輸入幣別。
 * 舊旅程沒有設定過這個欄位，退回 JPY —— 從前整個介面把 undefined
 * 交給符號表，結果全部顯示成 HK$，數字卻是日圓，看起來就像匯率壞掉。
 */
export const localOf = (trip: Trip): string => trip.localCurrency ?? "JPY";

export function formatMoney(amount: number, currency?: string): string {
  const c = currency ?? "HKD";
  const n = ZERO_DECIMAL.has(c)
    ? Math.round(amount).toLocaleString()
    : (Math.round(amount * 100) / 100).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
  return `${symbolOf(c)}${n}`;
}

/** 一筆支出實際輸入時所用的貨幣 */
export const currencyOf = (exp: Expense, trip: Trip): string =>
  exp.currency ?? localOf(trip);

/**
 * 記帳當刻鎖定的匯率：1 單位該貨幣 = 多少「基準貨幣」。
 *
 * 為何每筆各存一份，而不是共用 trip.exchangeRate：
 * 匯率會浮動。若只有一個共用值，日後一更新，過去記好的帳會整批跟著變 ——
 * 那些錢明明已經花了，帳面卻無故改動。快照一鎖，過去的帳就永遠是當時的事實。
 */
export function rateOf(exp: Expense, trip: Trip): number {
  if (exp.rate != null) return exp.rate;
  // 舊資料：金額以當地貨幣記錄，換算率就是旅程的匯率
  if (currencyOf(exp, trip) === homeOf(trip)) return 1;
  return trip.exchangeRate ?? 1;
}

/** 換算成基準貨幣（預算與總計都用這個） */
export const toHome = (exp: Expense, trip: Trip): number =>
  exp.amount * rateOf(exp, trip);

/** 一組支出以基準貨幣加總 */
export const sumHome = (expenses: Expense[], trip: Trip): number =>
  (expenses ?? []).reduce((acc, e) => acc + toHome(e, trip), 0);

/** 指定日期（YYYY-MM-DD）的支出總額，以基準貨幣計 */
export const sumOnDate = (trip: Trip, date: string): number =>
  sumHome((trip.expenses ?? []).filter(e => e.date === date), trip);

/** 每一日的花費，依行程日排列 */
export function dailySpend(trip: Trip): { date: string; day: number; amount: number }[] {
  return (trip.dailyItinerary ?? []).map(d => ({
    date: d.date,
    day: d.day,
    amount: sumOnDate(trip, d.date),
  }));
}

/** 常用貨幣選項 */
export const COMMON_CURRENCIES = [
  "JPY", "HKD", "TWD", "KRW", "GBP", "EUR", "USD", "THB", "SGD", "CNY", "AUD", "MYR",
];
