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
}=== ./components/layout/TripSwitcher.tsx ===
"use client";
import { useTripStore } from "@/store/useTripStore";
import { ChevronDown, MapPin } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";

export default function TripSwitcher() {
  const { trips, activeTripId, setActiveTrip } = useTripStore();
  const activeTrip = trips.find(t => t.id === activeTripId) || trips[0];
  const [isOpen, setIsOpen] = useState(false);

  if (!activeTrip) return null;

  return (
    <div className="relative z-50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm font-bold tracking-widest uppercase hover:opacity-70 transition-opacity"
      >
        <MapPin size={16} />
        <span className="truncate max-w-[150px]">{activeTrip.title}</span>
        <ChevronDown size={14} className={clsx("transition-transform", isOpen && "rotate-180")}/>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-100 shadow-xl rounded-lg py-2 z-50">
             <p className="px-4 py-2 text-[10px] text-gray-400 tracking-widest uppercase border-b border-gray-50 mb-1">Switch Trip</p>
             {trips.map(trip => (
               <button
                 key={trip.id}
                 onClick={() => { setActiveTrip(trip.id); setIsOpen(false); }}
                 className={clsx(
                   "w-full text-left px-4 py-2 text-xs font-medium hover:bg-gray-50 transition-colors truncate",
                   activeTrip.id === trip.id ? "text-black bg-gray-50" : "text-gray-500"
                 )}
               >
                 {trip.title}
               </button>
             ))}
          </div>
        </>
      )}
    </div>
  );
}=== ./components/layout/Sidebar.tsx ===
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
          VM&apos;s<br />Build
        </h1>
        <div className="h-[2px] w-10 bg-black my-5" />
        <p className="text-[10px] text-gray-500 tracking-[0.25em] uppercase font-medium">旅行手帳</p>
      </div>

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
          <p>© 2026 VM&apos;s Build</p>
        </div>
      </div>
    </aside>
  )
}