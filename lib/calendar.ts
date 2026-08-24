// lib/calendar.ts
import { Activity, Booking, DailyItinerary, Trip } from "@/store/useTripStore";

/**
 * 匯出 .ics（iCalendar）行事曆檔。
 *
 * 為何用 .ics 而不是接 Google / Apple Calendar 的 API：
 * .ics 是行事曆的共通格式，iPhone 點一下就會問「加入行事曆」，
 * 毋須授權、毋須帳戶、離線都用得，Google 日曆與 Outlook 同樣收得。
 *
 * 附帶好處：每個事件內含 VALARM 提醒。到時候是 iOS 自己按時通知，
 * 比自行架設推播可靠得多 —— 不必依賴伺服器、不必開著 app、飛行模式照樣響。
 */

/** 目的地時區。日本以外的行程之後可由旅程設定帶入。 */
const DEFAULT_TZ = "Asia/Tokyo";

/** ics 規格要求對 , ; \ 與換行做轉義 */
function esc(text: string): string {
  return (text ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** 每行最長 75 個八位元組，超出要摺行（開頭加一個空格） */
function fold(line: string): string {
  if (line.length <= 73) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 73));
  rest = rest.slice(73);
  while (rest.length > 72) {
    parts.push(" " + rest.slice(0, 72));
    rest = rest.slice(72);
  }
  if (rest) parts.push(" " + rest);
  return parts.join("\r\n");
}

/** "2026-09-12" + "14:30" → "20260912T143000" */
function localStamp(date: string, time?: string): string {
  const d = date.replace(/-/g, "");
  const t = (time && /^\d{1,2}:\d{2}$/.test(time) ? time : "09:00")
    .split(":")
    .map(v => v.padStart(2, "0"))
    .join("");
  return `${d}T${t}00`;
}

/** 加上分鐘數，回傳同樣格式的時間戳 */
function addMinutes(date: string, time: string | undefined, minutes: number): string {
  const base = localStamp(date, time);
  const y = +base.slice(0, 4), mo = +base.slice(4, 6) - 1, d = +base.slice(6, 8);
  const h = +base.slice(9, 11), mi = +base.slice(11, 13);
  const dt = new Date(Date.UTC(y, mo, d, h, mi));
  dt.setUTCMinutes(dt.getUTCMinutes() + minutes);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${dt.getUTCFullYear()}${p(dt.getUTCMonth() + 1)}${p(dt.getUTCDate())}T${p(dt.getUTCHours())}${p(dt.getUTCMinutes())}00`;
}

const TYPE_LABEL: Record<string, string> = {
  Food: "美食", Sightseeing: "景點", Shopping: "購物",
  Transport: "交通", Hotel: "住宿", Other: "其他",
};

export interface IcsOptions {
  /** 提前多少分鐘提醒；0 或 undefined 代表不設提醒 */
  alarmMinutes?: number;
  /** 每個活動預設時長（分鐘） */
  durationMinutes?: number;
  timezone?: string;
}

/** 通用 VEVENT 組裝器 —— 行程活動同預訂共用同一套規則 */
function vevent(input: {
  uid: string;
  start: string;
  end: string;
  summary: string;
  location?: string;
  description?: string;
  alarmMinutes: number;
  timezone: string;
}): string[] {
  const lines = [
    "BEGIN:VEVENT",
    `UID:${input.uid}@tabi-log`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    `DTSTART;TZID=${input.timezone}:${input.start}`,
    `DTEND;TZID=${input.timezone}:${input.end}`,
    fold(`SUMMARY:${esc(input.summary)}`),
    input.location ? fold(`LOCATION:${esc(input.location)}`) : "",
    input.description ? fold(`DESCRIPTION:${esc(input.description)}`) : "",
  ].filter(Boolean);

  if (input.alarmMinutes > 0) {
    lines.push(
      "BEGIN:VALARM",
      `TRIGGER:-PT${input.alarmMinutes}M`,
      "ACTION:DISPLAY",
      fold(`DESCRIPTION:${esc(input.summary)}`),
      "END:VALARM"
    );
  }

  lines.push("END:VEVENT");
  return lines;
}

const mapLink = (address?: string, placeId?: string) =>
  placeId
    ? `https://www.google.com/maps/place/?q=place_id:${placeId}`
    : address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : "";

const BOOKING_LABEL: Record<string, string> = {
  Flight: "航班", Hotel: "住宿", Rental: "租車", Ticket: "票券",
};

/**
 * 預訂的行事曆事件。
 *
 * 住宿與租車會拆成兩個事件（入住／退房、取車／還車）——
 * 若排成一條橫跨五日的長條，反而會蓋住中間數日的行程，看不到那幾日的安排。
 * 航班提前三小時提醒，其餘一小時；退房提前半小時，通常已經在酒店。
 */
function bookingEvents(
  b: Booking,
  trip: Trip,
  opts: Required<Pick<IcsOptions, "alarmMinutes" | "durationMinutes" | "timezone">>
): string[] {
  const d = b.details ?? {};
  const tz = opts.timezone;
  const label = BOOKING_LABEL[b.type] ?? "預訂";
  const link = mapLink(d.address);
  const base = [
    d.note ? `備註：${d.note}` : "",
    d.fileUrl ? `憑證：${d.fileUrl}` : "",
    link ? `地圖：${link}` : "",
    `行程：${trip.title}`,
  ].filter(Boolean).join("\n");

  if (!b.date) return [];

  if (b.type === "Flight") {
    const route = [d.origin, d.destination].filter(Boolean).join(" → ");
    const summary = `✈️ ${[d.airline, d.flightNum].filter(Boolean).join(" ")} ${route}`.trim() || `✈️ ${b.title}`;
    // 有抵達時間就用真實時間，否則當三小時
    const end = d.arriveTime && /^\d{1,2}:\d{2}$/.test(d.arriveTime)
      ? localStamp(b.date, d.arriveTime)
      : addMinutes(b.date, d.departTime, 180);
    return vevent({
      uid: `${b.id}-flight`,
      start: localStamp(b.date, d.departTime),
      end,
      summary,
      location: d.origin || d.address,
      description: [b.title, d.seat ? `座位：${d.seat}` : "", d.gate ? `登機門：${d.gate}` : "", base]
        .filter(Boolean).join("\n"),
      alarmMinutes: 180,
      timezone: tz,
    });
  }

  if (b.type === "Hotel" || b.type === "Rental") {
    const inLabel  = b.type === "Hotel" ? "入住" : "取車";
    const outLabel = b.type === "Hotel" ? "退房" : "還車";
    const inTime   = d.checkIn  || (b.type === "Hotel" ? "15:00" : "10:00");
    const outTime  = d.checkOut || (b.type === "Hotel" ? "11:00" : "10:00");
    const out: string[] = [];

    out.push(...vevent({
      uid: `${b.id}-in`,
      start: localStamp(b.date, inTime),
      end: addMinutes(b.date, inTime, 60),
      summary: `🏨 ${inLabel}｜${b.title}`,
      location: d.address || d.pickupLocation,
      description: base,
      alarmMinutes: opts.alarmMinutes,
      timezone: tz,
    }));

    if (d.endDate) {
      out.push(...vevent({
        uid: `${b.id}-out`,
        start: localStamp(d.endDate, outTime),
        end: addMinutes(d.endDate, outTime, 60),
        summary: `🏨 ${outLabel}｜${b.title}`,
        location: d.address || d.dropoffLocation,
        description: base,
        alarmMinutes: 30,
        timezone: tz,
      }));
    }
    return out;
  }

  // 票券
  return vevent({
    uid: `${b.id}-ticket`,
    start: localStamp(b.date, d.checkIn),
    end: addMinutes(b.date, d.checkIn, opts.durationMinutes),
    summary: `🎫 ${b.title}`,
    location: d.address,
    description: [label, d.seat ? `座位：${d.seat}` : "", base].filter(Boolean).join("\n"),
    alarmMinutes: opts.alarmMinutes,
    timezone: tz,
  });
}

function buildEvent(
  act: Activity,
  day: DailyItinerary,
  trip: Trip,
  opts: Required<Pick<IcsOptions, "alarmMinutes" | "durationMinutes" | "timezone">>
): string[] {
  const start = localStamp(day.date, act.time);
  const end = addMinutes(day.date, act.time, opts.durationMinutes);

  const descLines = [
    TYPE_LABEL[act.type] ? `分類：${TYPE_LABEL[act.type]}` : "",
    act.note ? `備註：${act.note}` : "",
    act.placeId
      ? `Google 地圖：https://www.google.com/maps/place/?q=place_id:${act.placeId}`
      : act.address
      ? `Google 地圖：https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(act.address)}`
      : "",
    `行程：${trip.title}`,
  ].filter(Boolean);

  const lines = [
    "BEGIN:VEVENT",
    `UID:${act.id}@tabi-log`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    `DTSTART;TZID=${opts.timezone}:${start}`,
    `DTEND;TZID=${opts.timezone}:${end}`,
    fold(`SUMMARY:${esc(act.location)}`),
    act.address ? fold(`LOCATION:${esc(act.address)}`) : "",
    fold(`DESCRIPTION:${esc(descLines.join("\n"))}`),
  ].filter(Boolean);

  if (opts.alarmMinutes > 0) {
    lines.push(
      "BEGIN:VALARM",
      `TRIGGER:-PT${opts.alarmMinutes}M`,
      "ACTION:DISPLAY",
      fold(`DESCRIPTION:${esc(act.location)}`),
      "END:VALARM"
    );
  }

  lines.push("END:VEVENT");
  return lines;
}

function wrap(trip: Trip, timezone: string, body: string[]): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tabi Log//行程//ZH",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    fold(`X-WR-CALNAME:${esc(trip.title)}`),
    `X-WR-TIMEZONE:${timezone}`,
    ...body,
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

const resolve = (o: IcsOptions) => ({
  alarmMinutes: o.alarmMinutes ?? 30,
  durationMinutes: o.durationMinutes ?? 60,
  timezone: o.timezone ?? DEFAULT_TZ,
});

/** 產生行程的 ics。傳入 dayIndex 就只匯出那一日。 */
export function buildTripIcs(trip: Trip, dayIndex?: number, options: IcsOptions = {}): string {
  const opts = resolve(options);

  const days =
    dayIndex == null
      ? trip.dailyItinerary ?? []
      : [(trip.dailyItinerary ?? [])[dayIndex]].filter(Boolean);

  const body: string[] = [];
  days.forEach(day => {
    (day.activities ?? [])
      .filter(a => a?.id && a.location)
      .forEach(act => body.push(...buildEvent(act, day, trip, opts)));
  });

  return wrap(trip, opts.timezone, body);
}

/** 產生預訂的 ics。傳入 bookingId 就只匯出那一項。 */
export function buildBookingIcs(trip: Trip, bookingId?: string, options: IcsOptions = {}): string {
  const opts = resolve(options);
  const list = (trip.bookings ?? []).filter(b => (bookingId ? b.id === bookingId : true));
  const body: string[] = [];
  list.forEach(b => body.push(...bookingEvents(b, trip, opts)));
  return wrap(trip, opts.timezone, body);
}

const triggerDownload = (ics: string, filename: string) => {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.replace(/[\\/:*?"<>|]/g, "") + ".ics";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** 觸發下載。iOS Safari 會直接問「加入行事曆」。 */
export function downloadIcs(trip: Trip, dayIndex?: number, options?: IcsOptions) {
  const suffix = dayIndex == null ? "全程" : `Day${(trip.dailyItinerary?.[dayIndex]?.day) ?? dayIndex + 1}`;
  triggerDownload(buildTripIcs(trip, dayIndex, options), `${trip.title}_${suffix}`);
}

/** 把預訂（機票／酒店／租車／票券）加入行事曆 */
export function downloadBookingIcs(trip: Trip, bookingId?: string, options?: IcsOptions) {
  const one = bookingId ? (trip.bookings ?? []).find(b => b.id === bookingId) : undefined;
  triggerDownload(buildBookingIcs(trip, bookingId, options), `${trip.title}_${one?.title ?? "預訂"}`);
}
