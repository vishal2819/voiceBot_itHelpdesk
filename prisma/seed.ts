import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed Service Catalog with the 4 required issue types
  const services = [
    {
      issueType: 'wifi_not_working',
      description: 'Wi-Fi not working',
      price: 20.0,
      keywords: [
        'wifi',
        'wi-fi',
        'internet',
        'connection',
        'network',
        'cant connect',
        'no internet',
        'wireless',
        'router',
        'connectivity',
      ],
    },
    {
      issueType: 'email_login_issues',
      description: 'Email login issues',
      price: 15.0,
      keywords: [
        'email',
        'login',
        'password',
        'outlook',
        'gmail',
        'cant login',
        'sign in',
        'authentication',
        'access',
        'forgot password',
      ],
    },
    {
      issueType: 'slow_laptop_performance',
      description: 'Slow laptop performance',
      price: 25.0,
      keywords: [
        'slow',
        'performance',
        'lag',
        'freeze',
        'cpu',
        'memory',
        'fast',
        'speed',
        'running slow',
        'sluggish',
        'hanging',
      ],
    },
    {
      issueType: 'printer_problems',
      description: 'Printer problems',
      price: 10.0,
      keywords: [
        'printer',
        'print',
        'printing',
        'cant print',
        'paper jam',
        'toner',
        'ink',
        'scanner',
        'copier',
      ],
    },
  ];

  for (const service of services) {
    await prisma.serviceCatalog.upsert({
      where: { issueType: service.issueType },
      update: {},
      create: service,
    });
  }

  console.log('Seeded 4 service types:');
  services.forEach((s) => console.log(`  - ${s.description}: $${s.price}`));

  // Create a sample ticket for demonstration
  const sampleTicket = await prisma.ticket.create({
    data: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '+1-555-0100',
      address: '123 Main St, Anytown, USA',
      issue: 'My laptop is running very slow and freezing frequently',
      issueType: 'slow_laptop_performance',
      price: 25.0,
      status: 'CREATED',
    },
  });

  console.log(`Created sample ticket: ${sampleTicket.ticketNumber}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
