#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const os = require('os');
const path = require('path');

console.log('🚀 TradeMaster Pro - iPad Development Mode');
console.log('==========================================');

// Get local IP address for network access
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIP = getLocalIP();
const port = process.env.PORT || 3000;

console.log(`📱 iPad Development Server`);
console.log(`🌐 Local: http://localhost:${port}`);
console.log(`📱 iPad: http://${localIP}:${port}`);
console.log(`⚡ Hot Reload: Enabled`);
console.log(`🔄 Auto Refresh: Every 3 seconds`);
console.log('');

// Start Next.js development server with optimized settings
const devProcess = spawn('npx', [
  'next', 'dev',
  '--port', port.toString(),
  '--hostname', '0.0.0.0', // Allow network access
  '--turbo', // Use Turbopack for faster builds
], {
  stdio: 'inherit',
  cwd: process.cwd()
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping development server...');
  devProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Stopping development server...');
  devProcess.kill('SIGTERM');
  process.exit(0);
});

// Auto-refresh helper for iPad
console.log('💡 iPad Tips:');
console.log('1. Connect iPad to same WiFi network');
console.log(`2. Open Safari and go to: http://${localIP}:${port}`);
console.log('3. Add to Home Screen for app-like experience');
console.log('4. Changes will appear automatically (hot reload)');
console.log('5. Use Safari Developer Tools for debugging');
console.log('');

devProcess.on('error', (error) => {
  console.error('❌ Failed to start development server:', error);
  process.exit(1);
});