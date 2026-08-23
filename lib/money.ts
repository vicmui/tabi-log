// lib/money.ts
import { Expense, Trip } from "@/store/useTripStore";

export const CURRENCY_SYMBOL: Record<string, string> = {
  JPY: "¥", TWD: "NT$", HKD: "HK$", KRW: "₩",
  SGD: "S$", THB: "฿", EUR: "€", USD: "$", GBP: "£",
  CNY: "¥", AUD: "A$", MYR: "RM", VND: "₫",
};

/** 沒有小數位的貨幣 —— 日圓、韓圜、越南盾切勿除以 100 或顯示小數 */
const ZERO_DECIMAL = new Set(["JPY", "KRW", "VND"]);

export const symbolOf = (c?: string) => CURRENCY_SYMBOL[c ?? ""] ?? "HK$";

export function formatMoney(amount: number, currency?: string): string {
  const c = currency ?? "HKD";
  const n = ZERO_DECIMAL.has(c)
    ? Math.round(amount).toLocaleString()
    : amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${symbolOf(c)}${n}`;
}

/**
 * 一筆支出的貨幣。舊資料沒有這個欄位，一律視為旅程的當地貨幣 ——
 * 因此所有既有紀錄的顯示結果完全不變。
 */
export const currencyOf = (exp: Expense, trip: Trip): string =>
  exp.currency ?? trip.localCurrency ?? "JPY";

/**
 * 記帳當刻鎖定的匯率（1 單位該貨幣 = 多少港元）。
 *
 * 為何要在每一筆存一份，而不是共用 trip.exchangeRate：
 * 匯率會浮動。若只存一個共用值，你下個月更新匯率，
 * 上個月已經記好的帳會整批跟著變 —— 那些錢明明已經花了，
 * 帳面卻會無故改動。快照一鎖，過去的帳就永遠是當時的事實。
 */
export const rateOf = (exp: Expense, trip: Trip): number =>
  exp.rate ?? trip.exchangeRate ?? 1;

/** 換算成港元（跨貨幣加總時的共同基準） */
export const toHKD = (exp: Expense, trip: Trip): number =>
  exp.amount * rateOf(exp, trip);

/**
 * 換算成旅程的當地貨幣，用於畫面上的總計與預算比較。
 * 同幣別直接取原值，避免來回換算產生的捨入誤差。
 */
export function toLocal(exp: Expense, trip: Trip): number {
  const local = trip.localCurrency ?? "JPY";
  if (currencyOf(exp, trip) === local) return exp.amount;
  const tripRate = trip.exchangeRate || 1;
  return toHKD(exp, trip) / tripRate;
}

/** 一組支出以旅程當地貨幣加總 */
export const sumLocal = (expenses: Expense[], trip: Trip): number =>
  expenses.reduce((acc, e) => acc + toLocal(e, trip), 0);

/** 指定日期（YYYY-MM-DD）的支出總額，以旅程當地貨幣計 */
export const sumOnDate = (trip: Trip, date: string): number =>
  sumLocal((trip.expenses ?? []).filter(e => e.date === date), trip);

/** 常用貨幣選項 */
export const COMMON_CURRENCIES = ["JPY", "HKD", "TWD", "KRW", "GBP", "EUR", "USD", "THB", "SGD", "CNY"];
