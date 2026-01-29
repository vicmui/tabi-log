"use client";
import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { useTripStore, Booking, BookingType } from "@/store/useTripStore";
import { Plane, Building, Ticket, Car, MapPin, Download, Plus, X, Edit, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';

export default function BookingsPage() {
  const { trips, activeTripId, addBooking, updateBooking, deleteBooking } = useTripStore();
  const trip = activeTripId ? trips.find(t => t.id === activeTripId) : trips[0];
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null); // 用於編輯
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!trip) return null;

  const handleEdit = (booking: Booking) => {
    setEditingBooking(booking);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if(confirm("確定要刪除此預訂嗎？")) deleteBooking(trip.id, id);
  };

  return (
    <div className="flex min-h-screen bg-white font-sans text-jp-charcoal">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 p-8 md:p-12 bg-gray-50 min-h-screen">
        <header className="mb-10 flex justify-between items-end">
          <div>
             <h1 className="text-3xl font-serif font-bold tracking-widest uppercase mb-2">預訂憑證</h1>
             <p className="text-xs text-gray-400 tracking-widest uppercase">Bookings & Tickets</p>
          </div>
          <button onClick={()=>{setEditingBooking(null); setIsModalOpen(true)}} className="bg-jp-charcoal text-white px-4 py-2 text-xs tracking-widest uppercase flex items-center gap-2 hover:bg-black">
             <Plus size={14}/> 新增預訂
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {trip.bookings.length > 0 ? trip.bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} onEdit={()=>handleEdit(booking)} onDelete={()=>handleDelete(booking.id)} />
          )) : <div className="text-gray-400 text-sm">暫無預訂資料</div>}
        </div>
        
        {isModalOpen && (
          <BookingModal 
            initialData={editingBooking}
            onClose={()=>setIsModalOpen(false)} 
            onSave={(b: Booking) => {
               if(editingBooking) updateBooking(trip.id, editingBooking.id, b);
               else addBooking(trip.id, b);
            }} 
          />
        )}
      </main>
    </div>
  );
}

function BookingCard({ booking, onEdit, onDelete }: { booking: Booking, onEdit: ()=>void, onDelete: ()=>void }) {
  const isFlight = booking.type === "Flight";
  const typeName = { Flight: "機票", Hotel: "住宿", Rental: "租車", Ticket: "票券" };
  
  return (
    <div className="bg-white rounded-none shadow-sm border border-gray-200 overflow-hidden relative group hover:shadow-md transition-shadow">
      <div className={`h-2 w-full ${isFlight ? 'bg-jp-charcoal' : 'bg-gray-200'}`} />
      
      {/* 編輯/刪除 按鈕 */}
      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
         <button onClick={onEdit} className="p-1 text-gray-400 hover:text-black bg-white rounded-full border border-gray-100"><Edit size={14}/></button>
         <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-500 bg-white rounded-full border border-gray-100"><Trash2 size={14}/></button>
      </div>

      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
             <div className="p-3 bg-gray-50 rounded-full">
               {booking.type === "Flight" && <Plane size={20}/>}
               {booking.type === "Hotel" && <Building size={20}/>}
               {booking.type === "Rental" && <Car size={20}/>}
               {booking.type === "Ticket" && <Ticket size={20}/>}
             </div>
             <div>
               <p className="text-[10px] text-gray-400 uppercase tracking-widest">{typeName[booking.type]}</p>
               <h3 className="text-xl font-bold font-serif">{booking.title}</h3>
             </div>
          </div>
          <span className="font-mono text-sm bg-gray-100 px-2 py-1">{booking.date}</span>
        </div>

        <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm mb-6">
           {booking.details.seat && (<div><p className="text-[10px] text-gray-400 uppercase">座位</p><p className="font-bold">{booking.details.seat}</p></div>)}
           {booking.details.gate && (<div><p className="text-[10px] text-gray-400 uppercase">登機門</p><p className="font-bold">{booking.details.gate}</p></div>)}
           {booking.details.checkIn && (<div><p className="text-[10px] text-gray-400 uppercase">{isFlight?"起飛":"Check-in"}</p><p className="font-bold">{booking.details.checkIn}</p></div>)}
           {booking.details.address && (<div className="col-span-2"><p className="text-[10px] text-gray-400 uppercase">地址</p><p className="font-medium text-gray-600 flex items-center gap-1"><MapPin size={12}/> {booking.details.address}</p></div>)}
        </div>
        
        <div className="relative border-t-2 border-dashed border-gray-200 my-6 -mx-6">
           <div className="absolute -left-3 -top-3 w-6 h-6 bg-gray-50 rounded-full" /><div className="absolute -right-3 -top-3 w-6 h-6 bg-gray-50 rounded-full" />
        </div>

        <div className="flex justify-between items-center">
           <div className="text-[10px] text-gray-400 tracking-widest uppercase">
             {booking.details.price ? `已付: ¥${booking.details.price.toLocaleString()}` : "PREPAID"}
           </div>
           <button className="flex items-center gap-2 text-xs border border-gray-300 px-4 py-2 hover:bg-black hover:text-white transition-colors uppercase tracking-wider">
             <Download size={14} /> 查看憑證
           </button>
        </div>
      </div>
    </div>
  );
}

function BookingModal({ onClose, onSave, initialData }: any) {
  const [type, setType] = useState<BookingType>(initialData?.type || "Flight");
  const [title, setTitle] = useState(initialData?.title || "");
  const [date, setDate] = useState(initialData?.date || "");
  const [detail1, setDetail1] = useState(initialData?.details?.address || initialData?.details?.airline || ""); 
  const [detail2, setDetail2] = useState(initialData?.details?.seat || initialData?.details?.checkIn || ""); 
  const [price, setPrice] = useState(initialData?.details?.price || 0);

  const handleSubmit = () => {
    onSave({
        id: initialData?.id || uuidv4(), type, title, date,
        details: { price, address: type==='Hotel'?detail1:undefined, seat: type==='Flight'?detail2:undefined, checkIn: detail2 }
    });
    onClose();
  };

  const typeLabels = { Flight: "機票", Hotel: "住宿", Rental: "租車", Ticket: "票券" };

  return (
     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white p-8 w-full max-w-md shadow-2xl relative">
           <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-black"><X size={20}/></button>
           <h2 className="font-serif font-bold text-xl mb-6">{initialData ? "編輯預訂" : "新增預訂"}</h2>
           <div className="flex gap-2 mb-4">
              {['Flight','Hotel','Rental','Ticket'].map(t => (
                  <button key={t} onClick={()=>setType(t as any)} className={`px-3 py-1 text-xs border ${type===t?'bg-black text-white':'border-gray-200'}`}>{typeLabels[t as BookingType]}</button>
              ))}
           </div>
           <input className="w-full border-b mb-4 p-2 text-sm" placeholder="標題 (例: CX506 / 酒店名稱)" value={title} onChange={e=>setTitle(e.target.value)}/>
           <input className="w-full border-b mb-4 p-2 text-sm" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
           <input className="w-full border-b mb-4 p-2 text-sm" placeholder="詳細 1 (地址 / 航空公司)" value={detail1} onChange={e=>setDetail1(e.target.value)}/>
           <input className="w-full border-b mb-4 p-2 text-sm" placeholder="詳細 2 (時間 / 座位)" value={detail2} onChange={e=>setDetail2(e.target.value)}/>
           <input className="w-full border-b mb-6 p-2 text-sm" type="number" placeholder="金額 (¥)" value={price} onChange={e=>setPrice(Number(e.target.value))}/>
           <button onClick={handleSubmit} className="w-full bg-black text-white py-3 text-xs uppercase tracking-widest hover:opacity-80">確認儲存</button>
        </div>
     </div>
  )
}