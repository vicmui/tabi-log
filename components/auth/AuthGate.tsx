'use client'
import { useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { Loader2, Lock, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTripStore } from '@/store/useTripStore'

/**
 * AuthGate
 * 包覆整個應用程式：未登入只會看到登入畫面，登入後才可進入。
 *
 * 帳戶不在此建立 —— 請於 Supabase Dashboard → Authentication → Users →
 * Add user 手動新增，並在 Providers → Email 關閉
 * "Allow new users to sign up"，以免外人自行註冊。
 *
 * /share/... 為例外（對外分享的唯讀行程），毋須登入亦可瀏覽。
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublicRoute = !!pathname && pathname.startsWith('/share')

  const [checking, setChecking] = useState(true)
  const [signedIn, setSignedIn] = useState(false)

  const loadTripsFromCloud = useTripStore(s => s.loadTripsFromCloud)
  const applyRemoteTrip = useTripStore(s => s.applyRemoteTrip)
  const removeRemoteTrip = useTripStore(s => s.removeRemoteTrip)
  const flushPendingSync = useTripStore(s => s.flushPendingSync)

  useEffect(() => {
    let alive = true

    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      setSignedIn(!!data.session)
      setChecking(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return
      setSignedIn(!!session)
      setChecking(false)
    })

    return () => { alive = false; sub.subscription.unsubscribe() }
  }, [])

  // 登入後才向雲端讀取資料（未登入時 RLS 必定攔截，查詢亦是徒勞）
  useEffect(() => {
    if (signedIn) loadTripsFromCloud()
  }, [signedIn, loadTripsFromCloud])

  // 即時同步：另一部裝置一有改動，本機立即收到。
  // 沒有這一段，兩人各自編輯便會互相覆蓋（整個 trip 是以單一 JSON upsert 上傳）。
  useEffect(() => {
    if (!signedIn) return
    const channel = supabase
      .channel('trips-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trips' },
        (payload: any) => {
          if (payload.eventType === 'DELETE') {
            if (payload.old?.id) removeRemoteTrip(payload.old.id)
            return
          }
          if (payload.new) applyRemoteTrip(payload.new)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [signedIn, applyRemoteTrip, removeRemoteTrip])

  // 保險機制：由背景切回前景、或重新連上網絡時，補推一次未上傳的改動再重新讀取。
  // （手機熄屏或 PWA 置於背景期間，WebSocket 很可能已中斷）
  //
  // loadTripsFromCloud 內部本身會先 flush 一次；這裡在離線期間結束時額外叫一次，
  // 是為了讓「回復連線」這個時刻立即開始上傳，而不必等使用者切走再切回來。
  useEffect(() => {
    if (!signedIn) return
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadTripsFromCloud()
    }
    const onOnline = () => { flushPendingSync().then(() => loadTripsFromCloud()) }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
    }
  }, [signedIn, loadTripsFromCloud, flushPendingSync])

  if (isPublicRoute) return <>{children}</>

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 size={20} className="animate-spin text-gray-500" />
      </div>
    )
  }

  if (!signedIn) return <LoginScreen />

  return <>{children}</>
}

function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(
        error.message === 'Invalid login credentials'
          ? '電郵或密碼不正確'
          : error.message
      )
      setBusy(false)
    }
    // 成功後由 onAuthStateChange 接手，此處毋須額外處理
  }, [email, password])

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-white">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="w-12 h-12 border border-gray-200 flex items-center justify-center mx-auto mb-5">
            <Lock size={18} className="text-gray-700" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#333333]">Tabi Log</h1>
          <p className="text-sm text-gray-500 mt-2">請登入以繼續</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-xs font-medium tracking-widest uppercase text-gray-500 mb-2">
              電郵
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 px-3 py-3 text-base focus:outline-none focus:border-black transition-colors"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium tracking-widest uppercase text-gray-500 mb-2">
              密碼
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 px-3 py-3 text-base focus:outline-none focus:border-black transition-colors"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-black text-white py-4 text-xs font-medium tracking-widest uppercase hover:opacity-80 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy ? <><Loader2 size={14} className="animate-spin" /> 登入中…</> : '登入'}
          </button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-8 leading-relaxed">
          此應用程式僅供受邀成員使用。<br />
          如忘記密碼，請於 Supabase 後台重設。
        </p>
      </div>
    </div>
  )
}

/** 登出按鈕 —— 置於「工具」頁最底 */
export function LogoutButton() {
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    supabase.auth.getUser().then(({ data }) => {
      if (alive) setEmail(data.user?.email ?? null)
    })
    return () => { alive = false }
  }, [])

  return (
    <div className="border border-gray-200 p-6 space-y-4">
      <div>
        <p className="text-xs font-medium tracking-widest uppercase text-gray-500 mb-1">帳戶</p>
        <p className="text-sm text-gray-700 break-all">{email ?? '—'}</p>
      </div>
      <button
        onClick={() => supabase.auth.signOut()}
        className="w-full flex items-center justify-center gap-2 border border-gray-300 py-3 text-xs font-medium tracking-widest uppercase text-gray-700 hover:border-black hover:text-black transition-colors"
      >
        <LogOut size={14} /> 登出
      </button>
    </div>
  )
}
