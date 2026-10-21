import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalHttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { InstanceInterceptor } from '../src/common/interceptors/instance.interceptor';
import { PrismaService } from '../src/database/prisma.service';

describe('Disposable PostgreSQL application flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let customerToken: string;
  let adminToken: string;
  let productId: string;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL?.includes('akufada_e2e')) {
      throw new Error('DATABASE_URL must target the disposable akufada_e2e database. Use scripts/test-e2e.ps1.');
    }
    process.env.NODE_ENV = 'test';
    process.env.JWT_ACCESS_SECRET ||= 'e2e-test-access-secret-at-least-32-characters-long';
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication({ rawBody: true });
    prisma = app.get(PrismaService);
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new GlobalHttpExceptionFilter());
    app.useGlobalInterceptors(new InstanceInterceptor());
    await app.init();

    const customer = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      email: `e2e-${Date.now()}@example.test`, fullName: 'E2E Customer', password: 'E2eCustomerPass123!',
    }).expect(201);
    customerToken = customer.body.tokens.accessToken;
    const admin = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      email: 'admin@akufada.com', password: 'AdminSecret123!',
    }).expect(200);
    adminToken = admin.body.tokens.accessToken;
    const product = await prisma.product.findFirst({ where: { isActive: true, inventory: { is: { quantity: { gte: 2 } } } } });
    if (!product) throw new Error('Seed did not create an active in-stock product');
    productId = product.id;
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('serves live/readiness and public catalog endpoints from migrated, seeded Postgres', async () => {
    await request(app.getHttpServer()).get('/api/v1/health/live').expect(200);
    await request(app.getHttpServer()).get('/api/v1/health/ready').expect(200);
    await request(app.getHttpServer()).get('/api/v1/categories').expect(200);
    await request(app.getHttpServer()).get('/api/v1/products').expect(200);
    await request(app.getHttpServer()).get(`/api/v1/products/${productId}`).expect(200);
  });

  it('registers/authenticates customers, restricts admin access, and lists users to an admin', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').set('Authorization', `Bearer ${customerToken}`).expect(200);
    await request(app.getHttpServer()).get('/api/v1/admin/users').set('Authorization', `Bearer ${customerToken}`).expect(403);
    await request(app.getHttpServer()).get('/api/v1/admin/users').set('Authorization', `Bearer ${adminToken}`).expect(200);
  });

  it('creates an idempotent cash order, tracks it, and restores reserved stock when cancelled', async () => {
    const stockBefore = (await prisma.inventory.findUniqueOrThrow({ where: { productId } })).quantity;
    const response = await request(app.getHttpServer()).post('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .set('Idempotency-Key', `e2e-${Date.now()}`)
      .send({ items: [{ productId, quantity: 1 }], payment: { provider: 'CASH_ON_PICKUP' } })
      .expect(201);
    expect(response.body.payment.status).toBe('PENDING');
    expect(response.body.status).toBe('CONFIRMED');

    const orderId = response.body.id;
    await request(app.getHttpServer()).get(`/api/v1/orders/${orderId}/track`)
      .set('Authorization', `Bearer ${customerToken}`).expect(200);
    await request(app.getHttpServer()).get('/api/v1/orders')
      .set('Authorization', `Bearer ${customerToken}`).expect(200);
    await request(app.getHttpServer()).post(`/api/v1/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${customerToken}`).send({ reason: 'E2E cleanup' }).expect(200);
    const stockAfter = (await prisma.inventory.findUniqueOrThrow({ where: { productId } })).quantity;
    expect(stockAfter).toBe(stockBefore);
  });

  it('serves staff and admin reporting endpoints with seeded roles', async () => {
    await request(app.getHttpServer()).get('/api/v1/staff/orders').set('Authorization', `Bearer ${adminToken}`).expect(200);
    await request(app.getHttpServer()).get('/api/v1/admin/reports/sales').set('Authorization', `Bearer ${adminToken}`).expect(200);
    await request(app.getHttpServer()).get('/api/v1/admin/audit-events').set('Authorization', `Bearer ${adminToken}`).expect(200);
  });
});
