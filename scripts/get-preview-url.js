#!/usr/bin/env node

/**
 * Quick script to get the Netlify preview URL for the current branch
 * Run: npm run preview-url
 */

const { execSync } = require('child_process');

try {
  // Get current branch name
  const branch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();
  
  console.log('\n🌿 Current Branch:', branch);
  
  if (branch === 'main') {
    console.log('📦 Production URL: https://your-site.netlify.app');
    console.log('\n💡 Tip: Create a new branch to get a preview URL');
  } else {
    // Netlify preview URL format
    const sanitizedBranch = branch.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    
    console.log('\n📱 Deploy Preview URLs will be available at:');
    console.log('   Option 1: Check your Netlify dashboard > Deploys > Deploy Previews');
    console.log('   Option 2: After push, check the GitHub PR for the Netlify bot comment');
    console.log('   Option 3: Expected format: https://deploy-preview-[PR#]--your-site.netlify.app');
    
    console.log('\n✨ How to use:');
    console.log('   1. Commit your changes: git add . && git commit -m "description"');
    console.log('   2. Push to GitHub: git push');
    console.log('   3. Netlify will automatically create a preview URL!');
    console.log('   4. You\'ll get the URL in ~2-3 minutes');
  }
  
  console.log('\n🔗 Quick Links:');
  console.log('   • Netlify Dashboard: https://app.netlify.com/');
  console.log('   • Docs: See QUICK_PREVIEW.md for more info\n');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
