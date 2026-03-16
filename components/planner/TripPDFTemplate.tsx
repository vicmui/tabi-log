// components/planner/TripPDFTemplate.tsx
// Rendered off-screen → captured by html2canvas → sliced into A4 pages.
// Style: United Tokyo — stark black/white, strong typography, clean grid.

import { Trip } from "@/store/useTripStore";

const TYPE_EMOJI: Record<string, string> = {
  Food: "🍽", Sightseeing: "📸", Shopping: "🛍",
  Transport: "🚃", Hotel: "🏨", Other: "📍",
};
const TYPE_LABEL: Record<string, string> = {
  Food: "美食", Sightseeing: "景點", Shopping: "購物",
  Transport: "交通", Hotel: "住宿", Other: "其他",
};

// ── Shared tokens ──────────────────────────────────────────────────────────
const FONT  = "'Noto Sans TC', 'PingFang TC', 'Hiragino Sans', 'Microsoft JhengHei', sans-serif";
const SERIF = "Georgia, 'Noto Serif TC', serif";
const BLACK = "#0a0a0a";
const GRAY  = "#767676";
const RULE  = "1px solid #e0e0e0";
const THICK = "2px solid #0a0a0a";

interface Props { trip: Trip }

export default function TripPDFTemplate({ trip }: Props) {
  const totalActs   = trip.dailyItinerary.reduce((s, d) => s + (d.activities?.length ?? 0), 0);
  const visitedActs = trip.dailyItinerary.reduce((s, d) => s + (d.activities?.filter(a => a?.isVisited)?.length ?? 0), 0);
  const nights      = Math.max(0, trip.dailyItinerary.length - 1);

  return (
    <div
      id="trip-pdf-root"
      style={{ width: 794, background: "#fff", color: BLACK, fontFamily: FONT, fontSize: 12 }}
    >

      {/* ══════════════════════════════════════════════════════════════
          COVER PAGE
      ══════════════════════════════════════════════════════════════ */}
      <div style={{ width: 794, minHeight: 1123, display: "flex", flexDirection: "column" }}>

        {/* Top bar */}
        <div style={{ height: 6, background: BLACK }} />

        {/* Header strip */}
        <div style={{ padding: "28px 56px 0", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 9, letterSpacing: "0.35em", color: GRAY, textTransform: "uppercase", fontFamily: FONT }}>
            VM&apos;S BUILD / 旅行手帳
          </span>
          <span style={{ fontSize: 9, letterSpacing: "0.2em", color: GRAY, fontFamily: FONT }}>
            {new Date().toLocaleDateString("zh-HK", { year: "numeric", month: "long", day: "numeric" })}
          </span>
        </div>

        {/* Hero image */}
        <div style={{ margin: "32px 0 0", height: 340, overflow: "hidden", position: "relative", background: "#111" }}>
          {trip.coverImage && (
            <img
              src={trip.coverImage}
              alt=""
              crossOrigin="anonymous"
              style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.75 }}
            />
          )}
          {/* Overlay grid lines */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to bottom, transparent 50%, rgba(10,10,10,0.55) 100%)",
          }} />
        </div>

        {/* Title block */}
        <div style={{ padding: "40px 56px 0" }}>
          <div style={{ borderLeft: "4px solid " + BLACK, paddingLeft: 20, marginBottom: 32 }}>
            <h1 style={{
              fontFamily: SERIF, fontSize: 48, fontWeight: 700,
              letterSpacing: "-0.02em", lineHeight: 1.1,
              margin: "0 0 10px", color: BLACK,
            }}>
              {trip.title}
            </h1>
            <p style={{ fontSize: 13, color: GRAY, margin: 0, letterSpacing: "0.08em" }}>
              {trip.startDate}&nbsp;&nbsp;—&nbsp;&nbsp;{trip.endDate}
            </p>
          </div>

          {/* Stats row */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
            borderTop: THICK, borderBottom: THICK,
            padding: "24px 0",
          }}>
            {[
              ["行程天數", `${trip.dailyItinerary.length}`, "天"],
              ["住宿晚數", `${nights}`, "晚"],
              ["活動數目", `${totalActs}`, "個"],
              ["完成率",   `${totalActs > 0 ? Math.round((visitedActs / totalActs) * 100) : 0}`, "%"],
            ].map(([label, num, unit]) => (
              <div key={label} style={{ textAlign: "center", padding: "0 8px" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 3 }}>
                  <span style={{ fontFamily: SERIF, fontSize: 40, fontWeight: 700, lineHeight: 1, color: BLACK }}>{num}</span>
                  <span style={{ fontSize: 11, color: GRAY }}>{unit}</span>
                </div>
                <div style={{ fontSize: 9, letterSpacing: "0.2em", color: GRAY, marginTop: 6, textTransform: "uppercase" }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Day index */}
        <div style={{ padding: "32px 56px 0" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.3em", color: GRAY, textTransform: "uppercase", marginBottom: 12 }}>
            行程概覽
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px 16px" }}>
            {trip.dailyItinerary.map(day => {
              const acts = (day.activities || []).filter(a => a?.id);
              return (
                <div key={day.day} style={{
                  display: "flex", alignItems: "baseline", gap: 8,
                  padding: "6px 0", borderBottom: "1px solid #f0f0f0",
                }}>
                  <span style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 700, color: BLACK, minWidth: 30 }}>
                    {String(day.day).padStart(2, "0")}
                  </span>
                  <div>
                    <div style={{ fontSize: 9, color: GRAY }}>{day.date}</div>
                    <div style={{ fontSize: 10, color: BLACK, marginTop: 1 }}>
                      {day.customLocation || (acts[0]?.location?.split(" ")[0]) || "自由探索"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Spacer + footer */}
        <div style={{ flex: 1 }} />
        <div style={{
          margin: "0 56px 40px",
          paddingTop: 16, borderTop: RULE,
          display: "flex", justifyContent: "space-between",
          fontSize: 9, color: GRAY, letterSpacing: "0.2em",
        }}>
          <span>CONFIDENTIAL — PERSONAL TRAVEL DOCUMENT</span>
          <span>1 / {1 + trip.dailyItinerary.length + (trip.bookings?.length ? 1 : 0)}</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          DAILY ITINERARY — one page per day
      ══════════════════════════════════════════════════════════════ */}
      {trip.dailyItinerary.map((day, dayIdx) => {
        const acts = (day.activities || []).filter(a => a?.id);
        const pageNum = dayIdx + 2;
        return (
          <div key={day.day} style={{ width: 794, minHeight: 1123, display: "flex", flexDirection: "column" }}>

            {/* Top bar */}
            <div style={{ height: 6, background: BLACK }} />

            {/* Page header */}
            <div style={{
              padding: "24px 56px 20px",
              display: "flex", alignItems: "flex-end", justifyContent: "space-between",
              borderBottom: THICK,
            }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
                {/* Big day number */}
                <span style={{ fontFamily: SERIF, fontSize: 72, fontWeight: 700, lineHeight: 1, color: BLACK, letterSpacing: "-0.04em" }}>
                  {String(day.day).padStart(2, "0")}
                </span>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: "0.3em", color: GRAY, textTransform: "uppercase", marginBottom: 4 }}>
                    DAY {day.day} / {trip.dailyItinerary.length}
                  </div>
                  <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 600, color: BLACK }}>
                    {day.customLocation || (acts[0]?.location?.split(" ")[0]) || "自由探索"}
                  </div>
                  <div style={{ fontSize: 10, color: GRAY, marginTop: 2, letterSpacing: "0.05em" }}>
                    {day.date}
                  </div>
                </div>
              </div>
              {/* Trip name top right */}
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 9, color: GRAY, letterSpacing: "0.2em", textTransform: "uppercase" }}>
                  {trip.title}
                </div>
                <div style={{ fontSize: 9, color: GRAY, letterSpacing: "0.1em", marginTop: 2 }}>
                  {acts.length} 個活動
                </div>
              </div>
            </div>

            {/* Activities */}
            <div style={{ flex: 1, padding: "0 56px" }}>
              {acts.length === 0 ? (
                <div style={{ padding: "40px 0", color: GRAY, fontSize: 11, letterSpacing: "0.1em", textAlign: "center" }}>
                  今日暫無行程
                </div>
              ) : acts.map((act, i) => (
                <div
                  key={act.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "72px 28px 1fr",
                    gap: "0 16px",
                    padding: "18px 0",
                    borderBottom: i < acts.length - 1 ? RULE : undefined,
                  }}
                >
                  {/* Time */}
                  <div style={{ paddingTop: 2, textAlign: "right" }}>
                    {act.time ? (
                      <span style={{ fontFamily: "monospace", fontSize: 12, color: BLACK, letterSpacing: "0.04em" }}>
                        {act.time}
                      </span>
                    ) : (
                      <span style={{ color: "#ccc", fontSize: 10 }}>—</span>
                    )}
                  </div>

                  {/* Index circle */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 2 }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: "50%",
                      background: act.isVisited ? BLACK : "#fff",
                      border: "1.5px solid " + BLACK,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 700,
                      color: act.isVisited ? "#fff" : BLACK,
                      flexShrink: 0,
                    }}>
                      {i + 1}
                    </div>
                    {/* Connector line */}
                    {i < acts.length - 1 && (
                      <div style={{ width: 1, flex: 1, background: "#e0e0e0", marginTop: 4 }} />
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ minWidth: 0 }}>
                    {/* Title row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 600, color: BLACK }}>
                        {act.location}
                      </span>
                      <span style={{
                        fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase",
                        padding: "2px 7px", border: RULE, color: GRAY,
                      }}>
                        {TYPE_EMOJI[act.type] ?? "📍"} {TYPE_LABEL[act.type] ?? act.type}
                      </span>
                      {act.isVisited && (
                        <span style={{
                          fontSize: 9, letterSpacing: "0.1em",
                          padding: "2px 7px", background: BLACK, color: "#fff",
                        }}>
                          ✓ VISITED
                        </span>
                      )}
                    </div>

                    {/* Address */}
                    {act.address && (
                      <div style={{ fontSize: 10, color: GRAY, marginBottom: 3, letterSpacing: "0.02em" }}>
                        {act.address}
                      </div>
                    )}

                    {/* Note */}
                    {act.note && (
                      <div style={{
                        fontSize: 11, color: "#444",
                        borderLeft: "2px solid #e0e0e0",
                        paddingLeft: 10, marginTop: 5,
                        fontStyle: "italic",
                      }}>
                        {act.note}
                      </div>
                    )}

                    {/* Rating */}
                    {act.rating && act.rating > 0 ? (
                      <div style={{ marginTop: 5, fontSize: 11, letterSpacing: "0.05em" }}>
                        {"★".repeat(act.rating)}<span style={{ color: "#ddd" }}>{"★".repeat(5 - act.rating)}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            {/* Page footer */}
            <div style={{
              margin: "0 56px 40px",
              paddingTop: 16, borderTop: RULE,
              display: "flex", justifyContent: "space-between",
              fontSize: 9, color: GRAY, letterSpacing: "0.2em",
            }}>
              <span>{trip.title.toUpperCase()}</span>
              <span>{pageNum} / {1 + trip.dailyItinerary.length + (trip.bookings?.length ? 1 : 0)}</span>
            </div>
          </div>
        );
      })}

      {/* ══════════════════════════════════════════════════════════════
          BOOKINGS SUMMARY PAGE
      ══════════════════════════════════════════════════════════════ */}
      {trip.bookings && trip.bookings.length > 0 && (() => {
        const pageNum = 1 + trip.dailyItinerary.length + 1;
        const typeLabel: Record<string, string> = { Flight: "✈ 機票", Hotel: "🏨 住宿", Rental: "🚗 租車", Ticket: "🎟 票券" };
        return (
          <div style={{ width: 794, minHeight: 1123, display: "flex", flexDirection: "column" }}>
            <div style={{ height: 6, background: BLACK }} />

            {/* Header */}
            <div style={{
              padding: "24px 56px 20px",
              display: "flex", alignItems: "flex-end", justifyContent: "space-between",
              borderBottom: THICK,
            }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
                <span style={{ fontFamily: SERIF, fontSize: 54, fontWeight: 700, lineHeight: 1, color: BLACK, letterSpacing: "-0.03em" }}>
                  BK
                </span>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: "0.3em", color: GRAY, textTransform: "uppercase", marginBottom: 4 }}>
                    BOOKINGS
                  </div>
                  <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 600 }}>預訂憑證</div>
                  <div style={{ fontSize: 10, color: GRAY, marginTop: 2 }}>{trip.bookings.length} 項預訂</div>
                </div>
              </div>
              <div style={{ textAlign: "right", fontSize: 9, color: GRAY, letterSpacing: "0.2em" }}>
                <div>{trip.title.toUpperCase()}</div>
                <div style={{ marginTop: 2 }}>{trip.startDate} — {trip.endDate}</div>
              </div>
            </div>

            {/* Bookings list */}
            <div style={{ flex: 1, padding: "0 56px" }}>
              {trip.bookings.map((b, i) => {
                const d = b.details || {};
                return (
                  <div key={b.id} style={{
                    display: "grid", gridTemplateColumns: "100px 1fr",
                    gap: "0 24px", padding: "20px 0",
                    borderBottom: i < trip.bookings!.length - 1 ? RULE : undefined,
                  }}>
                    {/* Left: type + date */}
                    <div>
                      <div style={{
                        fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase",
                        padding: "2px 7px", border: RULE,
                        display: "inline-block", marginBottom: 6, color: GRAY,
                      }}>
                        {typeLabel[b.type] ?? b.type}
                      </div>
                      <div style={{ fontFamily: "monospace", fontSize: 10, color: GRAY }}>
                        {b.date}
                      </div>
                    </div>

                    {/* Right: details */}
                    <div>
                      <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 600, marginBottom: 5 }}>
                        {b.title}
                      </div>

                      {b.type === "Flight" && d.origin && (
                        <div style={{
                          display: "flex", alignItems: "center", gap: 16,
                          background: "#f8f8f8", padding: "10px 16px",
                          marginBottom: 6,
                        }}>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 700 }}>{d.origin}</div>
                            <div style={{ fontSize: 10, color: GRAY, fontFamily: "monospace" }}>{d.departTime || "--:--"}</div>
                          </div>
                          <div style={{ flex: 1, height: 1, background: "#ccc" }} />
                          <div style={{ fontSize: 10, color: GRAY }}>✈</div>
                          <div style={{ flex: 1, height: 1, background: "#ccc" }} />
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 700 }}>{d.destination}</div>
                            <div style={{ fontSize: 10, color: GRAY, fontFamily: "monospace" }}>{d.arriveTime || "--:--"}</div>
                          </div>
                        </div>
                      )}

                      {d.address && (
                        <div style={{ fontSize: 10, color: GRAY, marginBottom: 3 }}>📍 {d.address}</div>
                      )}
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
                      {d.price ? (
                        <div style={{ fontSize: 10, color: GRAY, marginTop: 4 }}>
                          已付：{d.price.toLocaleString()}
                        </div>
                      ) : (
                        <div style={{ fontSize: 9, color: "#bbb", marginTop: 4, letterSpacing: "0.15em" }}>PREPAID</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{
              margin: "0 56px 40px",
              paddingTop: 16, borderTop: RULE,
              display: "flex", justifyContent: "space-between",
              fontSize: 9, color: GRAY, letterSpacing: "0.2em",
            }}>
              <span>{trip.title.toUpperCase()}</span>
              <span>{pageNum} / {pageNum}</span>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
