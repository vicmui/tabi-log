"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TripSwitcher from "@/components/layout/TripSwitcher";
import { useTripStore, Member } from "@/store/useTripStore";
import { User, Plus, Trash2, Camera, Edit2, X, Check, Loader2 } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import { supabase } from "@/lib/supabase";
import clsx from "clsx";
import { ConfirmDialog, AlertDialog } from "@/components/ui/Dialog";

export default function MembersPage() {
  const { trips, activeTripId, updateTrip, isSyncing } = useTripStore();
  const trip = activeTripId ? trips.find(t => t.id === activeTripId) : trips[0];
  
  const [isMounted, setIsMounted] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [roleInput, setRoleInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

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
    setRoleInput(member.role || "");
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingMemberId(null);
    setNameInput("");
    setAvatarUrl("");
    setRoleInput("");
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
        setAlertMsg("上傳失敗：" + (error.message || "未知錯誤"));
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleSave = () => {
    if (!nameInput.trim()) return;
    setIsSubmitting(true);
    try {
        let updatedMembers = [...trip.members];
        if (editingMemberId) {
            updatedMembers = updatedMembers.map(m => m.id === editingMemberId ? { ...m, name: nameInput, avatar: avatarUrl || m.avatar, role: roleInput || m.role } : m);
        } else {
            const newMember = { id: uuidv4(), name: nameInput, avatar: avatarUrl || getRandomAvatar(nameInput), role: roleInput || "旅伴" };
            updatedMembers.push(newMember);
        }
        updateTrip(trip.id, { members: updatedMembers });
        resetForm();
    } catch (error) {
        console.error(error);
        setAlertMsg("儲存失敗，請重試。");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteMember = (id: string) => setDeletingMemberId(id);

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
            <div key={member.id} className={clsx("group relative bg-white border p-6 flex flex-col items-center transition-all duration-300 rounded-none", editingMemberId === member.id ? "border-black ring-1 ring-black" : "border-gray-200 hover:shadow-lg")}>
              <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-2 border-gray-100 bg-gray-50 relative group/avatar">
                 <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
              </div>
              <h3 className="text-xl font-bold font-serif mb-1">{member.name}</h3>
              <p className="text-[10px] text-gray-400 tracking-widest uppercase">{member.role || "旅伴"}</p>
              <div className="absolute top-4 right-4 flex gap-2">
                 <button onClick={() => startEditing(member)} className="text-gray-400 hover:text-black transition-colors p-1"><Edit2 size={14} /></button>
                 <button onClick={() => handleDeleteMember(member.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}

          <div className={clsx("border border-dashed p-6 flex flex-col items-center justify-center gap-4 rounded-none transition-colors", editingMemberId ? "bg-white border-black" : "bg-gray-50 border-gray-300")}>
             <div className="w-full flex justify-between items-center mb-2">
                 <span className="text-xs font-bold tracking-widest uppercase text-gray-400">{editingMemberId ? "編輯資料" : "新增成員"}</span>
                 {editingMemberId && <button onClick={resetForm} className="text-gray-400 hover:text-black"><X size={16}/></button>}
             </div>
             <label className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-gray-400 border border-gray-200 cursor-pointer hover:border-black relative overflow-hidden group transition-all" title="400x400 JPG/PNG max 2MB">
                {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"/> : <div className="flex flex-col items-center gap-1"><Camera size={20} /><span className="text-[9px]">上傳</span></div>}
                {isSubmitting && !nameInput && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Loader2 className="w-5 h-5 text-white animate-spin"/></div>}
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={isSubmitting} />
             </label>
             <input type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="輸入名字..." className="bg-transparent border-b border-gray-300 text-center py-2 focus:outline-none focus:border-black w-full text-lg font-serif placeholder-gray-400" disabled={isSubmitting} />
             <input type="text" value={roleInput} onChange={(e) => setRoleInput(e.target.value)} placeholder="身份（如：主辦、媽咪、旅伴...）" className="bg-transparent border-b border-gray-200 text-center py-1.5 focus:outline-none focus:border-black w-full text-xs text-gray-400 tracking-widest uppercase placeholder-gray-300" disabled={isSubmitting} />
             <button onClick={handleSave} disabled={!nameInput.trim() || isSubmitting} className={clsx("text-white px-6 py-3 text-xs font-bold tracking-widest uppercase transition-all w-full rounded-none flex items-center justify-center gap-2", (!nameInput.trim() || isSubmitting) ? "bg-gray-300 cursor-not-allowed" : "bg-[#333333] hover:bg-black active:scale-95")}>
               {isSubmitting ? "處理中..." : <>{editingMemberId ? <Check size={14}/> : <Plus size={14}/>} {editingMemberId ? "更新資料" : "確認新增"}</>}
             </button>
          </div>
        </div>
      </main>

      <ConfirmDialog
        isOpen={!!deletingMemberId}
        title="刪除成員"
        message={"確定要刪除這位成員嗎？\n（注意：相關的記帳紀錄可能會受影響）"}
        confirmLabel="刪除" cancelLabel="取消" danger
        onConfirm={() => {
          if (deletingMemberId) {
            updateTrip(trip.id, { members: trip.members.filter(m => m.id !== deletingMemberId) });
            if (editingMemberId === deletingMemberId) resetForm();
          }
          setDeletingMemberId(null);
        }}
        onCancel={() => setDeletingMemberId(null)}
      />
      <AlertDialog
        isOpen={!!alertMsg}
        message={alertMsg || ""}
        onClose={() => setAlertMsg(null)}
      />
    </div>
  );
}=== ./app/page.tsx ===
'use client'
import Sidebar from '@/components/layout/Sidebar'
import EditTripModal from '@/components/dashboard/EditTripModal'
import { NewTripModal, ConfirmDialog } from '@/components/ui/Dialog'
import { useTripStore } from '@/store/useTripStore'
import { Plus, Settings, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { differenceInDays, parseISO } from 'date-fns'
import Link from 'next/link'

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2000&auto=format&fit=crop'

export default function Home() {
  const { trips, addTrip, deleteTrip, setActiveTrip } = useTripStore()
  const [isMounted, setIsMounted] = useState(false)
  const [editingTrip, setEditingTrip] = useState<any>(null)
  const [isNewTripOpen, setIsNewTripOpen] = useState(false)
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null)

  useEffect(() => { setIsMounted(true) }, [])
  if (!isMounted) return <div className="p-10 animate-pulse text-center text-gray-400">Loading...</div>

  // ── Updated: accept optional coverImage ──
  const handleAddTrip = (data: {
    title: string
    startDate: string
    endDate: string
    coverImage?: string
  }) => {
    addTrip({
      title: data.title,
      startDate: data.startDate,
      endDate: data.endDate,
      status: 'planning',
      coverImage: data.coverImage || DEFAULT_COVER,
    })
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    e.preventDefault()
    setDeletingTripId(id)
  }

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <main className="flex-1 p-8 ml-0 md:ml-64 pb-24">
        <div className="flex justify-between items-center mb-12 mt-4">
          <div>
            <h1 className="text-3xl font-serif font-bold tracking-widest text-jp-charcoal uppercase mb-2">
              成員管理
            </h1>
            <p className="text-gray-400 text-xs tracking-widest uppercase">Members</p>
          </div>
          <button
            onClick={() => setIsNewTripOpen(true)}
            className="bg-jp-charcoal text-white px-6 py-3 flex items-center gap-2 hover:bg-gray-800 transition-colors active:scale-95 text-xs tracking-widest uppercase rounded"
          >
            <Plus size={16} />
            New Trip
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {trips.map(trip => {
            const daysLeft = differenceInDays(parseISO(trip.startDate), new Date())
            const totalActs = trip.dailyItinerary.reduce((acc, day) => acc + (day.activities?.filter(a => a)?.length ?? 0), 0)
            const visitedActs = trip.dailyItinerary.reduce((acc, day) => acc + (day.activities?.filter(a => a?.isVisited)?.length ?? 0), 0)
            const progress = totalActs > 0 ? Math.round((visitedActs / totalActs) * 100) : 0

            return (
              <div
                key={trip.id}
                onClick={() => setActiveTrip(trip.id)}
                className="relative group cursor-pointer bg-white border border-gray-100 hover:border hover:border-gray-200 transition-all duration-300 overflow-hidden h-[360px] flex flex-col rounded-none"
              >
                <Link href={`/planner/${trip.id}`} className="absolute inset-0 z-10" />
                <div className="h-48 w-full relative overflow-hidden">
                  <img
                    src={trip.coverImage}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    alt={trip.title}
                  />
                  <div className="absolute top-4 left-4 bg-white/90 px-3 py-1 text-xs font-bold rounded-full z-20">
                    {daysLeft > 0 ? `${daysLeft}d` : ''}
                  </div>
                  <div className="absolute top-4 right-4 flex gap-2 z-30">
                    <button
                      onClick={e => { e.stopPropagation(); e.preventDefault(); setEditingTrip(trip) }}
                      className="bg-white/80 p-2 rounded-full hover:bg-white text-gray-600 hover:text-black transition-colors"
                    >
                      <Settings size={14} />
                    </button>
                    <button
                      onClick={e => handleDelete(e, trip.id)}
                      className="bg-white/80 p-2 rounded-full hover:bg-red-500 hover:text-white text-gray-600 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="p-6 flex flex-col justify-between flex-1">
                  <div>
                    <h3 className="text-xl font-medium mb-1 tracking-wide truncate">{trip.title}</h3>
                    <p className="text-xs text-gray-400 font-light tracking-widest">
                      {trip.startDate} → {trip.endDate}
                    </p>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-gray-400 mb-1 uppercase tracking-widest">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1 bg-gray-100 w-full">
                      <div className="h-full bg-black" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {editingTrip && (
        <EditTripModal trip={editingTrip} onClose={() => setEditingTrip(null)} />
      )}
      <NewTripModal
        isOpen={isNewTripOpen}
        onClose={() => setIsNewTripOpen(false)}
        onConfirm={handleAddTrip}
      />
      <ConfirmDialog
        isOpen={!!deletingTripId}
        title="Delete Trip"
        message="Are you sure? This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        onConfirm={() => {
          if (deletingTripId) deleteTrip(deletingTripId)
          setDeletingTripId(null)
        }}
        onCancel={() => setDeletingTripId(null)}
      />
    </div>
  )
}
