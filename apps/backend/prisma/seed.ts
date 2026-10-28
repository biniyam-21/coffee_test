import { PrismaClient, RoleType, StockMovementReason } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Synthetic demo seed is disabled in production. Bootstrap the first administrator through an approved deployment procedure.');
  }
  console.log('--- Starting Idempotent Synthetic Seed Process ---');

  // 1. Seed Roles
  console.log('Seeding Roles...');
  const roles = [
    {
      name: RoleType.CUSTOMER,
      description: 'End consumer placing orders and viewing order history',
    },
    {
      name: RoleType.STAFF,
      description: 'Coffee shop staff managing kitchen queue and order status',
    },
    {
      name: RoleType.ADMIN,
      description: 'Store administrator managing catalog, inventory, and users',
    },
  ];

  const seededRoles: Record<RoleType, number> = {} as Record<RoleType, number>;
  for (const r of roles) {
    const roleRecord = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: { name: r.name, description: r.description },
    });
    seededRoles[r.name] = roleRecord.id;
  }

  // 2. Seed Synthetic Users with Real Bcrypt Hashes
  console.log('Seeding Synthetic Users...');
  const usersData = [
    // Standard Demo Accounts for Web & Mobile
    {
      email: 'admin@akufada.com',
      password: 'AdminSecret123!',
      fullName: 'Sara Haile (Admin)',
      phoneNumber: '+251911000001',
      role: RoleType.ADMIN,
    },
    {
      email: 'staff@akufada.com',
      password: 'StaffSecret123!',
      fullName: 'Dawit Tadesse (Staff)',
      phoneNumber: '+251911000002',
      role: RoleType.STAFF,
    },
    {
      email: 'customer@akufada.com',
      password: 'CustomerSecret123!',
      fullName: 'Abebe Bikila (Customer)',
      phoneNumber: '+251911000003',
      role: RoleType.CUSTOMER,
    },
    // Legacy Local Accounts
    {
      email: 'admin@akufada.local',
      password: 'AdminSecret123!',
      fullName: 'Sara Haile (Admin)',
      phoneNumber: '+251911000001',
      role: RoleType.ADMIN,
    },
    {
      email: 'staff1@akufada.local',
      password: 'StaffSecret123!',
      fullName: 'Dawit Tadesse (Staff)',
      phoneNumber: '+251911000002',
      role: RoleType.STAFF,
    },
    {
      email: 'customer1@akufada.local',
      password: 'CustomerSecret123!',
      fullName: 'Abebe Bikila (Customer)',
      phoneNumber: '+251911000003',
      role: RoleType.CUSTOMER,
    },
  ];

  const seededUsers: Record<string, string> = {};
  for (const u of usersData) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        passwordHash,
        fullName: u.fullName,
        phoneNumber: u.phoneNumber,
        isActive: true,
      },
      create: {
        email: u.email,
        passwordHash,
        fullName: u.fullName,
        phoneNumber: u.phoneNumber,
        isActive: true,
      },
    });

    seededUsers[u.email] = user.id;

    // Assign Role
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: seededRoles[u.role],
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: seededRoles[u.role],
      },
    });
  }

  // 3. Seed Categories
  console.log('Seeding Categories...');
  const categories = [
    {
      name: 'Hot Coffee & Espresso',
      slug: 'hot-coffee',
      description: 'Single-origin espresso, pour overs, and traditional macchiatos',
      displayOrder: 1,
    },
    {
      name: 'Cold Brews & Refreshers',
      slug: 'cold-brews',
      description: 'Slow-steeped cold brews and iced fruit teas',
      displayOrder: 2,
    },
    {
      name: 'Fresh Pastries',
      slug: 'pastries',
      description: 'Daily baked artisan croissants, muffins, and cakes',
      displayOrder: 3,
    },
    {
      name: 'Artisan Whole Bean',
      slug: 'artisan-beans',
      description: '250g bags of specialty roasted Ethiopian beans',
      displayOrder: 4,
    },
  ];

  const seededCategories: Record<string, string> = {};
  for (const c of categories) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description, displayOrder: c.displayOrder },
      create: c,
    });
    seededCategories[c.slug] = cat.id;
  }

  // 4. Seed Products & Inventory
  console.log('Seeding Products and Inventory...');
  const products = [
    // Hot Coffee
    {
      name: 'Ethiopian Yirgacheffe Pour Over',
      slug: 'ethiopian-yirgacheffe-pour-over',
      categorySlug: 'hot-coffee',
      description: 'Bright citrus, jasmine floral aroma, and delicate bergamot finish.',
      basePriceCents: 450,
      imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd',
      initialStock: 60,
    },
    {
      name: 'Sidama Reserve Double Espresso',
      slug: 'sidama-reserve-double-espresso',
      categorySlug: 'hot-coffee',
      description: 'Rich berry notes, velvety crema, and dark chocolate undertones.',
      basePriceCents: 350,
      imageUrl: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04',
      initialStock: 80,
    },
    {
      name: 'Traditional Addis Macchiato',
      slug: 'traditional-addis-macchiato',
      categorySlug: 'hot-coffee',
      description: 'Layered steamed milk with a bold shot of dark-roasted Harar espresso.',
      basePriceCents: 400,
      imageUrl: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d',
      initialStock: 75,
    },
    {
      name: 'Caffe Latte with Oat Milk',
      slug: 'caffe-latte-oat-milk',
      categorySlug: 'hot-coffee',
      description: 'Smooth microfoam over double espresso with organic oat milk.',
      basePriceCents: 500,
      imageUrl: 'https://images.unsplash.com/photo-1534778101976-62847782c213',
      initialStock: 50,
    },

    // Cold Brews
    {
      name: 'Nitro Cold Brew Reserve',
      slug: 'nitro-cold-brew-reserve',
      categorySlug: 'cold-brews',
      description: 'Nitrogen-infused cold brew with cascading creamy head.',
      basePriceCents: 550,
      imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5',
      initialStock: 45,
    },
    {
      name: 'Vanilla Sweet Cream Cold Brew',
      slug: 'vanilla-sweet-cream-cold-brew',
      categorySlug: 'cold-brews',
      description: 'Slow-steeped Guji coffee topped with house-made vanilla sweet cream.',
      basePriceCents: 575,
      imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735',
      initialStock: 40,
    },
    {
      name: 'Iced Cardamom Cascara Tea',
      slug: 'iced-cardamom-cascara-tea',
      categorySlug: 'cold-brews',
      description: 'Sun-dried coffee cherry tea brewed with crushed cardamom pods.',
      basePriceCents: 425,
      imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc',
      initialStock: 30,
    },

    // Pastries
    {
      name: 'Butter Croissant',
      slug: 'butter-croissant',
      categorySlug: 'pastries',
      description: 'Flaky, multi-layered French butter pastry baked fresh every morning.',
      basePriceCents: 350,
      imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a',
      initialStock: 25,
    },
    {
      name: 'Almond Frangipane Croissant',
      slug: 'almond-frangipane-croissant',
      categorySlug: 'pastries',
      description: 'Twice-baked croissant filled with almond cream and sliced almonds.',
      basePriceCents: 425,
      imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff',
      initialStock: 20,
    },
    {
      name: 'Wild Blueberry Streusel Muffin',
      slug: 'wild-blueberry-streusel-muffin',
      categorySlug: 'pastries',
      description: 'Bursting with organic blueberries and topped with cinnamon streusel.',
      basePriceCents: 375,
      imageUrl: 'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e',
      initialStock: 30,
    },

    // Whole Bean
    {
      name: 'Yirgacheffe Kochere 250g Whole Bean',
      slug: 'yirgacheffe-kochere-250g',
      categorySlug: 'artisan-beans',
      description: 'Washed process, Grade 1 heirloom varietal. Roast profile: Light.',
      basePriceCents: 1650,
      imageUrl: 'https://images.unsplash.com/photo-1587734195503-904fca47e0e9',
      initialStock: 35,
    },
    {
      name: 'Guji Highland Natural 250g Whole Bean',
      slug: 'guji-highland-natural-250g',
      categorySlug: 'artisan-beans',
      description: 'Natural sun-dried process with intense strawberry jam notes. Medium roast.',
      basePriceCents: 1750,
      imageUrl: 'https://images.unsplash.com/photo-1611854779393-1b2da9d400fe',
      initialStock: 25,
    },
  ];

  const adminUserId = seededUsers['admin@akufada.com'] || seededUsers['admin@akufada.local'];

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        description: p.description,
        basePriceCents: p.basePriceCents,
        imageUrl: p.imageUrl,
        categoryId: seededCategories[p.categorySlug],
        isActive: true,
      },
      create: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        basePriceCents: p.basePriceCents,
        imageUrl: p.imageUrl,
        categoryId: seededCategories[p.categorySlug],
        isActive: true,
      },
    });

    // Seed or update Inventory record
    const inventory = await prisma.inventory.upsert({
      where: { productId: product.id },
      update: {},
      create: {
        productId: product.id,
        quantity: p.initialStock,
        lowStockThreshold: 10,
      },
    });

    // Check if initial stock movement already exists
    const existingMovement = await prisma.stockMovement.findFirst({
      where: {
        productId: product.id,
        reason: StockMovementReason.RESTOCK_PURCHASE,
      },
    });

    if (!existingMovement) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          userId: adminUserId,
          quantityDelta: p.initialStock,
          balanceAfter: inventory.quantity,
          reason: StockMovementReason.RESTOCK_PURCHASE,
          notes: 'Initial synthetic roastery batch intake for practical exam evaluation',
        },
      });
    }
  }

  console.log(
    `--- Synthetic Seed Complete: ${products.length} products & stock records ready. ---`,
  );
}

main()
  .catch((e) => {
    console.error('Error during synthetic seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
