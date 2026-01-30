"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Ticket, 
  Map, 
  Calculator, 
  ClipboardCheck, 
  Briefcase, 
  Users 
} from "lucide-react";

export default function MobileNav() {
  const pathname = usePathname();

  // ⚠️ 請檢查這裡的 href 是否對應你專案的實際路徑
  const navItems = [
    { name: "預訂", href: "/bookings", icon: Ticket },      // 預訂憑證
    { name: "行程", href: "/planner", icon: Map },        // 行程規劃
    { name: "預算", href: "/budget", icon: Calculator },    // 預算分帳
    { name: "準備", href: "/planning", icon: ClipboardCheck }, // 行前準備
    { name: "工具", href: "/toolbox", icon: Briefcase },      // 旅行工具
    { name: "成員", href: "/members", icon: Users },        // 成員管理
  ];

  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full bg-white border-t border-gray-100 pb-safe shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
      {/* Grid-cols-6: 確保6個制平分闊度 */}
      <div className="grid grid-cols-6 h-[60px] w-full max-w-md mx-auto">
        {navItems.map((item) => {
          // 檢查當前路徑是否包含該 item 的 href (或是完全相等，視乎你習慣)
          // 如果想簡單啲，用 pathname === item.href 都可以
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-[2px] transition-colors duration-200 ${
                isActive 
                  ? "text-black" // Active 顏色 (黑色，跟返你截圖風格)
                  : "text-gray-400 hover:text-gray-500" // Inactive 顏色 (灰色)
              }`}
            >
              <Icon 
                size={22} // Icon 大小
                strokeWidth={isActive ? 2 : 1.5} // Active 時粗少少
                className="mb-0.5"
              />
              <span className="text-[10px] font-medium tracking-tight">
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}