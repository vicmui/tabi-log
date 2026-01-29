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
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col justify-between py-12 px-8 z-50 hidden md:flex">
      <div>
        <div className="mb-16">
          <h1 className="font-serif text-2xl tracking-[0.1em] font-bold text-[#333333]">VM&apos;s Build</h1>
          {/* 🔥 這裡改成了中文 */}
          <p className="text-[10px] text-gray-500 tracking-widest mt-1">自製大阪行手帳</p>
        </div>
        <nav className="space-y-6">
          {MENU_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href) && item.href !== "/" || pathname === item.href;
            return (
              <Link href={item.href} key={item.href} className="group block">
                <div className="flex items-baseline gap-3">
                  <span className={clsx("text-sm tracking-widest transition-colors duration-300 font-medium", isActive ? "text-black font-bold" : "text-gray-500 group-hover:text-black")}>
                    {item.label}
                  </span>
                  <span className="text-[10px] text-gray-400 group-hover:text-gray-600 transition-colors">{item.subLabel}</span>
                </div>
                <div className={clsx("h-[1px] bg-black mt-2 transition-all duration-500 ease-out", isActive ? "w-full" : "w-0 group-hover:w-8")} />
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="text-[10px] text-gray-400 tracking-widest"><p>© 2026 VM&apos;s Build</p><p className="mt-1">OSAKA EDITION</p></div>
    </aside>
  );
}