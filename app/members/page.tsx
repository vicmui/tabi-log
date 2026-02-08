"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TripSwitcher from "@/components/layout/TripSwitcher";
import { useTripStore, Member } from "@/store/useTripStore";
import { User, Plus, Trash2, Camera, Edit2, X, Check } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "@/lib/supabase";
import clsx from "clsx";

export default function MembersPage() {
  const { trips, activeTripId, updateTrip, isSyncing } = useTripStore();
  const trip = activeTripId ? trips.find(t => t.id === activeTripId) : trips[0];
  
  // 狀態管理
  const [isMounted, setIsMounted] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null); // 追蹤正在編輯誰
  const [nameInput, setNameInput] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { setIsMounted(true) }, []);

  if (!isMounted || !trip) return <div className="p-12 text-center text-gray-400 text-xs tracking-widest animate-pulse">載入中...</div>;

  const getRandomAvatar = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;

  // 進入編輯模式
  const startEditing = (member: Member) => {
    setEditingMemberId(member.id);
    setNameInput(member.name);
    setAvatarUrl(member.avatar);
    // 滾動到編輯區 (手機版好用)
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  // 取消編輯 / 重置表單
  const resetForm = () => {
    setEditingMemberId(null);
    setNameInput("");
    setAvatarUrl("");
    setIsSubmitting(false);
  };

  // 上傳頭像
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsSubmitting(true);
    try {
        const filePath = `public/${trip.id}/avatars/${uuidv4()}-${file.name}`;
        const { error } = await supabase.storage.from('trip_files').upload(filePath, file);
        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage.from('trip_files').getPublicUrl(filePath);
        setAvatarUrl(publicUrl);
    } catch (error: any) {
        alert("上傳失敗: " + error.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  // 儲存 (新增或更新)
  const handleSave = () => {
    if (!nameInput.trim()) return;
    setIsSubmitting(true);

    let updatedMembers = [...trip.members];

    if (editingMemberId) {
        // 更新現有成員
        updatedMembers = updatedMembers.map(m => 
            m.id === editingMemberId 
            ? { ...m, name: nameInput, avatar: avatarUrl || m.avatar }
            : m
        );
    } else {
        // 新增成員
        const newMember = { 
            id: uuidv4(), 
            name: nameInput, 
            avatar: avatarUrl || getRandomAvatar(nameInput) 
        };
        updatedMembers.push(newMember);
    }

    updateTrip(trip.id, { members: updatedMembers });
    resetForm();
  };

  const handleDeleteMember = (id: string) => {
    if (confirm("確定要刪除這位成員嗎？\n(注意：相關的記帳紀錄可能會受影響)")) {
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
          
          {/* 現有成員列表 */}
          {trip.members.map(member => (
            <div key={member.id} className={clsx(
                "group relative bg-white border p-6 flex flex-col items-center transition-all duration-300 rounded-xl",
                editingMemberId === member.id ? "border-black shadow-md ring-1 ring-black" : "border-gray-200 hover:shadow-lg"
            )}>
              <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-2 border-gray-100 bg-gray-50 relative group/avatar">
                 <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
              </div>
              
              <h3 className="text-xl font-bold font-serif mb-1">{member.name}</h3>
              <p className="text-[10px] text-gray-400 tracking-widest uppercase">旅伴</p>
              
              {/* 操作按鈕 */}
              <div className="absolute top-4 right-4 flex gap-2">
                 <button 
                    onClick={() => startEditing(member)} 
                    className="text-gray-400 hover:text-black transition-colors p-1"
                    title="編輯"
                 >
                    <Edit2 size={14} />
                 </button>
                 <button 
                    onClick={() => handleDeleteMember(member.id)} 
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    title="刪除"
                 >
                    <Trash2 size={14} />
                 </button>
              </div>

              {editingMemberId === member.id && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center rounded-xl z-10">
                      <span className="text-xs font-bold tracking-widest uppercase text-black">正在編輯中...</span>
                  </div>
              )}
            </div>
          ))}

          {/* 新增/編輯區塊 */}
          <div className={clsx(
              "border border-dashed p-6 flex flex-col items-center justify-center gap-4 rounded-xl transition-colors",
              editingMemberId ? "bg-white border-black" : "bg-gray-50 border-gray-300"
          )}>
             {/* 標題 */}
             <div className="w-full flex justify-between items-center mb-2">
                 <span className="text-xs font-bold tracking-widest uppercase text-gray-400">
                     {editingMemberId ? "編輯資料" : "新增成員"}
                 </span>
                 {editingMemberId && (
                     <button onClick={resetForm} className="text-gray-400 hover:text-black"><X size={16}/></button>
                 )}
             </div>

             {/* 頭像上傳 */}
             <label className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-gray-400 border border-gray-200 cursor-pointer hover:border-black relative overflow-hidden group transition-all shadow-sm">
                {avatarUrl ? (
                    <img src={avatarUrl} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"/>
                ) : (
                    <div className="flex flex-col items-center gap-1">
                        <Camera size={20} />
                        <span className="text-[9px]">上傳</span>
                    </div>
                )}
                {/* Loading Indicator */}
                {isSubmitting && !nameInput && (
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                    </div>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={isSubmitting} />
             </label>

             {/* 名字輸入 */}
             <input 
               type="text" 
               value={nameInput} 
               onChange={(e) => setNameInput(e.target.value)} 
               placeholder="輸入名字..." 
               className="bg-transparent border-b border-gray-300 text-center py-2 focus:outline-none focus:border-black w-full text-lg font-serif placeholder-gray-400"
               disabled={isSubmitting}
             />

             {/* 儲存按鈕 */}
             <button 
               onClick={handleSave} 
               disabled={!nameInput.trim() || isSubmitting}
               className={clsx(
                   "text-white px-6 py-3 text-xs font-bold tracking-widest uppercase transition-all w-full rounded-lg flex items-center justify-center gap-2",
                   (!nameInput.trim() || isSubmitting) ? "bg-gray-300 cursor-not-allowed" : "bg-[#333333] hover:bg-black shadow-lg active:scale-95"
               )}
             >
               {isSubmitting ? (
                   "處理中..."
               ) : (
                   <>{editingMemberId ? <Check size={14}/> : <Plus size={14}/>} {editingMemberId ? "更新資料" : "確認新增"}</>
               )}
             </button>
          </div>
        </div>
      </main>
    </div>
  );
}