"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Home, Ticket, CalendarRange, Wallet, ClipboardList, Briefcase, Users } from "lucide-react";

const MENU_ITEMS = [
  { label: "HOME", subLabel: "首頁", href: "/", icon: Home },
  { label: "BOOKINGS", subLabel: "預訂憑證", href: "/bookings", icon: Ticket },
  { label: "PLANNER", subLabel: "行程規劃", href: "/planner", icon: CalendarRange },
  { label: "BUDGET", subLabel: "預算分帳", href: "/budget", icon: Wallet },
  { label: "PLANNING", subLabel: "行前準備", href: "/planning", icon: ClipboardList },
  { label: "TOOLBOX", subLabel: "旅行工具", href: "/toolbox", icon: Briefcase },
  { label: "MEMBERS", subLabel: "成員管理", href: "/members", icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-100 flex flex-col py-12 px-8 z-50 hidden md:flex">
      <div className="mb-10">
        <h1 className="text-4xl font-black tracking-tighter text-[#1a1a1a] uppercase leading-none" style={{ fontFamily: 'var(--font-inter)' }}>
          VM&apos;s<br/>Build
        </h1>
        <div className="h-[2px] w-10 bg-black my-5"></div>
        {/* 🔥 修改：Travel Architect -> 旅行手帳 */}
        <p className="text-[10px] text-gray-400 tracking-[0.25em] uppercase font-medium">旅行手帳</p>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto no-scrollbar py-2">
        {MENU_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href) && item.href !== "/" || pathname === item.href;
          return (
            <Link href={item.href} key={item.href} className="group block">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className={clsx("text-xs tracking-[0.15em] transition-all duration-300 uppercase", isActive ? "text-black font-bold" : "text-gray-400 group-hover:text-gray-600 font-medium")}>
                    {item.label}
                  </span>
                  <span className="text-[9px] text-gray-300 group-hover:text-gray-400 transition-colors tracking-widest font-light scale-90 origin-left">
                    {item.subLabel}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-8 border-t border-gray-50">
        <div className="text-[9px] text-gray-300 tracking-widest uppercase leading-loose">
          <p>© 2026 VM&apos;s Build</p>
          <p className="text-gray-400 font-medium">Osaka Edition</p>
        </div>
      </div>
    </aside>
  );
}