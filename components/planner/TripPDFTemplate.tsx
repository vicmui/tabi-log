// components/planner/TripPDFTemplate.tsx
import { Trip, Activity, Booking } from "@/store/useTripStore";

const TYPE_LABEL: Record<string, string> = {
  Food: "美食", Sightseeing: "景點", Shopping: "購物",
  Transport: "交通", Hotel: "住宿", Other: "其他",
};
const BOOKING_LABEL: Record<string, string> = {
  Flight: "機票", Hotel: "住宿", Rental: "租車", Ticket: "票券",
};

const FONT  = "'Noto Sans HK', 'PingFang HK', 'PingFang TC', 'Hiragino Sans', 'Microsoft JhengHei', sans-serif";
const SERIF = "Georgia, 'Noto Serif HK', 'Songti TC', serif";
const MONO  = "'SFMono-Regular', Menlo, Consolas, monospace";
const BLACK = "#0a0a0a";
const GRAY  = "#767676";
const LGRAY = "#b0b0b0";
const RULE  = "1px solid #e8e8e8";
const THICK = "2px solid #0a0a0a";

const PAGE_W = 794;
const PAGE_H = 1123;
const PAD_X  = 56;

/**
 * 清理 Google 回傳的日本地址。
 * 原始格式例如：
 *   "Japan, 〒542-0083 Osaka, Chuo Ward, Higashishinsaibashi, 1-chōme-12-9 Eight Bld"
 * 前面的國名與郵遞區號在行程紙本上毫無用處，佔位卻最多，先行剝走。
 */
function cleanAddr(addr?: string): string {
  if (!addr) return "";
  return addr
    .replace(/^Japan,?\s*/i, "")
    .replace(/〒\s*\d{3}-?\d{4}\s*,?\s*/g, "")
    .replace(/,?\s*Japan\s*$/i, "")
    .replace(/\s*\([^)]*\)\s*$/, "")   // 移除尾部重複的括號內容
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * 依字數截斷備註。
 * 舊版用 -webkit-line-clamp 限制行數，但 html2canvas 並不支援該屬性——
 * 版面高度停留在一行，文字卻有兩三行，結果整段字被攔腰切斷。
 */
function clampText(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "…" : t;
}

const NOTE_MAX = 110;
const ADDR_MAX = 72;

/* ── 分頁 ──────────────────────────────────────────────────────────
   每一頁都固定 1123px 並裁走溢出，所以必須先估算每個項目的高度，
   確保沒有一頁塞爆。估算值刻意保守，寧可留白也不要切斷內容。      */
const CONTENT_H_FIRST = 900;   // 首頁扣除大標題與頁尾後可用高度
const CONTENT_H_CONT  = 980;   // 續頁標題較矮
const H_BASE = 46;             // 標題 + 分隔線
const H_ADDR = 16;
const H_NOTE = 34;
const H_RATE = 16;

function itemHeight(act: Activity, note: string | null, addr: string): number {
  return H_BASE + (addr ? H_ADDR : 0) + (note ? H_NOTE : 0) + ((act.rating ?? 0) > 0 ? H_RATE : 0);
}

interface DayChunk { day: any; acts: Activity[]; part: number; parts: number; offset: number }

function chunkDay(day: any): DayChunk[] {
  const acts: Activity[] = (day.activities || []).filter((a: Activity) => a?.id);
  if (acts.length === 0) return [{ day, acts: [], part: 1, parts: 1, offset: 0 }];

  const chunks: Activity[][] = [];
  let cur: Activity[] = [];
  let used = 0;
  let limit = CONTENT_H_FIRST;

  for (const act of acts) {
    const addr = clampText(cleanAddr(act.address), ADDR_MAX);
    const note = pickNote(act, addr);
    const h = itemHeight(act, note, addr);
    if (cur.length > 0 && used + h > limit) {
      chunks.push(cur);
      cur = []; used = 0; limit = CONTENT_H_CONT;
    }
    cur.push(act);
    used += h;
  }
  if (cur.length) chunks.push(cur);

  let offset = 0;
  return chunks.map((c, i) => {
    const chunk = { day, acts: c, part: i + 1, parts: chunks.length, offset };
    offset += c.length;
    return chunk;
  });
}

/** 備註若只是重複地址就不顯示 */
function pickNote(act: Activity, addr: string): string | null {
  if (!act.note) return null;
  const n = act.note.trim();
  if (!n) return null;
  if (n === act.address) return null;
  if (addr && n.startsWith(addr.slice(0, 20))) return null;
  return clampText(n, NOTE_MAX);
}

interface Props {
  trip: Trip;
  /** 已轉成 data URL 的封面圖；取不到時為 null，改用純文字封面 */
  coverDataUrl?: string | null;
}

export default function TripPDFTemplate({ trip, coverDataUrl }: Props) {
  const days        = trip.dailyItinerary || [];
  const totalActs   = days.reduce((s, d) => s + (d.activities?.filter(a => a?.id).length ?? 0), 0);
  const visitedActs = days.reduce((s, d) => s + (d.activities?.filter(a => a?.isVisited).length ?? 0), 0);
  const nights      = Math.max(0, days.length - 1);

  const dayChunks = days.flatMap(chunkDay);
  const bookings  = trip.bookings ?? [];
  const bookingPages: Booking[][] = [];
  for (let i = 0; i < bookings.length; i += 5) bookingPages.push(bookings.slice(i, i + 5));

  const totalPages = 1 + dayChunks.length + bookingPages.length;
  let pageNo = 1;

  const Page = ({ children }: { children: React.ReactNode }) => (
    <div
      data-pdf-page
      style={{
        width: PAGE_W, height: PAGE_H, overflow: "hidden",
        background: "#fff", display: "flex", flexDirection: "column",
        position: "relative",
      }}
    >
      {children}
    </div>
  );

  const Footer = ({ left, n }: { left: string; n: number }) => (
    <div style={{
      margin: `0 ${PAD_X}px 30px`, paddingTop: 12, borderTop: RULE,
      display: "flex", justifyContent: "space-between",
      fontSize: 9, color: LGRAY, letterSpacing: "0.18em",
    }}>
      <span>{left}</span>
      <span>{n} / {totalPages}</span>
    </div>
  );

  return (
    <div id="trip-pdf-root" style={{ width: PAGE_W, background: "#fff", color: BLACK, fontFamily: FONT, fontSize: 12 }}>

      {/* ══ 封面 ══════════════════════════════════════════════════ */}
      <Page>
        <div style={{ height: 6, background: BLACK }} />

        <div style={{ padding: "22px 56px 0", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 9, letterSpacing: "0.35em", color: GRAY, textTransform: "uppercase" }}>VM&apos;S BUILD / 旅行手帳</span>
          <span style={{ fontSize: 9, letterSpacing: "0.2em", color: GRAY }}>
            {new Date().toLocaleDateString("zh-HK", { year: "numeric", month: "long", day: "numeric" })}
          </span>
        </div>

        {/* 主視覺 —— 沒有圖片時不留黑框，改用一條細規線分隔 */}
        {coverDataUrl ? (
          <div style={{ margin: "24px 0 0", height: 300, overflow: "hidden", position: "relative", background: "#f2f2f2" }}>
            <img src={coverDataUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        ) : (
          <div style={{ margin: "40px 56px 0", borderTop: THICK }} />
        )}

        <div style={{ padding: "36px 56px 0" }}>
          <div style={{ borderLeft: `4px solid ${BLACK}`, paddingLeft: 18, marginBottom: 30 }}>
            <h1 style={{ fontFamily: SERIF, fontSize: 42, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2, margin: "0 0 10px", color: BLACK }}>
              {trip.title}
            </h1>
            <p style={{ fontSize: 12, color: GRAY, margin: 0, letterSpacing: "0.08em", fontFamily: MONO }}>
              {trip.startDate} &nbsp;—&nbsp; {trip.endDate}
            </p>
          </div>

          {/* 數字概要 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderTop: THICK, borderBottom: THICK, padding: "22px 0", marginBottom: 32 }}>
            {[
              ["行程天數", String(days.length), "天"],
              ["住宿晚數", String(nights), "晚"],
              ["活動數目", String(totalActs), "個"],
              ["完成率", String(totalActs > 0 ? Math.round((visitedActs / totalActs) * 100) : 0), "%"],
            ].map(([label, num, unit]) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4, height: 40 }}>
                  <span style={{ fontFamily: SERIF, fontSize: 36, fontWeight: 700, lineHeight: 1, color: BLACK }}>{num}</span>
                  <span style={{ fontSize: 11, color: GRAY, lineHeight: 1 }}>{unit}</span>
                </div>
                <div style={{ fontSize: 9, letterSpacing: "0.2em", color: GRAY, marginTop: 10, lineHeight: 1 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* 行程概覽 —— 單欄清單，行數少亦不會出現半行留白 */}
          <div>
            <div style={{ fontSize: 9, letterSpacing: "0.3em", color: GRAY, textTransform: "uppercase", marginBottom: 12 }}>行程概覽</div>
            {days.map(day => {
              const acts = (day.activities || []).filter(a => a?.id);
              return (
                <div key={day.day} style={{
                  display: "grid", gridTemplateColumns: "34px 92px 1fr auto",
                  alignItems: "baseline", gap: 12,
                  padding: "9px 0", borderBottom: RULE,
                }}>
                  <span style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, color: BLACK }}>
                    {String(day.day).padStart(2, "0")}
                  </span>
                  <span style={{ fontSize: 10, color: LGRAY, fontFamily: MONO }}>{day.date}</span>
                  <span style={{ fontSize: 11, color: BLACK }}>
                    {day.customLocation || acts[0]?.location?.split(" ")[0] || "自由探索"}
                  </span>
                  <span style={{ fontSize: 10, color: LGRAY }}>{acts.length} 項</span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ flex: 1 }} />
        <Footer left="CONFIDENTIAL — PERSONAL TRAVEL DOCUMENT" n={pageNo++} />
      </Page>

      {/* ══ 每日行程 ══════════════════════════════════════════════ */}
      {dayChunks.map((chunk, ci) => {
        const { day, acts, part, parts, offset } = chunk;
        const allActs = (day.activities || []).filter((a: Activity) => a?.id);
        const n = pageNo++;

        return (
          <Page key={`d${day.day}-${part}`}>
            <div style={{ height: 6, background: BLACK }} />

            {/* 日標題 */}
            <div style={{ padding: "20px 56px 16px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", borderBottom: THICK }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 18 }}>
                <span style={{ fontFamily: SERIF, fontSize: part === 1 ? 64 : 40, fontWeight: 700, lineHeight: 0.9, color: BLACK, letterSpacing: "-0.04em" }}>
                  {String(day.day).padStart(2, "0")}
                </span>
                <div style={{ paddingBottom: 4 }}>
                  <div style={{ fontSize: 9, letterSpacing: "0.3em", color: GRAY, marginBottom: 4 }}>
                    DAY {day.day} / {days.length}{parts > 1 ? `　（${part} / ${parts}）` : ""}
                  </div>
                  <div style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 600, color: BLACK }}>
                    {day.customLocation || allActs[0]?.location?.split(" ")[0] || "自由探索"}
                  </div>
                  <div style={{ fontSize: 10, color: GRAY, marginTop: 3, fontFamily: MONO }}>{day.date}</div>
                </div>
              </div>
              <div style={{ textAlign: "right", paddingBottom: 4 }}>
                <div style={{ fontSize: 9, color: GRAY, letterSpacing: "0.18em" }}>{trip.title}</div>
                <div style={{ fontSize: 9, color: LGRAY, marginTop: 3 }}>{allActs.length} 個活動</div>
              </div>
            </div>

            {/* 活動 */}
            <div style={{ flex: 1, padding: `10px ${PAD_X}px 0`, overflow: "hidden" }}>
              {acts.length === 0 ? (
                <div style={{ padding: "48px 0", color: LGRAY, fontSize: 11, textAlign: "center", letterSpacing: "0.16em" }}>
                  尚未安排行程
                </div>
              ) : acts.map((act, i) => {
                const addr = clampText(cleanAddr(act.address), ADDR_MAX);
                const note = pickNote(act, addr);
                const last = i === acts.length - 1;
                const seq  = offset + i + 1;

                return (
                  <div key={act.id} style={{
                    display: "grid",
                    gridTemplateColumns: "52px 22px 1fr",
                    gap: "0 14px",
                    paddingTop: i === 0 ? 4 : 12,
                  }}>
                    {/* 時間 */}
                    <div style={{ textAlign: "right", paddingTop: 3 }}>
                      {act.time
                        ? <span style={{ fontFamily: MONO, fontSize: 11, color: BLACK, whiteSpace: "nowrap" }}>{act.time}</span>
                        : <span style={{ color: "#dcdcdc", fontSize: 10 }}>—</span>}
                    </div>

                    {/* 序號 + 連接線 */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                        background: act.isVisited ? BLACK : "#fff",
                        border: `1.5px solid ${BLACK}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 9, fontWeight: 700, fontFamily: MONO,
                        color: act.isVisited ? "#fff" : BLACK,
                      }}>
                        {seq}
                      </div>
                      {!last && <div style={{ width: 1, flex: 1, background: "#e4e4e4", marginTop: 4 }} />}
                    </div>

                    {/* 內容 */}
                    <div style={{
                      minWidth: 0,
                      paddingBottom: last ? 0 : 12,
                      borderBottom: last ? undefined : RULE,
                    }}>
                      <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "3px 8px", marginBottom: 4 }}>
                        <span style={{ fontFamily: SERIF, fontSize: 14, fontWeight: 600, color: BLACK, lineHeight: 1.35 }}>
                          {act.location}
                        </span>
                        {/* 不用 emoji：PDF 字型回退不一致，而且與版面調性不符 */}
                        <span style={{ fontSize: 9, letterSpacing: "0.14em", padding: "1px 6px", border: "1px solid #e0e0e0", color: GRAY, whiteSpace: "nowrap" }}>
                          {TYPE_LABEL[act.type] ?? act.type}
                        </span>
                        {act.isVisited && (
                          <span style={{ fontSize: 9, letterSpacing: "0.14em", padding: "1px 6px", background: BLACK, color: "#fff", whiteSpace: "nowrap" }}>
                            已完成
                          </span>
                        )}
                      </div>

                      {addr && (
                        <div style={{ fontSize: 10, color: GRAY, lineHeight: 1.45, marginBottom: note ? 5 : 0 }}>
                          {addr}
                        </div>
                      )}

                      {note && (
                        <div style={{
                          fontSize: 10, color: "#3d3d3d",
                          borderLeft: "2px solid #dcdcdc", paddingLeft: 9,
                          lineHeight: 1.5,
                        }}>
                          {note}
                        </div>
                      )}

                      {(act.rating ?? 0) > 0 && (
                        <div style={{ marginTop: 5, fontSize: 10, letterSpacing: "0.1em", color: BLACK }}>
                          {"★".repeat(act.rating!)}
                          <span style={{ color: "#dcdcdc" }}>{"★".repeat(5 - act.rating!)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <Footer left={trip.title} n={n} />
          </Page>
        );
      })}

      {/* ══ 預訂憑證 ══════════════════════════════════════════════ */}
      {bookingPages.map((rows, pi) => {
        const n = pageNo++;
        return (
          <Page key={`bk${pi}`}>
            <div style={{ height: 6, background: BLACK }} />

            <div style={{ padding: "20px 56px 16px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", borderBottom: THICK }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 18 }}>
                <span style={{ fontFamily: SERIF, fontSize: 48, fontWeight: 700, lineHeight: 0.9, color: BLACK, letterSpacing: "-0.03em" }}>BK</span>
                <div style={{ paddingBottom: 4 }}>
                  <div style={{ fontSize: 9, letterSpacing: "0.3em", color: GRAY, marginBottom: 4 }}>
                    BOOKINGS{bookingPages.length > 1 ? `　（${pi + 1} / ${bookingPages.length}）` : ""}
                  </div>
                  <div style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 600 }}>預訂憑證</div>
                  <div style={{ fontSize: 10, color: GRAY, marginTop: 3 }}>共 {bookings.length} 項</div>
                </div>
              </div>
              <div style={{ textAlign: "right", paddingBottom: 4, fontSize: 9, color: GRAY, letterSpacing: "0.18em" }}>
                <div>{trip.title}</div>
                <div style={{ marginTop: 3, fontFamily: MONO }}>{trip.startDate} — {trip.endDate}</div>
              </div>
            </div>

            <div style={{ flex: 1, padding: `0 ${PAD_X}px`, overflow: "hidden" }}>
              {rows.map((b, i) => {
                const d = b.details || {};
                const addr = clampText(cleanAddr(d.address), ADDR_MAX);
                return (
                  <div key={b.id} style={{
                    display: "grid", gridTemplateColumns: "92px 1fr", gap: "0 22px",
                    padding: "18px 0", borderBottom: i < rows.length - 1 ? RULE : undefined,
                  }}>
                    <div>
                      <div style={{ fontSize: 9, letterSpacing: "0.14em", padding: "2px 6px", border: RULE, display: "inline-block", marginBottom: 6, color: GRAY }}>
                        {BOOKING_LABEL[b.type] ?? b.type}
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: 10, color: GRAY }}>{b.date}</div>
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 600, marginBottom: 7, color: BLACK }}>
                        {b.title}
                      </div>

                      {b.type === "Flight" && d.origin && (
                        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#f7f7f7", padding: "10px 14px", marginBottom: 7 }}>
                          <div style={{ textAlign: "center", minWidth: 52 }}>
                            <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700 }}>{d.origin}</div>
                            <div style={{ fontSize: 10, color: GRAY, fontFamily: MONO }}>{d.departTime || "--:--"}</div>
                          </div>
                          <div style={{ flex: 1, height: 1, background: "#d4d4d4" }} />
                          <div style={{ textAlign: "center", minWidth: 52 }}>
                            <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700 }}>{d.destination}</div>
                            <div style={{ fontSize: 10, color: GRAY, fontFamily: MONO }}>{d.arriveTime || "--:--"}</div>
                          </div>
                        </div>
                      )}

                      {addr && <div style={{ fontSize: 10, color: GRAY, marginBottom: 4, lineHeight: 1.45 }}>{addr}</div>}

                      {(d.checkIn || d.checkOut) && (
                        <div style={{ fontSize: 10, color: "#3d3d3d" }}>
                          {d.checkIn && `入住 ${d.checkIn}`}
                          {d.checkIn && d.checkOut && "　·　"}
                          {d.checkOut && `退房 ${d.checkOut}`}
                        </div>
                      )}

                      {b.type === "Flight" && d.airline && (
                        <div style={{ fontSize: 10, color: GRAY, marginTop: 4 }}>
                          {d.airline} {d.flightNum}
                          {d.seat && `　·　座位 ${d.seat}`}
                          {d.gate && `　·　閘口 ${d.gate}`}
                        </div>
                      )}

                      {d.note && (
                        <div style={{ fontSize: 10, color: "#3d3d3d", marginTop: 4, lineHeight: 1.45 }}>
                          {clampText(d.note, NOTE_MAX)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <Footer left={trip.title} n={n} />
          </Page>
        );
      })}
    </div>
  );
}
