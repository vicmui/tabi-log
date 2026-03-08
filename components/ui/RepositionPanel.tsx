'use client'
import { useState } from 'react'
import { Check, X, Move } from 'lucide-react'

/**
 * RepositionPanel — mobile-friendly cover image crop adjuster.
 *
 * Uses a range slider instead of pointer drag so mobile users can adjust
 * without accidentally scrolling the browser.
 *
 * Props:
 *   src        — image URL
 *   initialY   — starting objectPosition Y% (0–100), default 50
 *   onConfirm  — called with final Y% when user taps 完成
 *   onCancel   — called when user taps 取消
 *   compact    — if true, renders inline (for modals); if false, renders fullscreen (for planner page)
 */
interface RepositionPanelProps {
  src: string
  initialY?: number
  onConfirm: (y: number) => void
  onCancel: () => void
  compact?: boolean
}

export function RepositionPanel({ src, initialY = 50, onConfirm, onCancel, compact = false }: RepositionPanelProps) {
  const [posY, setPosY] = useState(initialY)

  const previewClass = compact ? 'h-40' : 'flex-1'

  const inner = (
    <div className={`flex flex-col ${compact ? '' : 'h-full'}`}>
      {/* Instruction bar */}
      <div className="bg-neutral-900 text-white text-center py-2.5 px-4 shrink-0">
        <p className="text-[10px] font-bold tracking-widest uppercase flex items-center justify-center gap-1.5">
          <Move size={11} /> 拖動滑桿調整封面焦點
        </p>
      </div>

      {/* Live preview */}
      <div className={`${previewClass} overflow-hidden relative`} style={{ minHeight: compact ? 160 : undefined }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="reposition preview"
          draggable={false}
          className="w-full h-full object-cover pointer-events-none select-none"
          style={{ objectPosition: `center ${posY}%` }}
        />
        {/* Centre guide line */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center gap-1">
          <div className="w-full h-px bg-white/35" />
          <span className="bg-black/55 text-white text-[9px] px-2.5 py-0.5 rounded-full tracking-widest">
            焦點區域
          </span>
        </div>
      </div>

      {/* Slider — touch-friendly, avoids browser scroll conflict */}
      <div className="bg-white px-5 py-4 shrink-0">
        <div className="flex items-center gap-3">
          {/* Top icon */}
          <span className="text-[10px] text-gray-400 font-bold select-none">頂</span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={posY}
            onChange={e => setPosY(Number(e.target.value))}
            className="flex-1 h-2 accent-black cursor-pointer touch-pan-x"
            style={{ touchAction: 'pan-x' }}   // only block vertical scroll on the slider itself
          />
          <span className="text-[10px] text-gray-400 font-bold select-none">底</span>
        </div>
        <p className="text-center text-[9px] text-gray-300 mt-1 tracking-widest">
          左右滑動調整 · 唔影響 browser 捲動
        </p>
      </div>

      {/* Actions */}
      <div className="flex border-t border-gray-100 shrink-0">
        <button
          onClick={onCancel}
          className="flex-1 py-3.5 text-[10px] font-semibold tracking-widest text-neutral-400 uppercase hover:bg-gray-50 transition-colors border-r border-gray-100 flex items-center justify-center gap-1.5"
        >
          <X size={11} /> 取消
        </button>
        <button
          onClick={() => onConfirm(posY)}
          className="flex-1 py-3.5 text-[10px] font-bold tracking-widest text-neutral-900 uppercase hover:bg-neutral-50 transition-colors flex items-center justify-center gap-1.5"
        >
          <Check size={11} /> 完成
        </button>
      </div>
    </div>
  )

  if (compact) return <div className="border border-gray-100 overflow-hidden">{inner}</div>

  // Fullscreen mode for PlannerPage
  return (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col">
      {inner}
    </div>
  )
}
