import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/favicon.ico',
        destination: '/brand/arkalon-daily-icon-32.svg'
      }
    ]
  }
}

export default nextConfig
