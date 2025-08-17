import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NHN_SECRET_KEY: process.env.NHN_SECRET_KEY,
    NHN_APP_KEY: process.env.NHN_APP_KEY,
    NHN_SENDER_KEY: process.env.NHN_SENDER_KEY,
  },
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dckycsszywpcnkqpjxes.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig;
