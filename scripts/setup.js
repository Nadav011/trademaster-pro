#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 TradeMaster Pro - Setup Script');
console.log('================================\n');

// Create data directory
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('✅ Created data directory');
}

// Create uploads directory
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory');
}

// Check for .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.log('⚠️  .env.local not found');
  console.log('   Please copy env.example to .env.local and add your Finnhub API key');
  console.log('   Get your free API key at: https://finnhub.io/\n');
} else {
  console.log('✅ .env.local found');
}

console.log('🎉 Setup completed!');
console.log('\nNext steps:');
console.log('1. Add your Finnhub API key to .env.local');
console.log('2. Run: npm run dev');
console.log('3. Open: http://localhost:3000');
console.log('\nHappy trading! 📈');
