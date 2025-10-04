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
}

module.exports = nextConfig
