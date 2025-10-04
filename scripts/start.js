#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 TradeMaster Pro - Starting Application');
console.log('=======================================\n');

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.log('⚠️  .env.local not found');
  console.log('   Please copy env.example to .env.local and add your Finnhub API key');
  console.log('   Get your free API key at: https://finnhub.io/\n');
  console.log('   For now, starting without API key (market data will be unavailable)');
  console.log('   You can add the API key later and restart the application.\n');
}

// Create necessary directories
const dataDir = path.join(process.cwd(), 'data');
const uploadsDir = path.join(process.cwd(), 'uploads');

[dataDir, uploadsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created ${dir}`);
  }
});

console.log('🎯 Starting TradeMaster Pro...');
console.log('   - Dashboard: http://localhost:3000');
console.log('   - Add Trade: http://localhost:3000/add-trade');
console.log('   - Trades List: http://localhost:3000/trades');
console.log('   - Capital Management: http://localhost:3000/capital');
console.log('   - Settings: http://localhost:3000/settings');
console.log('\n📈 Happy Trading!');

try {
  execSync('npm run dev', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Failed to start application:', error.message);
  process.exit(1);
}
