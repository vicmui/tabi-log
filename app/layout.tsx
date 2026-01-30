import type { Metadata } from "next";
import { Inter } from "next/font/google"; // 假設你用 Inter，無用可以 ignore
import "./globals.css";
import MobileNav from "@/components/MobileNav"; // 記得 import

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Travel App",
  description: "My awesome travel planner",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-HK">
      {/* pb-[80px]: 底部留位俾 Navigation Bar + Safe Area */}
      {/* md:pb-0: 電腦版唔使留位 */}
      <body className={`${inter.className} bg-gray-50 pb-[80px] md:pb-0`}>
        
        <main className="min-h-screen max-w-md mx-auto bg-white shadow-sm md:max-w-full md:shadow-none md:bg-transparent">
          {children}
        </main>

        {/* 只在 Mobile 顯示 Bottom Bar */}
        <div className="md:hidden">
          <MobileNav />
        </div>
        
      </body>
    </html>
  );
}