'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Ticket,
  CalendarRange,
  Wallet,
  ClipboardList,
  Briefcase,
  Users,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useTripStore } from '@/store/useTripStore'

// 冇 /planner 呢一頁（只有 /planner/[id]），所以「行程」要動態砌條 href，
// 同 Sidebar 用同一套邏輯。之前硬寫 "/planner" 係會 404 嘅。
const STATIC_ITEMS = [
  { label: "首頁",  href: "/",        icon: Home },
  { label: "預訂",  href: "/bookings", icon: Ticket },
  { label: "預算",  href: "/budget",   icon: Wallet },
  { label: "準備",  href: "/planning", icon: ClipboardList },
  { label: "工具",  href: "/toolbox",  icon: Briefcase },
  { label: "成員",  href: "/members",  icon: Users },
];

export default function MobileNav() {
  const pathname = usePathname()
  const { trips, activeTripId } = useTripStore()

  // 1. 現正選中嘅行程 → 2. 最近將要出發嘅 → 3. 最新嗰個
  const plannerHref = (() => {
    if (trips.length === 0) return '/'
    const active = activeTripId ? trips.find(t => t.id === activeTripId) : null
    if (active) return `/planner/${active.id}`
    const today = new Date().toISOString().split('T')[0]
    const upcoming = trips
      .filter(t => t.startDate >= today)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
    if (upcoming.length > 0) return `/planner/${upcoming[0].id}`
    const sorted = [...trips].sort((a, b) => b.startDate.localeCompare(a.startDate))
    return `/planner/${sorted[0].id}`
  })()

  const MENU_ITEMS = [
    STATIC_ITEMS[0],
    STATIC_ITEMS[1],
    { label: "行程", href: plannerHref, icon: CalendarRange },
    ...STATIC_ITEMS.slice(2),
  ]

  // Share 頁隱藏 nav（唯讀 view）
  if (pathname.startsWith('/share')) return null

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe">
      <div className="flex items-center px-1 py-2">
        {MENU_ITEMS.map(item => {
          const isActive =
            item.label === '行程'
              ? pathname.startsWith('/planner')
              : item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href)

          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex-1 min-w-0 flex flex-col items-center justify-center py-1 gap-0.5 transition-colors duration-200 relative"
            >
              {/* Active top bar */}
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[2px] bg-black" />
              )}

              <item.icon
                size={20}
                strokeWidth={isActive ? 2.5 : 1.5}
                className={isActive ? 'text-black' : 'text-gray-500'}
              />

              <span
                className={clsx(
                  'text-[11px] font-medium tracking-wide whitespace-nowrap',
                  isActive ? 'font-bold text-black' : 'text-gray-500'
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
