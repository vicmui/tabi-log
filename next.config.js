const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontEndNav: true,       // cache每次navigation
  aggressiveFrontEndNavCaching: true,  // 積極cache所有前端跳轉
  reloadOnOnline: false,          // 重新上網時唔強制reload
  workboxOptions: {
    disableDevLogs: true,
    // 預先cache所有app routes
    additionalManifestEntries: [
      { url: "/", revision: null },
      { url: "/bookings", revision: null },
      { url: "/planner", revision: null },
      { url: "/budget", revision: null },
      { url: "/planning", revision: null },
      { url: "/toolbox", revision: null },
      { url: "/members", revision: null },
    ],
    runtimeCaching: [
      // App pages - StaleWhileRevalidate: 離線用cache版，有網就靜默更新
      {
        urlPattern: /^https:\/\/[^/]+\/(bookings|planner|budget|planning|toolbox|members|share)(\/.*)?$/,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "app-pages",
          expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // Next.js static assets - CacheFirst (唔會變)
      {
        urlPattern: /\/_next\/static\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "next-static",
          expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 365 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // Next.js image optimization
      {
        urlPattern: /\/_next\/image\?.*/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "next-images",
          expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // Supabase storage (cover images, receipts, avatars)
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "supabase-storage",
          expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // Google Maps tiles & API
      {
        urlPattern: /^https:\/\/maps\.(googleapis|gstatic)\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "google-maps",
          expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // DiceBear avatars
      {
        urlPattern: /^https:\/\/api\.dicebear\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "avatars",
          expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // Local static images (osaka-cover etc)
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "images",
          expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      // Fonts
      {
        urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "fonts",
          expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lxtcaiooublurbttwjiy.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
    ],
  },
};

module.exports = withPWA(nextConfig);
