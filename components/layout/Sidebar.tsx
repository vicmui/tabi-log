'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { useTripStore } from '@/store/useTripStore'

const STATIC_MENU_ITEMS = [
  { label: 'HOME',     subLabel: '首頁',   href: '/'        },
  { label: 'BOOKINGS', subLabel: '預訂憑證', href: '/bookings' },
  // PLANNER is handled dynamically below
  { label: 'BUDGET',   subLabel: '預算分帳', href: '/budget'   },
  { label: 'PLANNING', subLabel: '行前準備', href: '/planning' },
  { label: 'TOOLBOX',  subLabel: '旅行工具', href: '/toolbox'  },
  { label: 'MEMBERS',  subLabel: '成員管理', href: '/members'  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { trips, activeTripId } = useTripStore()

  // Resolve the best planner href:
  // 1. Currently active trip (set when user clicks a trip card)
  // 2. Most upcoming future trip
  // 3. First trip in list
  const plannerHref = (() => {
    if (trips.length === 0) return '/'   // no trips → go home

    // Try active trip first
    const active = activeTripId ? trips.find(t => t.id === activeTripId) : null
    if (active) return `/planner/${active.id}`

    // Pick the trip whose start date is soonest in the future (or least past)
    const today = new Date().toISOString().split('T')[0]
    const upcoming = trips
      .filter(t => t.startDate >= today)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
    if (upcoming.length > 0) return `/planner/${upcoming[0].id}`

    // Fallback: last trip chronologically
    const sorted = [...trips].sort((a, b) => b.startDate.localeCompare(a.startDate))
    return `/planner/${sorted[0].id}`
  })()

  const isPlannerActive = pathname.startsWith('/planner')

  const allItems = [
    STATIC_MENU_ITEMS[0], // HOME
    STATIC_MENU_ITEMS[1], // BOOKINGS
    { label: 'PLANNER', subLabel: '行程規劃', href: plannerHref },
    ...STATIC_MENU_ITEMS.slice(2), // BUDGET onward
  ]

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-100 flex flex-col py-12 px-8 z-40 hidden md:flex">
      {/* Logo */}
      <div className="mb-10">
        {/* 品牌標記 —— 不跟隨全站的字重收窄規則。
            日系極簡網站正文再輕，wordmark 一樣是重的，那是識別而非內文。 */}
        <h1
          className="text-4xl font-bold tracking-tighter text-[#1a1a1a] uppercase leading-none"
          style={{ fontFamily: 'var(--font-inter)' }}
        >
          VM&apos;S<br />BUILD
        </h1>
      </div>

      <div className="h-[2px] w-10 bg-black mb-2" />
      <p className="text-xs text-gray-500 tracking-[0.25em] uppercase font-medium mb-8">旅行手帳</p>

      {/* Nav Links */}
      <nav className="flex-1 space-y-6 overflow-y-auto no-scrollbar py-2">
        {allItems.map(item => {
          const isActive =
            item.label === 'PLANNER'
              ? isPlannerActive
              : item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href)

          return (
            <Link href={item.href} key={item.label} className="group block">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span
                    className={clsx(
                      'text-xs tracking-[0.15em] transition-all duration-300 uppercase',
                      isActive
                        ? 'text-black font-semibold'
                        : 'text-gray-500 group-hover:text-gray-600 font-medium'
                    )}
                  >
                    {item.label}
                  </span>
                  <span className="text-[11px] text-gray-500 group-hover:text-gray-600 transition-colors tracking-widest font-light">
                    {item.subLabel}
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto pt-8 border-t border-gray-50">
        <div className="text-[11px] text-gray-500 tracking-widest uppercase leading-loose">
          <p>© 2026 VM&apos;S BUILD</p>
        </div>
      </div>
    </aside>
  )
}
