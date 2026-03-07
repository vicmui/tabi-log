'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'

// ── OFFLINE 已移除，其餘順序不變 ──
const MENU_ITEMS = [
  { label: 'HOME',     subLabel: '首頁',  href: '/'        }, // ← 保留你原本日文 subLabel
  { label: 'BOOKINGS', subLabel: '預訂頁面',  href: '/bookings' }, // ← 保留你原本日文 subLabel
  { label: 'PLANNER',  subLabel: '行程規劃',  href: '/planner'  }, // ← 保留你原本日文 subLabel
  { label: 'BUDGET',   subLabel: '預算分帳',  href: '/budget'   }, // ← 保留你原本日文 subLabel
  { label: 'PLANNING', subLabel: '行前準備',  href: '/planning' }, // ← 保留你原本日文 subLabel
  { label: 'TOOLBOX',  subLabel: '旅行工具',  href: '/toolbox'  }, // ← 保留你原本日文 subLabel
  { label: 'MEMBERS',  subLabel: '成員管理',  href: '/members'  }, // ← 保留你原本日文 subLabel
  // OFFLINE 已刪除 ✕
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-100 flex flex-col py-12 px-8 z-50 hidden md:flex">
      {/* Logo */}
      <div className="mb-10">
        <h1
          className="text-4xl font-black tracking-tighter text-[#1a1a1a] uppercase leading-none"
          style={{ fontFamily: 'var(--font-inter)' }}
        >
          VMap&apos;s<br />Build
        </h1>
      </div>

      <div className="h-[2px] w-10 bg-black my-5" />
      <p className="text-[10px] text-gray-500 tracking-[0.25em] uppercase font-medium" />

      {/* Nav Links */}
      <nav className="flex-1 space-y-6 overflow-y-auto no-scrollbar py-2">
        {MENU_ITEMS.map(item => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)

          return (
            <Link href={item.href} key={item.href} className="group block">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span
                    className={clsx(
                      'text-xs tracking-[0.15em] transition-all duration-300 uppercase',
                      isActive
                        ? 'text-black font-bold'
                        : 'text-gray-400 group-hover:text-gray-600 font-medium'
                    )}
                  >
                    {item.label}
                  </span>
                  <span className="text-[9px] text-gray-500 group-hover:text-gray-600 transition-colors tracking-widest font-light scale-90 origin-left">
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
        <div className="text-[9px] text-gray-400 tracking-widest uppercase leading-loose">
          <p>© 2026 VMap&apos;s Build</p>
          <p className="text-gray-500 font-medium">Osaka Edition</p>
        </div>
      </div>
    </aside>
  )
}
