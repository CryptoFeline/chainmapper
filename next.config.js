/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove 'output: export' to enable API routes on Vercel
  // Vercel handles server-side rendering automatically
  images: {
    unoptimized: true, // Keep for external images
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'static.coinall.ltd',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'static.oklink.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'static.okx.com',
        pathname: '/**',
      },
    ],
  },
  // Enable experimental features if needed
  experimental: {
    // typedRoutes: true,
  },
}

module.exports = nextConfig
