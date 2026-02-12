import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  webpack: (config) => {
    // Fix for better-sqlite3
    config.externals.push({
      'better-sqlite3': 'commonjs better-sqlite3',
    })
    return config
  },
}

export default nextConfig
