"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { useTripStore } from "@/store/useTripStore";
import { User, Plus, Trash2, Camera } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "@/lib/supabase";

export default function MembersPage() {
  const { trips, activeTripId, updateTrip, isSyncing } = useTripStore();
  const trip = activeTripId ? trips.find(t => t.id === activeTripId) : trips[0];
  const [newName, setNewName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true) }, []);

  if (!isMounted || !trip) return <div className="p-12 text-center text-gray-400 animate-pulse">載入中...</div>;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const filePath = `public/${trip.id}/avatars/${uuidv4()}-${file.name}`;
    const { error } = await supabase.storage.from('trip_files').upload(filePath, file);
    if (error) alert("上傳失敗: " + error.message);
    else {
        const { data: { publicUrl } } = supabase.storage.from('trip_files').getPublicUrl(filePath);
        setAvatarUrl(publicUrl);
    }
  };

  const handleAddMember = () => {
    if (!newName) return;
    const newMember = { 
        id: uuidv4(), 
        name: newName, 
        // 如果有上傳就用上傳的，否則用預設
        avatar: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${newName}` 
    };
    const updatedMembers = [...trip.members, newMember];
    updateTrip(trip.id, { members: updatedMembers });
    setNewName(""); setAvatarUrl("");
  };

  const handleDeleteMember = (id: string) => {
    if (confirm("確定要刪除成員嗎？")) {
      updateTrip(trip.id, { members: trip.members.filter(m => m.id !== id) });
    }
  };

  return (
    <div className="flex min-h-screen bg-white font-sans text-[#333333]">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 p-8 md:p-12 pb-24">
        <header className="mb-10"><h1 className="text-3xl font-serif font-bold tracking-widest uppercase mb-2">成員管理</h1></header>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {trip.members.map(member => (
            <div key={member.id} className="group relative bg-white border border-gray-200 p-6 flex flex-col items-center hover:shadow-lg transition-all duration-300 rounded-xl">
              <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-2 border-gray-100 bg-gray-50">
                 <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
              </div>
              <h3 className="text-xl font-bold font-serif mb-1">{member.name}</h3>
              <p className="text-[10px] text-gray-400 tracking-widest uppercase">旅伴</p>
              <button onClick={() => handleDeleteMember(member.id)} className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
            </div>
          ))}

          <div className="bg-gray-50 border border-dashed border-gray-300 p-6 flex flex-col items-center justify-center gap-4 rounded-xl">
             <label className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-gray-400 border border-gray-200 cursor-pointer hover:border-black relative overflow-hidden">
                {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover"/> : <Camera size={24} />}
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
             </label>
             <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="名字..." className="bg-transparent border-b border-gray-300 text-center py-2 focus:outline-none focus:border-black w-full text-lg font-serif" />
             <button onClick={handleAddMember} className="bg-[#333333] text-white px-6 py-2 text-xs font-bold tracking-widest uppercase hover:bg-black transition-colors w-full rounded-lg">新增成員</button>
          </div>
        </div>
      </main>
    </div>
  );
}