// components/planner/TripPDFTemplate.tsx
import { Trip } from "@/store/useTripStore";

const TYPE_EMOJI: Record<string, string> = {
  Food: "🍽", Sightseeing: "📸", Shopping: "🛍",
  Transport: "🚃", Hotel: "🏨", Other: "📍",
};
const TYPE_LABEL: Record<string, string> = {
  Food: "美食", Sightseeing: "景點", Shopping: "購物",
  Transport: "交通", Hotel: "住宿", Other: "其他",
};

const FONT  = "'Noto Sans TC', 'PingFang TC', 'Hiragino Sans', 'Microsoft JhengHei', sans-serif";
const SERIF = "Georgia, 'Noto Serif TC', serif";
const BLACK = "#0a0a0a";
const GRAY  = "#767676";
const LGRAY = "#b0b0b0";
const RULE  = "1px solid #e8e8e8";
const THICK = "2px solid #0a0a0a";

// Truncate long strings for PDF display
const trunc = (s: string, max: number) => s && s.length > max ? s.slice(0, max) + "…" : s;

// Clean address: remove duplicate parenthetical copies e.g. "Addr (Addr)"
const cleanAddr = (addr?: string) => {
  if (!addr) return "";
  // Remove trailing " (same text)" duplicates
  const cleaned = addr.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return trunc(cleaned, 80);
};

interface Props { trip: Trip }

export default function TripPDFTemplate({ trip }: Props) {
  const totalActs   = trip.dailyItinerary.reduce((s, d) => s + (d.activities?.length ?? 0), 0);
  const visitedActs = trip.dailyItinerary.reduce((s, d) => s + (d.activities?.filter(a => a?.isVisited)?.length ?? 0), 0);
  const nights      = Math.max(0, trip.dailyItinerary.length - 1);
  const totalPages  = 1 + trip.dailyItinerary.length + (trip.bookings?.length ? 1 : 0);

  return (
    <div id="trip-pdf-root" style={{ width: 794, background: "#fff", color: BLACK, fontFamily: FONT, fontSize: 12 }}>

      {/* ══ COVER ══════════════════════════════════════════════════ */}
      <div style={{ width: 794, minHeight: 1123, display: "flex", flexDirection: "column" }}>
        <div style={{ height: 6, background: BLACK }} />

        {/* Meta strip */}
        <div style={{ padding: "22px 56px 0", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 9, letterSpacing: "0.35em", color: GRAY, textTransform: "uppercase" }}>VM&apos;S BUILD / 旅行手帳</span>
          <span style={{ fontSize: 9, letterSpacing: "0.2em", color: GRAY }}>{new Date().toLocaleDateString("zh-HK", { year: "numeric", month: "long", day: "numeric" })}</span>
        </div>

        {/* Hero */}
        <div style={{ margin: "24px 0 0", height: 320, overflow: "hidden", position: "relative", background: "#111" }}>
          {trip.coverImage && (
            <img src={trip.coverImage} alt="" crossOrigin="anonymous"
              style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.72 }} />
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 50%, rgba(10,10,10,0.5) 100%)" }} />
        </div>

        {/* Title */}
        <div style={{ padding: "36px 56px 0" }}>
          <div style={{ borderLeft: `4px solid ${BLACK}`, paddingLeft: 18, marginBottom: 28 }}>
            <h1 style={{ fontFamily: SERIF, fontSize: 44, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.15, margin: "0 0 8px", color: BLACK }}>
              {trip.title}
            </h1>
            <p style={{ fontSize: 13, color: GRAY, margin: 0, letterSpacing: "0.06em" }}>
              {trip.startDate}&nbsp;&nbsp;—&nbsp;&nbsp;{trip.endDate}
            </p>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", borderTop: THICK, borderBottom: THICK, padding: "20px 0", marginBottom: 28 }}>
            {[["行程天數", `${trip.dailyItinerary.length}`, "天"], ["住宿晚數", `${nights}`, "晚"], ["活動數目", `${totalActs}`, "個"], ["完成率", `${totalActs > 0 ? Math.round((visitedActs / totalActs) * 100) : 0}`, "%"]].map(([label, num, unit]) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 3 }}>
                  <span style={{ fontFamily: SERIF, fontSize: 38, fontWeight: 700, lineHeight: 1, color: BLACK }}>{num}</span>
                  <span style={{ fontSize: 11, color: GRAY }}>{unit}</span>
                </div>
                <div style={{ fontSize: 9, letterSpacing: "0.18em", color: GRAY, marginTop: 5, textTransform: "uppercase" }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Day index */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 9, letterSpacing: "0.3em", color: GRAY, textTransform: "uppercase", marginBottom: 10 }}>行程概覽</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "4px 12px" }}>
              {trip.dailyItinerary.map(day => {
                const acts = (day.activities || []).filter(a => a?.id);
                return (
                  <div key={day.day} style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "5px 0", borderBottom: "1px solid #f0f0f0" }}>
                    <span style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, color: BLACK, minWidth: 24 }}>
                      {String(day.day).padStart(2, "0")}
                    </span>
                    <div>
                      <div style={{ fontSize: 9, color: LGRAY }}>{day.date}</div>
                      <div style={{ fontSize: 10, color: BLACK, marginTop: 1 }}>
                        {day.customLocation || acts[0]?.location?.split(" ")[0] || "自由探索"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }} />
        <div style={{ margin: "0 56px 36px", paddingTop: 14, borderTop: RULE, display: "flex", justifyContent: "space-between", fontSize: 9, color: LGRAY, letterSpacing: "0.18em" }}>
          <span>CONFIDENTIAL — PERSONAL TRAVEL DOCUMENT</span>
          <span>1 / {totalPages}</span>
        </div>
      </div>

      {/* ══ DAILY PAGES ════════════════════════════════════════════ */}
      {trip.dailyItinerary.map((day, dayIdx) => {
        const acts = (day.activities || []).filter(a => a?.id);
        const pageNum = dayIdx + 2;

        return (
          <div key={day.day} style={{ width: 794, minHeight: 1123, display: "flex", flexDirection: "column", background: "#fff" }}>
            <div style={{ height: 6, background: BLACK }} />

            {/* Day header */}
            <div style={{ padding: "20px 56px 16px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", borderBottom: THICK }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 18 }}>
                <span style={{ fontFamily: SERIF, fontSize: 68, fontWeight: 700, lineHeight: 1, color: BLACK, letterSpacing: "-0.04em" }}>
                  {String(day.day).padStart(2, "0")}
                </span>
                <div style={{ paddingBottom: 4 }}>
                  <div style={{ fontSize: 9, letterSpacing: "0.3em", color: GRAY, textTransform: "uppercase", marginBottom: 3 }}>DAY {day.day} / {trip.dailyItinerary.length}</div>
                  <div style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 600, color: BLACK }}>
                    {day.customLocation || acts[0]?.location?.split(" ")[0] || "自由探索"}
                  </div>
                  <div style={{ fontSize: 10, color: GRAY, marginTop: 2, letterSpacing: "0.04em" }}>{day.date}</div>
                </div>
              </div>
              <div style={{ textAlign: "right", paddingBottom: 4 }}>
                <div style={{ fontSize: 9, color: GRAY, letterSpacing: "0.18em", textTransform: "uppercase" }}>{trip.title}</div>
                <div style={{ fontSize: 9, color: LGRAY, marginTop: 2 }}>{acts.length} 個活動</div>
              </div>
            </div>

            {/* Activities */}
            <div style={{ flex: 1, padding: "4px 56px" }}>
              {acts.length === 0 ? (
                <div style={{ padding: "36px 0", color: LGRAY, fontSize: 11, textAlign: "center", letterSpacing: "0.1em" }}>今日暫無行程</div>
              ) : acts.map((act, i) => {
                const addr = cleanAddr(act.address);
                // Don't show note if it's just repeating the address
                const note = act.note && act.note !== act.address && !act.note.startsWith(addr.slice(0, 20))
                  ? act.note
                  : null;

                return (
                  <div key={act.id} style={{
                    display: "grid",
                    gridTemplateColumns: "60px 1px 1fr",  // time | line | content
                    gap: "0 20px",
                    paddingTop: 14,
                    paddingBottom: i < acts.length - 1 ? 0 : 14,
                  }}>
                    {/* Time column */}
                    <div style={{ textAlign: "right", paddingTop: 2 }}>
                      {act.time
                        ? <span style={{ fontFamily: "monospace", fontSize: 11, color: BLACK, letterSpacing: "0.02em", whiteSpace: "nowrap" }}>{act.time}</span>
                        : <span style={{ color: "#ddd", fontSize: 10 }}>—</span>
                      }
                    </div>

                    {/* Timeline column: circle + line */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                      {/* Circle */}
                      <div style={{
                        width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                        background: act.isVisited ? BLACK : "#fff",
                        border: `1.5px solid ${BLACK}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 9, fontWeight: 700,
                        color: act.isVisited ? "#fff" : BLACK,
                        zIndex: 1,
                        marginLeft: -10,  // centre over the 1px column
                      }}>
                        {i + 1}
                      </div>
                      {/* Connector */}
                      {i < acts.length - 1 && (
                        <div style={{ width: 1, flex: 1, background: "#e0e0e0", marginTop: 4, marginLeft: -10 }} />
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ minWidth: 0, paddingBottom: i < acts.length - 1 ? 14 : 0, borderBottom: i < acts.length - 1 ? RULE : undefined }}>
                      {/* Title + badges */}
                      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "4px 8px", marginBottom: 4 }}>
                        <span style={{ fontFamily: SERIF, fontSize: 14, fontWeight: 600, color: BLACK }}>
                          {act.location}
                        </span>
                        <span style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", padding: "1px 6px", border: "1px solid #e0e0e0", color: GRAY, whiteSpace: "nowrap" }}>
                          {TYPE_EMOJI[act.type] ?? "📍"} {TYPE_LABEL[act.type] ?? act.type}
                        </span>
                        {act.isVisited && (
                          <span style={{ fontSize: 9, letterSpacing: "0.08em", padding: "1px 6px", background: BLACK, color: "#fff" }}>
                            ✓ VISITED
                          </span>
                        )}
                      </div>

                      {/* Address — cleaned, single line */}
                      {addr && (
                        <div style={{ fontSize: 10, color: GRAY, marginBottom: note ? 4 : 0, lineHeight: 1.4 }}>
                          {addr}
                        </div>
                      )}

                      {/* Note — only if different from address */}
                      {note && (
                        <div style={{
                          fontSize: 10, color: "#444",
                          borderLeft: "2px solid #e0e0e0", paddingLeft: 9,
                          marginTop: 4, fontStyle: "italic", lineHeight: 1.5,
                          // Limit note to 3 lines max for layout
                          display: "-webkit-box",
                          WebkitLineClamp: 4,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        } as any}>
                          {note}
                        </div>
                      )}

                      {/* Rating */}
                      {(act.rating ?? 0) > 0 && (
                        <div style={{ marginTop: 4, fontSize: 11 }}>
                          {"★".repeat(act.rating!)}<span style={{ color: "#ddd" }}>{"★".repeat(5 - act.rating!)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{ margin: "0 56px 32px", paddingTop: 12, borderTop: RULE, display: "flex", justifyContent: "space-between", fontSize: 9, color: LGRAY, letterSpacing: "0.18em" }}>
              <span>{trip.title.toUpperCase()}</span>
              <span>{pageNum} / {totalPages}</span>
            </div>
          </div>
        );
      })}

      {/* ══ BOOKINGS PAGE ══════════════════════════════════════════ */}
      {trip.bookings && trip.bookings.length > 0 && (() => {
        const pageNum = totalPages;
        const typeLabel: Record<string, string> = { Flight: "✈ 機票", Hotel: "🏨 住宿", Rental: "🚗 租車", Ticket: "🎟 票券" };
        return (
          <div style={{ width: 794, minHeight: 1123, display: "flex", flexDirection: "column", background: "#fff" }}>
            <div style={{ height: 6, background: BLACK }} />

            {/* Header */}
            <div style={{ padding: "20px 56px 16px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", borderBottom: THICK }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 18 }}>
                <span style={{ fontFamily: SERIF, fontSize: 52, fontWeight: 700, lineHeight: 1, color: BLACK, letterSpacing: "-0.03em" }}>BK</span>
                <div style={{ paddingBottom: 4 }}>
                  <div style={{ fontSize: 9, letterSpacing: "0.3em", color: GRAY, textTransform: "uppercase", marginBottom: 3 }}>BOOKINGS</div>
                  <div style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 600 }}>預訂憑證</div>
                  <div style={{ fontSize: 10, color: GRAY, marginTop: 2 }}>{trip.bookings.length} 項預訂</div>
                </div>
              </div>
              <div style={{ textAlign: "right", paddingBottom: 4, fontSize: 9, color: GRAY, letterSpacing: "0.18em" }}>
                <div>{trip.title.toUpperCase()}</div>
                <div style={{ marginTop: 2 }}>{trip.startDate} — {trip.endDate}</div>
              </div>
            </div>

            {/* Booking rows */}
            <div style={{ flex: 1, padding: "0 56px" }}>
              {trip.bookings.map((b, i) => {
                const d = b.details || {};
                const addr = cleanAddr(d.address);
                return (
                  <div key={b.id} style={{
                    display: "grid", gridTemplateColumns: "96px 1fr",
                    gap: "0 24px", padding: "18px 0",
                    borderBottom: i < trip.bookings!.length - 1 ? RULE : undefined,
                  }}>
                    {/* Left */}
                    <div>
                      <div style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", padding: "2px 6px", border: RULE, display: "inline-block", marginBottom: 5, color: GRAY }}>
                        {typeLabel[b.type] ?? b.type}
                      </div>
                      <div style={{ fontFamily: "monospace", fontSize: 10, color: GRAY }}>{b.date}</div>
                    </div>

                    {/* Right */}
                    <div>
                      <div style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 600, marginBottom: 6, color: BLACK }}>
                        {b.title}
                      </div>

                      {b.type === "Flight" && d.origin && (
                        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#f8f8f8", padding: "10px 14px", marginBottom: 6 }}>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 700 }}>{d.origin}</div>
                            <div style={{ fontSize: 10, color: GRAY, fontFamily: "monospace" }}>{d.departTime || "--:--"}</div>
                          </div>
                          <div style={{ flex: 1, height: 1, background: "#ccc" }} />
                          <div style={{ fontSize: 12, color: GRAY }}>✈</div>
                          <div style={{ flex: 1, height: 1, background: "#ccc" }} />
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 700 }}>{d.destination}</div>
                            <div style={{ fontSize: 10, color: GRAY, fontFamily: "monospace" }}>{d.arriveTime || "--:--"}</div>
                          </div>
                        </div>
                      )}

                      {addr && <div style={{ fontSize: 10, color: GRAY, marginBottom: 3 }}>📍 {addr}</div>}

                      {(d.checkIn || d.checkOut) && (
                        <div style={{ fontSize: 10, color: "#444" }}>
                          {d.checkIn && `Check-in  ${d.checkIn}`}
                          {d.checkIn && d.checkOut && "  ·  "}
                          {d.checkOut && `Check-out  ${d.checkOut}`}
                        </div>
                      )}

                      {b.type === "Flight" && d.airline && (
                        <div style={{ fontSize: 10, color: GRAY, marginTop: 3 }}>
                          {d.airline} {d.flightNum}
                          {d.seat && `  ·  Seat ${d.seat}`}
                          {d.gate && `  ·  Gate ${d.gate}`}
                        </div>
                      )}

                      <div style={{ fontSize: 9, color: LGRAY, marginTop: 5, letterSpacing: "0.12em" }}>
                        {d.price ? `已付：${d.price.toLocaleString()}` : "PREPAID"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{ margin: "0 56px 32px", paddingTop: 12, borderTop: RULE, display: "flex", justifyContent: "space-between", fontSize: 9, color: LGRAY, letterSpacing: "0.18em" }}>
              <span>{trip.title.toUpperCase()}</span>
              <span>{pageNum} / {totalPages}</span>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
