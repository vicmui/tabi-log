"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { useTripStore, Priority } from "@/store/useTripStore";
import { CheckCircle2, Circle, Image as ImageIcon, Trash2, Upload, X } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "@/lib/supabase";
import clsx from "clsx";

export default function PlanningPage() {
  const { trips, activeTripId, addPlanItem, togglePlanItem, deletePlanItem, isSyncing } = useTripStore();
  
  // 優先使用 activeTripId，否則拿第一個，防止 refresh 後找不到
  const trip = activeTripId ? trips.find(t => t.id === activeTripId) : trips.length > 0 ? trips[0] : null;
  
  const [activeTab, setActiveTab] = useState("Packing");
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [location, setLocation] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [assignee, setAssignee] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // 🔥 關鍵修正：如果沒有 trip 資料，顯示 Loading 畫面，而不是崩潰或跳轉
  if (!trip) {
    return (
      <div className="flex min-h-screen bg-white font-sans text-jp-charcoal">
        <Sidebar />
        <main className="flex-1 ml-0 md:ml-64 p-12 flex items-center justify-center">
           <div className="text-center text-gray-400 text-xs tracking-widest animate-pulse">
              {isSyncing ? "清單同步中..." : "請先在首頁建立一個旅程"}
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
     // Reset
     setText(""); setLocation(""); setEstimatedCost(""); setAssignee(""); setImageUrl("");
  };

  // 🔥 Supabase 圖片上傳功能
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      try {
          const filePath = `public/${trip.id}/planning/${uuidv4()}-${file.name}`;
          const { error } = await supabase.storage.from('trip_files').upload(filePath, file);

          if (error) throw error;

          const { data: { publicUrl } } = supabase.storage.from('trip_files').getPublicUrl(filePath);
          setImageUrl(publicUrl);
      } catch (error: any) {
          alert("上傳失敗: " + error.message);
      } finally {
          setIsUploading(false);
      }
  };

  return (
    <div className="flex min-h-screen bg-white font-sans text-jp-charcoal">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 p-8 md:p-12">
        <header className="mb-10">
            <h1 className="text-3xl font-serif font-bold tracking-widest uppercase mb-2">行前準備</h1>
            <p className="text-xs text-gray-400 tracking-widest uppercase">Checklist & Shopping</p>
        </header>
        
        {/* Tabs */}
        <div className="flex gap-8 border-b border-gray-100 mb-8 overflow-x-auto no-scrollbar">
           {['Packing','Todo','Shopping'].map(t => (
               <button key={t} onClick={()=>setActiveTab(t)} className={`pb-4 text-xs font-bold tracking-[0.2em] uppercase whitespace-nowrap ${activeTab===t?'border-b-2 border-black':'text-gray-300'}`}>{tabNames[t]}</button>
           ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {/* Items List */}
           {currentItems.map(item => {
               const assigned = trip.members.find(m=>m.id === item.assigneeId);
               return (
               <div key={item.id} className="p-4 border border-gray-100 bg-white hover:shadow-md transition-shadow relative group rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                     <button onClick={()=>togglePlanItem(trip.id, item.id)} className={item.isCompleted ? "text-gray-300" : "text-black"}>
                        {item.isCompleted ? <CheckCircle2 size={20}/> : <Circle size={20}/>}
                     </button>
                     <span className={`text-[10px] uppercase font-bold ${priorityColor[item.priority]}`}>{item.priority}</span>
                  </div>
                  
                  {/* 縮圖顯示 */}
                  {item.imageUrl && (
                      <div className="w-full h-32 mb-3 bg-gray-50 rounded overflow-hidden border border-gray-100">
                          <img src={item.imageUrl} className="w-full h-full object-cover" />
                      </div>
                  )}

                  <p className={`font-medium ${item.isCompleted?'line-through text-gray-300':''}`}>{item.text}</p>
                  
                  <div className="mt-2 space-y-1">
                    {item.location && <p className="text-xs text-gray-400">📍 {item.location}</p>}
                    {item.estimatedCost && <p className="text-xs text-gray-400">💰 ¥{item.estimatedCost}</p>}
                  </div>
                  
                  {assigned && (
                      <div className="mt-3 flex items-center gap-2 bg-gray-50 p-1 rounded-full w-fit pr-2 border border-gray-100">
                          <img src={assigned.avatar} className="w-5 h-5 rounded-full"/>
                          <span className="text-[10px] text-gray-500">{assigned.name}</span>
                      </div>
                  )}

                  <button onClick={() => deletePlanItem(trip.id, item.id)} className="absolute top-4 right-2 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-opacity">
                      <Trash2 size={16} />
                  </button>
               </div>
           )})}
           
           {/* Add New Item Card */}
           <div className="border border-dashed border-gray-300 p-4 bg-gray-50 rounded-lg">
              <input value={text} onChange={e=>setText(e.target.value)} placeholder="項目名稱..." className="w-full bg-transparent border-b mb-3 text-sm p-1 focus:border-black outline-none"/>
              
              {activeTab === 'Shopping' && (
                  <>
                    <input value={location} onChange={e=>setLocation(e.target.value)} placeholder="購買地點..." className="w-full bg-transparent border-b mb-3 text-sm p-1 focus:border-black outline-none"/>
                    <input type="number" value={estimatedCost} onChange={e=>setEstimatedCost(e.target.value)} placeholder="預算 (¥)..." className="w-full bg-transparent border-b mb-3 text-sm p-1 focus:border-black outline-none"/>
                    
                    {/* 圖片上傳按鈕 */}
                    <div className="mb-3">
                        {imageUrl ? (
                            <div className="relative w-full h-24 rounded overflow-hidden group">
                                <img src={imageUrl} className="w-full h-full object-cover" />
                                <button onClick={()=>setImageUrl("")} className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full"><X size={12}/></button>
                            </div>
                        ) : (
                            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer hover:text-black transition-colors">
                                {isUploading ? "上傳中..." : <><ImageIcon size={14}/> 上傳參考圖片</>}
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                            </label>
                        )}
                    </div>
                  </>
              )}

              <div className="flex gap-2 mb-3">
                 {['High','Medium','Low'].map(p=>(<button key={p} onClick={()=>setPriority(p as any)} className={`text-[10px] border px-2 py-1 rounded ${priority===p?'bg-black text-white':'bg-white text-gray-400'}`}>{p}</button>))}
              </div>
              
              <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
                 <span className="text-[10px] text-gray-400 flex items-center shrink-0">指派:</span>
                 {trip.members.map(m => (
                    <button key={m.id} onClick={()=>setAssignee(m.id === assignee ? "" : m.id)} className={`w-6 h-6 rounded-full border shrink-0 ${assignee===m.id ? 'border-black scale-110 shadow-sm' : 'border-transparent opacity-50'}`}>
                       <img src={m.avatar} className="w-full h-full rounded-full"/>
                    </button>
                 ))}
              </div>
              
              <button onClick={handleAdd} className="w-full bg-jp-charcoal text-white py-2 text-xs uppercase tracking-widest hover:bg-black rounded transition-colors">新增</button>
           </div>
        </div>
      </main>
    </div>
  );
}