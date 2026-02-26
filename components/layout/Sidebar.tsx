"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const MENU_ITEMS = [
  { label: "HOME",     subLabel: "首頁",   href: "/" },
  { label: "BOOKINGS", subLabel: "預訂憑證", href: "/bookings" },
  { label: "PLANNER",  subLabel: "行程規劃", href: "/planner" },
  { label: "BUDGET",   subLabel: "預算分帳", href: "/budget" },
  { label: "PLANNING", subLabel: "行前準備", href: "/planning" },
  { label: "TOOLBOX",  subLabel: "旅行工具", href: "/toolbox" },
  { label: "MEMBERS",  subLabel: "成員管理", href: "/members" },
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
        <p className="text-[10px] text-gray-500 tracking-[0.25em] uppercase font-medium">旅行手帳</p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar py-2">
        {MENU_ITEMS.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link href={item.href} key={item.href} className="group block py-2">
              <div className={clsx(
                "flex flex-col transition-all duration-200",
                isActive
                  ? "border-l-[3px] pl-2 -ml-2"
                  : "border-l-[3px] border-transparent pl-2 -ml-2 group-hover:border-gray-200"
              )}
              >
                <span className={clsx(
                  "text-xs tracking-[0.15em] transition-all duration-200 uppercase",
                  isActive ? "text-black font-bold" : "text-gray-400 group-hover:text-gray-600 font-medium"
                )}>
                  {item.label}
                </span>
                <span className="text-[9px] text-gray-400 group-hover:text-gray-500 transition-colors tracking-widest font-light">
                  {item.subLabel}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-8 border-t border-gray-100">
        <div className="text-[9px] text-gray-400 tracking-widest uppercase leading-loose">
          <p>© 2026 VM&apos;s Build</p>
          <p className="text-gray-500 font-medium">Osaka Edition</p>
        </div>
      </div>
    </aside>
  );
}
