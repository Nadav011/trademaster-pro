/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove trailingSlash for proper App Router support
  trailingSlash: false,
  images: {
    unoptimized: true,
  },
  // Disable static optimization to prevent _document issues
  output: 'standalone',
  // Ensure proper page handling
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  
  // Enhanced development settings for better iPad experience
  experimental: {
    // Enable faster refresh for better mobile development
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog'],
  },
  
  // Development optimizations
  ...(process.env.NODE_ENV === 'development' && {
    // Faster builds in development
    swcMinify: false,
    // Better error overlay for mobile
    onDemandEntries: {
      maxInactiveAge: 25 * 1000,
      pagesBufferLength: 2,
    },
  }),
}

module.exports = nextConfig
