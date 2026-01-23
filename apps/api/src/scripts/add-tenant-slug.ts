// Script to add slugs to existing tenants
// Run with: npx ts-node src/scripts/add-tenant-slug.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function addSlugsToTenants() {
  try {
    const tenants = await prisma.tenant.findMany();

    console.log(`Found ${tenants.length} tenants`);

    for (const tenant of tenants) {
      if (!tenant.slug) {
        const slug = generateSlug(tenant.name);
        let uniqueSlug = slug;
        let counter = 1;

        // Ensure slug is unique
        while (
          await prisma.tenant.findUnique({ where: { slug: uniqueSlug } })
        ) {
          uniqueSlug = `${slug}-${counter}`;
          counter++;
        }

        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { slug: uniqueSlug },
        });

        console.log(`Updated tenant "${tenant.name}" with slug: ${uniqueSlug}`);
      } else {
        console.log(`Tenant "${tenant.name}" already has slug: ${tenant.slug}`);
      }
    }

    console.log('All tenants updated successfully!');
  } catch (error) {
    console.error('Error updating tenants:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addSlugsToTenants();
