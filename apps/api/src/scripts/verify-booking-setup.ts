// Verification script for public booking setup
// Run with: npx ts-node src/scripts/verify-booking-setup.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyBookingSetup() {
  console.log('🔍 Verifying public booking setup...\n');

  let allGood = true;

  try {
    // 1. Check if slug column exists
    console.log('1️⃣  Checking database schema...');
    const tenant = await prisma.tenant.findFirst();

    if (!tenant) {
      console.log('   ❌ No tenants found in database');
      console.log('   → Create a tenant first\n');
      allGood = false;
    } else if (typeof tenant.slug === 'undefined') {
      console.log('   ❌ Slug column does not exist in tenants table');
      console.log('   → Run: ALTER TABLE tenants ADD COLUMN slug VARCHAR(255) UNIQUE;\n');
      allGood = false;
    } else {
      console.log('   ✅ Database schema is correct\n');
    }

    // 2. Check if tenants have slugs
    if (tenant) {
      console.log('2️⃣  Checking tenant slugs...');
      const tenants = await prisma.tenant.findMany();
      const tenantsWithoutSlugs = tenants.filter((t) => !t.slug);

      if (tenantsWithoutSlugs.length > 0) {
        console.log(`   ⚠️  ${tenantsWithoutSlugs.length} tenant(s) missing slugs:`);
        tenantsWithoutSlugs.forEach((t) => {
          console.log(`      - ${t.name} (ID: ${t.id})`);
        });
        console.log('   → Run: npx ts-node src/scripts/add-tenant-slug.ts\n');
        allGood = false;
      } else {
        console.log(`   ✅ All ${tenants.length} tenants have slugs\n`);
        console.log('   Available booking URLs:');
        tenants.forEach((t) => {
          console.log(`   → /book/${t.slug} (${t.name})`);
        });
        console.log('');
      }

      // 3. Check if tenants have services
      console.log('3️⃣  Checking services...');
      const services = await prisma.service.findMany({
        include: { tenant: true },
      });

      if (services.length === 0) {
        console.log('   ❌ No services found');
        console.log('   → Add at least one service to a tenant\n');
        allGood = false;
      } else {
        console.log(`   ✅ Found ${services.length} service(s):\n`);

        const servicesByTenant = services.reduce((acc, service) => {
          const tenantId = service.tenantId;
          if (!acc[tenantId]) {
            acc[tenantId] = [];
          }
          acc[tenantId].push(service);
          return acc;
        }, {} as Record<string, typeof services>);

        for (const [tenantId, tenantServices] of Object.entries(servicesByTenant)) {
          const tenant = tenantServices[0].tenant;
          console.log(`   ${tenant.name} (${tenant.slug}):`);
          tenantServices.forEach((s) => {
            console.log(`      - ${s.name} ($${s.price || 'N/A'}, ${s.durationMinutes}min)`);
          });
        }
        console.log('');
      }

      // 4. Check environment variables
      console.log('4️⃣  Environment check...');
      const requiredEnvVars = [
        'DATABASE_URL',
        'CLERK_SECRET_KEY',
      ];

      const missingEnvVars = requiredEnvVars.filter(
        (varName) => !process.env[varName]
      );

      if (missingEnvVars.length > 0) {
        console.log('   ⚠️  Missing environment variables:');
        missingEnvVars.forEach((v) => console.log(`      - ${v}`));
        console.log('');
        allGood = false;
      } else {
        console.log('   ✅ Required environment variables are set\n');
      }
    }

    // Final summary
    console.log('═'.repeat(50));
    if (allGood) {
      console.log('✅ PUBLIC BOOKING SETUP COMPLETE!\n');
      console.log('Next steps:');
      console.log('1. Start API: pnpm run start:dev');
      console.log('2. Start Web: pnpm run dev');
      console.log('3. Visit: http://localhost:3000/book/[tenant-slug]\n');
    } else {
      console.log('⚠️  SETUP INCOMPLETE\n');
      console.log('Please address the issues above and run this script again.\n');
    }
    console.log('═'.repeat(50));

  } catch (error) {
    console.error('\n❌ Error during verification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyBookingSetup();
