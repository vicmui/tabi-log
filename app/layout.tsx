import type { Metadata } from "next";
import { Inter, Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import MobileNav from "@/components/layout/MobileNav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const notoSansJP = Noto_Sans_JP({ 
  subsets: ["latin"], 
  weight: ["300", "400", "500", "700"], 
  variable: "--font-noto-sans" 
});
const notoSerifJP = Noto_Serif_JP({ 
  subsets: ["latin"], 
  weight: ["400", "700"], 
  variable: "--font-noto-serif" 
});

export const metadata: Metadata = {
  title: "VM's Build",
  description: "Travel Architect",
  manifest: "/manifest.json",
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body className={`${inter.variable} ${notoSansJP.variable} ${notoSerifJP.variable} font-sans bg-white text-[#333333] antialiased`}>
        {/* 這裡加了 pb-24 防止手機版內容被底部選單遮住 */}
        <div className="pb-24 md:pb-0">
          {children}
        </div>
        
        {/* 手機版底部選單 */}
        <MobileNav />
      </body>
    </html>
  );
}