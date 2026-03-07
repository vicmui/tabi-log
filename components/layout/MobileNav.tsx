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

const MENU_ITEMS = [
  { label: "首頁",  href: "/",        icon: Home },
  { label: "預訂",  href: "/bookings", icon: Ticket },
  { label: "行程",  href: "/planner",  icon: CalendarRange },
  { label: "預算",  href: "/budget",   icon: Wallet },
  { label: "準備",  href: "/planning", icon: ClipboardList },
  { label: "工具",  href: "/toolbox",  icon: Briefcase },
  { label: "成員",  href: "/members",  icon: Users },
];

export default function MobileNav() {
  const pathname = usePathname()

  // Share 頁隱藏 nav（唯讀 view）
  if (pathname.startsWith('/share')) return null

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe">
      <div className="flex justify-between items-center px-1 py-2 overflow-x-auto no-scrollbar">
        {MENU_ITEMS.map(item => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center min-w-[56px] py-1 gap-0.5 transition-colors duration-200 relative"
            >
              {/* Active top bar */}
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[2px] bg-black" />
              )}

              <item.icon
                size={20}
                strokeWidth={isActive ? 2.5 : 1.5}
                className={isActive ? 'text-black' : 'text-gray-400'}
              />

              <span
                className={clsx(
                  'text-[9px] font-medium tracking-wide',
                  isActive ? 'font-bold text-black' : 'text-gray-400'
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
