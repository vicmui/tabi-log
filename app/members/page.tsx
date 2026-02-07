"use client";
import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { useTripStore } from "@/store/useTripStore";
import { User, Plus, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';

// ... imports ...

export default function MembersPage() {
  const { trips, activeTripId, updateTrip, isSyncing } = useTripStore();
  const trip = activeTripId ? trips.find(t => t.id === activeTripId) : trips[0];
  const [newName, setNewName] = useState("");
  const getRandomAvatar = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;

  // 🔥 修正：白畫面防護
  if (!trip) {
    return (
      <div className="flex min-h-screen bg-white font-sans text-[#333333]">
        <Sidebar />
        <main className="flex-1 ml-0 md:ml-64 p-12 flex items-center justify-center">
           <div className="text-center text-gray-400">
              {isSyncing ? "成員資料同步中..." : "請先建立旅程"}
           </div>
        </main>
      </div>
    );

  // ... handleAddMember, handleDeleteMember, return JSX 保持不變 ...

  const handleDeleteMember = (id: string) => {
    if (confirm("確定要刪除這位成員嗎？相關的記帳紀錄可能會受影響。")) {
      const updatedMembers = trip.members.filter(m => m.id !== id);
      updateTrip(trip.id, { members: updatedMembers });
    }
  };

  return (
    <div className="flex min-h-screen bg-white font-sans text-[#333333]">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 p-8 md:p-12">
        <header className="mb-10">
          <h1 className="text-3xl font-serif font-bold tracking-widest uppercase mb-2">成員管理</h1>
          <p className="text-xs text-gray-500 tracking-widest uppercase">旅伴列表</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* 1. 成員列表 */}
          {trip.members.map(member => (
            <div key={member.id} className="group relative bg-white border border-gray-200 p-6 flex flex-col items-center hover:shadow-lg transition-all duration-300">
              <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-2 border-gray-100 bg-gray-50">
                 <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
              </div>
              <h3 className="text-xl font-bold font-serif mb-1">{member.name}</h3>
              <p className="text-[10px] text-gray-400 tracking-widest uppercase">旅伴 Traveler</p>
              
              <button 
                onClick={() => handleDeleteMember(member.id)}
                className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                title="刪除成員"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          {/* 2. 新增成員卡片 */}
          <div className="bg-gray-50 border border-dashed border-gray-300 p-6 flex flex-col items-center justify-center gap-4">
             <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 mb-2">
                <User size={32} />
             </div>
             <input 
               type="text" 
               value={newName}
               onChange={(e) => setNewName(e.target.value)}
               placeholder="輸入成員名字..."
               className="bg-transparent border-b border-gray-300 text-center py-2 focus:outline-none focus:border-black w-full text-lg font-serif placeholder-gray-400"
             />
             <button 
               onClick={handleAddMember}
               className="bg-[#333333] text-white px-6 py-3 text-xs font-bold tracking-widest uppercase hover:bg-black transition-colors w-full flex items-center justify-center gap-2"
             >
               <Plus size={14} /> 新增成員
             </button>
          </div>

        </div>
      </main>
    </div>
  );
}