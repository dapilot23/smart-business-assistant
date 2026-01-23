// This script should be run with ts-node, not included in build
// Run with: npx ts-node -r tsconfig-paths/register src/scripts/validate-clerk-config.ts

/**
 * Validation script for Clerk configuration
 * Run with: ts-node src/scripts/validate-clerk-config.ts
 */

// Note: This file is for reference only and should be excluded from build
// To use it, install dotenv and uncomment the imports below

// import { config } from 'dotenv';
// import { resolve } from 'path';
// config({ path: resolve(__dirname, '../../.env') });

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

function validateClerkConfig(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check CLERK_SECRET_KEY
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    errors.push('CLERK_SECRET_KEY is not set in .env file');
  } else if (secretKey === 'your_clerk_secret_key_here') {
    errors.push('CLERK_SECRET_KEY is still set to placeholder value');
  } else if (!secretKey.startsWith('sk_')) {
    warnings.push('CLERK_SECRET_KEY does not start with "sk_" - this might be incorrect');
  }

  // Check CLERK_PUBLISHABLE_KEY
  const publishableKey = process.env.CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    errors.push('CLERK_PUBLISHABLE_KEY is not set in .env file');
  } else if (publishableKey === 'your_clerk_publishable_key_here') {
    errors.push('CLERK_PUBLISHABLE_KEY is still set to placeholder value');
  } else if (!publishableKey.startsWith('pk_')) {
    warnings.push('CLERK_PUBLISHABLE_KEY does not start with "pk_" - this might be incorrect');
  }

  // Check database connection
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    errors.push('DATABASE_URL is not set in .env file');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

function printResults(result: ValidationResult): void {
  console.log('\n=== Clerk Configuration Validation ===\n');

  if (result.errors.length > 0) {
    console.log('❌ ERRORS:');
    result.errors.forEach((error) => {
      console.log(`  - ${error}`);
    });
    console.log('');
  }

  if (result.warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    result.warnings.forEach((warning) => {
      console.log(`  - ${warning}`);
    });
    console.log('');
  }

  if (result.isValid) {
    console.log('✅ Configuration is valid!\n');
    console.log('Next steps:');
    console.log('1. Run database migration: pnpm prisma migrate deploy');
    console.log('2. Create a tenant in the database');
    console.log('3. Configure Clerk user with tenantId in public metadata');
    console.log('4. Start the server: pnpm dev');
    console.log('5. Test the /auth/me endpoint with a Clerk JWT token\n');
  } else {
    console.log('❌ Configuration is invalid. Please fix the errors above.\n');
    process.exit(1);
  }
}

// Run validation
const result = validateClerkConfig();
printResults(result);
