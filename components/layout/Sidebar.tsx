"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const MENU_ITEMS = [
  { label: "HOME", subLabel: "首頁", href: "/" },
  { label: "BOOKINGS", subLabel: "預訂憑證", href: "/bookings" },
  { label: "PLANNER", subLabel: "行程規劃", href: "/planner" },
  { label: "BUDGET", subLabel: "預算分帳", href: "/budget" },
  { label: "PLANNING", subLabel: "行前準備", href: "/planning" },
  { label: "TOOLBOX", subLabel: "旅行工具", href: "/toolbox" },
  { label: "MEMBERS", subLabel: "成員管理", href: "/members" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-100 flex flex-col justify-between py-12 px-10 z-50 hidden md:flex">
      <div>
        <div className="mb-20">
          {/* 🔥 Logo: 幼身 + 寬字距 */}
          <h1 className="text-3xl tracking-ut-widest font-light text-black uppercase" style={{ fontFamily: 'var(--font-inter)' }}>
            VM&apos;s<br/>Build
          </h1>
          <div className="h-[1px] w-8 bg-black my-4"></div>
          <p className="text-[10px] text-gray-400 tracking-[0.3em] uppercase">Travel Architect</p>
        </div>
        <nav className="space-y-8">
          {MENU_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href) && item.href !== "/" || pathname === item.href;
            return (
              <Link href={item.href} key={item.href} className="group block">
                <div className="flex flex-col gap-1">
                  <span className={clsx(
                    "text-xs tracking-ut-wide transition-all duration-300 uppercase",
                    isActive ? "text-black font-medium" : "text-gray-400 group-hover:text-gray-600 font-light"
                  )}>
                    {item.label}
                  </span>
                  {/* 中文副標題更細 */}
                  <span className="text-[9px] text-gray-300 group-hover:text-gray-400 transition-colors tracking-widest font-light">
                    {item.subLabel}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="text-[9px] text-gray-300 tracking-widest uppercase">
        <p>© 2026 VM&apos;s Build</p>
        <p className="mt-2">Osaka Edition</p>
      </div>
    </aside>
  );
}