"use client";
import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TripSwitcher from "@/components/layout/TripSwitcher";
import { useTripStore, Booking, BookingType } from "@/store/useTripStore";
import { useActiveTrip } from "@/lib/useActiveTrip";
import { Plane, Building, Ticket, Car, MapPin, Download, Plus, X, Edit, Trash2, CheckCircle2, Upload, ArrowRightLeft, Navigation } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "@/lib/supabase";
import PlacesSearch from "@/components/ui/PlacesSearch";
import { ConfirmDialog, AlertDialog } from "@/components/ui/Dialog";

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
            <h1 className="text-3xl font-serif font-bold tracking-widest uppercase mb-2">預訂憑證</h1>
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

        <div className="grid grid-cols-1 gap-6 max-w-3xl mx-auto">
          {trip.bookings && trip.bookings.length > 0
            ? trip.bookings.map(booking => (
                <BookingCard key={booking.id} booking={booking}
                  onEdit={() => { setEditingBooking(booking); setIsModalOpen(true); }}
                  onDelete={() => setDeletingBookingId(booking.id)} />
              ))
            : <div className="text-gray-500 text-sm text-center py-20">暫無預訂</div>
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

function BookingCard({ booking, onEdit, onDelete }: { booking: Booking; onEdit: () => void; onDelete: () => void }) {
  const isFlight = booking.type === "Flight";
  const details  = booking.details || {};
  const typeName: Record<string, string> = { Flight: "機票", Hotel: "住宿", Rental: "租車", Ticket: "票券" };

  return (
    <div className="bg-white border border-gray-200 overflow-hidden relative group hover:border-neutral-400 transition-colors">
      <div className={`h-[3px] w-full ${booking.type === 'Flight' ? 'bg-neutral-900' : booking.type === 'Hotel' ? 'bg-neutral-600' : booking.type === 'Rental' ? 'bg-neutral-400' : 'bg-neutral-300'}`} />
      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button onClick={onEdit} className="p-1.5 text-gray-500 hover:text-black bg-white rounded-full border border-gray-100"><Edit size={14} /></button>
        <button onClick={onDelete} className="p-1.5 text-gray-500 hover:text-red-500 bg-white rounded-full border border-gray-100"><Trash2 size={14} /></button>
      </div>
      <div className="p-6">
        <div className="flex justify-between items-start mb-6 pr-16">
          <div className="flex items-center gap-4">
            <div className={`p-3 text-white ${booking.type === 'Flight' ? 'bg-neutral-900' : booking.type === 'Hotel' ? 'bg-neutral-700' : booking.type === 'Rental' ? 'bg-neutral-500' : 'bg-neutral-400'}`}>
              {booking.type === "Flight" && <Plane size={24} />}
              {booking.type === "Hotel" && <Building size={24} />}
              {booking.type === "Rental" && <Car size={24} />}
              {booking.type === "Ticket" && <Ticket size={24} />}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest">{typeName[booking.type]}</p>
              <h3 className="text-xl font-bold font-serif">{booking.title}</h3>
              {isFlight && <p className="text-sm font-mono text-gray-600 mt-1">{details.airline} {details.flightNum}</p>}
            </div>
          </div>
          <span className="font-mono text-sm bg-gray-50 border border-gray-100 px-3 py-1 shrink-0">{booking.date}</span>
        </div>

        {isFlight ? (
          <div className="flex items-center justify-between bg-gray-50 p-4 border border-gray-100 mb-4">
            <div className="text-center">
              <span className="text-2xl font-black text-gray-800">{details.origin || "ORG"}</span>
              <p className="text-xs text-gray-500 uppercase">{details.departTime || "--:--"}</p>
            </div>
            <div className="flex-1 flex flex-col items-center px-4">
              <span className="text-[11px] text-gray-500 mb-1">飛行時間</span>
              <div className="w-full h-[1px] bg-gray-300 relative flex items-center justify-center">
                <Plane size={12} className="text-gray-500 rotate-90 absolute bg-gray-50 px-1" />
              </div>
            </div>
            <div className="text-center">
              <span className="text-2xl font-black text-gray-800">{details.destination || "DST"}</span>
              <p className="text-xs text-gray-500 uppercase">{details.arriveTime || "--:--"}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 mb-4">
            {details.checkIn  && <div className="bg-gray-50 p-3"><p className="text-[11px] text-gray-500 uppercase">Check-in</p><p className="font-bold">{details.checkIn}</p></div>}
            {details.checkOut && <div className="bg-gray-50 p-3"><p className="text-[11px] text-gray-500 uppercase">Check-out</p><p className="font-bold">{details.checkOut}</p></div>}
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 text-sm mb-4 pt-2 border-t border-dashed border-gray-200">
          {details.seat && <div><p className="text-[11px] text-gray-500 uppercase">座位</p><p className="font-bold">{details.seat}</p></div>}
          {details.gate && <div><p className="text-[11px] text-gray-500 uppercase">登機門</p><p className="font-bold">{details.gate}</p></div>}
          {details.address && (
            <div
              onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(details.address ?? '')}`, '_blank')}
              className="col-span-3 flex items-center gap-2 text-gray-600 bg-white p-2 border cursor-pointer hover:border-blue-500 hover:text-blue-600 transition-colors"
            >
              <MapPin size={14} /><span className="truncate flex-1">{details.address}</span><Navigation size={12} className="text-blue-500" />
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
          <div className="text-xs text-gray-500 tracking-widest uppercase">
            {details.price ? `已付: ¥${details.price.toLocaleString()}` : "PREPAID"}
          </div>
          <button
            onClick={() => details.fileUrl && window.open(details.fileUrl, '_blank')}
            disabled={!details.fileUrl}
            className={`flex items-center gap-2 text-xs border border-gray-200 px-4 py-2 transition-colors uppercase tracking-wider ${details.fileUrl ? 'hover:bg-black hover:text-white cursor-pointer' : 'opacity-50 cursor-not-allowed bg-gray-50'}`}
          >
            {details.fileUrl ? <><Download size={14} /> 查看憑證</> : <><X size={14} /> 無憑證</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function BookingModal({ onClose, onSave, initialData, trip }: any) {
  const [type, setType]         = useState<BookingType>(initialData?.type || "Flight");
  const [title, setTitle]       = useState(initialData?.title || "");
  const [date, setDate]         = useState(initialData?.date || "");
  const init = initialData?.details || {};
  const localCurr = trip?.localCurrency || 'JPY';
  const [inputPrice, setInputPrice]   = useState(init.price ? String(init.price) : "");
  const [currency, setCurrency]       = useState(localCurr);
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
  const rate = trip?.exchangeRate || 0.052;

  const handleSubmit = () => {
    let finalPrice = Number(inputPrice);
    if (currency === "HKD") finalPrice = Math.round(Number(inputPrice) / rate);
    onSave({
      id: initialData?.id || uuidv4(), type, title, date,
      details: {
        price: finalPrice, address, fileUrl,
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
        <h2 className="font-serif font-bold text-xl mb-6">{initialData ? "編輯預訂" : "新增預訂"}</h2>

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
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-widest">日期</label>
            <input type="date" className="w-full border-b p-2 text-sm focus:border-black outline-none"
              value={date} onChange={e => setDate(e.target.value)} />
          </div>

          {type === 'Flight' && (<>
            <div className="flex gap-2">
              <input className="flex-1 border-b p-2 text-sm focus:outline-none" placeholder="航空公司" value={airline} onChange={e => setAirline(e.target.value)} />
              <input className="flex-1 border-b p-2 text-sm focus:outline-none" placeholder="航班號" value={flightNum} onChange={e => setFlightNum(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <input className="flex-1 border-b p-2 text-sm focus:outline-none" placeholder="起飛 (HKG)" value={origin} onChange={e => setOrigin(e.target.value)} />
              <input className="flex-1 border-b p-2 text-sm focus:outline-none" placeholder="抵達 (KIX)" value={destination} onChange={e => setDestination(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <input className="flex-1 border-b p-2 text-sm focus:outline-none" placeholder="起飛時間" value={departTime} onChange={e => setDepartTime(e.target.value)} />
              <input className="flex-1 border-b p-2 text-sm focus:outline-none" placeholder="抵達時間" value={arriveTime} onChange={e => setArriveTime(e.target.value)} />
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
            <div className="flex gap-2">
              <input className="flex-1 border-b p-2 text-sm focus:outline-none" placeholder="Check-in 時間" value={checkIn} onChange={e => setCheckIn(e.target.value)} />
              <input className="flex-1 border-b p-2 text-sm focus:outline-none" placeholder="Check-out 時間" value={checkOut} onChange={e => setCheckOut(e.target.value)} />
            </div>
          </>)}

          {type === 'Rental' && (<>
            <div className="flex gap-2">
              <input className="flex-1 border-b p-2 text-sm focus:outline-none" placeholder="取車地點" value={pickupLocation} onChange={e => setPickupLocation(e.target.value)} />
              <input className="flex-1 border-b p-2 text-sm focus:outline-none" placeholder="還車地點" value={dropoffLocation} onChange={e => setDropoffLocation(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <input className="flex-1 border-b p-2 text-sm focus:outline-none" placeholder="取車時間" value={checkIn} onChange={e => setCheckIn(e.target.value)} />
              <input className="flex-1 border-b p-2 text-sm focus:outline-none" placeholder="還車時間" value={checkOut} onChange={e => setCheckOut(e.target.value)} />
            </div>
          </>)}

          {type === 'Ticket' && (<>
            <input className="w-full border-b p-2 text-sm focus:outline-none" placeholder="地點 / 場館" value={address} onChange={e => setAddress(e.target.value)} />
            <div className="flex gap-2">
              <input className="flex-1 border-b p-2 text-sm focus:outline-none" placeholder="入場時間" value={checkIn} onChange={e => setCheckIn(e.target.value)} />
              <input className="flex-1 border-b p-2 text-sm focus:outline-none" placeholder="座位 / 區域" value={seat} onChange={e => setSeat(e.target.value)} />
            </div>
          </>)}

          {/* Price */}
          <div className="flex items-center border-b">
            <input className="w-full p-2 text-sm focus:outline-none" type="number" inputMode="decimal"
              placeholder="費用" value={inputPrice} onChange={e => setInputPrice(e.target.value)} />
            <button onClick={() => setCurrency(currency === localCurr ? "HKD" : localCurr)}
              className="text-xs font-bold px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 flex items-center gap-1 min-w-[50px] justify-center">
              {currency} <ArrowRightLeft size={10} />
            </button>
          </div>
          {currency === "HKD" && inputPrice && (
            <p className="text-xs text-gray-500 text-right">
              approx. ¥{Math.round(Number(inputPrice) / rate).toLocaleString()} (Rate: {rate})
            </p>
          )}

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
