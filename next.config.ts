import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Google OAuth profile photos
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // Vercel Blob receipt attachments
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
  // Cap build parallelism so static generation stays within memory on
  // constrained machines (CI/prod have ample RAM and can raise this).
  experimental: {
    cpus: 2,
    // Keep client Router Cache entries warm so switching bottom-tabs (and
    // back/forward) is instant and preserves scroll instead of re-running the
    // route's server component. Mutations still bust the cache via
    // revalidateTag, so data can't go stale past a real write.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
