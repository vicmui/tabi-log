'use client'
import { useState } from 'react'
import { Check, X, Move, RotateCcw } from 'lucide-react'

export interface CoverFocus { x: number; y: number }

/**
 * RepositionPanel —— 封面焦點調整。
 *
 * 為何要兩條軸：同一張封面會在三個寬高比完全不同的地方出現
 * （首頁卡片約 3:2、行程頁橫幅桌面約 3.75:1、手機約 2.2:1）。
 * 只調上下時，若圖片比例剛好接近容器就完全沒有可裁切的空間，
 * 滑桿看起來便像「無反應」。加上左右軸之後，任何比例的圖都調得到。
 *
 * 以滑桿而非拖曳實作，手機上不會與頁面捲動打架。
 */
interface RepositionPanelProps {
  src: string
  initial?: CoverFocus
  /** 預覽框的寬高比，填實際顯示的比例，所見即所得 */
  aspect?: number
  onConfirm: (focus: CoverFocus) => void
  onCancel: () => void
  compact?: boolean
}

export function RepositionPanel({
  src,
  initial = { x: 50, y: 50 },
  aspect = 2,
  onConfirm,
  onCancel,
  compact = false,
}: RepositionPanelProps) {
  const [x, setX] = useState(initial.x ?? 50)
  const [y, setY] = useState(initial.y ?? 50)

  const Slider = ({
    label, min, max, value, onChange, hint,
  }: { label: string; min: string; max: string; value: number; onChange: (v: number) => void; hint: string }) => (
    <div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 select-none w-8 shrink-0">{min}</span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          aria-label={label}
          className="flex-1 h-2 accent-black cursor-pointer"
          style={{ touchAction: 'pan-x' }}
        />
        <span className="text-xs text-gray-500 select-none w-8 shrink-0 text-right">{max}</span>
      </div>
      <p className="text-[11px] text-gray-500 mt-1 tracking-wide text-center">{hint}</p>
    </div>
  )

  const inner = (
    <div className={`flex flex-col ${compact ? '' : 'h-full'}`}>
      <div className="bg-neutral-900 text-white text-center py-2.5 px-4 shrink-0">
        <p className="text-xs font-medium tracking-widest uppercase flex items-center justify-center gap-1.5">
          <Move size={11} /> 調整封面焦點
        </p>
      </div>

      {/* 即時預覽 —— 用實際顯示比例，睇到嘅就係之後嘅效果 */}
      <div
        className={`${compact ? '' : 'flex-1'} overflow-hidden relative bg-neutral-100`}
        style={compact ? { aspectRatio: String(aspect) } : undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="封面預覽"
          draggable={false}
          className="w-full h-full object-cover pointer-events-none select-none"
          style={{ objectPosition: `${x}% ${y}%` }}
        />
        {/* 十字準星 */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-x-0 top-1/2 h-px bg-white/40" />
          <div className="absolute inset-y-0 left-1/2 w-px bg-white/40" />
        </div>
      </div>

      <div className="bg-white px-5 py-4 shrink-0 space-y-4">
        <Slider label="左右焦點" min="左" max="右" value={x} onChange={setX} hint="左右移動畫面焦點" />
        <Slider label="上下焦點" min="頂" max="底" value={y} onChange={setY} hint="上下移動畫面焦點" />
        <button
          onClick={() => { setX(50); setY(50) }}
          className="w-full flex items-center justify-center gap-1.5 text-[11px] tracking-widest uppercase text-gray-500 hover:text-black transition-colors py-1"
        >
          <RotateCcw size={11} /> 回復置中
        </button>
      </div>

      <div className="flex border-t border-gray-100 shrink-0">
        <button
          onClick={onCancel}
          className="flex-1 py-3.5 text-xs font-medium tracking-widest text-neutral-400 uppercase hover:bg-gray-50 transition-colors border-r border-gray-100 flex items-center justify-center gap-1.5"
        >
          <X size={11} /> 取消
        </button>
        <button
          onClick={() => onConfirm({ x, y })}
          className="flex-1 py-3.5 text-xs font-medium tracking-widest text-neutral-900 uppercase hover:bg-neutral-50 transition-colors flex items-center justify-center gap-1.5"
        >
          <Check size={11} /> 完成
        </button>
      </div>
    </div>
  )

  if (compact) return <div className="border border-gray-200 overflow-hidden">{inner}</div>

  return (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col">
      {inner}
    </div>
  )
}
