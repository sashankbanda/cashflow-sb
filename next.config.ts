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
  },
};

export default nextConfig;
