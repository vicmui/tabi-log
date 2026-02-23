"use client";
import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TripSwitcher from "@/components/layout/TripSwitcher";
import { useTripStore, Booking, BookingType } from "@/store/useTripStore";
import { Plane, Building, Ticket, Car, MapPin, Download, Plus, X, Edit, Trash2, CheckCircle2, Upload, ArrowRightLeft, Navigation } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "@/lib/supabase";
import GooglePlacesAutocomplete from 'react-google-places-autocomplete';
import { ConfirmDialog, AlertDialog } from "@/components/ui/Dialog";

export default function BookingsPage() {
  const { trips, activeTripId, addBooking, updateBooking, deleteBooking } = useTripStore();
  const trip = activeTripId ? trips.find(t => t.id === activeTripId) : trips[0];
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);

  if (!trip) return <div className="p-12 text-center text-gray-400 animate-pulse">載入中...</div>;

  const handleEdit = (booking: Booking) => { setEditingBooking(booking); setIsModalOpen(true); };
  const handleDelete = (id: string) => { setDeletingBookingId(id); };

  return (
    <div className="flex min-h-screen bg-white font-sans text-jp-charcoal">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 p-8 md:p-12 bg-gray-50 min-h-screen pb-24">
        <header className="mb-10 flex justify-between items-end">
          <div><h1 className="text-3xl font-serif font-bold tracking-widest uppercase mb-2">預訂憑證</h1><div className="flex items-center gap-4"><p className="text-xs text-gray-400 tracking-widest uppercase">Bookings</p><span className="text-gray-300">|</span><TripSwitcher /></div></div>
          {/* 🔥 修復：whitespace-nowrap 防止文字跌落黎 */}
          <button onClick={()=>{setEditingBooking(null); setIsModalOpen(true)}} className="bg-jp-charcoal text-white px-4 py-2 text-xs tracking-widest uppercase flex items-center gap-2 hover:bg-black rounded whitespace-nowrap"><Plus size={14}/> 新增預訂</button>
        </header>

        <div className="grid grid-cols-1 gap-6 max-w-3xl mx-auto">
          {trip.bookings && trip.bookings.length > 0 ? trip.bookings.map((booking) => (<BookingCard key={booking.id} booking={booking} onEdit={()=>handleEdit(booking)} onDelete={()=>handleDelete(booking.id)} />)) : <div className="text-gray-400 text-sm text-center py-20">暫無預訂</div>}
        </div>
        
        {isModalOpen && <BookingModal initialData={editingBooking} trip={trip} onClose={()=>setIsModalOpen(false)} onSave={(b: Booking) => { if(editingBooking) updateBooking(trip.id, editingBooking.id, b); else addBooking(trip.id, b); }} />}

        <ConfirmDialog
          isOpen={!!deletingBookingId}
          title="刪除預訂"
          message="確定要刪除此預訂記錄嗎？此操作無法復原。"
          confirmLabel="刪除" cancelLabel="取消" danger
          onConfirm={() => { if (deletingBookingId) deleteBooking(trip.id, deletingBookingId); setDeletingBookingId(null); }}
          onCancel={() => setDeletingBookingId(null)}
        />
      </main>
    </div>
  );
}

function BookingCard({ booking, onEdit, onDelete }: { booking: Booking, onEdit: ()=>void, onDelete: ()=>void }) {
  const isFlight = booking.type === "Flight";
  const details = booking.details || {};
  const typeName = { Flight: "機票", Hotel: "住宿", Rental: "租車", Ticket: "票券" };
  const handleViewFile = () => { if (details.fileUrl) window.open(details.fileUrl, '_blank'); else { /* no alert - button is disabled when no file */ } };
  
  // 🔥 新增：導航功能
  const handleNavigate = () => {
      if(!details.address) return;
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(details.address)}`, '_blank');
  };

  return (
    <div className="bg-white rounded-none shadow-sm border border-gray-200 overflow-hidden relative group hover:shadow-md transition-all rounded-xl">
      <div className={`h-[3px] w-full ${booking.type === 'Flight' ? 'bg-neutral-900' : booking.type === 'Hotel' ? 'bg-neutral-600' : booking.type === 'Rental' ? 'bg-neutral-400' : 'bg-neutral-300'}`} />
      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"><button onClick={onEdit} className="p-1.5 text-gray-500 hover:text-black bg-white rounded-full border border-gray-100 shadow-sm"><Edit size={14}/></button><button onClick={onDelete} className="p-1.5 text-gray-500 hover:text-red-500 bg-white rounded-full border border-gray-100 shadow-sm"><Trash2 size={14}/></button></div>
      <div className="p-6">
        <div className="flex justify-between items-start mb-6"><div className="flex items-center gap-4"><div className={`p-3 rounded-xl text-white ${booking.type === 'Flight' ? 'bg-neutral-900' : booking.type === 'Hotel' ? 'bg-neutral-700' : booking.type === 'Rental' ? 'bg-neutral-500' : 'bg-neutral-400'}`}>{booking.type === "Flight" && <Plane size={24}/>}{booking.type === "Hotel" && <Building size={24}/>}{booking.type === "Rental" && <Car size={24}/>}{booking.type === "Ticket" && <Ticket size={24}/>}</div><div><p className="text-[10px] text-gray-400 uppercase tracking-widest">{typeName[booking.type]}</p><h3 className="text-xl font-bold font-serif">{booking.title}</h3>{isFlight && <p className="text-sm font-mono text-gray-600 mt-1">{details.airline} {details.flightNum}</p>}</div></div><span className="font-mono text-sm bg-gray-50 border border-gray-100 px-3 py-1 rounded">{booking.date}</span></div>
        {isFlight ? (<div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-100 mb-4"><div className="text-center"><span className="text-2xl font-black text-gray-800">{details.origin || "ORG"}</span><p className="text-[10px] text-gray-400 uppercase">{details.departTime || "--:--"}</p></div><div className="flex-1 flex flex-col items-center px-4"><span className="text-[9px] text-gray-400 mb-1">飛行時間</span><div className="w-full h-[1px] bg-gray-300 relative flex items-center justify-center"><Plane size={12} className="text-gray-400 rotate-90 absolute bg-gray-50 px-1"/></div></div><div className="text-center"><span className="text-2xl font-black text-gray-800">{details.destination || "DST"}</span><p className="text-[10px] text-gray-400 uppercase">{details.arriveTime || "--:--"}</p></div></div>) : (<div className="grid grid-cols-2 gap-4 mb-4">{details.checkIn && <div className="bg-gray-50 p-3 rounded"><p className="text-[9px] text-gray-400 uppercase">Check-in</p><p className="font-bold">{details.checkIn}</p></div>}{details.checkOut && <div className="bg-gray-50 p-3 rounded"><p className="text-[9px] text-gray-400 uppercase">Check-out</p><p className="font-bold">{details.checkOut}</p></div>}</div>)}
        <div className="grid grid-cols-3 gap-4 text-sm mb-4 pt-2 border-t border-dashed border-gray-200">
           {details.seat && (<div><p className="text-[9px] text-gray-400 uppercase">座位</p><p className="font-bold">{details.seat}</p></div>)}{details.gate && (<div><p className="text-[9px] text-gray-400 uppercase">登機門</p><p className="font-bold">{details.gate}</p></div>)}
           {/* 🔥 地址導航 */}
           {details.address && (<div onClick={handleNavigate} className="col-span-3 flex items-center gap-2 text-gray-600 bg-white p-2 border rounded cursor-pointer hover:border-blue-500 hover:text-blue-600 transition-colors"><MapPin size={14}/><span className="truncate flex-1">{details.address}</span><Navigation size={12} className="text-blue-500"/></div>)}
        </div>
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100"><div className="text-[10px] text-gray-400 tracking-widest uppercase">{details.price ? `已付: ¥${details.price.toLocaleString()}` : "PREPAID"}</div><button onClick={handleViewFile} disabled={!details.fileUrl} className={`flex items-center gap-2 text-xs border border-gray-200 px-4 py-2 rounded transition-colors uppercase tracking-wider ${details.fileUrl ? 'hover:bg-black hover:text-white cursor-pointer' : 'opacity-50 cursor-not-allowed bg-gray-50'}`}>{details.fileUrl ? <><Download size={14} /> 查看憑證</> : <><X size={14}/> 無憑證</>}</button></div>
      </div>
    </div>
  );
}

function BookingModal({ onClose, onSave, initialData, trip }: any) {
  const [type, setType] = useState<BookingType>(initialData?.type || "Flight");
  const [title, setTitle] = useState(initialData?.title || "");
  const [date, setDate] = useState(initialData?.date || "");
  const initDetails = initialData?.details || {};
  const [price, setPrice] = useState(initDetails.price || 0);
  const [inputPrice, setInputPrice] = useState(initDetails.price ? initDetails.price.toString() : ""); 
  const [currency, setCurrency] = useState("JPY"); 
  const [address, setAddress] = useState(initDetails.address || "");
  const [fileUrl, setFileUrl] = useState(initDetails.fileUrl || "");
  const [uploading, setUploading] = useState(false);
  const [airline, setAirline] = useState(initDetails.airline || "");
  const [flightNum, setFlightNum] = useState(initDetails.flightNum || "");
  const [origin, setOrigin] = useState(initDetails.origin || "");
  const [destination, setDestination] = useState(initDetails.destination || "");
  const [seat, setSeat] = useState(initDetails.seat || "");
  const [gate, setGate] = useState(initDetails.gate || "");
  const [departTime, setDepartTime] = useState(initDetails.departTime || "");
  const [arriveTime, setArriveTime] = useState(initDetails.arriveTime || "");
  const [checkIn, setCheckIn] = useState(initDetails.checkIn || "");
  const [checkOut, setCheckOut] = useState(initDetails.checkOut || "");
  const [isGoogleMode, setIsGoogleMode] = useState(true);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  const rate = trip?.exchangeRate || 0.052; 
  
  const handleSubmit = () => {
    let finalPrice = Number(inputPrice);
    if (currency === "HKD") finalPrice = Math.round(Number(inputPrice) / rate);
    onSave({
        id: initialData?.id || uuidv4(), type, title, date,
        details: { price: finalPrice, address, fileUrl, ...(type === 'Flight' ? { airline, flightNum, origin, destination, seat, gate, departTime, arriveTime } : {}), ...(type === 'Hotel' ? { checkIn, checkOut } : {}) }
    });
    onClose();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; setUploading(true);
    try { const fileExt = file.name.split('.').pop(); const fileName = `${uuidv4()}.${fileExt}`; const filePath = `public/${trip.id}/bookings/${fileName}`; const { error } = await supabase.storage.from('trip_files').upload(filePath, file); if (error) throw error; const { data: { publicUrl } } = supabase.storage.from('trip_files').getPublicUrl(filePath); setFileUrl(publicUrl); } catch (error: any) { console.error("上傳失敗:", error.message); } finally { setUploading(false); }
  };

  const TYPE_LABELS: Record<BookingType, string> = { Flight: "機票", Hotel: "住宿", Rental: "租車", Ticket: "票券" };
  return (
     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white p-6 w-full max-w-md shadow-2xl relative rounded-xl max-h-[90vh] overflow-y-auto">
           <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black"><X size={20}/></button>
           <h2 className="font-serif font-bold text-xl mb-6">{initialData ? "編輯預訂" : "新增預訂"}</h2>
           <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">{(Object.keys(TYPE_LABELS) as BookingType[]).map((t) => (<button key={t} onClick={()=>setType(t)} className={`flex-shrink-0 px-3 py-1 text-xs border rounded-full transition-colors ${type===t?'bg-black text-white':'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{TYPE_LABELS[t]}</button>))}</div>
           <div className="space-y-3">
               <div className="space-y-1"><label className="text-[10px] text-gray-400 uppercase tracking-widest">標題</label><input className="w-full border-b p-2 text-sm focus:border-black outline-none" placeholder="標題" value={title} onChange={e=>setTitle(e.target.value)}/></div>
               <div className="space-y-1"><label className="text-[10px] text-gray-400 uppercase tracking-widest">日期</label><input className="w-full border-b p-2 text-sm focus:border-black outline-none" type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
               {type === 'Flight' && (<><div className="flex gap-2"><input className="flex-1 border-b p-2 text-sm" placeholder="航空公司" value={airline} onChange={e=>setAirline(e.target.value)}/><input className="flex-1 border-b p-2 text-sm" placeholder="航班號" value={flightNum} onChange={e=>setFlightNum(e.target.value)}/></div><div className="flex gap-2"><input className="flex-1 border-b p-2 text-sm" placeholder="起飛 (HKG)" value={origin} onChange={e=>setOrigin(e.target.value)}/><input className="flex-1 border-b p-2 text-sm" placeholder="抵達 (KIX)" value={destination} onChange={e=>setDestination(e.target.value)}/></div><div className="flex gap-2"><input className="flex-1 border-b p-2 text-sm" placeholder="起飛時間" value={departTime} onChange={e=>setDepartTime(e.target.value)}/><input className="flex-1 border-b p-2 text-sm" placeholder="抵達時間" value={arriveTime} onChange={e=>setArriveTime(e.target.value)}/></div><div className="flex gap-2"><input className="flex-1 border-b p-2 text-sm" placeholder="座位" value={seat} onChange={e=>setSeat(e.target.value)}/><input className="flex-1 border-b p-2 text-sm" placeholder="登機門" value={gate} onChange={e=>setGate(e.target.value)}/></div></>)}
               {type === 'Hotel' && (<><div className="space-y-1"><div className="flex justify-between items-center"><label className="text-[10px] text-gray-400 uppercase tracking-widest">地址</label>{apiKey && <button onClick={()=>setIsGoogleMode(!isGoogleMode)} className="text-[9px] text-blue-500 underline">{isGoogleMode ? "手動" : "搜尋"}</button>}</div>{isGoogleMode && apiKey ? (<GooglePlacesAutocomplete apiKey={apiKey} selectProps={{ placeholder: "搜尋地點...", onChange: (val: any) => setAddress(val.label), styles: { control: (p) => ({ ...p, border: 'none', borderBottom: '1px solid #e5e7eb', borderRadius: 0, boxShadow: 'none', minHeight: '36px' }) } }} />) : (<input className="w-full border-b p-2 text-sm" placeholder="輸入地址..." value={address} onChange={e=>setAddress(e.target.value)}/>)}</div><div className="flex gap-2"><input className="flex-1 border-b p-2 text-sm" placeholder="Check-in 時間" value={checkIn} onChange={e=>setCheckIn(e.target.value)}/><input className="flex-1 border-b p-2 text-sm" placeholder="Check-out 時間" value={checkOut} onChange={e=>setCheckOut(e.target.value)}/></div></>)}
               {(type === 'Rental' || type === 'Ticket') && <input className="w-full border-b p-2 text-sm" placeholder="地址 / 取車點" value={address} onChange={e=>setAddress(e.target.value)}/>}
               <div className="relative"><div className="flex items-center border-b"><input className="w-full p-2 text-sm focus:outline-none" type="number" placeholder="費用" value={inputPrice} onChange={e=>setInputPrice(e.target.value)}/><button onClick={()=>setCurrency(currency==="JPY"?"HKD":"JPY")} className="text-xs font-bold px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 flex items-center gap-1 min-w-[50px] justify-center">{currency} <ArrowRightLeft size={10}/></button></div>{currency === "HKD" && inputPrice && (<p className="text-[10px] text-gray-400 mt-1 text-right">≈ ¥{Math.round(Number(inputPrice) / rate).toLocaleString()} (Rate: {rate})</p>)}</div>
               <div className="pt-4"><label className={`flex items-center justify-center gap-2 w-full p-3 border border-dashed rounded-lg cursor-pointer transition-colors ${fileUrl ? 'border-green-300 bg-green-50 text-green-600' : 'border-gray-300 text-gray-400 hover:bg-gray-50'}`}><input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileUpload} />{uploading ? <span className="animate-pulse">上傳中...</span> : fileUrl ? <><CheckCircle2 size={16}/> 憑證已上傳 (點擊更換)</> : <><Upload size={16}/> 上傳憑證 (PDF/圖片)</>}</label></div>
           </div>
           <button onClick={handleSubmit} disabled={uploading} className="w-full bg-black text-white py-3 text-xs uppercase tracking-widest hover:opacity-80 mt-6 rounded-lg transition-opacity disabled:opacity-50">確認儲存</button>
        </div>
     </div>
  )
}