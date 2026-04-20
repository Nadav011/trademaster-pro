// Generate basic icons for PWA
// This script creates simple SVG icons that can be used as placeholders

const fs = require('fs')
const path = require('path')

// Create icons directory if it doesn't exist
const iconsDir = path.join(__dirname, '../public')
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true })
}

// Generate a simple SVG icon
function generateIcon(size, filename) {
  const svgContent = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" rx="8" fill="#2563eb"/>
    <path d="M8 6L16 10L8 14V6Z" fill="white"/>
    <text x="50%" y="65%" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="6" font-weight="bold">TM</text>
  </svg>`

  fs.writeFileSync(path.join(iconsDir, filename), svgContent)
  console.log(`✅ Generated ${filename}`)
}

// Generate icons in different sizes
generateIcon(192, 'icon-192x192.png')
generateIcon(512, 'icon-512x512.png')
generateIcon(150, 'icon-150x150.png')

// For now, we'll use SVG files as placeholders
// In production, you would convert these to PNG using a tool like sharp or imagemin

console.log('🎉 Icon generation completed!')
console.log('📝 Note: These are SVG placeholders. For production, convert to PNG format.')