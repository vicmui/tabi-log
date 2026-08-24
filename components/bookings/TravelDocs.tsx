'use client'
import { useCallback, useEffect, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import {
  ShieldCheck, QrCode, FileText, Plus, X, Trash2, Upload,
  Loader2, Maximize2, AlertTriangle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Trip, TravelDoc, TravelDocKind, useTripStore } from '@/store/useTripStore'
import { ConfirmDialog } from '@/components/ui/Dialog'

/**
 * 旅遊證件。
 *
 * 為何另開一個私人 bucket，而不是沿用放酒店封面那個：
 * 封面是公開的沒問題，證件不是。一條猜不到的公開連結仍然是公開連結 ——
 * 一旦流出（截圖、複製、分享），任何人都看得到護照與簽證。
 * 所以這裡只儲存檔案路徑，每次要檢視時才即時簽發一條一小時後失效的連結。
 *
 * 需要在 Supabase 建立一個名為 trip_docs 的 bucket，並取消勾選 Public。
 */
const BUCKET = 'trip_docs'

const KIND_META: Record<TravelDocKind, { label: string; icon: typeof QrCode; hint: string }> = {
  Entry:     { label: '入境 QR',  icon: QrCode,     hint: 'Visit Japan Web、K-ETA、SG Arrival Card' },
  Visa:      { label: '簽證',     icon: ShieldCheck, hint: '電子簽證或貼紙簽證的掃描本' },
  Insurance: { label: '保險',     icon: FileText,    hint: '旅遊保單、緊急支援電話' },
  Passport:  { label: '護照',     icon: FileText,    hint: '資料頁影本，證件遺失時補領用' },
  Other:     { label: '其他',     icon: FileText,    hint: '國際車牌、疫苗紀錄等' },
}

const KIND_ORDER: TravelDocKind[] = ['Entry', 'Visa', 'Insurance', 'Passport', 'Other']

/** 簽發一條短效連結；舊資料若仍是公開連結則直接沿用 */
async function resolveUrl(doc: TravelDoc): Promise<string | null> {
  if (doc.path) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(doc.path, 3600)
    if (!error && data?.signedUrl) return data.signedUrl
  }
  return doc.fileUrl ?? null
}

export default function TravelDocs({ trip }: { trip: Trip }) {
  const { addDocument, deleteDocument } = useTripStore()
  const docs = trip.documents ?? []

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [viewing, setViewing] = useState<TravelDoc | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  return (
    <section className="max-w-3xl mx-auto mb-10">
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2 className="text-xs tracking-[0.2em] uppercase text-gray-500">旅遊證件</h2>
          <p className="text-[11px] text-gray-500 mt-1">入境 QR、簽證、保險 —— 過關時一按即可開啟</p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-1.5 text-[11px] tracking-widest uppercase border border-gray-200 px-3 py-2 bg-white hover:border-black transition-colors"
        >
          <Plus size={12} /> 新增
        </button>
      </div>

      {docs.length === 0 ? (
        <button
          onClick={() => setIsFormOpen(true)}
          className="w-full border border-dashed border-gray-300 py-8 flex flex-col items-center gap-2 text-gray-500 hover:border-black hover:text-black transition-colors bg-white"
        >
          <QrCode size={22} />
          <span className="text-sm">上傳入境 QR 或簽證</span>
          <span className="text-[11px]">前往日本可存 Visit Japan Web 的 QR；一人一張，記得註明持有人</span>
        </button>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {docs.map(doc => (
            <DocCard
              key={doc.id}
              doc={doc}
              onOpen={() => setViewing(doc)}
              onDelete={() => setDeletingId(doc.id)}
            />
          ))}
        </div>
      )}

      {isFormOpen && (
        <DocForm
          trip={trip}
          onClose={() => setIsFormOpen(false)}
          onSave={doc => addDocument(trip.id, doc)}
        />
      )}

      {viewing && <DocViewer doc={viewing} onClose={() => setViewing(null)} />}

      <ConfirmDialog
        isOpen={!!deletingId}
        title="刪除證件"
        message="確定要刪除？記錄會移除，已上傳的檔案仍會保留在儲存空間。"
        confirmLabel="刪除"
        cancelLabel="取消"
        danger
        onConfirm={() => { if (deletingId) deleteDocument(trip.id, deletingId); setDeletingId(null) }}
        onCancel={() => setDeletingId(null)}
      />
    </section>
  )
}

function DocCard({ doc, onOpen, onDelete }: { doc: TravelDoc; onOpen: () => void; onDelete: () => void }) {
  const meta = KIND_META[doc.kind] ?? KIND_META.Other
  const Icon = meta.icon
  const expired = doc.expiry ? doc.expiry < new Date().toISOString().slice(0, 10) : false

  return (
    <div className="relative group bg-white border border-gray-200 hover:border-black transition-colors">
      <button onClick={onOpen} className="w-full text-left p-4">
        <div className="flex items-center gap-2 mb-3">
          <Icon size={15} className="text-gray-700 shrink-0" />
          <span className="text-[10px] tracking-widest uppercase text-gray-500 truncate">{meta.label}</span>
        </div>
        <p className="text-sm font-medium leading-snug break-words">{doc.title}</p>
        {doc.holder && <p className="text-[11px] text-gray-500 mt-1">{doc.holder}</p>}
        {doc.expiry && (
          <p className={`text-[11px] mt-1 ${expired ? 'text-red-600' : 'text-gray-500'}`}>
            {expired ? '已過期 · ' : '有效至 '}{doc.expiry}
          </p>
        )}
        <span className="mt-3 inline-flex items-center gap-1 text-[10px] tracking-widest uppercase text-gray-500">
          <Maximize2 size={10} /> 開啟
        </span>
      </button>
      <button
        onClick={onDelete}
        aria-label="刪除"
        className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-red-600 transition-colors"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

/**
 * 全螢幕檢視。
 * 白底、大圖、無其他干擾 —— 過關時把手機遞出去便是這個畫面。
 * QR 掃不到多數是螢幕亮度所致，而非解像度，因此背景必須純白。
 */
function DocViewer({ doc, onClose }: { doc: TravelDoc; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    resolveUrl(doc).then(u => {
      if (!alive) return
      if (u) setUrl(u)
      else setError('讀取不到檔案')
    }).catch(() => alive && setError('讀取不到檔案，請檢查網絡'))
    return () => { alive = false }
  }, [doc])

  const isPdf = (doc.path ?? doc.fileUrl ?? '').toLowerCase().endsWith('.pdf')

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="min-w-0">
          <p className="text-[10px] tracking-widest uppercase text-gray-500">
            {(KIND_META[doc.kind] ?? KIND_META.Other).label}
          </p>
          <p className="text-sm font-medium truncate">{doc.title}{doc.holder ? `　${doc.holder}` : ''}</p>
        </div>
        <button onClick={onClose} aria-label="關閉" className="text-gray-500 hover:text-black shrink-0 ml-4">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
        {error ? (
          <p className="text-sm text-red-600 flex items-center gap-2">
            <AlertTriangle size={14} /> {error}
          </p>
        ) : !url ? (
          <Loader2 size={20} className="animate-spin text-gray-400" />
        ) : isPdf ? (
          <a href={url} target="_blank" rel="noreferrer"
            className="border border-gray-300 px-6 py-3 text-xs tracking-widest uppercase hover:bg-black hover:text-white transition-colors">
            開啟 PDF
          </a>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={url} alt={doc.title} className="max-w-full max-h-full object-contain" />
        )}
      </div>

      <p className="px-5 py-3 text-[11px] text-gray-500 border-t border-gray-100 leading-relaxed">
        提示：請把螢幕亮度調至最高，QR 方可順利掃描。連結一小時後失效，屆時重新開啟即可。
      </p>
    </div>
  )
}

function DocForm({ trip, onClose, onSave }: { trip: Trip; onClose: () => void; onSave: (d: TravelDoc) => void }) {
  const [kind, setKind]     = useState<TravelDocKind>('Entry')
  const [title, setTitle]   = useState('')
  const [holder, setHolder] = useState('')
  const [expiry, setExpiry] = useState('')
  const [path, setPath]     = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const filePath = `${trip.id}/docs/${uuidv4()}.${ext}`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(filePath, file)
      if (upErr) throw upErr
      setPath(filePath)
    } catch (err: any) {
      // bucket 未建立是最常見的原因，直接說明處理方法，不要只回一句「失敗」
      setError(
        /not found|bucket/i.test(err?.message ?? '')
          ? `找不到儲存空間「${BUCKET}」。請於 Supabase → Storage 新增一個同名 bucket，並取消勾選 Public。`
          : err?.message || '上傳失敗'
      )
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }, [trip.id])

  const canSave = title.trim() && path && !uploading

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white border border-gray-200 w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-black"><X size={20} /></button>
        <h3 className="font-serif font-semibold text-xl mb-5">新增證件</h3>

        <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
          {KIND_ORDER.map(k => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`shrink-0 px-3 py-1 text-xs border rounded-full transition-colors ${
                kind === k ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {KIND_META[k].label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-gray-500 mb-4">{KIND_META[kind].hint}</p>

        <div className="space-y-4">
          <div>
            <label className="text-[11px] tracking-widest uppercase text-gray-500 block mb-1">名稱</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={kind === 'Entry' ? '例：Visit Japan Web 入境審查 QR' : '例：旅遊保險保單'}
              className="w-full border-b border-gray-300 p-2 text-sm focus:outline-none focus:border-black"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[11px] tracking-widest uppercase text-gray-500 block mb-1">持有人</label>
              <select
                value={holder}
                onChange={e => setHolder(e.target.value)}
                className="w-full border-b border-gray-300 p-2 text-sm bg-transparent focus:outline-none focus:border-black"
              >
                <option value="">不指定</option>
                {(trip.members ?? []).map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[11px] tracking-widest uppercase text-gray-500 block mb-1">有效至</label>
              <input
                type="date"
                value={expiry}
                onChange={e => setExpiry(e.target.value)}
                className="w-full border-b border-gray-300 p-2 text-sm bg-transparent focus:outline-none focus:border-black"
              />
            </div>
          </div>

          <label className={`flex items-center justify-center gap-2 w-full p-4 border border-dashed cursor-pointer transition-colors ${
            path ? 'border-green-300 bg-green-50 text-green-700' : 'border-gray-300 text-gray-500 hover:bg-gray-50'
          }`}>
            <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleUpload} />
            {uploading
              ? <><Loader2 size={16} className="animate-spin" /> 上傳中…</>
              : path
                ? <><ShieldCheck size={16} /> 已上傳（點擊更換）</>
                : <><Upload size={16} /> 上傳圖片或 PDF</>}
          </label>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 px-3 py-2 leading-relaxed select-text">
              {error}
            </p>
          )}

          <p className="text-[11px] text-gray-500 leading-relaxed">
            證件存放於私人儲存空間，只有已登入的成員方可開啟；每次檢視均即時簽發一條一小時後失效的連結。
          </p>
        </div>

        <button
          disabled={!canSave}
          onClick={() => {
            onSave({
              id: uuidv4(),
              kind,
              title: title.trim(),
              holder: holder || undefined,
              expiry: expiry || undefined,
              path,
            })
            onClose()
          }}
          className="w-full bg-black text-white py-3 text-xs tracking-widest uppercase mt-6 hover:opacity-80 transition-opacity disabled:opacity-40"
        >
          儲存
        </button>
      </div>
    </div>
  )
}
