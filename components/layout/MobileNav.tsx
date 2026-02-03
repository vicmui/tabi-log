"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  Ticket, 
  CalendarRange, 
  Wallet, 
  ClipboardList, 
  Briefcase, 
  Users 
} from "lucide-react";
import clsx from "clsx";

const MENU_ITEMS = [
  { label: "首頁", href: "/", icon: Home },
  { label: "預訂", href: "/bookings", icon: Ticket },
  { label: "行程", href: "/planner", icon: CalendarRange },
  { label: "預算", href: "/budget", icon: Wallet },
  { label: "準備", href: "/planning", icon: ClipboardList },
  { label: "工具", href: "/toolbox", icon: Briefcase },
  { label: "成員", href: "/members", icon: Users },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe">
      <div className="flex justify-between items-center px-2 py-2 overflow-x-auto no-scrollbar">
        {MENU_ITEMS.map((item) => {
          // 判斷是否選中 (首頁需完全匹配，其他只要包含路徑即可)
          const isActive = item.href === "/" 
            ? pathname === "/" 
            : pathname.startsWith(item.href);

          return (
            <Link 
              key={item.href} 
              href={item.href} 
              className={clsx(
                "flex flex-col items-center justify-center min-w-[14%] py-1 gap-1 transition-colors duration-200",
                isActive ? "text-[#333333]" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <item.icon 
                size={22} 
                strokeWidth={isActive ? 2.5 : 2} 
                className="mb-0.5"
              />
              <span className="text-[9px] font-medium tracking-wide">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}