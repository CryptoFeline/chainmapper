/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Static export for Vercel/Netlify
  images: {
    unoptimized: true, // Required for static export
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
    ],
  },
  // Enable experimental features if needed
  experimental: {
    // typedRoutes: true,
  },
}

module.exports = nextConfig
