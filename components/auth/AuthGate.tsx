'use client'
import { useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { Loader2, Lock, LogOut } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useTripStore } from '@/store/useTripStore'

/**
 * AuthGate
 * 包住成個 app：冇登入就只見到登入畫面，登入咗先入到。
 *
 * 帳戶唔喺呢度開 —— 去 Supabase Dashboard → Authentication → Users → Add user
 * 手動加。同時記得喺 Providers → Email 度熄咗 "Allow new users to sign up"，
 * 咁樣就冇人可以自己註冊。
 *
 * /share/... 係例外（分享出去嘅唯讀行程），唔使登入都睇到。
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublicRoute = !!pathname && pathname.startsWith('/share')

  const [checking, setChecking] = useState(true)
  const [signedIn, setSignedIn] = useState(false)

  const loadTripsFromCloud = useTripStore(s => s.loadTripsFromCloud)

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

  // 登入咗先去雲端攞資料（未登入嘅話 RLS 一定會擋，call 都嘥氣）
  useEffect(() => {
    if (signedIn) loadTripsFromCloud()
  }, [signedIn, loadTripsFromCloud])

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
          ? '電郵或密碼唔啱'
          : error.message
      )
      setBusy(false)
    }
    // 成功嘅話 onAuthStateChange 會接手，唔使喺度做嘢
  }, [email, password])

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-white">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="w-12 h-12 border border-gray-200 flex items-center justify-center mx-auto mb-5">
            <Lock size={18} className="text-gray-700" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#333333]">Tabi Log</h1>
          <p className="text-sm text-gray-500 mt-2">請先登入</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-xs font-bold tracking-widest uppercase text-gray-500 mb-2">
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
            <label htmlFor="password" className="block text-xs font-bold tracking-widest uppercase text-gray-500 mb-2">
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
            className="w-full bg-black text-white py-4 text-xs font-bold tracking-widest uppercase hover:opacity-80 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {busy ? <><Loader2 size={14} className="animate-spin" /> 登入中…</> : '登入'}
          </button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-8 leading-relaxed">
          呢個 app 淨係開放畀受邀請嘅人。<br />
          忘記密碼可以喺 Supabase Dashboard 重設。
        </p>
      </div>
    </div>
  )
}

/** 登出掣 —— 放咗喺「工具」頁最底 */
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
        <p className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-1">帳戶</p>
        <p className="text-sm text-gray-700 break-all">{email ?? '—'}</p>
      </div>
      <button
        onClick={() => supabase.auth.signOut()}
        className="w-full flex items-center justify-center gap-2 border border-gray-300 py-3 text-xs font-bold tracking-widest uppercase text-gray-700 hover:border-black hover:text-black transition-colors"
      >
        <LogOut size={14} /> 登出
      </button>
    </div>
  )
}
