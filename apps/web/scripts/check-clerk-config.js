#!/usr/bin/env node

/**
 * Clerk Configuration Checker
 * Verifies that all required Clerk environment variables are set
 *
 * Usage: node scripts/check-clerk-config.js
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_VARS = [
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
];

const OPTIONAL_VARS = [
  'NEXT_PUBLIC_CLERK_SIGN_IN_URL',
  'NEXT_PUBLIC_CLERK_SIGN_UP_URL',
  'NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL',
  'NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL',
];

function checkEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');

  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local file not found!');
    console.log('📝 Create .env.local from .env.example');
    return false;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  const vars = {};

  lines.forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      vars[match[1].trim()] = match[2].trim();
    }
  });

  let allValid = true;

  console.log('\n🔍 Checking Clerk Configuration...\n');

  REQUIRED_VARS.forEach(varName => {
    const value = vars[varName];
    if (!value || value.includes('your_') || value.includes('_here')) {
      console.error(`❌ ${varName}: Not configured or using placeholder`);
      allValid = false;
    } else {
      console.log(`✅ ${varName}: Configured`);
    }
  });

  console.log('\n📋 Optional Variables:\n');

  OPTIONAL_VARS.forEach(varName => {
    const value = vars[varName];
    if (value) {
      console.log(`✅ ${varName}: ${value}`);
    } else {
      console.log(`⚠️  ${varName}: Not set (will use defaults)`);
    }
  });

  if (!allValid) {
    console.log('\n❌ Configuration incomplete!');
    console.log('\n📖 Get your Clerk keys:');
    console.log('   1. Go to https://dashboard.clerk.com');
    console.log('   2. Select your application');
    console.log('   3. Navigate to API Keys');
    console.log('   4. Copy Publishable Key and Secret Key');
    console.log('   5. Update .env.local\n');
    return false;
  }

  console.log('\n✅ All required Clerk variables are configured!\n');
  return true;
}

if (require.main === module) {
  const isValid = checkEnvFile();
  process.exit(isValid ? 0 : 1);
}

module.exports = { checkEnvFile };
