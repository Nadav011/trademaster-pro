/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove trailingSlash for proper App Router support
  trailingSlash: false,
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
