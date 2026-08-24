'use client'
import { useState, useRef } from 'react'
import { Camera, Loader2, X, Check, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ExpenseCategory, Trip } from '@/store/useTripStore'
import { COMMON_CURRENCIES, formatMoney } from '@/lib/money'

/**
 * 用 canvas 縮圖，不引入額外套件。
 *
 * 為何一定要縮：Gemini 的視覺 token 是 ⌈闊/28⌉ × ⌈高/28⌉。
 * 一張 1000px 的相約 1,300 token；手機原生 4000px 那張要一萬幾，
 * 貴十倍之餘上傳亦慢好多，而收據文字在 1000px 已經綽綽有餘。
 */
async function shrinkImage(file: File, maxSide = 1000, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('無法處理圖片')
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      b => (b ? resolve(b) : reject(new Error('圖片轉檔失敗'))),
      'image/jpeg',
      quality
    )
  })
}

const CAT_LABEL: Record<ExpenseCategory, string> = {
  Food: '餐飲', Transport: '交通', Accommodation: '住宿',
  Sightseeing: '景點', Shopping: '購物', Other: '其他',
}

export interface ScannedExpense {
  itemName: string
  date: string
  amount: number
  currency: string
  category: ExpenseCategory
  note: string
  receiptUrl: string
}

interface Props {
  trip: Trip
  /** 讀不到日期時的預設值（通常是目前選取的那一天） */
  fallbackDate: string
  onConfirm: (e: ScannedExpense) => void
  onClose: () => void
}

/**
 * 拍照記帳。
 *
 * 刻意不自動入帳 —— 辨識結果一定經人手確認。
 * 金額記錯比沒記到麻煩得多：回家對帳時才發現，就要逐張翻查。
 * 而「誰付錢、怎樣分攤」收據上根本沒有寫，模型無從得知。
 */
export default function ReceiptScanModal({ trip, fallbackDate, onConfirm, onClose }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [stage, setStage] = useState<'pick' | 'working' | 'review'>('pick')
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [result, setResult] = useState<ScannedExpense | null>(null)
  const [confidence, setConfidence] = useState(1)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setStage('working')
    setError(null)

    try {
      const small = await shrinkImage(file)
      setPreview(URL.createObjectURL(small))

      const base64: string = await new Promise((resolve, reject) => {
        const r = new FileReader()
        r.onloadend = () => resolve(String(r.result).split(',')[1] ?? '')
        r.onerror = reject
        r.readAsDataURL(small)
      })

      // 同時上載正本，記帳後可隨時翻查
      const path = `public/${trip.id}/receipts/${Date.now()}-${file.name.replace(/[^\w.]/g, '_')}`
      const uploadPromise = supabase.storage.from('trip_files').upload(path, small, { contentType: 'image/jpeg' })

      const res = await fetch('/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: 'image/jpeg' }),
      })
      const data = await res.json()
      if (!res.ok) {
        // 一併顯示伺服器回報的真正原因，不要只留下一個毫無線索的狀態碼
        const detail = data?.detail ? `　（${data.detail}）` : ''
        throw new Error(`${data?.error || '辨識失敗'}${detail}`)
      }

      await uploadPromise
      const { data: pub } = supabase.storage.from('trip_files').getPublicUrl(path)

      // 日期落在行程範圍外，或者根本讀不到，就退回目前這一天
      const inRange = data.date && (trip.dailyItinerary ?? []).some(d => d.date === data.date)

      setConfidence(data.confidence ?? 0)
      setResult({
        itemName: data.merchant || '',
        date: inRange ? data.date : fallbackDate,
        amount: data.total || 0,
        currency: data.currency || trip.localCurrency || 'JPY',
        category: data.category as ExpenseCategory,
        note: data.note || '',
        receiptUrl: pub.publicUrl,
      })
      setStage('review')
    } catch (err: any) {
      setError(err?.message || '辨識失敗，請重試')
      setStage('pick')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const patch = (p: Partial<ScannedExpense>) => setResult(r => (r ? { ...r, ...p } : r))

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md border border-neutral-200 max-h-[92vh] overflow-y-auto">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-sm font-medium tracking-widest uppercase">拍照記帳</h2>
          <button onClick={onClose} aria-label="關閉" className="text-gray-400 hover:text-black transition-colors">
            <X size={18} />
          </button>
        </div>

        {stage === 'pick' && (
          <div className="p-6 space-y-5">
            <label className="border border-dashed border-gray-300 py-12 flex flex-col items-center gap-3 cursor-pointer hover:border-black transition-colors">
              <Camera size={26} className="text-gray-500" />
              <span className="text-sm">拍攝或選擇收據相片</span>
              <span className="text-[11px] text-gray-500">請將收據攤平、對正，光線充足辨識最準確</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFile}
              />
            </label>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 break-words select-text">{error}</p>
            )}
            <p className="text-[11px] text-gray-500 leading-relaxed">
              辨識結果一定會先讓你確認才入帳。收據正本會一併存起，日後可翻查。
            </p>
          </div>
        )}

        {stage === 'working' && (
          <div className="p-16 flex flex-col items-center gap-4">
            <Loader2 size={22} className="animate-spin text-gray-500" />
            <p className="text-xs tracking-widest uppercase text-gray-500">辨識中…</p>
          </div>
        )}

        {stage === 'review' && result && (
          <div className="p-6 space-y-5">
            {preview && (
              <img src={preview} alt="收據" className="w-full max-h-40 object-contain bg-gray-50 border border-gray-100" />
            )}

            {confidence < 0.7 && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 flex items-start gap-2">
                <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                辨識信心偏低，請逐項核對後再儲存。
              </p>
            )}

            <div>
              <label className="block text-[11px] tracking-widest uppercase text-gray-500 mb-1">項目</label>
              <input
                value={result.itemName}
                onChange={e => patch({ itemName: e.target.value })}
                className="w-full border-b border-gray-300 py-2 text-base focus:outline-none focus:border-black"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-[11px] tracking-widest uppercase text-gray-500 mb-1">金額</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={result.amount || ''}
                  onChange={e => patch({ amount: Number(e.target.value) })}
                  className="w-full border-b border-gray-300 py-2 text-xl focus:outline-none focus:border-black"
                />
              </div>
              <div className="w-24">
                <label className="block text-[11px] tracking-widest uppercase text-gray-500 mb-1">貨幣</label>
                <select
                  value={result.currency}
                  onChange={e => patch({ currency: e.target.value })}
                  className="w-full border-b border-gray-300 py-2.5 text-sm bg-transparent focus:outline-none focus:border-black"
                >
                  {Array.from(new Set([result.currency, trip.localCurrency ?? 'JPY', ...COMMON_CURRENCIES])).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-[11px] tracking-widest uppercase text-gray-500 mb-1">日期</label>
                <input
                  type="date"
                  value={result.date}
                  onChange={e => patch({ date: e.target.value })}
                  className="w-full border-b border-gray-300 py-2 text-sm bg-transparent focus:outline-none focus:border-black"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[11px] tracking-widest uppercase text-gray-500 mb-1">分類</label>
                <select
                  value={result.category}
                  onChange={e => patch({ category: e.target.value as ExpenseCategory })}
                  className="w-full border-b border-gray-300 py-2.5 text-sm bg-transparent focus:outline-none focus:border-black"
                >
                  {(Object.keys(CAT_LABEL) as ExpenseCategory[]).map(c => (
                    <option key={c} value={c}>{CAT_LABEL[c]}</option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-[11px] text-gray-500">
              確認後會帶入記帳表單，付款人與分攤方式在那裡設定。
              {result.amount > 0 && `　金額：${formatMoney(result.amount, result.currency)}`}
            </p>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setStage('pick'); setResult(null) }}
                className="flex-1 border border-gray-300 py-3 text-xs tracking-widest uppercase hover:bg-gray-50 transition-colors"
              >
                重新拍攝
              </button>
              <button
                onClick={() => result.amount > 0 && onConfirm(result)}
                disabled={!result.amount || !result.itemName}
                className="flex-[2] bg-black text-white py-3 text-xs tracking-widest uppercase flex items-center justify-center gap-2 disabled:opacity-40 hover:bg-gray-800 transition-colors"
              >
                <Check size={13} /> 確認
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
