"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TripSwitcher from "@/components/layout/TripSwitcher";
import { useTripStore, Member } from "@/store/useTripStore";
import { User, Plus, Trash2, Camera, Edit2, X, Check, Loader2 } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "@/lib/supabase";
import clsx from "clsx";

export default function MembersPage() {
  const { trips, activeTripId, updateTrip, isSyncing } = useTripStore();
  const trip = activeTripId ? trips.find(t => t.id === activeTripId) : trips[0];
  
  const [isMounted, setIsMounted] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { setIsMounted(true) }, []);

  if (!isMounted || !trip) {
    return (
      <div className="flex min-h-screen bg-white">
        <Sidebar />
        <main className="flex-1 ml-0 md:ml-64 p-12 flex items-center justify-center">
           <div className="text-center text-gray-400 text-xs tracking-widest animate-pulse">
              {isSyncing ? "成員資料同步中..." : "載入中..."}
           </div>
        </main>
      </div>
    );
  }

  const getRandomAvatar = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;

  const startEditing = (member: Member) => {
    setEditingMemberId(member.id);
    setNameInput(member.name);
    setAvatarUrl(member.avatar);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingMemberId(null);
    setNameInput("");
    setAvatarUrl("");
    setIsSubmitting(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsSubmitting(true);
    try {
        if (file.size > 5 * 1024 * 1024) throw new Error("圖片太大！請使用 5MB 以下的圖片。");
        const fileExt = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `public/${trip.id}/avatars/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('trip_files').upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('trip_files').getPublicUrl(filePath);
        setAvatarUrl(publicUrl);
    } catch (error: any) {
        alert("上傳失敗: " + (error.message || "未知錯誤"));
    } finally {
        setIsSubmitting(false);
    }
  };

  // 🔥 修正版：加入 try-catch 防卡死
  const handleSave = () => {
    if (!nameInput.trim()) return;
    
    setIsSubmitting(true);
    try {
        let updatedMembers = [...trip.members];

        if (editingMemberId) {
            updatedMembers = updatedMembers.map(m => 
                m.id === editingMemberId 
                ? { ...m, name: nameInput, avatar: avatarUrl || m.avatar }
                : m
            );
        } else {
            const newMember = { 
                id: uuidv4(), 
                name: nameInput, 
                avatar: avatarUrl || getRandomAvatar(nameInput) 
            };
            updatedMembers.push(newMember);
        }

        updateTrip(trip.id, { members: updatedMembers });
        resetForm();

    } catch (error) {
        console.error("Save Member Failed:", error);
        alert("儲存成員失敗，請重試。");
        // 無論成功失敗，都要結束 Loading
        setIsSubmitting(false);
    }
  };

  const handleDeleteMember = (id: string) => {
    if (confirm("確定要刪除這位成員嗎？")) {
      updateTrip(trip.id, { members: trip.members.filter(m => m.id !== id) });
      if (editingMemberId === id) resetForm();
    }
  };

  return (
    <div className="flex min-h-screen bg-white font-sans text-jp-charcoal">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 p-8 md:p-12 pb-24">
        <header className="mb-10">
          <h1 className="text-3xl font-serif font-bold tracking-widest uppercase mb-2">成員管理</h1>
          <div className="flex items-center gap-4">
             <p className="text-xs text-gray-400 tracking-widest uppercase">Travel Companions</p>
             <span className="text-gray-300">|</span>
             <TripSwitcher />
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {trip.members.map(member => (
            <div key={member.id} className={clsx("group relative bg-white border p-6 flex flex-col items-center transition-all duration-300 rounded-xl", editingMemberId === member.id ? "border-black shadow-md ring-1 ring-black" : "border-gray-200 hover:shadow-lg")}>
              <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-2 border-gray-100 bg-gray-50 relative group/avatar">
                 <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
              </div>
              <h3 className="text-xl font-bold font-serif mb-1">{member.name}</h3>
              <p className="text-[10px] text-gray-400 tracking-widest uppercase">旅伴</p>
              <div className="absolute top-4 right-4 flex gap-2">
                 <button onClick={() => startEditing(member)} className="text-gray-400 hover:text-black transition-colors p-1"><Edit2 size={14} /></button>
                 <button onClick={() => handleDeleteMember(member.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}

          <div className={clsx("border border-dashed p-6 flex flex-col items-center justify-center gap-4 rounded-xl transition-colors", editingMemberId ? "bg-white border-black" : "bg-gray-50 border-gray-300")}>
             <div className="w-full flex justify-between items-center mb-2">
                 <span className="text-xs font-bold tracking-widest uppercase text-gray-400">{editingMemberId ? "編輯資料" : "新增成員"}</span>
                 {editingMemberId && <button onClick={resetForm} className="text-gray-400 hover:text-black"><X size={16}/></button>}
             </div>
             <label className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-gray-400 border border-gray-200 cursor-pointer hover:border-black relative overflow-hidden group transition-all shadow-sm">
                {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"/> : <div className="flex flex-col items-center gap-1"><Camera size={20} /><span className="text-[9px]">上傳</span></div>}
                {isSubmitting && !nameInput && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Loader2 className="w-5 h-5 text-white animate-spin"/></div>}
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={isSubmitting} />
             </label>
             <input type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="輸入名字..." className="bg-transparent border-b border-gray-300 text-center py-2 focus:outline-none focus:border-black w-full text-lg font-serif placeholder-gray-400" disabled={isSubmitting} />
             <button onClick={handleSave} disabled={!nameInput.trim() || isSubmitting} className={clsx("text-white px-6 py-3 text-xs font-bold tracking-widest uppercase transition-all w-full rounded-lg flex items-center justify-center gap-2", (!nameInput.trim() || isSubmitting) ? "bg-gray-300 cursor-not-allowed" : "bg-[#333333] hover:bg-black shadow-lg active:scale-95")}>
               {isSubmitting ? "處理中..." : <>{editingMemberId ? <Check size={14}/> : <Plus size={14}/>} {editingMemberId ? "更新資料" : "確認新增"}</>}
             </button>
          </div>
        </div>
      </main>
    </div>
  );
}