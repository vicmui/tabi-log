"use client";
import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TripSwitcher from "@/components/layout/TripSwitcher";
import { useTripStore, Booking, BookingType } from "@/store/useTripStore";
import { useActiveTrip } from "@/lib/useActiveTrip";
import { Plane, Building, Ticket, Car, MapPin, Download, Plus, X, Edit, Trash2, CheckCircle2, Upload, Navigation, CalendarPlus, Moon } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "@/lib/supabase";
import PlacesSearch from "@/components/ui/PlacesSearch";
import { ConfirmDialog, AlertDialog } from "@/components/ui/Dialog";
import TravelDocs from "@/components/bookings/TravelDocs";
import { downloadBookingIcs } from "@/lib/calendar";
import { COMMON_CURRENCIES, formatMoney, localOf } from "@/lib/money";

/** 兩個日期之間的晚數 */
function nightsBetween(from?: string, to?: string): number {
  if (!from || !to) return 0;
  const a = Date.parse(from + "T00:00:00");
  const b = Date.parse(to + "T00:00:00");
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
  return Math.round((b - a) / 86400000);
}

export default function BookingsPage() {
  const { addBooking, updateBooking, deleteBooking } = useTripStore();
  const { trip, isLoading } = useActiveTrip();
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);

  if (isLoading) return <div className="p-12 text-center text-gray-500 text-xs tracking-widest animate-pulse">載入中...</div>;
  if (!trip) return <div className="p-12 text-center text-gray-500 text-xs tracking-widest">暫無旅程，請先新增旅程</div>;

  return (
    <div className="flex min-h-screen bg-white font-sans text-jp-charcoal">
      <Sidebar />
      <main className="flex-1 min-w-0 ml-0 md:ml-64 p-5 sm:p-8 md:p-12 bg-gray-50 min-h-screen pb-24">
        <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end">
          <div>
            <h1 className="text-3xl font-serif font-semibold tracking-widest uppercase mb-2">預訂憑證</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-xs text-gray-500 tracking-widest uppercase">Bookings</p>
              <span className="text-gray-400">|</span>
              <TripSwitcher />
            </div>
          </div>
          <button
            onClick={() => { setEditingBooking(null); setIsModalOpen(true); }}
            className="bg-jp-charcoal text-white px-6 py-3 text-xs tracking-widest uppercase flex items-center justify-center gap-2 hover:bg-black whitespace-nowrap transition-colors w-full sm:w-auto shrink-0"
          >
            <Plus size={14} /> 新增預訂
          </button>
        </header>

        {/* 證件置於最前 —— 過關時要即時找得到，不應要捲到頁底 */}
        <TravelDocs trip={trip} />

        <div className="max-w-3xl mx-auto mb-4">
          <h2 className="text-xs tracking-[0.2em] uppercase text-gray-500">預訂</h2>
        </div>

        <div className="grid grid-cols-1 gap-6 max-w-3xl mx-auto">
          {trip.bookings && trip.bookings.length > 0
            ? [...trip.bookings]
                .sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"))
                .map(booking => (
                  <BookingCard key={booking.id} booking={booking} trip={trip}
                    onEdit={() => { setEditingBooking(booking); setIsModalOpen(true); }}
                    onDelete={() => setDeletingBookingId(booking.id)} />
                ))
            : <div className="text-gray-500 text-sm text-center py-20 border border-dashed border-gray-200 bg-white">暫無預訂</div>
          }
        </div>

        {isModalOpen && (
          <BookingModal
            initialData={editingBooking}
            trip={trip}
            onClose={() => setIsModalOpen(false)}
            onSave={(b: Booking) => {
              if (editingBooking) updateBooking(trip.id, editingBooking.id, b);
              else addBooking(trip.id, b);
            }}
          />
        )}

        <ConfirmDialog
          isOpen={!!deletingBookingId}
          title="刪除預訂" message="確定要刪除此預訂記錄嗎？此操作無法復原。"
          confirmLabel="刪除" cancelLabel="取消" danger
          onConfirm={() => { if (deletingBookingId) deleteBooking(trip.id, deletingBookingId); setDeletingBookingId(null); }}
          onCancel={() => setDeletingBookingId(null)}
        />
      </main>
    </div>
  );
}

function BookingCard({ booking, trip, onEdit, onDelete }: { booking: Booking; trip: any; onEdit: () => void; onDelete: () => void }) {
  const isFlight = booking.type === "Flight";
  const details  = booking.details || {};
  const typeName: Record<string, string> = { Flight: "機票", Hotel: "住宿", Rental: "租車", Ticket: "票券" };
  const hasRange = !!details.endDate && details.endDate !== booking.date;
  const nights   = nightsBetween(booking.date, details.endDate);

  return (
    <div className="bg-white border border-gray-200 overflow-hidden relative group hover:border-neutral-400 transition-colors">
      <div className={`h-[3px] w-full ${booking.type === 'Flight' ? 'bg-neutral-900' : booking.type === 'Hotel' ? 'bg-neutral-600' : booking.type === 'Rental' ? 'bg-neutral-400' : 'bg-neutral-300'}`} />
      <div className="absolute top-4 right-4 flex gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10">
        <button onClick={onEdit} aria-label="編輯" className="p-1.5 text-gray-500 hover:text-black bg-white rounded-full border border-gray-100"><Edit size={14} /></button>
        <button onClick={onDelete} aria-label="刪除" className="p-1.5 text-gray-500 hover:text-red-500 bg-white rounded-full border border-gray-100"><Trash2 size={14} /></button>
      </div>
      <div className="p-6">
        {/*
          手機上必須直排（flex-col）。
          之前橫排時，日期膠囊「2026-09-11 → 2026-09-15」加上右上角按鈕的 pr-16，
          在 390px 闊的螢幕上只剩幾十像素給標題，於是 break-words 逐個字斷行，
          「Cross Hotel」變成直排。給標題整行寬度，問題自然消失。
        */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4 mb-6 pr-14">
          <div className="flex items-center gap-4 min-w-0">
            <div className={`p-3 text-white shrink-0 ${booking.type === 'Flight' ? 'bg-neutral-900' : booking.type === 'Hotel' ? 'bg-neutral-700' : booking.type === 'Rental' ? 'bg-neutral-500' : 'bg-neutral-400'}`}>
              {booking.type === "Flight" && <Plane size={24} />}
              {booking.type === "Hotel" && <Building size={24} />}
              {booking.type === "Rental" && <Car size={24} />}
              {booking.type === "Ticket" && <Ticket size={24} />}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 uppercase tracking-widest">{typeName[booking.type]}</p>
              <h3 className="text-xl font-semibold font-serif break-words leading-snug">{booking.title}</h3>
              {isFlight && <p className="text-sm font-mono text-gray-600 mt-1">{details.airline} {details.flightNum}</p>}
            </div>
          </div>
          {/* 日期範圍 —— 住宿不應只有單一日期 */}
          <div className="shrink-0 sm:text-right">
            <span className="font-mono text-xs sm:text-sm bg-gray-50 border border-gray-100 px-3 py-1 inline-block whitespace-nowrap">
              {booking.date || "—"}{hasRange && <> <span className="text-gray-400">→</span> {details.endDate}</>}
            </span>
            {nights > 0 && (
              <p className="text-[11px] text-gray-500 mt-1.5 flex items-center gap-1 sm:justify-end">
                <Moon size={10} /> {nights} 晚
              </p>
            )}
          </div>
        </div>

        {isFlight ? (
          <div className="flex items-center justify-between bg-gray-50 p-4 border border-gray-100 mb-4">
            <div className="text-center">
              <span className="text-2xl font-semibold text-gray-800">{details.origin || "ORG"}</span>
              <p className="text-xs text-gray-500 uppercase">{details.departTime || "--:--"}</p>
            </div>
            <div className="flex-1 flex flex-col items-center px-4">
              <span className="text-[11px] text-gray-500 mb-1">飛行時間</span>
              <div className="w-full h-[1px] bg-gray-300 relative flex items-center justify-center">
                <Plane size={12} className="text-gray-500 rotate-90 absolute bg-gray-50 px-1" />
              </div>
            </div>
            <div className="text-center">
              <span className="text-2xl font-semibold text-gray-800">{details.destination || "DST"}</span>
              <p className="text-xs text-gray-500 uppercase">{details.arriveTime || "--:--"}</p>
            </div>
          </div>
        ) : (
          (details.checkIn || details.checkOut) && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              {details.checkIn  && <div className="bg-gray-50 p-3"><p className="text-[11px] text-gray-500 uppercase">{booking.type === 'Rental' ? '取車' : booking.type === 'Ticket' ? '入場' : 'Check-in'}</p><p className="font-semibold">{details.checkIn}</p></div>}
              {details.checkOut && <div className="bg-gray-50 p-3"><p className="text-[11px] text-gray-500 uppercase">{booking.type === 'Rental' ? '還車' : 'Check-out'}</p><p className="font-semibold">{details.checkOut}</p></div>}
            </div>
          )
        )}

        <div className="grid grid-cols-3 gap-4 text-sm mb-4 pt-2 border-t border-dashed border-gray-200">
          {details.seat && <div><p className="text-[11px] text-gray-500 uppercase">座位</p><p className="font-semibold">{details.seat}</p></div>}
          {details.gate && <div><p className="text-[11px] text-gray-500 uppercase">登機門</p><p className="font-semibold">{details.gate}</p></div>}
          {details.address && (
            <div
              onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(details.address ?? '')}`, '_blank')}
              className="col-span-3 flex items-center gap-2 text-gray-600 bg-white p-2 border cursor-pointer hover:border-blue-500 hover:text-blue-600 transition-colors"
            >
              <MapPin size={14} /><span className="truncate flex-1">{details.address}</span><Navigation size={12} className="text-blue-500" />
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-between items-center gap-3 mt-4 pt-4 border-t border-gray-100">
          <div className="text-xs text-gray-500 tracking-widest uppercase">
            {details.price
              ? `已付 ${formatMoney(details.price, details.currency ?? localOf(trip))}`
              : "PREPAID"}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => downloadBookingIcs(trip, booking.id)}
              disabled={!booking.date}
              title="加入行事曆"
              className="flex items-center gap-2 text-xs border border-gray-200 px-4 py-2 transition-colors uppercase tracking-wider hover:bg-black hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-current"
            >
              <CalendarPlus size={14} /> 行事曆
            </button>
            <button
              onClick={() => details.fileUrl && window.open(details.fileUrl, '_blank')}
              disabled={!details.fileUrl}
              className={`flex items-center gap-2 text-xs border border-gray-200 px-4 py-2 transition-colors uppercase tracking-wider ${details.fileUrl ? 'hover:bg-black hover:text-white cursor-pointer' : 'opacity-50 cursor-not-allowed bg-gray-50'}`}
            >
              {details.fileUrl ? <><Download size={14} /> 憑證</> : <><X size={14} /> 無憑證</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingModal({ onClose, onSave, initialData, trip }: any) {
  const [type, setType]         = useState<BookingType>(initialData?.type || "Flight");
  const [title, setTitle]       = useState(initialData?.title || "");
  const [date, setDate]         = useState(initialData?.date || trip?.startDate || "");
  const init = initialData?.details || {};
  const localCurr = localOf(trip);
  const [endDate, setEndDate]         = useState(init.endDate || "");
  const [inputPrice, setInputPrice]   = useState(init.price ? String(init.price) : "");
  // 舊紀錄沒有 currency：當時一律換算成當地貨幣才儲存，故退回當地貨幣即可對應
  const [currency, setCurrency]       = useState(init.currency || localCurr);
  const [address, setAddress]         = useState(init.address || "");
  const [pickupLocation, setPickupLocation] = useState(init.pickupLocation || "");
  const [dropoffLocation, setDropoffLocation] = useState(init.dropoffLocation || "");
  const [fileUrl, setFileUrl]         = useState(init.fileUrl || "");
  const [uploading, setUploading]     = useState(false);
  const [airline, setAirline]         = useState(init.airline || "");
  const [flightNum, setFlightNum]     = useState(init.flightNum || "");
  const [origin, setOrigin]           = useState(init.origin || "");
  const [destination, setDestination] = useState(init.destination || "");
  const [seat, setSeat]               = useState(init.seat || "");
  const [gate, setGate]               = useState(init.gate || "");
  const [departTime, setDepartTime]   = useState(init.departTime || "");
  const [arriveTime, setArriveTime]   = useState(init.arriveTime || "");
  const [checkIn, setCheckIn]         = useState(init.checkIn || "");
  const [checkOut, setCheckOut]       = useState(init.checkOut || "");
  /** 住宿同租車先有結束日期；機票同票券得一日 */
  const hasRange = type === 'Hotel' || type === 'Rental';
  const nights = nightsBetween(date, endDate);

  const handleSubmit = () => {
    onSave({
      id: initialData?.id || uuidv4(), type, title, date,
      details: {
        // 直接儲存原幣金額，不再於存檔時強制換算 ——
        // 從前存的是換算後的日圓，日後改匯率，已付的單就跟住變。
        price: Number(inputPrice) || 0,
        currency,
        address, fileUrl,
        ...(hasRange ? { endDate } : {}),
        ...(type === 'Flight' ? { airline, flightNum, origin, destination, seat, gate, departTime, arriveTime } : {}),
        ...(type === 'Hotel'  ? { checkIn, checkOut } : {}),
        ...(type === 'Rental' ? { pickupLocation, dropoffLocation, checkIn, checkOut } : {}),
        ...(type === 'Ticket' ? { checkIn, seat } : {}),
      },
    });
    onClose();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; setUploading(true);
    try {
      const filePath = `public/${trip.id}/bookings/${uuidv4()}.${file.name.split('.').pop()}`;
      const { error } = await supabase.storage.from('trip_files').upload(filePath, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('trip_files').getPublicUrl(filePath);
      setFileUrl(publicUrl);
    } catch (err: any) { console.error(err.message); }
    finally { setUploading(false); }
  };

  const TYPE_LABELS: Record<BookingType, string> = { Flight: "機票", Hotel: "住宿", Rental: "租車", Ticket: "票券" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white p-6 w-full max-w-md border border-gray-200 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-black"><X size={20} /></button>
        <h2 className="font-serif font-semibold text-xl mb-6">{initialData ? "編輯預訂" : "新增預訂"}</h2>

        <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
          {(Object.keys(TYPE_LABELS) as BookingType[]).map(t => (
            <button key={t} onClick={() => setType(t)}
              className={`flex-shrink-0 px-3 py-1 text-xs border rounded-full transition-colors ${type === t ? 'bg-black text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-widest">標題</label>
            <input className="w-full border-b p-2 text-sm focus:border-black outline-none" placeholder="標題"
              value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          {/* 日期 —— 住宿／租車是一段期間，並非單一日子 */}
          <div className={hasRange ? "grid grid-cols-2 gap-3" : ""}>
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-widest">
                {type === 'Hotel' ? '入住日期' : type === 'Rental' ? '取車日期' : type === 'Flight' ? '出發日期' : '日期'}
              </label>
              <input type="date" className="w-full border-b p-2 text-sm focus:border-black outline-none"
                value={date} onChange={e => setDate(e.target.value)} />
            </div>
            {hasRange && (
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-widest">
                  {type === 'Hotel' ? '退房日期' : '還車日期'}
                </label>
                <input type="date" min={date || undefined} className="w-full border-b p-2 text-sm focus:border-black outline-none"
                  value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            )}
          </div>
          {hasRange && nights > 0 && (
            <p className="text-[11px] text-gray-500 -mt-1">共 {nights} 晚</p>
          )}
          {hasRange && endDate && nights === 0 && (
            <p className="text-[11px] text-red-600 -mt-1">退房日期須晚於入住日期</p>
          )}

          {type === 'Flight' && (<>
            <div className="flex gap-2">
              <input className="flex-1 border-b p-2 text-sm focus:outline-none" placeholder="航空公司" value={airline} onChange={e => setAirline(e.target.value)} />
              <input className="flex-1 border-b p-2 text-sm focus:outline-none" placeholder="航班號" value={flightNum} onChange={e => setFlightNum(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <input className="flex-1 border-b p-2 text-sm focus:outline-none" placeholder="起飛 (HKG)" value={origin} onChange={e => setOrigin(e.target.value)} />
              <input className="flex-1 border-b p-2 text-sm focus:outline-none" placeholder="抵達 (KIX)" value={destination} onChange={e => setDestination(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <label className="flex-1 block">
                <span className="text-[11px] text-gray-500">起飛時間</span>
                <input type="time" className="w-full border-b p-2 text-sm focus:outline-none focus:border-black bg-transparent" value={departTime} onChange={e => setDepartTime(e.target.value)} />
              </label>
              <label className="flex-1 block">
                <span className="text-[11px] text-gray-500">抵達時間</span>
                <input type="time" className="w-full border-b p-2 text-sm focus:outline-none focus:border-black bg-transparent" value={arriveTime} onChange={e => setArriveTime(e.target.value)} />
              </label>
            </div>
            <div className="flex gap-2">
              <input className="flex-1 border-b p-2 text-sm focus:outline-none" placeholder="座位" value={seat} onChange={e => setSeat(e.target.value)} />
              <input className="flex-1 border-b p-2 text-sm focus:outline-none" placeholder="登機門" value={gate} onChange={e => setGate(e.target.value)} />
            </div>
          </>)}

          {type === 'Hotel' && (<>
            {/* ✅ New PlacesSearch replaces GooglePlacesAutocomplete */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">地址</label>
              <PlacesSearch
                placeholder="搜尋酒店地址..."
                onSelect={result => setAddress(result.label)}
              />
              {address && <p className="text-xs text-gray-500 mt-1 truncate">{address}</p>}
            </div>
            <div className="flex gap-3">
              <label className="flex-1 block">
                <span className="text-[11px] text-gray-500">入住時間</span>
                <input type="time" className="w-full border-b p-2 text-sm focus:outline-none focus:border-black bg-transparent" value={checkIn} onChange={e => setCheckIn(e.target.value)} />
              </label>
              <label className="flex-1 block">
                <span className="text-[11px] text-gray-500">退房時間</span>
                <input type="time" className="w-full border-b p-2 text-sm focus:outline-none focus:border-black bg-transparent" value={checkOut} onChange={e => setCheckOut(e.target.value)} />
              </label>
            </div>
            <p className="text-[11px] text-gray-500">若未填寫，行事曆將採用一般酒店時間：入住 15:00、退房 11:00。</p>
          </>)}

          {type === 'Rental' && (<>
            <div className="flex gap-2">
              <input className="flex-1 border-b p-2 text-sm focus:outline-none" placeholder="取車地點" value={pickupLocation} onChange={e => setPickupLocation(e.target.value)} />
              <input className="flex-1 border-b p-2 text-sm focus:outline-none" placeholder="還車地點" value={dropoffLocation} onChange={e => setDropoffLocation(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <label className="flex-1 block">
                <span className="text-[11px] text-gray-500">取車時間</span>
                <input type="time" className="w-full border-b p-2 text-sm focus:outline-none focus:border-black bg-transparent" value={checkIn} onChange={e => setCheckIn(e.target.value)} />
              </label>
              <label className="flex-1 block">
                <span className="text-[11px] text-gray-500">還車時間</span>
                <input type="time" className="w-full border-b p-2 text-sm focus:outline-none focus:border-black bg-transparent" value={checkOut} onChange={e => setCheckOut(e.target.value)} />
              </label>
            </div>
          </>)}

          {type === 'Ticket' && (<>
            <input className="w-full border-b p-2 text-sm focus:outline-none" placeholder="地點 / 場館" value={address} onChange={e => setAddress(e.target.value)} />
            <div className="flex gap-3">
              <label className="flex-1 block">
                <span className="text-[11px] text-gray-500">入場時間</span>
                <input type="time" className="w-full border-b p-2 text-sm focus:outline-none focus:border-black bg-transparent" value={checkIn} onChange={e => setCheckIn(e.target.value)} />
              </label>
              <label className="flex-1 block">
                <span className="text-[11px] text-gray-500">座位 / 區域</span>
                <input className="w-full border-b p-2 text-sm focus:outline-none focus:border-black" value={seat} onChange={e => setSeat(e.target.value)} />
              </label>
            </div>
          </>)}

          {/* 費用 —— 選用哪種貨幣便儲存哪種，不再於存檔時暗中換算 */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-widest block mb-1">費用</label>
            <div className="flex items-center gap-2 border-b">
              <input className="flex-1 min-w-0 p-2 text-sm focus:outline-none" type="number" inputMode="decimal"
                placeholder="0" value={inputPrice} onChange={e => setInputPrice(e.target.value)} />
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="text-xs bg-gray-100 px-2 py-1.5 focus:outline-none"
              >
                {Array.from(new Set([currency, localCurr, ...COMMON_CURRENCIES])).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            {Number(inputPrice) > 0 && (
              <p className="text-[11px] text-gray-500 mt-1 text-right">
                {formatMoney(Number(inputPrice), currency)}
                {nights > 1 && `　平均每晚 ${formatMoney(Number(inputPrice) / nights, currency)}`}
              </p>
            )}
          </div>

          {/* File upload */}
          <div className="pt-2">
            <label className={`flex items-center justify-center gap-2 w-full p-3 border border-dashed cursor-pointer transition-colors ${fileUrl ? 'border-green-300 bg-green-50 text-green-600' : 'border-gray-300 text-gray-500 hover:bg-gray-50'}`}>
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileUpload} />
              {uploading
                ? <span className="animate-pulse">上傳中...</span>
                : fileUrl
                  ? <><CheckCircle2 size={16} /> 憑證已上傳 (點擊更換)</>
                  : <><Upload size={16} /> 上傳憑證 (PDF / 圖片，最大 10MB)</>
              }
            </label>
          </div>
        </div>

        <button onClick={handleSubmit} disabled={uploading}
          className="w-full bg-black text-white py-3 text-xs uppercase tracking-widest hover:opacity-80 mt-6 transition-opacity disabled:opacity-50">
          確認儲存
        </button>
      </div>
    </div>
  );
}
