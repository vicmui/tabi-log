"use client";
import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { useTripStore, Priority } from "@/store/useTripStore";
import { CheckCircle2, Circle, Image as ImageIcon, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';

export default function PlanningPage() {
  const { trips, activeTripId, addPlanItem, togglePlanItem, deletePlanItem, isSyncing } = useTripStore();
  const trip = activeTripId ? trips.find(t => t.id === activeTripId) : trips[0];
  const [activeTab, setActiveTab] = useState("Packing");
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [location, setLocation] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [assignee, setAssignee] = useState("");
  const [imageUrl, setImageUrl] = useState(""); // 新增：圖片網址

    if (!trip) {
    return (
      <div className="flex min-h-screen bg-white font-sans text-jp-charcoal">
        <Sidebar />
        <main className="flex-1 ml-0 md:ml-64 p-12 flex items-center justify-center">
           <div className="text-center text-gray-400">
              {isSyncing ? "清單同步中..." : "暫無旅程"}
           </div>
        </main>
      </div>
    );
  }
  const currentItems = trip.plans.filter(p => p.category === activeTab);
  const tabNames: Record<string, string> = { Packing: "行李清單", Todo: "待辦事項", Shopping: "購物清單" };
  const priorityColor = { High: "text-red-500", Medium: "text-yellow-500", Low: "text-blue-500" };

  const handleAdd = () => {
     if(!text) return;
     addPlanItem(trip.id, {
         id: uuidv4(), category: activeTab as any, text, priority, location, 
         estimatedCost: activeTab==='Shopping' ? Number(estimatedCost) : undefined, 
         isCompleted: false, assigneeId: assignee, imageUrl
     });
     setText(""); setLocation(""); setEstimatedCost(""); setAssignee(""); setImageUrl("");
  };

  // 模擬上傳圖片 (實際需要 Backend，這裡用 Prompt 讓用戶貼網址，或用預設圖)
  const handleUploadImage = () => {
      const url = prompt("請輸入圖片網址 (URL):", "https://placehold.co/150x150/png?text=Item");
      if(url) setImageUrl(url);
  };

  return (
    <div className="flex min-h-screen bg-white font-sans text-jp-charcoal">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 p-8 md:p-12">
        <header className="mb-10"><h1 className="text-3xl font-serif font-bold tracking-widest uppercase mb-2">行前準備</h1></header>
        
        <div className="flex gap-8 border-b border-gray-100 mb-8">
           {['Packing','Todo','Shopping'].map(t => (
               <button key={t} onClick={()=>setActiveTab(t)} className={`pb-4 text-xs font-bold tracking-[0.2em] uppercase ${activeTab===t?'border-b-2 border-black':'text-gray-300'}`}>{tabNames[t]}</button>
           ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {currentItems.map(item => {
               const assigned = trip.members.find(m=>m.id === item.assigneeId);
               return (
               <div key={item.id} className="p-4 border border-gray-100 bg-white hover:shadow-md transition-shadow relative group">
                  <div className="flex justify-between items-start mb-2">
                     <button onClick={()=>togglePlanItem(trip.id, item.id)}>{item.isCompleted ? <CheckCircle2 size={20}/> : <Circle size={20}/>}</button>
                     <span className={`text-[10px] uppercase font-bold ${priorityColor[item.priority]}`}>{item.priority}</span>
                  </div>
                  
                  {/* 購物清單縮圖 */}
                  {item.category === 'Shopping' && item.imageUrl && (
                      <div className="w-full h-32 mb-3 bg-gray-50 rounded-md overflow-hidden border border-gray-100">
                          <img src={item.imageUrl} className="w-full h-full object-cover" />
                      </div>
                  )}

                  <p className={`font-medium ${item.isCompleted?'line-through text-gray-300':''}`}>{item.text}</p>
                  {item.location && <p className="text-xs text-gray-400 mt-1">@ {item.location}</p>}
                  {item.estimatedCost && <p className="text-xs text-gray-400 mt-1">預算: ¥{item.estimatedCost}</p>}
                  
                  {assigned && (
                      <div className="mt-3 flex items-center gap-2 bg-gray-50 p-1 rounded-full w-fit pr-2">
                          <img src={assigned.avatar} className="w-5 h-5 rounded-full"/>
                          <span className="text-[10px] text-gray-500">{assigned.name}</span>
                      </div>
                  )}

                  <button onClick={() => deletePlanItem(trip.id, item.id)} className="absolute top-4 right-2 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-opacity">
                      <Trash2 size={16} />
                  </button>
               </div>
           )})}
           
           <div className="border border-dashed border-gray-300 p-4 bg-gray-50">
              <input value={text} onChange={e=>setText(e.target.value)} placeholder="項目名稱..." className="w-full bg-transparent border-b mb-3 text-sm p-1"/>
              {activeTab === 'Shopping' && (
                  <>
                    <input value={location} onChange={e=>setLocation(e.target.value)} placeholder="購買地點..." className="w-full bg-transparent border-b mb-3 text-sm p-1"/>
                    <input type="number" value={estimatedCost} onChange={e=>setEstimatedCost(e.target.value)} placeholder="預算 (¥)..." className="w-full bg-transparent border-b mb-3 text-sm p-1"/>
                    <button onClick={handleUploadImage} className="text-xs text-blue-500 mb-3 flex items-center gap-1"><ImageIcon size={12}/> {imageUrl ? "已選擇圖片" : "加入圖片 (URL)"}</button>
                  </>
              )}
              <div className="flex gap-2 mb-3">
                 {['High','Medium','Low'].map(p=>(<button key={p} onClick={()=>setPriority(p as any)} className={`text-[10px] border px-2 ${priority===p?'bg-black text-white':'bg-white'}`}>{p}</button>))}
              </div>
              <div className="flex gap-2 mb-4">
                 <span className="text-[10px] text-gray-400 flex items-center">指派:</span>
                 {trip.members.map(m => (
                    <button key={m.id} onClick={()=>setAssignee(m.id === assignee ? "" : m.id)} className={`w-6 h-6 rounded-full border ${assignee===m.id ? 'border-black scale-110' : 'border-transparent opacity-50'}`}>
                       <img src={m.avatar} className="w-full h-full rounded-full"/>
                    </button>
                 ))}
              </div>
              <button onClick={handleAdd} className="w-full bg-black text-white py-2 text-xs uppercase">新增</button>
           </div>
        </div>
      </main>
    </div>
  );
}