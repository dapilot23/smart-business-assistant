import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create demo tenant - Elite Plumbing Services
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-plumbing' },
    update: {
      name: 'Elite Plumbing Services',
      email: 'info@eliteplumbing.com',
      phone: '(512) 555-7890',
    },
    create: {
      name: 'Elite Plumbing Services',
      slug: 'demo-plumbing',
      email: 'info@eliteplumbing.com',
      phone: '(512) 555-7890',
    },
  });
  console.log('Created tenant:', tenant.name);

  // Create demo user (admin) - This will be linked when someone signs up
  const admin = await prisma.user.upsert({
    where: { email: 'demo@eliteplumbing.com' },
    update: {},
    create: {
      email: 'demo@eliteplumbing.com',
      name: 'Alex Martinez',
      phone: '(512) 555-0001',
      role: 'ADMIN',
      status: 'ACTIVE',
      tenantId: tenant.id,
    },
  });
  console.log('Created admin user:', admin.name);

  // Create technicians
  const tech1 = await prisma.user.upsert({
    where: { email: 'mike.johnson@eliteplumbing.com' },
    update: {},
    create: {
      email: 'mike.johnson@eliteplumbing.com',
      name: 'Mike Johnson',
      phone: '(512) 555-0002',
      role: 'TECHNICIAN',
      status: 'ACTIVE',
      tenantId: tenant.id,
    },
  });

  const tech2 = await prisma.user.upsert({
    where: { email: 'sarah.chen@eliteplumbing.com' },
    update: {},
    create: {
      email: 'sarah.chen@eliteplumbing.com',
      name: 'Sarah Chen',
      phone: '(512) 555-0003',
      role: 'TECHNICIAN',
      status: 'ACTIVE',
      tenantId: tenant.id,
    },
  });

  const tech3 = await prisma.user.upsert({
    where: { email: 'david.williams@eliteplumbing.com' },
    update: {},
    create: {
      email: 'david.williams@eliteplumbing.com',
      name: 'David Williams',
      phone: '(512) 555-0004',
      role: 'TECHNICIAN',
      status: 'ACTIVE',
      tenantId: tenant.id,
    },
  });
  console.log('Created technicians');

  // Create services with realistic pricing
  const services = await Promise.all([
    prisma.service.upsert({
      where: { id: 'svc-drain-cleaning' },
      update: { price: 175, durationMinutes: 60 },
      create: {
        id: 'svc-drain-cleaning',
        name: 'Drain Cleaning',
        description: 'Professional drain cleaning using hydro-jetting technology',
        price: 175,
        durationMinutes: 60,
        tenantId: tenant.id,
      },
    }),
    prisma.service.upsert({
      where: { id: 'svc-water-heater' },
      update: { price: 350, durationMinutes: 120 },
      create: {
        id: 'svc-water-heater',
        name: 'Water Heater Repair',
        description: 'Diagnosis and repair of gas or electric water heaters',
        price: 350,
        durationMinutes: 120,
        tenantId: tenant.id,
      },
    }),
    prisma.service.upsert({
      where: { id: 'svc-leak-repair' },
      update: { price: 225, durationMinutes: 90 },
      create: {
        id: 'svc-leak-repair',
        name: 'Leak Detection & Repair',
        description: 'Advanced leak detection and professional repair',
        price: 225,
        durationMinutes: 90,
        tenantId: tenant.id,
      },
    }),
    prisma.service.upsert({
      where: { id: 'svc-toilet-repair' },
      update: { price: 150, durationMinutes: 45 },
      create: {
        id: 'svc-toilet-repair',
        name: 'Toilet Repair/Install',
        description: 'Toilet repair, replacement, or new installation',
        price: 150,
        durationMinutes: 45,
        tenantId: tenant.id,
      },
    }),
    prisma.service.upsert({
      where: { id: 'svc-faucet-repair' },
      update: { price: 125, durationMinutes: 45 },
      create: {
        id: 'svc-faucet-repair',
        name: 'Faucet Repair/Install',
        description: 'Kitchen or bathroom faucet repair and installation',
        price: 125,
        durationMinutes: 45,
        tenantId: tenant.id,
      },
    }),
    prisma.service.upsert({
      where: { id: 'svc-garbage-disposal' },
      update: { price: 200, durationMinutes: 60 },
      create: {
        id: 'svc-garbage-disposal',
        name: 'Garbage Disposal',
        description: 'Garbage disposal repair or replacement',
        price: 200,
        durationMinutes: 60,
        tenantId: tenant.id,
      },
    }),
    prisma.service.upsert({
      where: { id: 'svc-sewer-line' },
      update: { price: 450, durationMinutes: 180 },
      create: {
        id: 'svc-sewer-line',
        name: 'Sewer Line Service',
        description: 'Sewer line inspection, cleaning, and repair',
        price: 450,
        durationMinutes: 180,
        tenantId: tenant.id,
      },
    }),
    prisma.service.upsert({
      where: { id: 'svc-emergency' },
      update: { price: 299, durationMinutes: 60 },
      create: {
        id: 'svc-emergency',
        name: 'Emergency Service',
        description: '24/7 emergency plumbing service',
        price: 299,
        durationMinutes: 60,
        tenantId: tenant.id,
      },
    }),
  ]);
  console.log('Created services:', services.length);

  // Create customers with Austin, TX addresses
  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { id: 'cust-1' },
      update: {},
      create: {
        id: 'cust-1',
        name: 'Jennifer Thompson',
        email: 'jennifer.t@gmail.com',
        phone: '(512) 555-1234',
        address: '4521 Congress Ave, Austin, TX 78745',
        notes: 'Prefers morning appointments. Has a dog.',
        tenantId: tenant.id,
      },
    }),
    prisma.customer.upsert({
      where: { id: 'cust-2' },
      update: {},
      create: {
        id: 'cust-2',
        name: 'Robert Garcia',
        email: 'rgarcia@outlook.com',
        phone: '(512) 555-2345',
        address: '8734 Burnet Rd, Austin, TX 78757',
        notes: 'Commercial property - restaurant owner',
        tenantId: tenant.id,
      },
    }),
    prisma.customer.upsert({
      where: { id: 'cust-3' },
      update: {},
      create: {
        id: 'cust-3',
        name: 'Lisa Nguyen',
        email: 'lisa.nguyen@yahoo.com',
        phone: '(512) 555-3456',
        address: '2109 S Lamar Blvd, Austin, TX 78704',
        tenantId: tenant.id,
      },
    }),
    prisma.customer.upsert({
      where: { id: 'cust-4' },
      update: {},
      create: {
        id: 'cust-4',
        name: 'Marcus Brown',
        email: 'mbrown@techcompany.com',
        phone: '(512) 555-4567',
        address: '11501 Domain Dr #150, Austin, TX 78758',
        notes: 'Office building - contact security first',
        tenantId: tenant.id,
      },
    }),
    prisma.customer.upsert({
      where: { id: 'cust-5' },
      update: {},
      create: {
        id: 'cust-5',
        name: 'Amanda Foster',
        email: 'afoster@gmail.com',
        phone: '(512) 555-5678',
        address: '3401 Red River St, Austin, TX 78705',
        tenantId: tenant.id,
      },
    }),
    prisma.customer.upsert({
      where: { id: 'cust-6' },
      update: {},
      create: {
        id: 'cust-6',
        name: 'James Wilson',
        email: 'jwilson@protonmail.com',
        phone: '(512) 555-6789',
        address: '6001 W Parmer Ln, Austin, TX 78729',
        notes: 'Returning customer - VIP',
        tenantId: tenant.id,
      },
    }),
    prisma.customer.upsert({
      where: { id: 'cust-7' },
      update: {},
      create: {
        id: 'cust-7',
        name: 'Patricia Martinez',
        email: 'pmartinez@austin.rr.com',
        phone: '(512) 555-7890',
        address: '901 E 6th St, Austin, TX 78702',
        tenantId: tenant.id,
      },
    }),
    prisma.customer.upsert({
      where: { id: 'cust-8' },
      update: {},
      create: {
        id: 'cust-8',
        name: 'Downtown Cafe LLC',
        email: 'manager@downtowncafe.com',
        phone: '(512) 555-8901',
        address: '401 Congress Ave, Austin, TX 78701',
        notes: 'Commercial account - monthly maintenance contract',
        tenantId: tenant.id,
      },
    }),
  ]);
  console.log('Created customers:', customers.length);

  // Delete existing appointments to avoid duplicates
  await prisma.appointment.deleteMany({ where: { tenantId: tenant.id } });

  // Create appointments across multiple days
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const appointments: Prisma.PrismaPromise<unknown>[] = [];

  // Yesterday's appointments (completed)
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  appointments.push(
    prisma.appointment.create({
      data: {
        customerId: customers[0].id,
        serviceId: services[0].id, // Drain Cleaning
        assignedTo: tech1.id,
        scheduledAt: new Date(yesterday.getTime() + 9 * 60 * 60 * 1000), // 9 AM
        duration: 60,
        status: 'COMPLETED',
        notes: 'Kitchen sink was backing up. Cleared grease buildup.',
        tenantId: tenant.id,
      },
    }),
    prisma.appointment.create({
      data: {
        customerId: customers[1].id,
        serviceId: services[5].id, // Garbage Disposal
        assignedTo: tech2.id,
        scheduledAt: new Date(yesterday.getTime() + 11 * 60 * 60 * 1000), // 11 AM
        duration: 60,
        status: 'COMPLETED',
        notes: 'Replaced garbage disposal unit at restaurant.',
        tenantId: tenant.id,
      },
    }),
    prisma.appointment.create({
      data: {
        customerId: customers[4].id,
        serviceId: services[2].id, // Leak Repair
        assignedTo: tech1.id,
        scheduledAt: new Date(yesterday.getTime() + 14 * 60 * 60 * 1000), // 2 PM
        duration: 90,
        status: 'COMPLETED',
        notes: 'Fixed leak under bathroom sink. Replaced P-trap.',
        tenantId: tenant.id,
      },
    })
  );

  // Today's appointments
  appointments.push(
    prisma.appointment.create({
      data: {
        customerId: customers[2].id,
        serviceId: services[1].id, // Water Heater
        assignedTo: tech1.id,
        scheduledAt: new Date(today.getTime() + 8 * 60 * 60 * 1000), // 8 AM
        duration: 120,
        status: 'IN_PROGRESS',
        notes: 'Water heater not producing hot water. Customer reports pilot light issues.',
        tenantId: tenant.id,
      },
    }),
    prisma.appointment.create({
      data: {
        customerId: customers[3].id,
        serviceId: services[3].id, // Toilet Repair
        assignedTo: tech2.id,
        scheduledAt: new Date(today.getTime() + 10 * 60 * 60 * 1000), // 10 AM
        duration: 45,
        status: 'CONFIRMED',
        notes: 'Office bathroom toilet running constantly.',
        tenantId: tenant.id,
      },
    }),
    prisma.appointment.create({
      data: {
        customerId: customers[5].id,
        serviceId: services[4].id, // Faucet Repair
        assignedTo: tech3.id,
        scheduledAt: new Date(today.getTime() + 13 * 60 * 60 * 1000), // 1 PM
        duration: 45,
        status: 'SCHEDULED',
        notes: 'Kitchen faucet leaking. Wants to upgrade to touchless.',
        tenantId: tenant.id,
      },
    }),
    prisma.appointment.create({
      data: {
        customerId: customers[6].id,
        serviceId: services[0].id, // Drain Cleaning
        assignedTo: tech1.id,
        scheduledAt: new Date(today.getTime() + 15 * 60 * 60 * 1000), // 3 PM
        duration: 60,
        status: 'SCHEDULED',
        notes: 'Slow draining bathtub.',
        tenantId: tenant.id,
      },
    })
  );

  // Tomorrow's appointments
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  appointments.push(
    prisma.appointment.create({
      data: {
        customerId: customers[7].id,
        serviceId: services[6].id, // Sewer Line
        assignedTo: tech1.id,
        scheduledAt: new Date(tomorrow.getTime() + 8 * 60 * 60 * 1000), // 8 AM
        duration: 180,
        status: 'CONFIRMED',
        notes: 'Annual sewer line inspection and cleaning - commercial account.',
        tenantId: tenant.id,
      },
    }),
    prisma.appointment.create({
      data: {
        customerId: customers[0].id,
        serviceId: services[1].id, // Water Heater
        assignedTo: tech2.id,
        scheduledAt: new Date(tomorrow.getTime() + 10 * 60 * 60 * 1000), // 10 AM
        duration: 120,
        status: 'SCHEDULED',
        notes: 'Follow-up: customer wants quote for tankless water heater upgrade.',
        tenantId: tenant.id,
      },
    }),
    prisma.appointment.create({
      data: {
        customerId: customers[4].id,
        serviceId: services[3].id, // Toilet
        assignedTo: tech3.id,
        scheduledAt: new Date(tomorrow.getTime() + 14 * 60 * 60 * 1000), // 2 PM
        duration: 45,
        status: 'SCHEDULED',
        notes: 'Install new toilet - customer purchased own fixture.',
        tenantId: tenant.id,
      },
    })
  );

  // Day after tomorrow
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 2);

  appointments.push(
    prisma.appointment.create({
      data: {
        customerId: customers[1].id,
        serviceId: services[2].id, // Leak Repair
        assignedTo: tech1.id,
        scheduledAt: new Date(dayAfter.getTime() + 9 * 60 * 60 * 1000), // 9 AM
        duration: 90,
        status: 'SCHEDULED',
        notes: 'Water leak behind walk-in cooler.',
        tenantId: tenant.id,
      },
    }),
    prisma.appointment.create({
      data: {
        customerId: customers[6].id,
        serviceId: services[4].id, // Faucet
        assignedTo: tech2.id,
        scheduledAt: new Date(dayAfter.getTime() + 11 * 60 * 60 * 1000), // 11 AM
        duration: 45,
        status: 'SCHEDULED',
        notes: 'Bathroom faucet replacement.',
        tenantId: tenant.id,
      },
    })
  );

  await Promise.all(appointments);
  console.log('Created appointments:', appointments.length);

  // Create quotes
  await prisma.quoteItem.deleteMany({});
  await prisma.quote.deleteMany({ where: { tenantId: tenant.id } });

  const quote1 = await prisma.quote.create({
    data: {
      quoteNumber: 'Q-2026-001',
      customerId: customers[0].id,
      status: 'SENT',
      description: 'Tankless water heater upgrade - Rinnai RU199iN',
      amount: 3850,
      validUntil: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      tenantId: tenant.id,
      items: {
        create: [
          {
            description: 'Rinnai RU199iN Tankless Water Heater',
            quantity: 1,
            unitPrice: 2200,
            total: 2200,
          },
          {
            description: 'Installation labor (includes permits)',
            quantity: 1,
            unitPrice: 1200,
            total: 1200,
          },
          {
            description: 'Gas line modification',
            quantity: 1,
            unitPrice: 350,
            total: 350,
          },
          {
            description: 'Old unit disposal',
            quantity: 1,
            unitPrice: 100,
            total: 100,
          },
        ],
      },
    },
  });

  const quote2 = await prisma.quote.create({
    data: {
      quoteNumber: 'Q-2026-002',
      customerId: customers[7].id,
      status: 'ACCEPTED',
      description: 'Commercial restroom renovation - plumbing scope',
      amount: 8500,
      validUntil: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      tenantId: tenant.id,
      items: {
        create: [
          {
            description: 'Remove existing fixtures (3 toilets, 2 sinks)',
            quantity: 1,
            unitPrice: 800,
            total: 800,
          },
          {
            description: 'Install commercial toilets (Kohler Highline)',
            quantity: 3,
            unitPrice: 650,
            total: 1950,
          },
          {
            description: 'Install commercial sinks with sensor faucets',
            quantity: 2,
            unitPrice: 850,
            total: 1700,
          },
          {
            description: 'Rough-in plumbing modifications',
            quantity: 1,
            unitPrice: 2500,
            total: 2500,
          },
          {
            description: 'Labor and materials',
            quantity: 1,
            unitPrice: 1550,
            total: 1550,
          },
        ],
      },
    },
  });

  const quote3 = await prisma.quote.create({
    data: {
      quoteNumber: 'Q-2026-003',
      customerId: customers[3].id,
      status: 'DRAFT',
      description: 'Office break room plumbing upgrade',
      amount: 1875,
      validUntil: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      tenantId: tenant.id,
      items: {
        create: [
          {
            description: 'Install commercial dishwasher hookup',
            quantity: 1,
            unitPrice: 650,
            total: 650,
          },
          {
            description: 'Replace break room sink and faucet',
            quantity: 1,
            unitPrice: 425,
            total: 425,
          },
          {
            description: 'Install instant hot water dispenser',
            quantity: 1,
            unitPrice: 400,
            total: 400,
          },
          {
            description: 'Labor',
            quantity: 1,
            unitPrice: 400,
            total: 400,
          },
        ],
      },
    },
  });
  console.log('Created quotes');

  // Create invoices
  await prisma.invoiceItem.deleteMany({});
  await prisma.invoice.deleteMany({ where: { tenantId: tenant.id } });

  const invoice1 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-001',
      customerId: customers[0].id,
      status: 'PAID',
      description: 'Drain cleaning service - kitchen sink',
      amount: 175,
      paidAmount: 175,
      dueDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      paidAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      tenantId: tenant.id,
      items: {
        create: [
          {
            description: 'Drain Cleaning Service',
            quantity: 1,
            unitPrice: 175,
            total: 175,
          },
        ],
      },
    },
  });

  const invoice2 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-002',
      customerId: customers[1].id,
      status: 'SENT',
      description: 'Garbage disposal replacement',
      amount: 385,
      dueDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      tenantId: tenant.id,
      items: {
        create: [
          {
            description: 'InSinkErator Evolution Excel 1HP Disposal',
            quantity: 1,
            unitPrice: 185,
            total: 185,
          },
          {
            description: 'Installation labor',
            quantity: 1,
            unitPrice: 200,
            total: 200,
          },
        ],
      },
    },
  });

  const invoice3 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-003',
      customerId: customers[4].id,
      status: 'SENT',
      description: 'Leak repair - bathroom P-trap replacement',
      amount: 225,
      dueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      tenantId: tenant.id,
      items: {
        create: [
          {
            description: 'Leak Detection & Repair Service',
            quantity: 1,
            unitPrice: 225,
            total: 225,
          },
        ],
      },
    },
  });

  const invoice4 = await prisma.invoice.create({
    data: {
      invoiceNumber: 'INV-2026-004',
      customerId: customers[5].id,
      status: 'OVERDUE',
      description: 'Emergency after-hours service - burst pipe',
      amount: 475,
      dueDate: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      tenantId: tenant.id,
      items: {
        create: [
          {
            description: 'Emergency Service Call (after hours)',
            quantity: 1,
            unitPrice: 299,
            total: 299,
          },
          {
            description: 'Pipe repair materials',
            quantity: 1,
            unitPrice: 76,
            total: 76,
          },
          {
            description: 'Additional labor (1.5 hrs)',
            quantity: 1,
            unitPrice: 100,
            total: 100,
          },
        ],
      },
    },
  });
  console.log('Created invoices');

  // Create tenant settings
  await prisma.tenantSettings.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      timezone: 'America/Chicago',
      businessHours: {
        monday: { enabled: true, start: '07:00', end: '18:00' },
        tuesday: { enabled: true, start: '07:00', end: '18:00' },
        wednesday: { enabled: true, start: '07:00', end: '18:00' },
        thursday: { enabled: true, start: '07:00', end: '18:00' },
        friday: { enabled: true, start: '07:00', end: '18:00' },
        saturday: { enabled: true, start: '08:00', end: '14:00' },
        sunday: { enabled: false, start: '00:00', end: '00:00' },
      },
      appointmentReminders: true,
      reminderHoursBefore: 24,
      reviewRequestEnabled: true,
      reviewRequestDelay: 48,
      googleReviewUrl: 'https://g.page/r/eliteplumbing/review',
    },
  });
  console.log('Created tenant settings');

  console.log('\n✅ Seed completed successfully!');
  console.log('\n📋 Demo Data Summary:');
  console.log('   Tenant: Elite Plumbing Services');
  console.log('   Users: 1 admin + 3 technicians');
  console.log('   Services: 8');
  console.log('   Customers: 8');
  console.log('   Appointments: 13 (past, today, upcoming)');
  console.log('   Quotes: 3 (draft, sent, accepted)');
  console.log('   Invoices: 4 (paid, sent, overdue)');
  console.log('\n🔐 To access: Sign up with any email via Clerk');
  console.log('   You will be auto-assigned to the demo tenant.\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
