/** @type {import('next').NextConfig} */
import withPWAInit from 'next-pwa';

const withPWA = withPWAInit({
  dest: 'public', // Service worker 的輸出路徑
  register: true, // 自動註冊 Service Worker
  skipWaiting: true, // 更新時立即生效
  disable: process.env.NODE_ENV === 'development', // 開發模式下停用，避免緩存干擾開發
});

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'lxtcaiooublurbttwjiy.supabase.co' }, // 你的 Supabase URL
    ],
  },
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

export default withPWA(nextConfig);