"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // 轉頁時自動關閉選單
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <>
      {/* 漢堡按鈕 (固定在右上角，只在 Mobile 顯示) */}
      <div className="fixed top-4 right-4 z-[60] md:hidden">
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-lg border border-gray-100 text-jp-charcoal"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* 全螢幕選單 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="fixed inset-0 z-[70] bg-white flex flex-col md:hidden"
          >
            {/* Header */}
            <div className="p-6 flex justify-between items-center border-b border-gray-100">
               <div>
                 <h2 className="font-serif text-2xl font-bold text-jp-charcoal tracking-widest">VM&apos;s Build</h2>
                 <p className="text-[10px] text-gray-400 tracking-widest uppercase">MENU</p>
               </div>
               <button onClick={() => setIsOpen(false)} className="p-2 bg-gray-100 rounded-full">
                 <X size={24} />
               </button>
            </div>

            {/* Menu List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {MENU_ITEMS.map((item) => {
                const isActive = pathname.startsWith(item.href) && item.href !== "/" || pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} className="block group">
                    <div className="flex items-center justify-between">
                       <div>
                         <span className={clsx("text-2xl font-serif font-bold block", isActive ? "text-jp-charcoal" : "text-gray-300")}>
                           {item.label}
                         </span>
                         <span className="text-xs text-gray-400 tracking-widest uppercase">{item.subLabel}</span>
                       </div>
                       {isActive && <div className="w-2 h-2 bg-jp-charcoal rounded-full" />}
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 text-center">
               <p className="text-[10px] text-gray-300 tracking-widest uppercase">© 2026 VM&apos;s Build</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}