'use client'

import Sidebar from '@/components/layout/Sidebar'
import EditTripModal from '@/components/dashboard/EditTripModal'
import { NewTripModal, ConfirmDialog } from '@/components/ui/Dialog'
import { useTripStore, Trip } from '@/store/useTripStore'
import { Plus, Settings, Trash2, GripVertical } from 'lucide-react'
import { useEffect, useState } from 'react'
import { localDateKey, phaseLabel, tripPhase, tripRange } from '@/lib/tripPhase'
import { formatMoney, homeOf, sumHome } from '@/lib/money'
import Link from 'next/link'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2000&auto=format&fit=crop'

interface CardProps {
  trip: Trip
  onEdit: (trip: Trip) => void
  onDeleteRequest: (id: string) => void
  onSelect: (id: string) => void
}

function SortableTripCard({ trip, onEdit, onDeleteRequest, onSelect }: CardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: trip.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : undefined,
  }

  const today = localDateKey()
  const phase = tripPhase(trip, today)
  const badgeLabel = phaseLabel(trip, today)
  const { start, end } = tripRange(trip)

  const totalActs = trip.dailyItinerary.reduce(
    (acc, day) => acc + (day.activities?.filter(a => a)?.length ?? 0), 0)
  const visitedActs = trip.dailyItinerary.reduce(
    (acc, day) => acc + (day.activities?.filter(a => a?.isVisited)?.length ?? 0), 0)
  const progress = totalActs > 0 ? Math.round((visitedActs / totalActs) * 100) : 0

  // 整張卡一律開行程頁；已完成的旅程另有一條「旅程回顧」連結（見卡片底部）
  const href = `/planner/${trip.id}`
  const spent = sumHome(trip.expenses ?? [], trip)

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(trip.id)}
      className="relative group cursor-pointer bg-white border border-gray-100 hover:border-gray-200 transition-colors duration-300 overflow-hidden h-[420px] flex flex-col rounded-none"
    >
      {/* 整張卡是連結；拖曳手柄與按鈕的 z-index 都在它之上 */}
      <Link href={href} className="absolute inset-0 z-10" aria-label={trip.title} />

      <div className="h-64 w-full relative overflow-hidden">
        {/* 封面一律保持彩色；「已完成」由左上角的標籤標示便足夠 */}
        <img
          src={trip.coverImage}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          style={{ objectPosition: `${trip.coverPosX ?? 50}% ${trip.coverPosY ?? 50}%` }}
          alt={trip.title}
        />

        {/* 拖曳手柄 —— 按住這裡才會拖動，避免與開啟旅程的點擊衝突 */}
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          onClick={e => { e.stopPropagation(); e.preventDefault() }}
          aria-label="拖曳以調整次序"
          title="拖曳以調整次序"
          className="absolute bottom-3 left-3 z-30 bg-white/85 backdrop-blur p-2 text-gray-600 hover:text-black cursor-grab active:cursor-grabbing touch-none transition-colors"
        >
          <GripVertical size={16} />
        </button>

        {badgeLabel && (
          <div className={`absolute top-4 left-4 px-3 py-1 text-xs font-medium rounded-full z-20 whitespace-nowrap ${
            phase === 'ongoing' ? 'bg-black text-white' : 'bg-white/90 text-black'
          }`}>
            {badgeLabel}
          </div>
        )}

        <div className="absolute top-4 right-4 flex gap-2 z-30">
          <button
            onClick={e => { e.stopPropagation(); e.preventDefault(); onEdit(trip) }}
            aria-label="旅程設定"
            className="bg-white/80 p-2 rounded-full hover:bg-white text-gray-600 hover:text-black transition-colors"
          >
            <Settings size={14} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); e.preventDefault(); onDeleteRequest(trip.id) }}
            aria-label="刪除旅程"
            className="bg-white/80 p-2 rounded-full hover:bg-red-500 hover:text-white text-gray-600 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="p-6 flex flex-col justify-between flex-1">
        <div className="min-w-0">
          <h3 className="text-xl font-medium mb-1 tracking-wide truncate">{trip.title}</h3>
          <p className="text-xs text-gray-500 font-light tracking-widest">
            {start} → {end}
          </p>
        </div>
        {phase === 'completed' ? (
          // 去完之後「完成進度」已無意義，改為一句總結，並提示點擊會開回顧
          <div className="flex items-end justify-between gap-3 text-xs text-gray-500 tracking-widest">
            <span className="min-w-0 truncate">
              {totalActs} 個地點
              {/* 沒有記帳的旅程不顯示 HK$0.00 —— 那不是「花了零元」，只是沒有記錄 */}
              {spent > 0 && <> · {formatMoney(spent, homeOf(trip))}</>}
            </span>
            <Link
              href={`/recap/${trip.id}`}
              onClick={e => e.stopPropagation()}
              className="relative z-20 shrink-0 text-black uppercase hover:underline underline-offset-4"
            >
              旅程回顧 →
            </Link>
          </div>
        ) : (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1 uppercase tracking-widest">
              <span>完成進度</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1 bg-gray-100 w-full">
              <div className="h-full bg-black transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Home() {
  const { trips, addTrip, deleteTrip, setActiveTrip, reorderTrips } = useTripStore()
  const [isMounted, setIsMounted] = useState(false)
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null)
  const [isNewTripOpen, setIsNewTripOpen] = useState(false)
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null)

  // 指標需移動 8px 才視為拖曳，否則單擊會被誤判為拖動而無法開啟旅程
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => { setIsMounted(true) }, [])
  if (!isMounted) {
    return <div className="p-10 animate-pulse text-center text-gray-500 text-xs tracking-widest">載入中…</div>
  }

  const handleAddTrip = (data: {
    title: string
    startDate: string
    endDate: string
    coverImage?: string
    coverPosX?: number
    coverPosY?: number
  }) => {
    addTrip({
      title: data.title,
      startDate: data.startDate,
      endDate: data.endDate,
      status: 'planning',
      coverImage: data.coverImage || DEFAULT_COVER,
      coverPosX: data.coverPosX ?? 50,
      coverPosY: data.coverPosY ?? 50,
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = trips.findIndex(t => t.id === active.id)
    const newIndex = trips.findIndex(t => t.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    reorderTrips(arrayMove(trips, oldIndex, newIndex))
  }

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <main className="flex-1 min-w-0 p-5 sm:p-8 ml-0 md:ml-64 pb-24">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-10 mt-4">
          <div>
            <h1 className="text-3xl font-serif font-semibold tracking-widest text-jp-charcoal uppercase mb-2">
              我的旅程
            </h1>
            <p className="text-gray-500 text-xs tracking-widest uppercase">My Voyages</p>
          </div>
          <button
            onClick={() => setIsNewTripOpen(true)}
            className="bg-jp-charcoal text-white px-6 py-3 flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors active:scale-95 text-xs tracking-widest uppercase w-full sm:w-auto shrink-0"
          >
            <Plus size={16} />
            新增旅程
          </button>
        </div>

        {trips.length > 1 && (
          <p className="text-xs text-gray-500 mb-4 flex items-center gap-1.5">
            <GripVertical size={12} className="text-gray-400" />
            按住左下角的手柄拖曳，即可調整旅程次序
          </p>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={trips.map(t => t.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {trips.map(trip => (
                <SortableTripCard
                  key={trip.id}
                  trip={trip}
                  onEdit={setEditingTrip}
                  onDeleteRequest={setDeletingTripId}
                  onSelect={setActiveTrip}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
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
        title="刪除旅程"
        message="此旅程的所有行程、預訂、支出及準備清單將一併刪除，且無法復原。"
        confirmLabel="刪除"
        cancelLabel="取消"
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
