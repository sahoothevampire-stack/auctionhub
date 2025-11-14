import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // `typedRoutes` moved out of `experimental` in newer Next versions
  typedRoutes: true,
}

export default nextConfig


