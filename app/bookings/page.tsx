"use client";
import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TripSwitcher from "@/components/layout/TripSwitcher"; // 🔥 加入 Switcher
import { useTripStore, Booking, BookingType } from "@/store/useTripStore";
import { Plane, Building, Ticket, Car, MapPin, Download, Plus, X, Edit, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';

export default function BookingsPage() {
  const { trips, activeTripId, addBooking, updateBooking, deleteBooking } = useTripStore();
  const trip = activeTripId ? trips.find(t => t.id === activeTripId) : trips[0];
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!trip) return <div className="p-12 text-center text-gray-400 animate-pulse">載入中...</div>;

  const handleEdit = (booking: Booking) => { setEditingBooking(booking); setIsModalOpen(true); };
  const handleDelete = (id: string) => { if(confirm("確定要刪除此預訂嗎？")) deleteBooking(trip.id, id); };

  return (
    <div className="flex min-h-screen bg-white font-sans text-jp-charcoal">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 p-8 md:p-12 bg-gray-50 min-h-screen pb-24">
        <header className="mb-10 flex justify-between items-end">
          <div>
             <h1 className="text-3xl font-serif font-bold tracking-widest uppercase mb-2">預訂憑證</h1>
             <div className="flex items-center gap-4">
                <p className="text-xs text-gray-400 tracking-widest uppercase">Bookings & Tickets</p>
                <span className="text-gray-300">|</span>
                <TripSwitcher /> {/* 🔥 Switcher 在此 */}
             </div>
          </div>
          <button onClick={()=>{setEditingBooking(null); setIsModalOpen(true)}} className="bg-jp-charcoal text-white px-4 py-2 text-xs tracking-widest uppercase flex items-center gap-2 hover:bg-black rounded"><Plus size={14}/> 新增預訂</button>
        </header>

        <div className="grid grid-cols-1 gap-6 max-w-3xl mx-auto">
          {trip.bookings && trip.bookings.length > 0 ? trip.bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} onEdit={()=>handleEdit(booking)} onDelete={()=>handleDelete(booking.id)} />
          )) : <div className="text-gray-400 text-sm text-center py-20">此旅程暫無預訂資料</div>}
        </div>
        
        {isModalOpen && <BookingModal initialData={editingBooking} onClose={()=>setIsModalOpen(false)} onSave={(b: Booking) => { if(editingBooking) updateBooking(trip.id, editingBooking.id, b); else addBooking(trip.id, b); }} />}
      </main>
    </div>
  );
}

function BookingCard({ booking, onEdit, onDelete }: { booking: Booking, onEdit: ()=>void, onDelete: ()=>void }) {
  const isFlight = booking.type === "Flight";
  const details = booking.details || {};
  const typeName = { Flight: "機票", Hotel: "住宿", Rental: "租車", Ticket: "票券" };
  
  return (
    <div className="bg-white rounded-none shadow-sm border border-gray-200 overflow-hidden relative group hover:shadow-md transition-all rounded-xl">
      <div className={`h-2 w-full ${isFlight ? 'bg-blue-600' : booking.type === 'Hotel' ? 'bg-purple-600' : 'bg-gray-400'}`} />
      
      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
         <button onClick={onEdit} className="p-1.5 text-gray-500 hover:text-black bg-white rounded-full border border-gray-100 shadow-sm"><Edit size={14}/></button>
         <button onClick={onDelete} className="p-1.5 text-gray-500 hover:text-red-500 bg-white rounded-full border border-gray-100 shadow-sm"><Trash2 size={14}/></button>
      </div>

      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
             <div className={`p-3 rounded-xl text-white ${isFlight ? 'bg-blue-500' : booking.type==='Hotel' ? 'bg-purple-500' : 'bg-gray-500'}`}>
               {booking.type === "Flight" && <Plane size={24}/>}
               {booking.type === "Hotel" && <Building size={24}/>}
               {booking.type === "Rental" && <Car size={24}/>}
               {booking.type === "Ticket" && <Ticket size={24}/>}
             </div>
             <div>
               <p className="text-[10px] text-gray-400 uppercase tracking-widest">{typeName[booking.type]}</p>
               <h3 className="text-xl font-bold font-serif">{booking.title}</h3>
               {isFlight && <p className="text-sm font-mono text-gray-600 mt-1">{details.airline} {details.flightNum}</p>}
             </div>
          </div>
          <span className="font-mono text-sm bg-gray-50 border border-gray-100 px-3 py-1 rounded">{booking.date}</span>
        </div>

        {isFlight ? (
            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-100 mb-4">
               <div className="text-center"><span className="text-2xl font-black text-gray-800">{details.origin || "ORG"}</span><p className="text-[10px] text-gray-400 uppercase">{details.departTime || "--:--"}</p></div>
               <div className="flex-1 flex flex-col items-center px-4"><span className="text-[9px] text-gray-400 mb-1">飛行時間</span><div className="w-full h-[1px] bg-gray-300 relative flex items-center justify-center"><Plane size={12} className="text-gray-400 rotate-90 absolute bg-gray-50 px-1"/></div></div>
               <div className="text-center"><span className="text-2xl font-black text-gray-800">{details.destination || "DST"}</span><p className="text-[10px] text-gray-400 uppercase">{details.arriveTime || "--:--"}</p></div>
            </div>
        ) : (
            <div className="grid grid-cols-2 gap-4 mb-4">
                {details.checkIn && <div className="bg-gray-50 p-3 rounded"><p className="text-[9px] text-gray-400 uppercase">Check-in</p><p className="font-bold">{details.checkIn}</p></div>}
                {details.checkOut && <div className="bg-gray-50 p-3 rounded"><p className="text-[9px] text-gray-400 uppercase">Check-out</p><p className="font-bold">{details.checkOut}</p></div>}
            </div>
        )}

        <div className="grid grid-cols-3 gap-4 text-sm mb-4 pt-2 border-t border-dashed border-gray-200">
           {details.seat && (<div><p className="text-[9px] text-gray-400 uppercase">座位</p><p className="font-bold">{details.seat}</p></div>)}
           {details.gate && (<div><p className="text-[9px] text-gray-400 uppercase">登機門</p><p className="font-bold">{details.gate}</p></div>)}
           {details.address && (<div className="col-span-3 flex items-center gap-1 text-gray-600 bg-white p-2 border rounded"><MapPin size={14}/><span className="truncate">{details.address}</span></div>)}
        </div>

        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
           <div className="text-[10px] text-gray-400 tracking-widest uppercase">{details.price ? `已付: ¥${details.price.toLocaleString()}` : "PREPAID"}</div>
           <button className="flex items-center gap-2 text-xs border border-gray-200 px-4 py-2 rounded hover:bg-black hover:text-white transition-colors uppercase tracking-wider"><Download size={14} /> 查看詳情</button>
        </div>
      </div>
    </div>
  );
}

function BookingModal({ onClose, onSave, initialData }: any) {
  const [type, setType] = useState<BookingType>(initialData?.type || "Flight");
  const [title, setTitle] = useState(initialData?.title || "");
  const [date, setDate] = useState(initialData?.date || "");
  const initDetails = initialData?.details || {};
  
  const [price, setPrice] = useState(initDetails.price || 0);
  const [address, setAddress] = useState(initDetails.address || "");
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

  const handleSubmit = () => {
    onSave({
        id: initialData?.id || uuidv4(), type, title, date,
        details: { price, address, ...(type === 'Flight' ? { airline, flightNum, origin, destination, seat, gate, departTime, arriveTime } : {}), ...(type === 'Hotel' ? { checkIn, checkOut } : {}) }
    });
    onClose();
  };

  const TYPE_LABELS: Record<BookingType, string> = { Flight: "機票", Hotel: "住宿", Rental: "租車", Ticket: "票券" };

  return (
     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white p-6 w-full max-w-md shadow-2xl relative rounded-xl max-h-[90vh] overflow-y-auto">
           <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black"><X size={20}/></button>
           <h2 className="font-serif font-bold text-xl mb-6">{initialData ? "編輯預訂" : "新增預訂"}</h2>
           <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
              {(Object.keys(TYPE_LABELS) as BookingType[]).map((t) => (<button key={t} onClick={()=>setType(t)} className={`flex-shrink-0 px-3 py-1 text-xs border rounded-full transition-colors ${type===t?'bg-black text-white':'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{TYPE_LABELS[t]}</button>))}
           </div>
           <div className="space-y-3">
               <input className="w-full border-b p-2 text-sm" placeholder="標題 (例: 國泰航空 / 希爾頓酒店)" value={title} onChange={e=>setTitle(e.target.value)}/>
               <input className="w-full border-b p-2 text-sm" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
               {type === 'Flight' && (<><div className="flex gap-2"><input className="flex-1 border-b p-2 text-sm" placeholder="航空公司" value={airline} onChange={e=>setAirline(e.target.value)}/><input className="flex-1 border-b p-2 text-sm" placeholder="航班編號" value={flightNum} onChange={e=>setFlightNum(e.target.value)}/></div><div className="flex gap-2"><input className="flex-1 border-b p-2 text-sm" placeholder="起飛 (HKG)" value={origin} onChange={e=>setOrigin(e.target.value)}/><input className="flex-1 border-b p-2 text-sm" placeholder="抵達 (KIX)" value={destination} onChange={e=>setDestination(e.target.value)}/></div><div className="flex gap-2"><input className="flex-1 border-b p-2 text-sm" placeholder="起飛時間" value={departTime} onChange={e=>setDepartTime(e.target.value)}/><input className="flex-1 border-b p-2 text-sm" placeholder="抵達時間" value={arriveTime} onChange={e=>setArriveTime(e.target.value)}/></div><div className="flex gap-2"><input className="flex-1 border-b p-2 text-sm" placeholder="座位" value={seat} onChange={e=>setSeat(e.target.value)}/><input className="flex-1 border-b p-2 text-sm" placeholder="登機門" value={gate} onChange={e=>setGate(e.target.value)}/></div></>)}
               {type === 'Hotel' && (<><input className="w-full border-b p-2 text-sm" placeholder="地址" value={address} onChange={e=>setAddress(e.target.value)}/><div className="flex gap-2"><input className="flex-1 border-b p-2 text-sm" placeholder="Check-in 時間" value={checkIn} onChange={e=>setCheckIn(e.target.value)}/><input className="flex-1 border-b p-2 text-sm" placeholder="Check-out 時間" value={checkOut} onChange={e=>setCheckOut(e.target.value)}/></div></>)}
               {(type === 'Rental' || type === 'Ticket') && <input className="w-full border-b p-2 text-sm" placeholder="地址 / 取車點" value={address} onChange={e=>setAddress(e.target.value)}/>}
               <input className="w-full border-b p-2 text-sm" type="number" placeholder="價格 (¥)" value={price} onChange={e=>setPrice(Number(e.target.value))}/>
           </div>
           <button onClick={handleSubmit} className="w-full bg-black text-white py-3 text-xs uppercase tracking-widest hover:opacity-80 mt-6 rounded-lg">確認儲存</button>
        </div>
     </div>
  )
}