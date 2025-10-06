/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove trailingSlash for proper App Router support
  trailingSlash: false,
  images: {
    unoptimized: true,
  },
  // Ensure proper page handling
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  // Add basePath for Netlify deployment
  basePath: '',
  assetPrefix: '',
}

module.exports = nextConfig
