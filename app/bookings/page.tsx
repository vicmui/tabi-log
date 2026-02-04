"use client";
import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { useTripStore, Booking, BookingType } from "@/store/useTripStore";
import { Plane, Building, Ticket, Car, MapPin, Download, Plus, Edit, Trash2, ArrowRight } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';

export default function BookingsPage() {
  const { trips, activeTripId, addBooking, updateBooking, deleteBooking } = useTripStore();
  const trip = activeTripId ? trips.find(t => t.id === activeTripId) : trips[0];
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!trip) return null;

  const handleEdit = (booking: Booking) => { setEditingBooking(booking); setIsModalOpen(true); };
  const handleDelete = (id: string) => { if(confirm("確定要刪除此預訂嗎？")) deleteBooking(trip.id, id); };

  return (
    <div className="flex min-h-screen bg-white font-sans text-jp-charcoal">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 p-8 md:p-12 bg-gray-50 min-h-screen">
        <header className="mb-10 flex justify-between items-end">
          <div><h1 className="text-3xl font-serif font-bold tracking-widest uppercase mb-2">預訂憑證</h1></div>
          <button onClick={()=>{setEditingBooking(null); setIsModalOpen(true)}} className="bg-jp-charcoal text-white px-4 py-2 text-xs tracking-widest uppercase flex items-center gap-2 hover:bg-black"><Plus size={14}/> 新增</button>
        </header>

        <div className="grid grid-cols-1 gap-6 max-w-3xl mx-auto">
          {trip.bookings.length > 0 ? trip.bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} onEdit={()=>handleEdit(booking)} onDelete={()=>handleDelete(booking.id)} />
          )) : <div className="text-gray-400 text-sm text-center py-20">暫無預訂資料</div>}
        </div>
        
        {isModalOpen && <BookingModal initialData={editingBooking} onClose={()=>setIsModalOpen(false)} onSave={(b: Booking) => { if(editingBooking) updateBooking(trip.id, editingBooking.id, b); else addBooking(trip.id, b); }} />}
      </main>
    </div>
  );
}

function BookingCard({ booking, onEdit, onDelete }: { booking: Booking, onEdit: ()=>void, onDelete: ()=>void }) {
  const isFlight = booking.type === "Flight";
  
  return (
    <div className="bg-white shadow-sm border border-gray-200 overflow-hidden relative group hover:shadow-md transition-all rounded-xl">
      {/* 頂部顏色條 */}
      <div className={`h-2 w-full ${isFlight ? 'bg-blue-600' : booking.type === 'Hotel' ? 'bg-purple-600' : 'bg-gray-400'}`} />
      
      {/* 操作按鈕 */}
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
               <p className="text-[10px] text-gray-400 uppercase tracking-widest">{booking.type}</p>
               <h3 className="text-xl font-bold font-serif">{booking.title}</h3>
               {isFlight && <p className="text-sm font-mono text-gray-600 mt-1">{booking.details.airline} {booking.details.flightNum}</p>}
             </div>
          </div>
          <span className="font-mono text-sm bg-gray-50 border border-gray-100 px-3 py-1 rounded">{booking.date}</span>
        </div>

        {/* 內容區域：根據類型顯示不同 Layout */}
        {isFlight ? (
            // === 機票 Layout ===
            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-100 mb-4">
               <div className="text-center">
                  <span className="text-2xl font-black text-gray-800">{booking.details.origin || "ORG"}</span>
                  <p className="text-[10px] text-gray-400 uppercase">{booking.details.departTime || "--:--"}</p>
               </div>
               <div className="flex-1 flex flex-col items-center px-4">
                  <span className="text-[9px] text-gray-400 mb-1">FLIGHT DURATION</span>
                  <div className="w-full h-[1px] bg-gray-300 relative flex items-center justify-center">
                     <Plane size={12} className="text-gray-400 rotate-90 absolute bg-gray-50 px-1"/>
                  </div>
               </div>
               <div className="text-center">
                  <span className="text-2xl font-black text-gray-800">{booking.details.destination || "DST"}</span>
                  <p className="text-[10px] text-gray-400 uppercase">{booking.details.arriveTime || "--:--"}</p>
               </div>
            </div>
        ) : (
            // === 一般 Layout ===
            <div className="grid grid-cols-2 gap-4 mb-4">
                {booking.details.checkIn && <div className="bg-gray-50 p-3 rounded"><p className="text-[9px] text-gray-400 uppercase">CHECK-IN</p><p className="font-bold">{booking.details.checkIn}</p></div>}
                {booking.details.checkOut && <div className="bg-gray-50 p-3 rounded"><p className="text-[9px] text-gray-400 uppercase">CHECK-OUT</p><p className="font-bold">{booking.details.checkOut}</p></div>}
            </div>
        )}

        {/* 通用資訊 */}
        <div className="grid grid-cols-3 gap-4 text-sm mb-4 pt-2 border-t border-dashed border-gray-200">
           {booking.details.seat && (<div><p className="text-[9px] text-gray-400 uppercase">SEAT</p><p className="font-bold">{booking.details.seat}</p></div>)}
           {booking.details.gate && (<div><p className="text-[9px] text-gray-400 uppercase">GATE</p><p className="font-bold">{booking.details.gate}</p></div>)}
           {booking.details.address && (<div className="col-span-3 flex items-center gap-1 text-gray-600 bg-white p-2 border rounded"><MapPin size={14}/><span className="truncate">{booking.details.address}</span></div>)}
        </div>

        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
           <div className="text-[10px] text-gray-400 tracking-widest uppercase">
             {booking.details.price ? `PAID: ¥${booking.details.price.toLocaleString()}` : "PREPAID"}
           </div>
           <button className="flex items-center gap-2 text-xs border border-gray-200 px-4 py-2 rounded hover:bg-black hover:text-white transition-colors uppercase tracking-wider">
             <Download size={14} /> View Details
           </button>
        </div>
      </div>
    </div>
  );
}

// 智能 Modal：根據類型顯示不同欄位
function BookingModal({ onClose, onSave, initialData }: any) {
  const [type, setType] = useState<BookingType>(initialData?.type || "Flight");
  const [title, setTitle] = useState(initialData?.title || "");
  const [date, setDate] = useState(initialData?.date || "");
  
  // 通用欄位
  const [price, setPrice] = useState(initialData?.details?.price || 0);
  const [address, setAddress] = useState(initialData?.details?.address || "");
  
  // 機票欄位
  const [airline, setAirline] = useState(initialData?.details?.airline || "");
  const [flightNum, setFlightNum] = useState(initialData?.details?.flightNum || "");
  const [origin, setOrigin] = useState(initialData?.details?.origin || "");
  const [destination, setDestination] = useState(initialData?.details?.destination || "");
  const [seat, setSeat] = useState(initialData?.details?.seat || "");
  const [gate, setGate] = useState(initialData?.details?.gate || "");
  const [departTime, setDepartTime] = useState(initialData?.details?.departTime || "");
  const [arriveTime, setArriveTime] = useState(initialData?.details?.arriveTime || "");

  // 住宿欄位
  const [checkIn, setCheckIn] = useState(initialData?.details?.checkIn || "");
  const [checkOut, setCheckOut] = useState(initialData?.details?.checkOut || "");

  const handleSubmit = () => {
    onSave({
        id: initialData?.id || uuidv4(), type, title, date,
        details: { 
            price, address, 
            ...(type === 'Flight' ? { airline, flightNum, origin, destination, seat, gate, departTime, arriveTime } : {}),
            ...(type === 'Hotel' ? { checkIn, checkOut } : {})
        }
    });
    onClose();
  };

  return (
     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white p-6 w-full max-w-md shadow-2xl relative rounded-xl max-h-[90vh] overflow-y-auto">
           <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black"><X size={20}/></button>
           <h2 className="font-serif font-bold text-xl mb-6">{initialData ? "編輯預訂" : "新增預訂"}</h2>
           
           <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
              {['Flight','Hotel','Rental','Ticket'].map(t => (
                  <button key={t} onClick={()=>setType(t as any)} className={`flex-shrink-0 px-3 py-1 text-xs border rounded-full ${type===t?'bg-black text-white':'border-gray-200'}`}>{t}</button>
              ))}
           </div>

           <div className="space-y-3">
               <input className="w-full border-b p-2 text-sm" placeholder="標題 (例: 國泰航空 / Hilton)" value={title} onChange={e=>setTitle(e.target.value)}/>
               <input className="w-full border-b p-2 text-sm" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
               
               {/* 根據類型顯示不同 Input */}
               {type === 'Flight' && (
                   <>
                       <div className="flex gap-2">
                           <input className="flex-1 border-b p-2 text-sm" placeholder="航空公司" value={airline} onChange={e=>setAirline(e.target.value)}/>
                           <input className="flex-1 border-b p-2 text-sm" placeholder="航班號 (CX506)" value={flightNum} onChange={e=>setFlightNum(e.target.value)}/>
                       </div>
                       <div className="flex gap-2">
                           <input className="flex-1 border-b p-2 text-sm" placeholder="起飛機場 (HKG)" value={origin} onChange={e=>setOrigin(e.target.value)}/>
                           <input className="flex-1 border-b p-2 text-sm" placeholder="抵達機場 (KIX)" value={destination} onChange={e=>setDestination(e.target.value)}/>
                       </div>
                       <div className="flex gap-2">
                           <input className="flex-1 border-b p-2 text-sm" placeholder="起飛時間" value={departTime} onChange={e=>setDepartTime(e.target.value)}/>
                           <input className="flex-1 border-b p-2 text-sm" placeholder="抵達時間" value={arriveTime} onChange={e=>setArriveTime(e.target.value)}/>
                       </div>
                       <div className="flex gap-2">
                           <input className="flex-1 border-b p-2 text-sm" placeholder="座位" value={seat} onChange={e=>setSeat(e.target.value)}/>
                           <input className="flex-1 border-b p-2 text-sm" placeholder="登機門" value={gate} onChange={e=>setGate(e.target.value)}/>
                       </div>
                   </>
               )}

               {type === 'Hotel' && (
                   <>
                       <input className="w-full border-b p-2 text-sm" placeholder="地址" value={address} onChange={e=>setAddress(e.target.value)}/>
                       <div className="flex gap-2">
                           <input className="flex-1 border-b p-2 text-sm" placeholder="Check-in 時間" value={checkIn} onChange={e=>setCheckIn(e.target.value)}/>
                           <input className="flex-1 border-b p-2 text-sm" placeholder="Check-out 時間" value={checkOut} onChange={e=>setCheckOut(e.target.value)}/>
                       </div>
                   </>
               )}

               {(type === 'Rental' || type === 'Ticket') && (
                   <input className="w-full border-b p-2 text-sm" placeholder="地址 / 取車點" value={address} onChange={e=>setAddress(e.target.value)}/>
               )}

               <input className="w-full border-b p-2 text-sm" type="number" placeholder="價格 (¥)" value={price} onChange={e=>setPrice(Number(e.target.value))}/>
           </div>

           <button onClick={handleSubmit} className="w-full bg-black text-white py-3 text-xs uppercase tracking-widest hover:opacity-80 mt-6 rounded-lg">確認儲存</button>
        </div>
     </div>
  )
}